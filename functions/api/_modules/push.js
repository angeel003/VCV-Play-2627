// ============================================================================
// PUSH MODULE: WEB PUSH (RFC 8291 / 8292), CRONS Y NOTIFICACIONES
// ============================================================================
import { jsonResponse, flushBatch, runInBg, runInChunks, isSchemaMissingErr } from './shared.js';
import { formatMatch } from './matches.js';

export const DEFAULT_VAPID_PUBLIC = "BC2qOrSTAHeNqSis_RChG_ycGZ0SY1bTIgJbRr7etA9D6z0XgIZqNdR-1jwLn99sKtaJvuganWgIwUnFRUYd_1U";
export const DEFAULT_VAPID_PRIVATE = "RdKwpMLygVN-810zd21qVNUx93NKqMGmqL8CQmuCLvE";
export const DEFAULT_VAPID_SUBJECT = "mailto:soporte@vcvplay.com";

export function b64url(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(str) {
    str = (str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export function vapidToJwk(pubBytes, privBytes) {
    return {
        kty: "EC",
        crv: "P-256",
        x: b64url(pubBytes.slice(1, 33)),
        y: b64url(pubBytes.slice(33, 65)),
        d: b64url(privBytes),
        ext: true
    };
}

export async function createVapidHeader(audience, subject, pubKeyBytes, privKeyBytes) {
    const jwk = vapidToJwk(pubKeyBytes, privKeyBytes);
    const privKey = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const header = { alg: "ES256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        aud: audience,
        exp: now + 43200,
        sub: subject
    };

    const encHeader = b64url(new TextEncoder().encode(JSON.stringify(header)));
    const encPayload = b64url(new TextEncoder().encode(JSON.stringify(payload)));
    const dataToSign = new TextEncoder().encode(encHeader + "." + encPayload);

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privKey,
        dataToSign
    );

    const jwt = encHeader + "." + encPayload + "." + b64url(signature);
    return "vapid t=" + jwt + ", k=" + b64url(pubKeyBytes);
}

export async function encryptPayloadAes128Gcm(subscriberP256dhBase64, subscriberAuthBase64, payloadString) {
    const subscriberPubBytes = fromB64url(subscriberP256dhBase64);
    const subscriberAuthBytes = fromB64url(subscriberAuthBase64);

    const localKeyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
    );
    const localRawPub = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
    const localPubBytes = new Uint8Array(localRawPub);

    const subPubKey = await crypto.subtle.importKey(
        "raw",
        subscriberPubBytes,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
    );

    const sharedSecret = await crypto.subtle.deriveBits(
        { name: "ECDH", public: subPubKey },
        localKeyPair.privateKey,
        256
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const keyInfoPrefix = new TextEncoder().encode("WebPush: info\0");
    const keyInfo = new Uint8Array(keyInfoPrefix.length + 65 + 65);
    keyInfo.set(keyInfoPrefix, 0);
    keyInfo.set(subscriberPubBytes, keyInfoPrefix.length);
    keyInfo.set(localPubBytes, keyInfoPrefix.length + 65);

    const ecdhKey = await crypto.subtle.importKey("raw", sharedSecret, { name: "HKDF" }, false, ["deriveBits"]);
    const ikm = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: subscriberAuthBytes, info: keyInfo },
        ecdhKey,
        256
    );

    const prkKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);

    const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
    const cekBits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: salt, info: cekInfo },
        prkKey,
        128
    );
    const cek = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);

    const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
    const nonceBits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: salt, info: nonceInfo },
        prkKey,
        96
    );
    const nonce = new Uint8Array(nonceBits);

    const plainBytes = new TextEncoder().encode(payloadString);
    const padded = new Uint8Array(plainBytes.length + 1);
    padded.set(plainBytes, 0);
    padded[plainBytes.length] = 2; // Delimiter RFC 8291

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce, tagLength: 128 },
        cek,
        padded
    );
    const cipherBytes = new Uint8Array(ciphertext);

    const body = new Uint8Array(16 + 4 + 1 + 65 + cipherBytes.length);
    body.set(salt, 0);
    body[16] = 0; body[17] = 0; body[18] = 0x10; body[19] = 0; // 4096
    body[20] = 65;
    body.set(localPubBytes, 21);
    body.set(cipherBytes, 86);

    return body;
}

export async function sendWebPushNotification(subObj, payloadObj, env) {
    try {
        if (!subObj || !subObj.endpoint) {
            return { success: false, error: "Suscripción inválida: falta endpoint" };
        }

        const pubKeyStr = (env && env.VAPID_PUBLIC_KEY) || DEFAULT_VAPID_PUBLIC;
        const privKeyStr = (env && env.VAPID_PRIVATE_KEY) || DEFAULT_VAPID_PRIVATE;
        const subject = (env && env.VAPID_SUBJECT) || DEFAULT_VAPID_SUBJECT;

        const pubKeyBytes = fromB64url(pubKeyStr);
        const privKeyBytes = fromB64url(privKeyStr);

        const urlObj = new URL(subObj.endpoint);
        const audience = urlObj.protocol + "//" + urlObj.host;

        const vapidAuth = await createVapidHeader(audience, subject, pubKeyBytes, privKeyBytes);

        const jsonPayload = JSON.stringify(payloadObj);
        let bodyData;
        const headers = {
            "TTL": "86400",
            "Authorization": vapidAuth
        };

        if (subObj.keys && subObj.keys.p256dh && subObj.keys.auth) {
            bodyData = await encryptPayloadAes128Gcm(subObj.keys.p256dh, subObj.keys.auth, jsonPayload);
            headers["Content-Type"] = "application/octet-stream";
            headers["Content-Encoding"] = "aes128gcm";
        } else {
            bodyData = jsonPayload;
            headers["Content-Type"] = "application/json";
        }

        const resp = await fetch(subObj.endpoint, {
            method: "POST",
            headers: headers,
            body: bodyData
        });

        if (resp.status === 201 || resp.status === 200 || resp.status === 202) {
            return { success: true, status: resp.status };
        } else {
            const errText = await resp.text();
            return { success: false, status: resp.status, error: errText, isExpired: (resp.status === 404 || resp.status === 410) };
        }
    } catch (e) {
        console.error("sendWebPushNotification exception:", e);
        return { success: false, error: e.message };
    }
}

export async function ensureSuscripcionesPushSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Suscripciones_Push_Dispositivos" (
        "Endpoint" TEXT PRIMARY KEY, "Usuario" TEXT NOT NULL, "Suscripcion_JSON" TEXT NOT NULL, "Opciones_Viernes" INTEGER DEFAULT 1, "Opciones_2Horas" INTEGER DEFAULT 1, "Opciones_SoloOlvidos" INTEGER DEFAULT 0, "Opciones_Descongelacion" INTEGER DEFAULT 1, "Opciones_Mvp" INTEGER DEFAULT 1, "Equipos_Permitidos" TEXT DEFAULT '{}', "Ultima_Actualizacion" TEXT
    )`).run();
    await Promise.allSettled([
        db.prepare('ALTER TABLE "Suscripciones_Push_Dispositivos" ADD COLUMN "Opciones_Descongelacion" INTEGER DEFAULT 1').run(),
        db.prepare('ALTER TABLE "Suscripciones_Push_Dispositivos" ADD COLUMN "Opciones_Mvp" INTEGER DEFAULT 1').run()
    ]);
}

export async function ensureNotificacionesSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Notificaciones" (
        "ID" INTEGER PRIMARY KEY AUTOINCREMENT,
        "Titulo" TEXT,
        "Mensaje" TEXT,
        "Tipo" TEXT,
        "Importancia" TEXT,
        "Visibilidad" TEXT,
        "timestamp" INTEGER,
        "Activa" INTEGER DEFAULT 1
    )`).run();
    try { await db.prepare('ALTER TABLE "Notificaciones" ADD COLUMN "Activa" INTEGER DEFAULT 1').run(); } catch(e) {}
}

export async function ensureLogNotificacionesSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Notificaciones" (
        "ID" INTEGER PRIMARY KEY AUTOINCREMENT, "Usuario" TEXT, "Tipo" TEXT, "Titulo" TEXT, "Mensaje" TEXT, "Fecha" TEXT, "Estado" TEXT
    )`).run();
}

export async function writePushLogsAndCleanup(db, logStmts, expiredEndpoints) {
    const cleanStmts = (expiredEndpoints || []).map(ep =>
        db.prepare('DELETE FROM "Suscripciones_Push_Dispositivos" WHERE "Endpoint" = ?').bind(ep)
    );
    if (cleanStmts.length > 0) {
        try { await flushBatch(db, cleanStmts); } catch(e) {}
    }
    if (logStmts && logStmts.length > 0) {
        try {
            await flushBatch(db, logStmts);
        } catch(e) {
            if (isSchemaMissingErr(e)) {
                await ensureLogNotificacionesSchema(db);
                try { await flushBatch(db, logStmts); } catch(e2) {}
            }
        }
    }
}

export async function broadcastPushToAll(db, env, { title, body, url, tipo }) {
    try {
        let sql = 'SELECT Endpoint, Usuario, Suscripcion_JSON, Opciones_Descongelacion, Opciones_Mvp FROM "Suscripciones_Push_Dispositivos" WHERE LENGTH("Suscripcion_JSON") > 20';
        if (tipo === 'UNFREEZE_AUTO' || tipo === 'UNFREEZE_MANUAL') {
            sql += ' AND (Opciones_Descongelacion IS NULL OR Opciones_Descongelacion = 1)';
        } else if (tipo === 'MVP_OPEN') {
            sql += ' AND (Opciones_Mvp IS NULL OR Opciones_Mvp = 1)';
        }

        let subsRes;
        try {
            subsRes = await db.prepare(sql).all();
        } catch (err) {
            if (isSchemaMissingErr(err)) {
                await ensureSuscripcionesPushSchema(db);
                subsRes = await db.prepare(sql).all();
            } else {
                throw err;
            }
        }
        const subs = (subsRes && subsRes.results) || [];
        if (subs.length === 0) return 0;

        const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        const payload = {
            title: title,
            body: body,
            data: { url: url || '/' }
        };

        const tasks = [];
        for (const subRow of subs) {
            try {
                const subObj = JSON.parse(subRow.Suscripcion_JSON);
                tasks.push({ subRow, subObj });
            } catch(e) {}
        }

        let sent = 0;
        const logStmts = [];
        const expiredEndpoints = [];

        await runInChunks(tasks, 10, async (t) => {
            const pushRes = await sendWebPushNotification(t.subObj, payload, env);
            if (pushRes && pushRes.success) {
                sent++;
            } else if (pushRes && pushRes.isExpired && t.subRow.Endpoint) {
                expiredEndpoints.push(t.subRow.Endpoint);
            }
            logStmts.push(
                db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(t.subRow.Usuario || 'Todos', tipo || 'PUSH_GENERAL', title, body, nowMadrid, (pushRes && pushRes.success) ? 'ENVIADO' : `FALLIDO (${(pushRes && (pushRes.status || pushRes.error)) || 'error'})`)
            );
        });

        await writePushLogsAndCleanup(db, logStmts, expiredEndpoints);
        return sent;
    } catch(e) {
        console.warn('Error en broadcastPushToAll:', e);
        return 0;
    }
}

export async function notifyAdminsPush(db, env, { title, body, url, action }) {
    try {
        let sql = `
            SELECT s.Endpoint, s.Usuario, s.Suscripcion_JSON 
            FROM "Suscripciones_Push_Dispositivos" s
            INNER JOIN "Insignias" i ON lower(s.Usuario) = lower(i.Usuario)
            WHERE UPPER(TRIM(i."Admin Web")) = 'X' AND LENGTH(s."Suscripcion_JSON") > 20
        `;
        let subsRes;
        try {
            subsRes = await db.prepare(sql).all();
        } catch (err) {
            if (isSchemaMissingErr(err)) {
                await ensureSuscripcionesPushSchema(db);
                subsRes = await db.prepare(sql).all();
            } else {
                throw err;
            }
        }
        const subs = (subsRes && subsRes.results) || [];
        if (subs.length === 0) return 0;

        const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        const payload = {
            title: title,
            body: body,
            data: { 
                url: url || '/?admin_tab=solicitudes',
                action: action || 'abrirSolicitudesAdmin'
            }
        };

        const tasks = [];
        for (const subRow of subs) {
            try {
                const subObj = JSON.parse(subRow.Suscripcion_JSON);
                tasks.push({ subRow, subObj });
            } catch(e) {}
        }

        let sent = 0;
        const logStmts = [];
        const expiredEndpoints = [];

        await runInChunks(tasks, 10, async (t) => {
            const pushRes = await sendWebPushNotification(t.subObj, payload, env);
            if (pushRes && pushRes.success) {
                sent++;
            } else if (pushRes && pushRes.isExpired && t.subRow.Endpoint) {
                expiredEndpoints.push(t.subRow.Endpoint);
            }
            logStmts.push(
                db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(t.subRow.Usuario || 'Admin', 'SOLICITUD_REGISTRO', title, body, nowMadrid, (pushRes && pushRes.success) ? 'ENVIADO' : `FALLIDO (${(pushRes && (pushRes.status || pushRes.error)) || 'error'})`)
            );
        });

        await writePushLogsAndCleanup(db, logStmts, expiredEndpoints);
        return sent;
    } catch(e) {
        console.warn('Error en notifyAdminsPush:', e);
        return 0;
    }
}

export async function crearNotificacion(db, { titulo, mensaje, tipo = 'Aviso', importancia = 'ALTA', visibilidad = 'MOSTRAR', activa = 1 }) {
    const nowTs = Date.now();
    const runInsert = () => db.prepare('INSERT INTO "Notificaciones" ("Titulo", "Mensaje", "Tipo", "Importancia", "Visibilidad", "timestamp", "Activa") VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(titulo, mensaje, tipo, importancia, visibilidad, nowTs, activa).run();
    try {
        await runInsert();
        return true;
    } catch(e) {
        if (isSchemaMissingErr(e)) {
            try {
                await ensureNotificacionesSchema(db);
                await runInsert();
                return true;
            } catch(e2) {
                console.error('Error al crear notificacion (retry):', e2);
                return false;
            }
        }
        console.error('Error al crear notificacion:', e);
        return false;
    }
}

export function getLunesSemanaClave(date = new Date()) {
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Madrid',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
        const [y, m, d] = parts.split('-').map(Number);
        const madridDate = new Date(Date.UTC(y, m - 1, d));
        const day = madridDate.getUTCDay();
        const diff = (day === 0 ? -6 : 1 - day);
        const monday = new Date(madridDate);
        monday.setUTCDate(madridDate.getUTCDate() + diff);
        return monday.toISOString().slice(0, 10);
    } catch(e) {
        return new Date(date).toISOString().slice(0, 10);
    }
}

export async function verificarDescongelacionAutomatica(db, env, context, preloaded = {}) {
    try {
        const now = new Date();
        const utcDay = now.getUTCDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab

        const parseOverrideRow = (rowOverride) => {
            if (!rowOverride || !rowOverride.valor) return null;
            try {
                const parsed = JSON.parse(rowOverride.valor);
                if (parsed.expires_at && now.getTime() > parsed.expires_at) {
                    runInBg(context, db.prepare("DELETE FROM Cache_App WHERE clave = 'FREEZE_OVERRIDE'").run());
                    return null;
                }
                return parsed.mode || null;
            } catch(e) {
                return null;
            }
        };

        let freezeOverride = preloaded.hasOverride ? parseOverrideRow(preloaded.overrideRow) : undefined;

        if (utcDay !== 1) {
            return false;
        }

        let hourMadrid = 0;
        try {
            const hourStr = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }).format(now);
            hourMadrid = parseInt(hourStr, 10);
        } catch(e) {
            hourMadrid = now.getUTCHours() + 1;
        }
        if (hourMadrid < 10) {
            return false;
        }

        if (freezeOverride === undefined) {
            try {
                const rowOverride = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'FREEZE_OVERRIDE'").first();
                freezeOverride = parseOverrideRow(rowOverride);
            } catch(e) {
                freezeOverride = null;
            }
        }

        if (freezeOverride === 'FREEZE' || freezeOverride === 'UNFREEZE') {
            return false;
        }

        const lunesClave = getLunesSemanaClave(now);
        const autoKey = 'AUTO_UNFREEZE_' + lunesClave;

        if (lunesClave === '2026-11-16') {
            return false;
        }

        let yaEmitida = null;
        if (preloaded.hasAuto) {
            yaEmitida = preloaded.autoRow || null;
        } else {
            try {
                yaEmitida = await db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(autoKey).first();
            } catch(e) {
                await db.prepare('CREATE TABLE IF NOT EXISTS "Cache_App" ("clave" TEXT PRIMARY KEY, "valor" TEXT, "timestamp" INTEGER)').run();
                yaEmitida = await db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(autoKey).first();
            }
        }
        if (yaEmitida) {
            return false;
        }

        await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(autoKey, 'DONE_AUTO_' + Date.now(), Date.now()).run();

        try {
            await db.prepare('UPDATE "Notificaciones" SET "Activa" = 0 WHERE "Titulo" LIKE \'%descongelad%\' OR "Titulo" LIKE \'%Clasificaciones Descongeladas%\' OR "Titulo" LIKE \'%Rankings y Clasificaciones%\'').run();
        } catch(e) {}

        const titUnfreeze = '🏆 ¡Rankings y Clasificaciones Descongelados!';
        const msgUnfreeze = 'Ya se han actualizado todas las clasificaciones con los puntos definitivos de la jornada. ¡Comprueba tu posición en la tabla!';
        await crearNotificacion(db, {
            titulo: titUnfreeze,
            mensaje: msgUnfreeze,
            tipo: 'Aviso',
            importancia: 'ALTA',
            visibilidad: 'MOSTRAR',
            activa: 1
        });

        runInBg(context, broadcastPushToAll(db, env, {
            title: titUnfreeze,
            body: msgUnfreeze,
            url: '/?tab=clasificaciones',
            tipo: 'UNFREEZE_AUTO'
        }));
        return true;
    } catch(err) {
        console.warn('Error en verificarDescongelacionAutomatica:', err);
        return false;
    }
}

export async function getNotificacionesPublicas(db, env = null, context = null, preloaded = {}) {
    try {
        let didCreateAuto = false;
        if (env) {
            didCreateAuto = await verificarDescongelacionAutomatica(db, env, context, preloaded);
        }

        let rawRows = (!didCreateAuto && Array.isArray(preloaded.notifRows)) ? preloaded.notifRows : null;
        if (!rawRows) {
            try {
                const { results } = await db.prepare(`
                    SELECT * FROM "Notificaciones" 
                    WHERE "Visibilidad" IS NULL OR ("Visibilidad" != 'OCULTAR' AND "Visibilidad" != 'BORRADA' AND "Visibilidad" != 'ELIMINADA') 
                    ORDER BY "timestamp" DESC, "ID" DESC
                `).all();
                rawRows = results || [];
            } catch (eQuery) {
                await db.prepare(`CREATE TABLE IF NOT EXISTS "Notificaciones" (
                    "ID" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "Titulo" TEXT,
                    "Mensaje" TEXT,
                    "Tipo" TEXT,
                    "Importancia" TEXT,
                    "Visibilidad" TEXT,
                    "timestamp" INTEGER,
                    "Activa" INTEGER DEFAULT 1
                )`).run();
                try {
                    await db.prepare('ALTER TABLE "Notificaciones" ADD COLUMN "Activa" INTEGER DEFAULT 1').run();
                } catch(eCol) {}
                const { results } = await db.prepare(`
                    SELECT * FROM "Notificaciones" 
                    WHERE "Visibilidad" IS NULL OR ("Visibilidad" != 'OCULTAR' AND "Visibilidad" != 'BORRADA' AND "Visibilidad" != 'ELIMINADA') 
                    ORDER BY "timestamp" DESC, "ID" DESC
                `).all();
                rawRows = results || [];
            }
        }

        const mvpExpireCutoff = Date.now() - 24 * 3600 * 1000;
        let needsNullFix = false;
        let needsMvpExpire = false;
        let needsDeleteDirty = false;
        const cleanRows = [];

        for (const row of rawRows) {
            if (!row) continue;
            if (row.Titulo === '🔔 ¡Novedad! Recordatorios y Notificaciones' || row.ID === 8 || String(row.ID) === '8') {
                needsDeleteDirty = true;
                continue;
            }
            let activaVal = row.Activa;
            if (activaVal === null || activaVal === undefined) {
                needsNullFix = true;
                activaVal = 1;
            }
            if (String(row.Titulo || '').includes('MVP VALCYL') && activaVal === 1 && Number(row.timestamp || 0) < mvpExpireCutoff) {
                needsMvpExpire = true;
                activaVal = 0;
            }
            cleanRows.push(activaVal !== row.Activa ? { ...row, Activa: activaVal } : row);
        }

        if (needsNullFix || needsMvpExpire || needsDeleteDirty) {
            const bgFixStmts = [];
            if (needsNullFix) {
                bgFixStmts.push(db.prepare('UPDATE "Notificaciones" SET "Activa" = 1 WHERE "Activa" IS NULL'));
            }
            if (needsMvpExpire) {
                bgFixStmts.push(db.prepare('UPDATE "Notificaciones" SET "Activa" = 0 WHERE "Titulo" LIKE \'%MVP VALCYL%\' AND "Activa" = 1 AND "timestamp" < ?').bind(mvpExpireCutoff));
            }
            if (needsDeleteDirty) {
                bgFixStmts.push(db.prepare('DELETE FROM "Notificaciones" WHERE "Titulo" = \'🔔 ¡Novedad! Recordatorios y Notificaciones\' OR "ID" = 8'));
            }
            runInBg(context, flushBatch(db, bgFixStmts).catch(() => {}));
        }

        return cleanRows;
    } catch (e) {
        console.warn('Error fetching notificaciones:', e);
        return [];
    }
}

export async function procesarRecordatorioMvp1Hora(db, env, body = {}, subs = [], insMap = {}, sentSet = new Set(), soloAdmin = false, nowMadrid = '', partidosById = null) {
    let totalEnviadosMvp = 0;
    let detalleMvp = [];
    const now = Date.now();
    const ignorarFiltros = Boolean(body.ignorar_filtros_prueba || body.forzar_partido_id);

    try {
        const { results: roList } = await db.prepare('SELECT "ID Partido" as id_partido, mvp_cierre_votacion_ts, mvp_publicacion_ts, mvp_visible, mvp_candidatos, mvp_oficial FROM "Resultados_Oficiales" WHERE "mvp_visible" = 1 AND LENGTH("mvp_candidatos") > 5 AND "mvp_cierre_votacion_ts" > 0').all();

        if (!roList || roList.length === 0) return { totalEnviadosMvp: 0, detalleMvp: [] };

        const eligibleRos = [];
        for (const ro of roList) {
            if (ro.mvp_oficial && String(ro.mvp_oficial).trim() !== '') continue;

            const idPart = ro.id_partido;
            const cierreTs = parseInt(ro.mvp_cierre_votacion_ts) || 0;
            if (cierreTs <= 0) continue;

            const diffMs = cierreTs - now;
            const enVentana1Hora = (diffMs <= 65 * 60 * 1000 && diffMs >= 5 * 60 * 1000);
            const forzarEstePartido = body.forzar_partido_id && (String(body.forzar_partido_id).trim() === String(idPart).trim());
            if (!enVentana1Hora && !forzarEstePartido) continue;

            eligibleRos.push({ ro, idPart, cierreTs });
        }

        if (eligibleRos.length === 0) return { totalEnviadosMvp: 0, detalleMvp: [] };

        const votedSets = await Promise.all(eligibleRos.map(async (item) => {
            const matchPromise = (partidosById && partidosById[item.idPart])
                ? Promise.resolve(partidosById[item.idPart])
                : db.prepare('SELECT "Rival" FROM "Ajustes" WHERE "ID_Partido" = ?').bind(item.idPart).first();
            const votesPromise = db.prepare('SELECT DISTINCT usuario FROM "MVP_Votos" WHERE id_partido = ?').bind(item.idPart).all();
            const [mMatch, votesRes] = await Promise.all([matchPromise, votesRes]);
            return {
                ...item,
                mMatch,
                votedUsers: new Set(((votesRes && votesRes.results) || []).map(r => r.usuario))
            };
        }));

        const pushTasks = [];
        for (const { idPart, cierreTs, mMatch, votedUsers } of votedSets) {
            const rivalName = (mMatch && (mMatch.rival || mMatch.Rival)) ? (mMatch.rival || mMatch.Rival) : 'rival';

            let horaCierreStr = "las 12:00";
            try {
                const dC = new Date(cierreTs);
                horaCierreStr = "las " + dC.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
            } catch(e) {}

            const tipoLog = `MVP1H_${idPart}`;

            for (const subRow of subs) {
                const u = subRow.Usuario;
                const userIns = insMap[u] || {};
                const isUserAdmin = (userIns["Admin Web"] === "X");

                if (soloAdmin && !isUserAdmin) continue;
                if (subRow.Opciones_Mvp !== undefined && (subRow.Opciones_Mvp === 0 || subRow.Opciones_Mvp === '0' || subRow.Opciones_Mvp === false)) {
                    continue;
                }
                if (votedUsers.has(u) && !ignorarFiltros) {
                    continue;
                }
                if (!ignorarFiltros && sentSet.has(`${u}_${tipoLog}`)) {
                    continue;
                }

                let subObj;
                try { subObj = JSON.parse(subRow.Suscripcion_JSON); } catch(e) { continue; }

                const title = `👑 ¡Queda 1 hora para votar al MVP VALCYL!`;
                const bodyNotif = `¡Aún no has votado! Tienes hasta ${horaCierreStr} para elegir al MVP del partido contra ${rivalName}. ¡Entra ya y no te quedes sin tu bonus!`;
                pushTasks.push({
                    u,
                    endpoint: subRow.Endpoint,
                    idPart,
                    tipoLog,
                    title,
                    bodyNotif,
                    subObj,
                    payload: {
                        title,
                        body: bodyNotif,
                        data: { url: `/?partido=${idPart}`, id_partido: idPart }
                    }
                });
            }
        }

        if (pushTasks.length > 0) {
            const logStmts = [];
            const expiredEndpoints = [];
            await runInChunks(pushTasks, 10, async (t) => {
                const pushRes = await sendWebPushNotification(t.subObj, t.payload, env);
                logStmts.push(
                    db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                        .bind(t.u, t.tipoLog, t.title, t.bodyNotif, nowMadrid, pushRes.success ? 'ENVIADO' : `FALLIDO (${pushRes.status || pushRes.error})`)
                );
                if (pushRes.success) {
                    totalEnviadosMvp++;
                    sentSet.add(`${t.u}_${t.tipoLog}`);
                    detalleMvp.push({ usuario: t.u, tipo: 'MVP_1H', partido: t.idPart, estado: 'ENVIADO' });
                } else {
                    if (pushRes.isExpired && t.endpoint) expiredEndpoints.push(t.endpoint);
                    detalleMvp.push({ usuario: t.u, tipo: 'MVP_1H', partido: t.idPart, estado: 'FALLIDO', error: pushRes.error });
                }
            });
            await writePushLogsAndCleanup(db, logStmts, expiredEndpoints);
        }
    } catch(err) {
        console.error("Error en procesarRecordatorioMvp1Hora:", err);
    }

    return { totalEnviadosMvp, detalleMvp };
}

export async function procesarResumenViernes(db, env, body, subs, insMap, sentSet, soloAdmin, nowMadrid, permMap, clubTeams, partidos, porrasMap) {
    let totalEnviadosViernes = 0;
    let detalleViernes = [];
    const now = Date.now();
    const ignorarFiltros = Boolean(body.ignorar_filtros_prueba);
    const forzarViernes = Boolean(body.forzar_viernes || body.action === 'cron_resumen_viernes');

    try {
        const dMadrid = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
        const diaSemanaMadrid = dMadrid.getDay(); // 5 = Viernes
        const horaMadrid = dMadrid.getHours();

        const esViernesTarde = (diaSemanaMadrid === 5 && horaMadrid >= 18);

        if (!esViernesTarde && !forzarViernes) {
            return { totalEnviadosViernes: 0, detalleViernes: [] };
        }

        const fechaClave = `${dMadrid.getFullYear()}_${String(dMadrid.getMonth() + 1).padStart(2, '0')}_${String(dMadrid.getDate()).padStart(2, '0')}`;
        const claveCache = 'NOTIF_VIERNES_ENVIADO_' + fechaClave;

        if (!forzarViernes && !ignorarFiltros) {
            const yaEnviado = await db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(claveCache).first();
            if (yaEnviado) {
                return { totalEnviadosViernes: 0, detalleViernes: [] };
            }
        }

        const minFindeTs = now - (6 * 60 * 60 * 1000);
        const maxFindeTs = now + (60 * 60 * 60 * 1000);

        const partidosFinde = (partidos || []).filter(p => {
            if (!p.timestamp) return false;
            if (p.timestamp < minFindeTs || p.timestamp > maxFindeTs) return false;
            if (p.estado === 'FINALIZADO' || p.estado === 'CERRADO' || (p.oficial_sets && String(p.oficial_sets).trim() !== '')) return false;
            return true;
        });

        if (partidosFinde.length === 0 && !forzarViernes) {
            return { totalEnviadosViernes: 0, detalleViernes: [] };
        }

        const pushTasks = [];
        for (const subRow of subs) {
            const u = subRow.Usuario;
            const userIns = insMap[u] || {};
            const isUserAdmin = (userIns["Admin Web"] === "X");

            if (soloAdmin && !isUserAdmin) continue;
            if (subRow.Opciones_Viernes !== undefined && (subRow.Opciones_Viernes === 0 || subRow.Opciones_Viernes === '0' || subRow.Opciones_Viernes === false)) {
                continue;
            }

            const tipoLogUser = `VIERNES_${fechaClave}`;
            if (!ignorarFiltros && sentSet.has(`${u}_${tipoLogUser}`)) {
                continue;
            }

            const uPerm = permMap[u] || {};
            let userEqCfg = null;
            if (subRow.Equipos_Permitidos) {
                try { userEqCfg = JSON.parse(subRow.Equipos_Permitidos); } catch(e) {}
            }

            const getTeamSetting = (teamName) => {
                if (!userEqCfg || typeof userEqCfg !== 'object') return true;
                if (Array.isArray(userEqCfg)) {
                    return userEqCfg.length === 0 || userEqCfg.includes(teamName);
                }
                const val = userEqCfg[teamName];
                if (val === undefined) return true;
                if (typeof val === 'object') return val.activo !== false;
                return Boolean(val);
            };

            const userMatches = partidosFinde.filter(p => {
                const loc = p.equipo_local;
                const riv = p.rival;
                const locPerm = isUserAdmin || Boolean(uPerm[loc] && uPerm[loc].toString().toUpperCase() === 'X');
                const rivPerm = isUserAdmin || Boolean(uPerm[riv] && uPerm[riv].toString().toUpperCase() === 'X');
                if (!locPerm && !rivPerm) return false;

                const locActivo = getTeamSetting(loc);
                const rivActivo = getTeamSetting(riv);
                return locActivo || rivActivo;
            });

            if (userMatches.length === 0 && !forzarViernes) continue;

            const pendientes = userMatches.filter(p => !porrasMap[`${u}_${p.id_partido}`]);

            const equiposDelUsuario = new Set();
            userMatches.forEach(p => {
                if (clubTeams.has(p.equipo_local)) equiposDelUsuario.add(p.equipo_local);
                else if (clubTeams.has(p.rival)) equiposDelUsuario.add(p.rival);
                else equiposDelUsuario.add(p.equipo_local);
            });
            const listaEquipos = Array.from(equiposDelUsuario);
            const equiposTexto = listaEquipos.length > 0
                ? (listaEquipos.slice(0, 2).join(', ') + (listaEquipos.length > 2 ? '...' : ''))
                : 'tus equipos';

            let subObj;
            try { subObj = JSON.parse(subRow.Suscripcion_JSON); } catch(e) { continue; }

            const title = `🏐 ¡Jornada este fin de semana!`;
            const bodyNotif = pendientes.length > 0
                ? `Juegan ${equiposTexto}. Tienes ${pendientes.length} pronóstico${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''}. ¡Haz tus pronósticos en VCV Play!`
                : `Juegan ${equiposTexto}. ¡Tus pronósticos ya están listos! ¡A por la jornada!`;

            pushTasks.push({
                u,
                endpoint: subRow.Endpoint,
                tipoLogUser,
                title,
                bodyNotif,
                matchCount: userMatches.length,
                pendingCount: pendientes.length,
                subObj,
                payload: {
                    title,
                    body: bodyNotif,
                    data: { url: `/?tab=cartelera` }
                }
            });
        }

        if (pushTasks.length > 0) {
            const logStmts = [];
            const expiredEndpoints = [];
            await runInChunks(pushTasks, 10, async (t) => {
                const pushRes = await sendWebPushNotification(t.subObj, t.payload, env);
                logStmts.push(
                    db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                        .bind(t.u, t.tipoLogUser, t.title, t.bodyNotif, nowMadrid, pushRes.success ? 'ENVIADO' : `FALLIDO (${pushRes.status || pushRes.error})`)
                );
                if (pushRes.success) {
                    totalEnviadosViernes++;
                    sentSet.add(`${t.u}_${t.tipoLogUser}`);
                    detalleViernes.push({ usuario: t.u, tipo: 'RESUMEN_VIERNES', partidos: t.matchCount, pendientes: t.pendingCount, estado: 'ENVIADO' });
                } else {
                    if (pushRes.isExpired && t.endpoint) expiredEndpoints.push(t.endpoint);
                    detalleViernes.push({ usuario: t.u, tipo: 'RESUMEN_VIERNES', estado: 'FALLIDO', error: pushRes.error });
                }
            });
            await writePushLogsAndCleanup(db, logStmts, expiredEndpoints);
        }

        if (totalEnviadosViernes > 0 && !forzarViernes && !ignorarFiltros) {
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, '1', ?)")
                .bind(claveCache, Date.now()).run();
        }

    } catch(e) {
        console.error('Error procesando resumen viernes:', e);
    }

    return { totalEnviadosViernes, detalleViernes };
}

export async function handlePush(action, ctx) {
    const { db, env, body, usuario, getAuthUser } = ctx;

    if (action === 'get_vapid_public_key') {
        const pubKey = (env && env.VAPID_PUBLIC_KEY) || DEFAULT_VAPID_PUBLIC;
        return jsonResponse({ status: 'success', public_key: pubKey });
    }

    if (action === 'guardar_suscripcion_push') {
        const { suscripcion, opciones_2horas, opciones_viernes, opciones_solo_olvidos, opciones_descongelacion, opciones_mvp, equipos_config, equipos_permitidos, solo_preferencias } = body;
        if (!usuario) return jsonResponse({ status: 'error', message: 'Usuario no autenticado' }, 401);

        try {
            const op2h = (opciones_2horas !== undefined) ? (opciones_2horas ? 1 : 0) : 1;
            const opVie = (opciones_viernes !== undefined) ? (opciones_viernes ? 1 : 0) : 1;
            const opOlv = (opciones_solo_olvidos !== undefined) ? (opciones_solo_olvidos ? 1 : 0) : 0;
            const opDescong = (opciones_descongelacion !== undefined) ? (opciones_descongelacion ? 1 : 0) : 1;
            const opMvp = (opciones_mvp !== undefined) ? (opciones_mvp ? 1 : 0) : 1;
            const rawEq = (equipos_config !== undefined) ? equipos_config : equipos_permitidos;
            const eqPerm = (typeof rawEq === 'object') ? JSON.stringify(rawEq) : (typeof rawEq === 'string' ? rawEq : '{}');
            const nowIso = new Date().toISOString();

            if (solo_preferencias) {
                const runPrefUpdate = () => db.prepare(`UPDATE "Suscripciones_Push_Dispositivos" 
                    SET "Opciones_Viernes" = ?, "Opciones_2Horas" = ?, "Opciones_SoloOlvidos" = ?, "Opciones_Descongelacion" = ?, "Opciones_Mvp" = ?, "Equipos_Permitidos" = ?, "Ultima_Actualizacion" = ?
                    WHERE "Usuario" = ?`
                ).bind(opVie, op2h, opOlv, opDescong, opMvp, eqPerm, nowIso, usuario).run();
                try {
                    await runPrefUpdate();
                } catch (err) {
                    if (isSchemaMissingErr(err)) {
                        await ensureSuscripcionesPushSchema(db);
                        await runPrefUpdate();
                    } else {
                        throw err;
                    }
                }
                return jsonResponse({ status: 'success', message: 'Preferencias sincronizadas' });
            }

            if (!suscripcion) return jsonResponse({ status: 'error', message: 'Datos de suscripción requeridos' }, 400);

            let subObj = null;
            try { subObj = (typeof suscripcion === 'string') ? JSON.parse(suscripcion) : suscripcion; } catch(e){}
            const endpoint = (subObj && subObj.endpoint) ? subObj.endpoint : (usuario + '_pref_only');
            const subJson = typeof suscripcion === 'string' ? suscripcion : JSON.stringify(suscripcion);

            const subStmts = [
                db.prepare(`INSERT OR REPLACE INTO "Suscripciones_Push_Dispositivos" 
                    ("Endpoint", "Usuario", "Suscripcion_JSON", "Opciones_Viernes", "Opciones_2Horas", "Opciones_SoloOlvidos", "Opciones_Descongelacion", "Opciones_Mvp", "Equipos_Permitidos", "Ultima_Actualizacion")
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(endpoint, usuario, subJson, opVie, op2h, opOlv, opDescong, opMvp, eqPerm, nowIso),
                db.prepare(`UPDATE "Suscripciones_Push_Dispositivos" 
                    SET "Opciones_Viernes" = ?, "Opciones_2Horas" = ?, "Opciones_SoloOlvidos" = ?, "Opciones_Descongelacion" = ?, "Opciones_Mvp" = ?, "Equipos_Permitidos" = ?
                    WHERE "Usuario" = ?`
                ).bind(opVie, op2h, opOlv, opDescong, opMvp, eqPerm, usuario)
            ];

            try {
                await flushBatch(db, subStmts);
            } catch (err) {
                if (isSchemaMissingErr(err)) {
                    await ensureSuscripcionesPushSchema(db);
                    await flushBatch(db, subStmts);
                } else {
                    throw err;
                }
            }

            return jsonResponse({ status: 'success', message: 'Dispositivo y preferencias multidispositivo guardadas' });
        } catch(e) {
            return jsonResponse({ status: 'error', message: 'Error guardando suscripción: ' + e.message }, 500);
        }
    }

    if (action === 'obtener_config_push') {
        if (!usuario) return jsonResponse({ status: 'error', message: 'Usuario no autenticado' }, 401);
        const pubKey = (env && env.VAPID_PUBLIC_KEY) || DEFAULT_VAPID_PUBLIC;

        try {
            let row = null;
            let rowModo = null;
            try {
                [row, rowModo] = await Promise.all([
                    db.prepare('SELECT Endpoint, Usuario, Suscripcion_JSON, Opciones_Viernes, Opciones_2Horas, Opciones_SoloOlvidos, Opciones_Descongelacion, Opciones_Mvp, Equipos_Permitidos, Ultima_Actualizacion FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ? ORDER BY "Ultima_Actualizacion" DESC LIMIT 1').bind(usuario).first(),
                    db.prepare("SELECT valor FROM Cache_App WHERE clave = 'NOTIF_SOLO_ADMIN'").first().catch(() => null)
                ]);
            } catch (eQuery) {
                if (isSchemaMissingErr(eQuery)) {
                    await ensureSuscripcionesPushSchema(db);
                    [row, rowModo] = await Promise.all([
                        db.prepare('SELECT * FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ? ORDER BY "Ultima_Actualizacion" DESC LIMIT 1').bind(usuario).first(),
                        db.prepare("SELECT valor FROM Cache_App WHERE clave = 'NOTIF_SOLO_ADMIN'").first().catch(() => null)
                    ]);
                } else {
                    throw eQuery;
                }
            }

            let equiposCfg = {};
            if (row && row.Equipos_Permitidos) {
                try { equiposCfg = JSON.parse(row.Equipos_Permitidos); } catch(e){}
            }
            let soloAdmin = true;
            if (rowModo && rowModo.valor !== undefined) {
                soloAdmin = (rowModo.valor === 'SI' || rowModo.valor === '1' || rowModo.valor === 'true');
            }

            let config = {
                tiene_suscripcion: Boolean(row && row.Suscripcion_JSON && row.Suscripcion_JSON.length > 20),
                opciones_2horas: row ? Boolean(row.Opciones_2Horas) : true,
                opciones_viernes: row ? Boolean(row.Opciones_Viernes) : true,
                opciones_solo_olvidos: row ? Boolean(row.Opciones_SoloOlvidos) : false,
                opciones_descongelacion: (row && row.Opciones_Descongelacion !== undefined) ? Boolean(row.Opciones_Descongelacion) : true,
                opciones_mvp: (row && row.Opciones_Mvp !== undefined) ? Boolean(row.Opciones_Mvp) : true,
                equipos_config: equiposCfg,
                equipos_permitidos: Array.isArray(equiposCfg) ? equiposCfg : Object.keys(equiposCfg),
                public_key: pubKey,
                solo_admin: soloAdmin
            };
            return jsonResponse({ status: 'success', config });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === 'eliminar_suscripcion_push') {
        if (!usuario) return jsonResponse({ status: 'error', message: 'Usuario no autenticado' }, 401);
        const execDelete = () => body.endpoint
            ? db.prepare('DELETE FROM "Suscripciones_Push_Dispositivos" WHERE "Endpoint" = ?').bind(body.endpoint).run()
            : db.prepare('DELETE FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ?').bind(usuario).run();
        try {
            await execDelete();
            return jsonResponse({ status: 'success', message: 'Notificaciones desactivadas para este dispositivo' });
        } catch(e) {
            if (isSchemaMissingErr(e)) {
                try {
                    await ensureSuscripcionesPushSchema(db);
                    await execDelete();
                    return jsonResponse({ status: 'success', message: 'Notificaciones desactivadas para este dispositivo' });
                } catch(e2) {
                    return jsonResponse({ status: 'error', message: e2.message }, 500);
                }
            }
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === 'get_modo_pruebas_notif') {
        let soloAdmin = true;
        try {
            const row = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'NOTIF_SOLO_ADMIN'").first();
            if (row && row.valor !== undefined) {
                soloAdmin = (row.valor === 'SI' || row.valor === '1' || row.valor === 'true');
            }
        } catch(e) {}
        return jsonResponse({ status: 'success', solo_admin: soloAdmin });
    }

    if (action === 'set_modo_pruebas_notif') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const soloAdminVal = (body.solo_admin === true || body.solo_admin === 'SI' || body.solo_admin === 1) ? 'SI' : 'NO';
        try {
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('NOTIF_SOLO_ADMIN', ?, ?)").bind(soloAdminVal, Date.now()).run();
            return jsonResponse({ status: 'success', message: `Modo pruebas actualizado: ${soloAdminVal === 'SI' ? 'Activado (Solo Administradores)' : 'Desactivado (Todos los usuarios)'}`, solo_admin: soloAdminVal === 'SI' });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === 'enviar_push_prueba_admin') {
        try {
            const user = await getAuthUser();
            if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
            const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
            if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

            const targetUser = (body.target_usuario || usuario).trim();
            let subRows;
            try {
                ({ results: subRows } = await db.prepare('SELECT Endpoint, Suscripcion_JSON FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ?').bind(targetUser).all());
            } catch (err) {
                if (isSchemaMissingErr(err)) {
                    await ensureSuscripcionesPushSchema(db);
                    ({ results: subRows } = await db.prepare('SELECT Endpoint, Suscripcion_JSON FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ?').bind(targetUser).all());
                } else {
                    throw err;
                }
            }
            if (!subRows || subRows.length === 0) {
                return jsonResponse({ status: 'error', message: `El usuario @${targetUser} no tiene ningún dispositivo registrado aún.` }, 400);
            }

            const testPayload = {
                title: body.titulo || "🏐 Notificación de Prueba VCV Play",
                body: body.mensaje || `¡Hola @${targetUser}! Las notificaciones Push nativas funcionan correctamente en tu dispositivo.`,
                data: {
                    url: body.forzar_partido_id ? `/?partido=${body.forzar_partido_id}` : "/",
                    id_partido: body.forzar_partido_id || null
                }
            };

            const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
            const tasks = [];
            for (const row of subRows) {
                try {
                    const subObj = JSON.parse(row.Suscripcion_JSON);
                    tasks.push({ row, subObj });
                } catch(e) {}
            }

            let enviadasOk = 0;
            const errores = [];
            const logStmts = [];
            const expiredEndpoints = [];

            await runInChunks(tasks, 10, async (t) => {
                const pushRes = await sendWebPushNotification(t.subObj, testPayload, env);
                if (pushRes.success) {
                    enviadasOk++;
                    logStmts.push(
                        db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                            .bind(targetUser, 'PRUEBA_ADMIN', testPayload.title, testPayload.body, nowMadrid, 'ENVIADO')
                    );
                } else {
                    errores.push(pushRes.error || pushRes.status);
                    if (pushRes.status === 404 || pushRes.status === 410) {
                        expiredEndpoints.push(t.row.Endpoint);
                    }
                    logStmts.push(
                        db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                            .bind(targetUser, 'PRUEBA_ADMIN', testPayload.title, testPayload.body, nowMadrid, `FALLIDO (${pushRes.status || pushRes.error})`)
                    );
                }
            });

            await writePushLogsAndCleanup(db, logStmts, expiredEndpoints);

            if (enviadasOk > 0) {
                return jsonResponse({ status: 'success', message: `✅ ¡Enviada con éxito a ${enviadasOk} dispositivo(s) de @${targetUser}!` });
            } else {
                return jsonResponse({ status: 'error', message: `❌ Fallo al entregar Push (${errores.join(', ')}).` }, 502);
            }
        } catch(e) {
            return jsonResponse({ status: 'error', message: 'Error en prueba push: ' + e.message }, 500);
        }
    }

    if (action === 'cron_recordatorio_2horas' || action === 'cron_recordatorio_mvp_1hora' || action === 'cron_resumen_viernes') {
        const now = Date.now();
        const margenMinutos = parseInt(body.margen_minutos) || 121;
        const maxTs = now + (margenMinutos * 60 * 1000);
        const minTs = now + (45 * 60 * 1000);

        const [rowModo, rawPartidosRes, subsRes] = await Promise.all([
            (body.solo_admin === undefined)
                ? db.prepare("SELECT valor FROM Cache_App WHERE clave = 'NOTIF_SOLO_ADMIN'").first().catch(() => null)
                : Promise.resolve(null),
            db.prepare('SELECT * FROM "Ajustes"').all(),
            db.prepare('SELECT * FROM "Suscripciones_Push_Dispositivos" WHERE LENGTH("Suscripcion_JSON") > 20').all()
                .catch(async (err) => {
                    if (isSchemaMissingErr(err)) {
                        await ensureSuscripcionesPushSchema(db);
                        return db.prepare('SELECT * FROM "Suscripciones_Push_Dispositivos" WHERE LENGTH("Suscripcion_JSON") > 20').all();
                    }
                    throw err;
                })
        ]);

        let soloAdmin = true;
        if (rowModo && rowModo.valor !== undefined) {
            soloAdmin = (rowModo.valor === 'SI' || rowModo.valor === '1' || rowModo.valor === 'true');
        }
        if (body.solo_admin !== undefined) {
            soloAdmin = Boolean(body.solo_admin);
        }

        const rawPartidos = (rawPartidosRes && rawPartidosRes.results) || [];
        const resMap = {};
        const partidos = rawPartidos.map(r => formatMatch(r, resMap));
        const partidosById = {};
        for (const p of partidos) partidosById[p.id_partido] = p;

        let partidosObjetivo = [];
        if (action === 'cron_recordatorio_2horas') {
            if (body.forzar_partido_id) {
                partidosObjetivo = partidos.filter(p => String(p.id_partido).trim() === String(body.forzar_partido_id).trim());
            } else {
                partidosObjetivo = partidos.filter(p => p.visibilidad === 'MOSTRAR' && p.timestamp && p.timestamp >= minTs && p.timestamp <= maxTs);
            }
        }

        const subs = (subsRes && subsRes.results) || [];
        if (subs.length === 0) {
            return jsonResponse({
                status: 'success',
                message: 'No hay usuarios suscritos a notificaciones Push.',
                partidos_encontrados: partidosObjetivo.length,
                enviados: 0,
                solo_admin: soloAdmin
            });
        }

        const [permRes, insRes, porrasRes, recentLogsRes] = await Promise.all([
            db.prepare('SELECT * FROM "Permisos_Equipos"').all(),
            db.prepare('SELECT "Usuario", "Admin Web" FROM "Insignias"').all(),
            db.prepare('SELECT "Usuario", "ID Partido", "Sets" FROM "Porras"').all(),
            db.prepare('SELECT Usuario, Tipo FROM "Log_Notificaciones" WHERE "Estado" = \'ENVIADO\'').all().catch(() => ({ results: [] }))
        ]);

        const permRows = (permRes && permRes.results) || [];
        const permMap = {};
        const clubTeams = new Set();
        if (permRows.length > 0) {
            Object.keys(permRows[0]).forEach(k => {
                if (k !== 'Jugador' && k !== 'id') clubTeams.add(k);
            });
        }
        for (const pr of permRows) permMap[pr.Jugador] = pr;

        const insMap = {};
        for (const ir of (insRes && insRes.results) || []) insMap[ir.Usuario] = ir;

        const porrasMap = {};
        for (const po of (porrasRes && porrasRes.results) || []) porrasMap[`${po.Usuario}_${po["ID Partido"]}`] = po;

        const sentSet = new Set(((recentLogsRes && recentLogsRes.results) || []).map(l => `${l.Usuario}_${l.Tipo}`));

        let totalEnviados = 0;
        let detalleEnvios = [];
        const motivosOmision = [];
        const ignorarFiltros = Boolean(body.ignorar_filtros_prueba || body.forzar_partido_id);
        const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        const pushTasks2h = [];

        for (const p of partidosObjetivo) {
            const loc = p.equipo_local;
            const riv = p.rival;
            const tipoLog = `2HORAS_${p.id_partido}`;
            const isClubLoc = clubTeams.has(loc);
            const isClubRiv = clubTeams.has(riv);

            for (const subRow of subs) {
                const u = subRow.Usuario;
                const userIns = insMap[u] || {};
                const isUserAdmin = (userIns["Admin Web"] === "X");

                if (soloAdmin && !isUserAdmin) {
                    continue;
                }

                if (!ignorarFiltros && sentSet.has(`${u}_${tipoLog}`)) {
                    motivosOmision.push(`@${u}: ya se le envió hoy el recordatorio de ${p.id_partido}`);
                    continue;
                }

                const uPerm = permMap[u] || {};
                const realLocPerm = Boolean(uPerm[loc] && uPerm[loc].toString().toUpperCase() === 'X');
                const realRivPerm = Boolean(uPerm[riv] && uPerm[riv].toString().toUpperCase() === 'X');

                if (!isUserAdmin && !realLocPerm && !realRivPerm) {
                    continue;
                }

                const isDerby = Boolean(p.es_derby === true || (isClubLoc && isClubRiv) || (realLocPerm && realRivPerm));

                let userEqCfg = null;
                if (subRow.Equipos_Permitidos) {
                    try { userEqCfg = JSON.parse(subRow.Equipos_Permitidos); } catch(e) {}
                }

                const getTeamSetting = (teamName) => {
                    if (!userEqCfg || typeof userEqCfg !== 'object') return { activo: true, solo_olvidos: false };
                    if (Array.isArray(userEqCfg)) {
                        return { activo: userEqCfg.length === 0 || userEqCfg.includes(teamName), solo_olvidos: false };
                    }
                    const val = userEqCfg[teamName];
                    if (val === undefined) return { activo: true, solo_olvidos: false };
                    if (typeof val === 'object') return { activo: val.activo !== false, solo_olvidos: Boolean(val.solo_olvidos) };
                    return { activo: Boolean(val), solo_olvidos: false };
                };

                const appliesLoc = realLocPerm || (isUserAdmin && isClubLoc);
                const appliesRiv = realRivPerm || (isUserAdmin && isClubRiv);

                const locCfg = appliesLoc ? getTeamSetting(loc) : { activo: false, solo_olvidos: false };
                const rivCfg = appliesRiv ? getTeamSetting(riv) : { activo: false, solo_olvidos: false };

                if ((appliesLoc || appliesRiv) && !locCfg.activo && !rivCfg.activo) {
                    continue;
                }

                const userPred = porrasMap[`${u}_${p.id_partido}`];
                const hasPredicted = Boolean(userPred && userPred.Sets);

                const shouldSkipPredicted = (
                    (!locCfg.activo || locCfg.solo_olvidos) &&
                    (!rivCfg.activo || rivCfg.solo_olvidos)
                );

                if (!ignorarFiltros && shouldSkipPredicted && hasPredicted) {
                    motivosOmision.push(`@${u}: ya tiene predicción para ${p.id_partido} y tiene activo 'Solo si aún no tengo predicción'`);
                    continue;
                }

                let subObj;
                try { subObj = JSON.parse(subRow.Suscripcion_JSON); } catch(e) { continue; }

                const title = isDerby ? `🏐 ¡Derbi VCV en 2 horas!` : `🏐 ¡Tu partido empieza en 2 horas!`;
                const bodyNotif = isDerby
                    ? (hasPredicted
                        ? `Tu predicción (${userPred.Sets}): Derbi ${loc} vs ${riv}. ¡A punto de comenzar!`
                        : `⚠️ ¡Derbi entre tus equipos ${loc} vs ${riv}! Entra a hacer tu predicción antes de que empiece.`)
                    : (hasPredicted
                        ? `Tu predicción (${userPred.Sets}): ${loc} vs ${riv}. ¡A punto de comenzar!`
                        : `⚠️ ¡Aún no tienes predicción para el ${loc} vs ${riv}! Entra antes de que empiece.`);

                pushTasks2h.push({
                    u,
                    endpoint: subRow.Endpoint,
                    id_partido: p.id_partido,
                    tipoLog,
                    title,
                    bodyNotif,
                    subObj,
                    payload: {
                        title,
                        body: bodyNotif,
                        data: { url: `/?partido=${p.id_partido}`, id_partido: p.id_partido }
                    }
                });
            }
        }

        if (pushTasks2h.length > 0) {
            const logStmts2h = [];
            const expiredEndpoints2h = [];
            await runInChunks(pushTasks2h, 10, async (t) => {
                const pushRes = await sendWebPushNotification(t.subObj, t.payload, env);
                logStmts2h.push(
                    db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                        .bind(t.u, t.tipoLog, t.title, t.bodyNotif, nowMadrid, pushRes.success ? 'ENVIADO' : `FALLIDO (${pushRes.status || pushRes.error})`)
                );
                if (pushRes.success) {
                    totalEnviados++;
                    sentSet.add(`${t.u}_${t.tipoLog}`);
                    detalleEnvios.push({ usuario: t.u, partido: t.id_partido, estado: 'ENVIADO' });
                } else {
                    if (pushRes.isExpired && t.endpoint) expiredEndpoints2h.push(t.endpoint);
                    detalleEnvios.push({ usuario: t.u, partido: t.id_partido, estado: 'FALLIDO', error: pushRes.error });
                }
            });
            await writePushLogsAndCleanup(db, logStmts2h, expiredEndpoints2h);
        }

        const [mvpRes, resumenViernesRes] = await Promise.all([
            procesarRecordatorioMvp1Hora(db, env, body, subs, insMap, sentSet, soloAdmin, nowMadrid, partidosById),
            procesarResumenViernes(db, env, body, subs, insMap, sentSet, soloAdmin, nowMadrid, permMap, clubTeams, partidos, porrasMap)
        ]);
        totalEnviados += mvpRes.totalEnviadosMvp + resumenViernesRes.totalEnviadosViernes;
        if (mvpRes.detalleMvp && mvpRes.detalleMvp.length > 0) {
            detalleEnvios = detalleEnvios.concat(mvpRes.detalleMvp);
        }
        if (resumenViernesRes.detalleViernes && resumenViernesRes.detalleViernes.length > 0) {
            detalleEnvios = detalleEnvios.concat(resumenViernesRes.detalleViernes);
        }

        let finalMsg = totalEnviados > 0
            ? `¡Éxito! Se han enviado ${totalEnviados} notificaciones push (partidos y/o MVP 1h).`
            : (motivosOmision.length > 0
                ? `0 enviadas (${motivosOmision.join('; ')}).`
                : `Proceso completado: 0 notificaciones enviadas.`);

        return jsonResponse({
            status: 'success',
            message: finalMsg,
            partidos_encontrados: partidosObjetivo.length,
            enviados: totalEnviados,
            enviados_mvp: mvpRes.totalEnviadosMvp,
            enviados_viernes: resumenViernesRes.totalEnviadosViernes,
            solo_admin: soloAdmin,
            detalles: detalleEnvios
        });
    }

    if (action === 'obtener_log_notificaciones') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        try {
            const { results } = await db.prepare('SELECT * FROM "Log_Notificaciones" ORDER BY "ID" DESC LIMIT 50').all();
            return jsonResponse({ status: 'success', logs: results || [] });
        } catch(e) {
            if (isSchemaMissingErr(e)) {
                try {
                    await ensureLogNotificacionesSchema(db);
                    return jsonResponse({ status: 'success', logs: [] });
                } catch(e2) {
                    return jsonResponse({ status: 'error', message: e2.message }, 500);
                }
            }
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    return null;
}
