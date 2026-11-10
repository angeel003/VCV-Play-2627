// Cloudflare Pages Function: /api/vcv
// Backend nativo conectado 1:1 a las tablas exactas de Cloudflare D1

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json;charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-store"
        }
    });
}

function getMadridTimestamp(year, month, day, hour, minute) {
    const d = new Date(Date.UTC(year, month, day, hour, minute));
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const formatted = formatter.format(d);
    const match = formatted.match(/(\d\d)\/(\d\d)\/(\d{4}), (\d\d):(\d\d):(\d\d)/);
    if (!match) return d.getTime();
    const diffMs = Date.UTC(parseInt(match[3]), parseInt(match[2])-1, parseInt(match[1]), parseInt(match[4])) - Date.UTC(year, month, day, hour);
    return d.getTime() - diffMs;
}


// ============================================================================
// 🔔 SISTEMA WEB PUSH (RFC 8291 / RFC 8292) - 100% WEB CRYPTO NATIVO
// ============================================================================

const DEFAULT_VAPID_PUBLIC = "BC2qOrSTAHeNqSis_RChG_ycGZ0SY1bTIgJbRr7etA9D6z0XgIZqNdR-1jwLn99sKtaJvuganWgIwUnFRUYd_1U";
const DEFAULT_VAPID_PRIVATE = "RdKwpMLygVN-810zd21qVNUx93NKqMGmqL8CQmuCLvE";
const DEFAULT_VAPID_SUBJECT = "mailto:soporte@vcvplay.com";

function b64url(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str) {
    str = (str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function vapidToJwk(pubBytes, privBytes) {
    return {
        kty: "EC",
        crv: "P-256",
        x: b64url(pubBytes.slice(1, 33)),
        y: b64url(pubBytes.slice(33, 65)),
        d: b64url(privBytes),
        ext: true
    };
}

async function createVapidHeader(audience, subject, pubKeyBytes, privKeyBytes) {
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

async function encryptPayloadAes128Gcm(subscriberP256dhBase64, subscriberAuthBase64, payloadString) {
    const subscriberPubBytes = fromB64url(subscriberP256dhBase64);
    const subscriberAuthBytes = fromB64url(subscriberAuthBase64);

    const localKeyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"]
    );
    const localRawPub = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
    const localPubBytes = new Uint8Array(localRawPub);

    // Importar directamente como clave pública ANSI X9.62 ECDH cruda (65 bytes)
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

    // RFC 8291 3.4: HKDF-Extract(salt = auth_secret, IKM = ecdh_secret)
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

async function sendWebPushNotification(subObj, payloadObj, env) {
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


// ==============================================================================
// GESTIÓN DE CONTRASEÑAS SEGURAS (PBKDF2 SHA-256 + LAZY MIGRATION)
// ==============================================================================
async function hashPassword(password) {
    if (!password) return "";
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return 'v1$' + saltHex + '$' + hashHex;
}

async function verifyPasswordHash(password, storedHash) {
    if (!password || !storedHash) return false;
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'v1') return false;
    const saltHex = parts[1];
    const originalHashHex = parts[2];
    const match = saltHex.match(/.{1,2}/g);
    if (!match) return false;
    const salt = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hashHex.length !== originalHashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < hashHex.length; i++) {
        diff |= (hashHex.charCodeAt(i) ^ originalHashHex.charCodeAt(i));
    }
    return diff === 0;
}

async function verifyAndMigrateUser(db, usuario, password) {
    if (!usuario || !password) return null;
    const userRow = await db.prepare('SELECT * FROM "Usuarios" WHERE "Usuario" = ?').bind(usuario).first();
    if (!userRow) return null;

    const storedPwd = (userRow.Password || "").toString().trim();
    const inputPwd = password.toString().trim();

    // 1. Si la contraseña ya está en formato hash v1$
    if (storedPwd.startsWith("v1$")) {
        const isValid = await verifyPasswordHash(inputPwd, storedPwd);
        return isValid ? userRow : null;
    }

    // 2. Si es contraseña legacy en texto plano
    if (storedPwd === inputPwd) {
        // MIGRACIÓN PEREZOSA (Lazy Migration): Generar hash y actualizar D1 de inmediato
        try {
            const newHashed = await hashPassword(inputPwd);
            await db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(newHashed, usuario).run();
            userRow.Password = newHashed;
        } catch(e) {
            console.error("Error en lazy migration de contraseña:", e);
        }
        return userRow;
    }

    return null;
}

function runInBg(context, promise) {
    const p = Promise.resolve(promise).catch(e => console.warn("BG task error:", e));
    if (context && typeof context.waitUntil === 'function') {
        context.waitUntil(p);
    }
    return p;
}

async function isModoMantenimientoActivo(db) {
    try {
        const row = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'MODO_MANTENIMIENTO'").first();
        if (!row) {
            // Por defecto activo inicialmente para permitir verificación del administrador
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('MODO_MANTENIMIENTO', '1', ?)")
                .bind(Date.now()).run();
            return true;
        }
        return row.valor === '1';
    } catch(e) {
        try {
            await db.prepare('CREATE TABLE IF NOT EXISTS "Cache_App" ("clave" TEXT PRIMARY KEY, "valor" TEXT, "timestamp" INTEGER)').run();
            const rowRetry = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'MODO_MANTENIMIENTO'").first();
            if (!rowRetry) {
                await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('MODO_MANTENIMIENTO', '1', ?)")
                    .bind(Date.now()).run();
                return true;
            }
            return rowRetry.valor === '1';
        } catch(e2) {
            console.error("Error comprobando modo mantenimiento:", e2);
            return true;
        }
    }
}

function isSchemaMissingErr(err) {
    return /no such (column|table)/i.test(String(err && err.message || err || ''));
}

async function flushBatch(db, stmts, chunkSize = 50) {
    if (!stmts || stmts.length === 0) return;
    if (stmts.length === 1) {
        await stmts[0].run();
        return;
    }
    for (let i = 0; i < stmts.length; i += chunkSize) {
        await db.batch(stmts.slice(i, i + chunkSize));
    }
}

async function runInChunks(items, chunkSize, fn) {
    const out = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const settled = await Promise.allSettled(chunk.map(fn));
        out.push(...settled);
    }
    return out;
}

async function ensureSuscripcionesPushSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Suscripciones_Push_Dispositivos" (
        "Endpoint" TEXT PRIMARY KEY, "Usuario" TEXT NOT NULL, "Suscripcion_JSON" TEXT NOT NULL, "Opciones_Viernes" INTEGER DEFAULT 1, "Opciones_2Horas" INTEGER DEFAULT 1, "Opciones_SoloOlvidos" INTEGER DEFAULT 0, "Opciones_Descongelacion" INTEGER DEFAULT 1, "Opciones_Mvp" INTEGER DEFAULT 1, "Equipos_Permitidos" TEXT DEFAULT '{}', "Ultima_Actualizacion" TEXT
    )`).run();
    await Promise.allSettled([
        db.prepare('ALTER TABLE "Suscripciones_Push_Dispositivos" ADD COLUMN "Opciones_Descongelacion" INTEGER DEFAULT 1').run(),
        db.prepare('ALTER TABLE "Suscripciones_Push_Dispositivos" ADD COLUMN "Opciones_Mvp" INTEGER DEFAULT 1').run()
    ]);
}

async function ensureNotificacionesSchema(db) {
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

async function ensureLogNotificacionesSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Notificaciones" (
        "ID" INTEGER PRIMARY KEY AUTOINCREMENT, "Usuario" TEXT, "Tipo" TEXT, "Titulo" TEXT, "Mensaje" TEXT, "Fecha" TEXT, "Estado" TEXT
    )`).run();
}

async function ensureSugerenciasSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Sugerencias_Errores" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "usuario" TEXT NOT NULL,
        "tipo" TEXT NOT NULL,
        "mensaje" TEXT NOT NULL,
        "fecha_hora" TEXT NOT NULL,
        "timestamp" INTEGER NOT NULL,
        "estado" TEXT DEFAULT 'PENDIENTE'
    )`).run();
}

async function ensureMonitorSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Monitor_Usuarios" ("usuario" TEXT PRIMARY KEY, "activo" INTEGER DEFAULT 1, "fecha_alta" TEXT, "notas" TEXT)`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Accesos" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "usuario" TEXT, "fecha_hora" TEXT, "timestamp" INTEGER, "origen" TEXT, "dispositivo" TEXT)`).run();
    try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_log_accesos_user_ts ON "Log_Accesos" ("usuario", "timestamp" DESC)`).run(); } catch(e) {}
}

async function ensureMvpVotosSchema(db) {
    await db.prepare('CREATE TABLE IF NOT EXISTS "MVP_Votos" (id_partido TEXT, usuario TEXT, jugador TEXT, timestamp INTEGER, fecha_hora TEXT, PRIMARY KEY (id_partido, usuario))').run();
    try { await db.prepare('ALTER TABLE "MVP_Votos" ADD COLUMN "fecha_hora" TEXT').run(); } catch(e) {}
}

async function ensureResultadosMvpSchema(db) {
    const alters = [
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_por" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_fecha" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_candidatos" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_oficial" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_stats" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_proclamado_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_visible" INTEGER DEFAULT 1',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_cierre_votacion_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_publicacion_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_votos_recuento" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_mostrar_porcentajes" INTEGER DEFAULT 1'
    ];
    await Promise.allSettled(alters.map(sql => db.prepare(sql).run()));
}

async function writePushLogsAndCleanup(db, logStmts, expiredEndpoints) {
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

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}

async function broadcastPushToAll(db, env, { title, body, url, tipo }) {
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

async function crearNotificacion(db, { titulo, mensaje, tipo = 'Aviso', importancia = 'ALTA', visibilidad = 'MOSTRAR', activa = 1 }) {
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

function getLunesSemanaClave(date = new Date()) {
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

async function verificarDescongelacionAutomatica(db, env, context, preloaded = {}) {
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

        // Limpiar si viene preloaded y expiró aunque no sea lunes
        let freezeOverride = preloaded.hasOverride ? parseOverrideRow(preloaded.overrideRow) : undefined;

        // La descongelación automática ÚNICAMENTE debe dispararse los LUNES (utcDay === 1) a partir de las 18:00 hora peninsular española
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
        if (hourMadrid < 18) {
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

        // Si el admin ya lo ha descongelado manualmente (override UNFREEZE), o está en FREEZE forzado, no ejecutar
        if (freezeOverride === 'FREEZE' || freezeOverride === 'UNFREEZE') {
            return false;
        }

        // Lunes >= 18:00: clasificaciones descongeladas
        const lunesClave = getLunesSemanaClave(now);
        const autoKey = 'AUTO_UNFREEZE_' + lunesClave;

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

        // Marcar en Cache_App para evitar duplicados concurrentes
        await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(autoKey, 'DONE_AUTO_' + Date.now(), Date.now()).run();

        // Desactivar notificaciones anteriores de descongelación
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

async function getNotificacionesPublicas(db, env = null, context = null, preloaded = {}) {
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

async function procesarRecordatorioMvp1Hora(db, env, body = {}, subs = [], insMap = {}, sentSet = new Set(), soloAdmin = false, nowMadrid = '', partidosById = null) {
    let totalEnviadosMvp = 0;
    let detalleMvp = [];
    const now = Date.now();
    const ignorarFiltros = Boolean(body.ignorar_filtros_prueba || body.forzar_partido_id);

    try {
        // Buscar partidos que tengan votación MVP activa y hora de cierre programada
        const { results: roList } = await db.prepare('SELECT "ID Partido" as id_partido, mvp_cierre_votacion_ts, mvp_publicacion_ts, mvp_visible, mvp_candidatos, mvp_oficial FROM "Resultados_Oficiales" WHERE "mvp_visible" = 1 AND LENGTH("mvp_candidatos") > 5 AND "mvp_cierre_votacion_ts" > 0').all();

        if (!roList || roList.length === 0) return { totalEnviadosMvp: 0, detalleMvp: [] };

        const eligibleRos = [];
        for (const ro of roList) {
            // Si ya hay ganador oficial proclamado, la votación ya concluyó
            if (ro.mvp_oficial && String(ro.mvp_oficial).trim() !== '') continue;

            const idPart = ro.id_partido;
            const cierreTs = parseInt(ro.mvp_cierre_votacion_ts) || 0;
            if (cierreTs <= 0) continue;

            const diffMs = cierreTs - now;
            // Ventana de 1 hora: entre 65 minutos y 5 minutos antes del cierre (o forzado para prueba)
            const enVentana1Hora = (diffMs <= 65 * 60 * 1000 && diffMs >= 5 * 60 * 1000);
            const forzarEstePartido = body.forzar_partido_id && (String(body.forzar_partido_id).trim() === String(idPart).trim());
            if (!enVentana1Hora && !forzarEstePartido) continue;

            eligibleRos.push({ ro, idPart, cierreTs });
        }

        if (eligibleRos.length === 0) return { totalEnviadosMvp: 0, detalleMvp: [] };

        // Leer votos de todos los partidos elegibles en paralelo (y reutilizar partidosById si ya está cargado)
        const votedSets = await Promise.all(eligibleRos.map(async (item) => {
            const matchPromise = (partidosById && partidosById[item.idPart])
                ? Promise.resolve(partidosById[item.idPart])
                : db.prepare('SELECT "Rival" FROM "Ajustes" WHERE "ID_Partido" = ?').bind(item.idPart).first();
            const votesPromise = db.prepare('SELECT DISTINCT usuario FROM "MVP_Votos" WHERE id_partido = ?').bind(item.idPart).all();
            const [mMatch, votesRes] = await Promise.all([matchPromise, votesPromise]);
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


async function procesarResumenViernes(db, env, body, subs, insMap, sentSet, soloAdmin, nowMadrid, permMap, clubTeams, partidos, porrasMap) {
    let totalEnviadosViernes = 0;
    let detalleViernes = [];
    const now = Date.now();
    const ignorarFiltros = Boolean(body.ignorar_filtros_prueba);
    const forzarViernes = Boolean(body.forzar_viernes || body.action === 'cron_resumen_viernes');

    try {
        // Comprobar si en hora peninsular (Europe/Madrid) es viernes >= 18:00
        const dMadrid = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
        const diaSemanaMadrid = dMadrid.getDay(); // 5 = Viernes
        const horaMadrid = dMadrid.getHours();

        const esViernesTarde = (diaSemanaMadrid === 5 && horaMadrid >= 18);

        if (!esViernesTarde && !forzarViernes) {
            return { totalEnviadosViernes: 0, detalleViernes: [] };
        }

        // Clave única para hoy en Cache_App (evita duplicar el aviso del mismo viernes)
        const fechaClave = `${dMadrid.getFullYear()}_${String(dMadrid.getMonth() + 1).padStart(2, '0')}_${String(dMadrid.getDate()).padStart(2, '0')}`;
        const claveCache = 'NOTIF_VIERNES_ENVIADO_' + fechaClave;

        if (!forzarViernes && !ignorarFiltros) {
            const yaEnviado = await db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(claveCache).first();
            if (yaEnviado) {
                return { totalEnviadosViernes: 0, detalleViernes: [] };
            }
        }

        // Buscar partidos que se jueguen este fin de semana (desde viernes tarde hasta domingo 23:59:59)
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

        // Marcar en Cache_App que hoy ya se envió
        if (totalEnviadosViernes > 0 && !forzarViernes && !ignorarFiltros) {
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, '1', ?)")
                .bind(claveCache, Date.now()).run();
        }

    } catch(e) {
        console.error('Error procesando resumen viernes:', e);
    }

    return { totalEnviadosViernes, detalleViernes };
}

export async function onRequestGet(context) {
    const { request, env } = context;
    try {
        const url = new URL(request.url);
        const cronParam = url.searchParams.get("cron") || url.searchParams.get("action");
        if (cronParam === "2horas" || cronParam === "cron_recordatorio_2horas" || cronParam === "mvp" || cronParam === "mvp_1hora" || cronParam === "viernes" || cronParam === "cron_resumen_viernes") {
            let targetAction = "cron_recordatorio_2horas";
            if (cronParam === "mvp" || cronParam === "mvp_1hora") targetAction = "cron_recordatorio_mvp_1hora";
            else if (cronParam === "viernes" || cronParam === "cron_resumen_viernes") targetAction = "cron_resumen_viernes";
            const fakeContext = {
                request: new Request(request.url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: targetAction })
                }),
                env: env,
                waitUntil: (typeof context.waitUntil === 'function') ? context.waitUntil.bind(context) : undefined
            };
            return await onRequestPost(fakeContext);
        }
    } catch(e) {}
    return jsonResponse({ status: "ok", message: "VCV Cloudflare D1 API is online." });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const db = env.DB;

    if (!db) {
        return jsonResponse({ status: "error", message: "Error interno: Base de datos D1 no conectada." }, 500);
    }

    let body = {};
    try {
        body = await request.json();
    } catch(e) {
        try {
            const text = await request.text();
            body = JSON.parse(text);
        } catch(e2) {
            body = {};
        }
    }

    const action = body.action || "";
    const usuario = (body.usuario || "").trim();
    const password = (body.password || "").trim();

    let authUserCache = undefined;
    async function getAuthUser(targetU = usuario, targetP = password) {
        if (!targetU || !targetP) return null;
        if (targetU === usuario && targetP === password && authUserCache !== undefined) {
            return authUserCache;
        }
        const res = await verifyAndMigrateUser(db, targetU, targetP);
        if (targetU === usuario && targetP === password) {
            authUserCache = res;
        }
        return res;
    }

    // 1. PING & MIGRACIONES / ÍNDICES
    if (action === 'migrate_db' || action === 'apply_indexes') {
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Genero TEXT DEFAULT 'M'").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Avatar TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Avatar_Url TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Permiso_MVP TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Permiso_Resultados TEXT").run(); } catch(e) {}
        try { await db.prepare("CREATE TABLE IF NOT EXISTS Plantilla_Superliga (dorsal INTEGER PRIMARY KEY, nombre TEXT, apodo TEXT, posicion TEXT)").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Plantilla_Superliga ADD COLUMN apodo TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Plantilla_Superliga ADD COLUMN posicion TEXT").run(); } catch(e) {}
        try { await db.prepare("CREATE TABLE IF NOT EXISTS MVP_Votos (id_partido TEXT, usuario TEXT, jugador TEXT, timestamp INTEGER, fecha_hora TEXT, PRIMARY KEY (id_partido, usuario))").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE MVP_Votos ADD COLUMN fecha_hora TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_candidatos TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_oficial TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_stats TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_proclamado_ts INTEGER").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_cierre_votacion_ts INTEGER").run(); } catch(e) {}
        try { await db.prepare('UPDATE "Resultados_Oficiales" SET "mvp_cierre_votacion_ts" = "mvp_publicacion_ts" - (3 * 3600000) WHERE ("mvp_cierre_votacion_ts" IS NULL OR "mvp_cierre_votacion_ts" = 0) AND "mvp_publicacion_ts" > 0').run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_publicacion_ts INTEGER").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_votos_recuento TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_mostrar_porcentajes INTEGER DEFAULT 1").run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_por" TEXT').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_ts" INTEGER').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_fecha" TEXT').run(); } catch(e) {}

        // Tablas silenciosas de auditoría y monitorización de accesos
        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Monitor_Usuarios" (
                "usuario" TEXT PRIMARY KEY,
                "activo" INTEGER DEFAULT 1,
                "fecha_alta" TEXT,
                "notas" TEXT
            )`).run();
        } catch(e) {}
        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Accesos" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "usuario" TEXT,
                "fecha_hora" TEXT,
                "timestamp" INTEGER,
                "origen" TEXT,
                "dispositivo" TEXT
            )`).run();
            await db.prepare(`CREATE INDEX IF NOT EXISTS idx_log_accesos_user_ts ON "Log_Accesos" ("usuario", "timestamp" DESC)`).run();
        } catch(e) {}
        // Sincronización automática de fechas/horas/lugares oficiales (21/10/2026)
        try {
            const syncMatchesStmts = [
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '25/10/2026 12:30', "timestamp" = 1792927800000, "Pabellon" = 'PILAR FDEZ VALDERRAMA' WHERE "ID_Partido" = 'RFEVB_2555'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/02/2027 12:45', "timestamp" = 1802000700000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2623'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '06/02/2027 16:00', "timestamp" = 1801926000000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2755'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '31/10/2026 16:00', "timestamp" = 1793458800000 WHERE "ID_Partido" = 'RFEVB_2561'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '19/12/2026 18:30', "timestamp" = 1797701400000 WHERE "ID_Partido" = 'RFEVB_2753'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 10:30', "timestamp" = 1797154200000, "Pabellon" = 'P. San Antonio, Ávila' WHERE "ID_Partido" = 'FVCL_2F005'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 13:00', "timestamp" = 1806836400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2F007'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 13:30', "timestamp" = 1800793800000, "Pabellon" = 'Pabellón Escuela Juvenil Castilla' WHERE "ID_Partido" = 'FVCL_2F008'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2F014'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 12:30', "timestamp" = 1797161400000, "Pabellon" = 'P. San Antonio, Ávila' WHERE "ID_Partido" = 'FVCL_2M005_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 15:00', "timestamp" = 1806843600000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2M007_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 17:00', "timestamp" = 1800806400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID', "Equipo_Local" = 'VCV Meseta', "Rival" = 'Pegamo Abanto', "Ubicacion" = 'LOCAL' WHERE "ID_Partido" = 'FVCL_2M008'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '31/01/2027 20:00', "timestamp" = 1801422000000, "Pabellon" = 'POLIDEPORTIVO, JULIÁN SÁNCHEZ EL CHARRO, SALAMANCA' WHERE "ID_Partido" = 'FVCL_2M009_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2M014_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '20/11/2026 17:00', "timestamp" = 1795190400000, "Pabellon" = 'CAMPO DE LA JUVENTUD' WHERE "ID_Partido" = 'RFEVB_2715'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/11/2026 18:30', "timestamp" = 1794072600000, "Pabellon" = 'Pabellón Enrique Serichol, Segovia' WHERE "ID_Partido" = 'FVCL_2M003_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '28/11/2026 17:00', "timestamp" = 1795881600000, "Pabellon" = 'Polideportivo Cristo Rey, Valladolid' WHERE "ID_Partido" = 'FVCL_2F004'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '28/11/2026 19:00', "timestamp" = 1795888800000, "Pabellon" = 'Polideportivo Cristo Rey, Valladolid' WHERE "ID_Partido" = 'FVCL_2M004_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '06/03/2027 20:00', "timestamp" = 1804359600000, "Pabellon" = 'P. Pajaritos Sur' WHERE "ID_Partido" = 'FVCL_2M011_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/03/2027 14:00', "timestamp" = 1804424400000, "Pabellon" = 'P. Pajaritos Sur' WHERE "ID_Partido" = 'FVCL_2F011'`),
                db.prepare(`UPDATE "Ajustes" SET "Pabellon" = 'Campus Deportivo Fuente la Mora' WHERE "ID_Partido" = 'RFEVB_2583'`)
            ];
            await flushBatch(db, syncMatchesStmts);
        } catch(e) { console.error("Error sincronizando ajustes:", e); }

        // Sembrar plantilla inicial si está vacía
        try {
            await db.prepare('CREATE TABLE IF NOT EXISTS Plantilla_Superliga_2_Masc (id INTEGER PRIMARY KEY AUTOINCREMENT, dorsal INTEGER NOT NULL, nombre TEXT NOT NULL, apodo TEXT, posicion TEXT, usuario TEXT, fecha_alta INTEGER)').run();
            const countRow = await db.prepare("SELECT COUNT(*) as c FROM Plantilla_Superliga_2_Masc").first();
            if (!countRow || countRow.c === 0) {
                const initialPlayers = [
                    [1, "Jorge Alonso Rivas", "Jorge", "Colocador"],
                    [2, "Samuel Cabañeros Rodríguez", "Samuel", "Receptor"],
                    [3, "Iker de León Rodríguez", "Iker", "Central"],
                    [6, "Sergio Alonso Rivas", "Alonso", "Líbero"],
                    [7, "Álvaro Novella Gutiérrez", "Álvaro", "Opuesto"],
                    [8, "Manuel Posadas Yenes", "Manu", "Receptor"],
                    [9, "Alejandro Bertrán Catalina", "Alejandro", "Central"],
                    [10, "Alejandro González Fernández", "Jany Jr", "Colocador"],
                    [11, "Nikola Biserov Nankov", "Nikola", "Central"],
                    [16, "Eduardo Valverde Lorenzo", "Edu", "Líbero"],
                    [18, "Enrique Carrasco Alvarado", "Kike", "Receptor"],
                    [21, "Fabián Corona Mediavilla", "Fabián", "Opuesto"],
                    [23, "Álvaro García de Castro", "Álvaro G.", "Receptor"],
                    [24, "Kaloyan Biserov Nankov", "Kaloyan", "Central"]
                ];
                const seedTs = Date.now();
                const seedStmts = initialPlayers.map(([dor, nom, apod, pos]) =>
                    db.prepare("INSERT INTO Plantilla_Superliga_2_Masc (dorsal, nombre, apodo, posicion, usuario, fecha_alta) VALUES (?, ?, ?, ?, NULL, ?)").bind(dor, nom, apod, pos, seedTs)
                );
                await flushBatch(db, seedStmts);
            }
        } catch(e) {}

        // Sembrar regla Porcentaje Extra MVP si no existe
        try {
            await db.prepare('INSERT OR IGNORE INTO "Reglas_Puntuacion" ("Regla", "Puntos") VALUES (\'Porcentaje Extra MVP\', \'10\')').run();
        } catch(e) {}

        const indexQueries = [
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_usuario ON "Usuarios"("Usuario")',
            'CREATE INDEX IF NOT EXISTS idx_usuarios_login ON "Usuarios"("Usuario", "Password")',
            'CREATE INDEX IF NOT EXISTS idx_ajustes_id_partido ON "Ajustes"("ID_Partido")',
            'CREATE INDEX IF NOT EXISTS idx_ajustes_vis_ts ON "Ajustes"("Visibilidad", "timestamp")',
            'CREATE INDEX IF NOT EXISTS idx_ajustes_estado ON "Ajustes"("Estado")',
            'CREATE INDEX IF NOT EXISTS idx_porras_usuario ON "Porras"("Usuario")',
            'CREATE INDEX IF NOT EXISTS idx_porras_usuario_partido ON "Porras"("Usuario", "ID Partido")',
            'CREATE INDEX IF NOT EXISTS idx_porras_id_partido ON "Porras"("ID Partido")',
            'CREATE INDEX IF NOT EXISTS idx_pred_secretas_usuario ON "Predicciones_Secretas"("Usuario")',
            'CREATE INDEX IF NOT EXISTS idx_pred_secretas_usuario_equipo ON "Predicciones_Secretas"("Usuario", "Equipo")',
            'CREATE INDEX IF NOT EXISTS idx_insignias_usuario ON "Insignias"("Usuario")',
            'CREATE INDEX IF NOT EXISTS idx_ligas_jugador ON "Ligas"("Jugador")',
            'CREATE INDEX IF NOT EXISTS idx_permisos_equipos_jugador ON "Permisos_Equipos"("Jugador")',
            'CREATE INDEX IF NOT EXISTS idx_permisos_secreta_usuario ON "Permisos_Secreta"("Usuario")',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_resultados_id_partido ON "Resultados_Oficiales"("ID Partido")',
            'CREATE INDEX IF NOT EXISTS idx_notificaciones_vis_ts ON "Notificaciones"("Visibilidad", "timestamp", "ID")',
            'CREATE INDEX IF NOT EXISTS idx_peticiones_nombre_estado ON "Peticiones_Nombre"("Estado")',
            'CREATE INDEX IF NOT EXISTS idx_peticiones_insignias_estado ON "Peticiones_Insignias"("Estado")',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_app_clave ON "Cache_App"("clave")',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_ligas_config_liga ON "Ligas_Config"("Liga")',
            'CREATE INDEX IF NOT EXISTS idx_mvp_votos_partido ON "MVP_Votos"("id_partido")',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_mvp_votos_partido_usuario ON "MVP_Votos"("id_partido", "usuario")',
            'CREATE INDEX IF NOT EXISTS idx_mvp_votos_usuario ON "MVP_Votos"("usuario")',
            'CREATE INDEX IF NOT EXISTS idx_plantilla_dorsal ON "Plantilla_Superliga_2_Masc"("dorsal")',
            'CREATE INDEX IF NOT EXISTS idx_plantilla_usuario ON "Plantilla_Superliga_2_Masc"("usuario")',
            'CREATE INDEX IF NOT EXISTS idx_ajustes_ts ON "Ajustes"("timestamp" ASC)',
            'CREATE INDEX IF NOT EXISTS idx_peticiones_insignias_id ON "Peticiones_Insignias"("id_peticion")',
            'CREATE INDEX IF NOT EXISTS idx_peticiones_insignias_usuario ON "Peticiones_Insignias"("Usuario")',
            'CREATE INDEX IF NOT EXISTS idx_peticiones_nombre_usuario ON "Peticiones_Nombre"("Usuario Actual")',
            'CREATE INDEX IF NOT EXISTS idx_usuarios_orden ON "Usuarios"("Usuario" ASC)',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_monitor_usuarios_user ON "Monitor_Usuarios"("usuario")',
            'CREATE INDEX IF NOT EXISTS idx_monitor_usuarios_activo ON "Monitor_Usuarios"("activo")',
            'CREATE INDEX IF NOT EXISTS idx_log_accesos_user_ts ON "Log_Accesos"("usuario", "timestamp" DESC)',
            'CREATE INDEX IF NOT EXISTS idx_log_accesos_ts ON "Log_Accesos"("timestamp" DESC)',
            'CREATE INDEX IF NOT EXISTS idx_push_disp_usuario ON "Suscripciones_Push_Dispositivos"("Usuario")',
            'CREATE INDEX IF NOT EXISTS idx_push_disp_2h ON "Suscripciones_Push_Dispositivos"("Opciones_2Horas")',
            'CREATE INDEX IF NOT EXISTS idx_log_notif_estado ON "Log_Notificaciones"("Estado", "Usuario", "Tipo")'
        ];
        const created = [];
        const errors = [];
        for (const iq of indexQueries) {
            try { 
                await db.prepare(iq).run(); 
                const match = iq.match(/INDEX IF NOT EXISTS\s+([^\s]+)/i);
                if (match) created.push(match[1]);
            } catch(e) {
                errors.push(e.message);
            }
        }

        // Obtener lista real de índices existentes en sqlite_master
        let existingIndexes = [];
        try {
            const { results: idxRows } = await db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'").all();
            existingIndexes = idxRows || [];
        } catch(e) {}

        return jsonResponse({
            status: 'success', 
            message: `¡Base de datos totalmente optimizada! (${existingIndexes.length} índices activos en D1).`,
            indices_activos: existingIndexes.length,
            lista: existingIndexes
        });
    }
    if (action === "sync_official_matches_now") {
        try {
            await flushBatch(db, [
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '25/10/2026 12:30', "timestamp" = 1792927800000, "Pabellon" = 'PILAR FDEZ VALDERRAMA' WHERE "ID_Partido" = 'RFEVB_2555'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/02/2027 12:45', "timestamp" = 1802000700000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2623'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '06/02/2027 16:00', "timestamp" = 1801926000000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2755'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 10:30', "timestamp" = 1797154200000, "Pabellon" = 'P. San Antonio, Ávila' WHERE "ID_Partido" = 'FVCL_2F005'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 13:00', "timestamp" = 1806836400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2F007'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 13:30', "timestamp" = 1800793800000, "Pabellon" = 'Pabellón Escuela Juvenil Castilla' WHERE "ID_Partido" = 'FVCL_2F008'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2F014'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 12:30', "timestamp" = 1797161400000, "Pabellon" = 'P. San Antonio, Ávila' WHERE "ID_Partido" = 'FVCL_2M005_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 15:00', "timestamp" = 1806843600000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2M007_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 17:00', "timestamp" = 1800806400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID', "Equipo_Local" = 'VCV Meseta', "Rival" = 'Pegamo Abanto', "Ubicacion" = 'LOCAL' WHERE "ID_Partido" = 'FVCL_2M008'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '31/01/2027 20:00', "timestamp" = 1801422000000, "Pabellon" = 'POLIDEPORTIVO, JULIÁN SÁNCHEZ EL CHARRO, SALAMANCA' WHERE "ID_Partido" = 'FVCL_2M009_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2M014_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '20/11/2026 17:00', "timestamp" = 1795190400000, "Pabellon" = 'CAMPO DE LA JUVENTUD' WHERE "ID_Partido" = 'RFEVB_2715'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/11/2026 18:30', "timestamp" = 1794072600000, "Pabellon" = 'Pabellón Enrique Serichol, Segovia' WHERE "ID_Partido" = 'FVCL_2M003_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '28/11/2026 17:00', "timestamp" = 1795881600000, "Pabellon" = 'Polideportivo Cristo Rey, Valladolid' WHERE "ID_Partido" = 'FVCL_2F004'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '28/11/2026 19:00', "timestamp" = 1795888800000, "Pabellon" = 'Polideportivo Cristo Rey, Valladolid' WHERE "ID_Partido" = 'FVCL_2M004_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '06/03/2027 20:00', "timestamp" = 1804359600000, "Pabellon" = 'P. Pajaritos Sur' WHERE "ID_Partido" = 'FVCL_2M011_MES'`),
                db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/03/2027 14:00', "timestamp" = 1804424400000, "Pabellon" = 'P. Pajaritos Sur' WHERE "ID_Partido" = 'FVCL_2F011'`)
            ]);
            return jsonResponse({ status: "success", message: "Todos los partidos han sido sincronizados en la base de datos." });
        } catch(err) {
            return jsonResponse({ status: "error", message: err.message }, 500);
        }
    }
    // ADMIN: OBTENER LISTA DE MONITORIZACIÓN Y SUS ACCESOS
    if (action === "get_monitor_data") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { target_user } = body;
        const fetchMonitor = async () => {
            if (target_user) {
                const [vRes, lRes] = await Promise.all([
                    db.prepare('SELECT * FROM "Monitor_Usuarios" ORDER BY "usuario" ASC').all(),
                    db.prepare('SELECT * FROM "Log_Accesos" WHERE "usuario" = ? ORDER BY "timestamp" DESC LIMIT 100').bind(target_user).all()
                ]);
                return { vigilados: (vRes && vRes.results) || [], logs: (lRes && lRes.results) || [] };
            }
            const { results: vigilados } = await db.prepare('SELECT * FROM "Monitor_Usuarios" ORDER BY "usuario" ASC').all();
            let logs = [];
            if (vigilados && vigilados.length > 0) {
                const { results: l } = await db.prepare('SELECT * FROM "Log_Accesos" WHERE "usuario" = ? ORDER BY "timestamp" DESC LIMIT 100').bind(vigilados[0].usuario).all();
                logs = l || [];
            }
            return { vigilados: vigilados || [], logs };
        };

        try {
            let data;
            try {
                data = await fetchMonitor();
            } catch(err) {
                if (isSchemaMissingErr(err)) {
                    await ensureMonitorSchema(db);
                    data = await fetchMonitor();
                } else {
                    throw err;
                }
            }
            return jsonResponse({ status: 'success', vigilados: data.vigilados, logs: data.logs });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    // ADMIN: AÑADIR O QUITAR USUARIO DE LA LISTA DE MONITORIZACIÓN
    if (action === "toggle_monitor_user") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { target_user, activo, remove } = body;
        if (!target_user) return jsonResponse({ status: 'error', message: 'Falta usuario objetivo' }, 400);

        const execToggle = async () => {
            if (remove) {
                await db.prepare('DELETE FROM "Monitor_Usuarios" WHERE "usuario" = ?').bind(target_user).run();
                return jsonResponse({ status: 'success', message: `Usuario @${target_user} eliminado del monitor silencioso.` });
            }
            const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
            await db.prepare('INSERT INTO "Monitor_Usuarios" ("usuario", "activo", "fecha_alta") VALUES (?, ?, ?) ON CONFLICT("usuario") DO UPDATE SET "activo" = ?')
                .bind(target_user, activo ? 1 : 0, nowMadrid, activo ? 1 : 0).run();
            return jsonResponse({ status: 'success', message: `Seguimiento de @${target_user} actualizado.` });
        };

        try {
            return await execToggle();
        } catch(e) {
            if (isSchemaMissingErr(e)) {
                try {
                    await ensureMonitorSchema(db);
                    return await execToggle();
                } catch(e2) {
                    return jsonResponse({ status: 'error', message: e2.message }, 500);
                }
            }
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === "ping") {
        return jsonResponse({ status: "ok" });
    }

    // HELPERS CANÓNICOS MVP: Comparación fiable por dorsal/apodo/nombre y recuento real sin perder nominados con 0 votos
    function normalizeMvpStr(str) {
        if (!str) return '';
        return String(str)
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, ' ');
    }

    function extractMvpDorsal(str) {
        if (!str) return null;
        const m = String(str).match(/#(\d+)/);
        if (!m) return null;
        const num = parseInt(m[1], 10);
        return isNaN(num) ? null : num;
    }

    function isSameMvpPlayer(a, b) {
        if (!a || !b) return false;
        const nA = normalizeMvpStr(a);
        const nB = normalizeMvpStr(b);
        if (!nA || !nB) return false;
        if (nA === nB) return true;

        const dA = extractMvpDorsal(a);
        const dB = extractMvpDorsal(b);
        if (dA !== null && dB !== null) return dA === dB;

        const extractParts = (raw) => {
            const s = String(raw || '');
            const apMatch = s.match(/\(([^)]+)\)/);
            const apodo = apMatch ? normalizeMvpStr(apMatch[1]) : '';
            const cleaned = normalizeMvpStr(
                s.replace(/#\d+\s*/g, '').replace(/\s*\[[^\]]+\]/g, '').replace(/\s*\([^)]+\)/g, '')
            );
            return { apodo, cleaned };
        };
        const pA = extractParts(a);
        const pB = extractParts(b);

        if (pA.cleaned && pB.cleaned && pA.cleaned === pB.cleaned) return true;
        if (pA.apodo && pB.apodo && pA.apodo === pB.apodo) return true;
        if (pA.apodo && pB.cleaned && pA.apodo === pB.cleaned) return true;
        if (pB.apodo && pA.cleaned && pB.apodo === pA.cleaned) return true;
        return false;
    }

    function buildMvpVotesRecuento(candsList, rawVotesList) {
        const buckets = [];
        const cands = Array.isArray(candsList) ? candsList.filter(c => c && String(c).trim() !== '') : [];
        const rawVotes = Array.isArray(rawVotesList) ? rawVotesList.filter(v => v && v.jugador) : [];

        if (cands.length > 0) {
            for (const cand of cands) {
                if (!buckets.some(b => isSameMvpPlayer(b.jugador, cand))) {
                    buckets.push({ jugador: cand, total: 0 });
                }
            }
            for (const rv of rawVotes) {
                const count = Math.max(0, parseInt(rv.total, 10) || 0);
                const target = buckets.find(b => isSameMvpPlayer(b.jugador, rv.jugador));
                if (target) {
                    target.total += count;
                }
            }
        } else {
            for (const rv of rawVotes) {
                const count = Math.max(0, parseInt(rv.total, 10) || 0);
                const target = buckets.find(b => isSameMvpPlayer(b.jugador, rv.jugador));
                if (target) {
                    target.total += count;
                } else {
                    buckets.push({ jugador: rv.jugador, total: count });
                }
            }
        }
        return buckets;
    }

    async function getMvpVotesByMatchMap() {
        try {
            const { results } = await db.prepare('SELECT id_partido, jugador, COUNT(*) as total FROM MVP_Votos GROUP BY id_partido, jugador ORDER BY total DESC').all();
            const map = {};
            for (const row of results || []) {
                if (!row || !row.id_partido || !row.jugador) continue;
                if (!map[row.id_partido]) map[row.id_partido] = [];
                map[row.id_partido].push({
                    jugador: row.jugador,
                    total: parseInt(row.total, 10) || 0
                });
            }
            return map;
        } catch (e) {
            return null;
        }
    }

    // HELPER: Formatear fila de Ajustes al objeto que espera el frontend
    function formatMatch(r, resOficialMap = {}, mvpVotesMap = null) {
        const idPart = r.ID_Partido || "";
        const oRes = resOficialMap[idPart] || {};
        // PARSE FECHA 'DD/MM/YYYY HH:MM' TO TIMESTAMP
        let ts = r.timestamp || 0;
        if (!ts && r.Fecha) {
            const parts = r.Fecha.trim().split(' ');
            if (parts.length >= 1) {
                const dateParts = parts[0].split('/');
                if (dateParts.length === 3) {
                    const day = parseInt(dateParts[0], 10);
                    const month = parseInt(dateParts[1], 10) - 1;
                    const year = parseInt(dateParts[2], 10);
                    let hour = 0, minute = 0;
                    if (parts.length > 1) {
                        const timeParts = parts[1].split(':');
                        if (timeParts.length >= 2) {
                            hour = parseInt(timeParts[0], 10);
                            minute = parseInt(timeParts[1], 10);
                        }
                    }
                    ts = getMadridTimestamp(year, month, day, hour, minute);
                }
            }
        }

        if (idPart === 'RFEVB_2561') {
            r.Fecha = '31/10/2026 16:00';
            r.timestamp = 1793458800000;
            ts = 1793458800000;
        } else if (idPart === 'RFEVB_2753') {
            r.Fecha = '19/12/2026 18:30';
            r.timestamp = 1797701400000;
            ts = 1797701400000;
        } else if (idPart === 'RFEVB_2715') {
            r.Fecha = '20/11/2026 17:00';
            r.timestamp = 1795190400000;
            r.Pabellon = 'CAMPO DE LA JUVENTUD';
            ts = 1795190400000;
        } else if (idPart === 'FVCL_2M003_MES') {
            r.Fecha = '07/11/2026 18:30';
            r.timestamp = 1794072600000;
            r.Pabellon = 'Pabellón Enrique Serichol, Segovia';
            ts = 1794072600000;
        } else if (idPart === 'FVCL_2F004') {
            r.Fecha = '28/11/2026 17:00';
            r.timestamp = 1795881600000;
            r.Pabellon = 'Polideportivo Cristo Rey, Valladolid';
            ts = 1795881600000;
        } else if (idPart === 'FVCL_2M004_MES') {
            r.Fecha = '28/11/2026 19:00';
            r.timestamp = 1795888800000;
            r.Pabellon = 'Polideportivo Cristo Rey, Valladolid';
            ts = 1795888800000;
        } else if (idPart === 'FVCL_2M011_MES') {
            r.Fecha = '06/03/2027 20:00';
            r.timestamp = 1804359600000;
            r.Pabellon = 'P. Pajaritos Sur';
            ts = 1804359600000;
        } else if (idPart === 'FVCL_2F011') {
            r.Fecha = '07/03/2027 14:00';
            r.timestamp = 1804424400000;
            r.Pabellon = 'P. Pajaritos Sur';
            ts = 1804424400000;
        } else if (idPart === 'RFEVB_2583') {
            r.Pabellon = 'Campus Deportivo Fuente la Mora';
        }

        const mvpCandidatos = oRes.mvp_candidatos ? (function(){ try { return JSON.parse(oRes.mvp_candidatos); } catch(e){ return []; } })() : [];
        const savedRecuento = oRes.mvp_votos_recuento ? (function(){ try { return JSON.parse(oRes.mvp_votos_recuento); } catch(e){ return []; } })() : [];
        const liveOrSavedRecuento = (mvpVotesMap !== null)
            ? buildMvpVotesRecuento(mvpCandidatos, mvpVotesMap[idPart] || [])
            : buildMvpVotesRecuento(mvpCandidatos, savedRecuento);

        return {
            id_partido: idPart,
            ronda_global: r.Ronda_Global || "1",
            equipo_local: r.Equipo_Local || "",
            rival: r.Rival || "",
            jornada_eq: r.Jornada_Eq || "1",
            timestamp: ts,
            ubicacion: r.Ubicacion || "",
            estado: r.Estado || "ABIERTO",
            visibilidad: r.Visibilidad || "MOSTRAR",
            categoria: r.Categoria || "",
            pabellon: r.Pabellon || "",
            abrev_local: r.Abrev_izq || "",
            abrev_rival: r.Abrev_der || "",
            oficial_sets: oRes["Sets Oficial"] || "",
            oficial_parciales: oRes["Parciales Oficial"] || "",
            streaming: oRes.Streaming || "",
            actualizado_por: oRes.actualizado_por || "",
            actualizado_ts: oRes.actualizado_ts ? parseInt(oRes.actualizado_ts) : 0,
            actualizado_fecha: oRes.actualizado_fecha || "",
            mvp_candidatos: mvpCandidatos,
            mvp_oficial: oRes.mvp_oficial || "",
            mvp_stats: oRes.mvp_stats ? (function(){ try { return JSON.parse(oRes.mvp_stats); } catch(e){ return []; } })() : [],
            mvp_proclamado_ts: oRes.mvp_proclamado_ts ? parseInt(oRes.mvp_proclamado_ts) : 0,
            mvp_cierre_votacion_ts: oRes.mvp_cierre_votacion_ts ? parseInt(oRes.mvp_cierre_votacion_ts) : (oRes.mvp_publicacion_ts ? parseInt(oRes.mvp_publicacion_ts) - 3 * 3600000 : 0),
            mvp_publicacion_ts: oRes.mvp_publicacion_ts ? parseInt(oRes.mvp_publicacion_ts) : 0,
            mvp_votos_recuento: liveOrSavedRecuento,
            mvp_mostrar_porcentajes: oRes.mvp_mostrar_porcentajes !== undefined ? (oRes.mvp_mostrar_porcentajes === 1 || oRes.mvp_mostrar_porcentajes === '1' || oRes.mvp_mostrar_porcentajes === true) : true,
            mvp_visible: oRes.mvp_visible !== undefined ? (oRes.mvp_visible === 1 || oRes.mvp_visible === '1' || oRes.mvp_visible === true || oRes.mvp_visible === 'true' || oRes.mvp_visible === 'SI') : true
        };
    }

    // 2. LOGIN INVITADO
    if (action === "login_guest") {
        const autoKeyGuest = 'AUTO_UNFREEZE_' + getLunesSemanaClave(new Date());
        const [
            rawPartidosRes,
            resOfRes,
            mvpVotesMap,
            rowPerm,
            notifRes,
            cacheGuestRes
        ] = await Promise.all([
            db.prepare('SELECT * FROM "Ajustes" WHERE "Visibilidad" != \'OCULTAR\' ORDER BY "timestamp" ASC').all(),
            db.prepare('SELECT * FROM "Resultados_Oficiales"').all(),
            getMvpVotesByMatchMap(),
            db.prepare('SELECT * FROM "Permisos_Equipos" WHERE lower("Jugador") = \'invitado\'').first(),
            db.prepare(`
                SELECT * FROM "Notificaciones" 
                WHERE "Visibilidad" IS NULL OR ("Visibilidad" != 'OCULTAR' AND "Visibilidad" != 'BORRADA' AND "Visibilidad" != 'ELIMINADA') 
                ORDER BY "timestamp" DESC, "ID" DESC
            `).all().catch(() => null),
            db.prepare("SELECT clave, valor FROM Cache_App WHERE clave IN ('FREEZE_OVERRIDE', ?)").bind(autoKeyGuest).all().catch(() => null)
        ]);

        const rawPartidos = (rawPartidosRes && rawPartidosRes.results) || [];
        const resOf = (resOfRes && resOfRes.results) || [];
        const resMap = {};
        for (const ro of resOf) resMap[ro["ID Partido"]] = ro;

        const partidos = rawPartidos.map(r => formatMatch(r, resMap, mvpVotesMap));

        // Permisos Equipos del usuario 'Invitado'
        const misPermisos = {};
        if (rowPerm) {
            for (const col in rowPerm) {
                if (col !== "Jugador" && rowPerm[col] && rowPerm[col].toString().toUpperCase() === "X") {
                    misPermisos[col] = true;
                }
            }
        }

        // Cartelera y todos los partidos permitidos para el usuario Invitado
        const cartelera = [];
        const todosPartidos = [];
        const idsEnCartelera = {};

        for (const p of partidos) {
            if (p.visibilidad === "OCULTAR") continue;

            const esLoc = misPermisos[p.equipo_local] === true;
            const esRiv = misPermisos[p.rival] === true;

            if (esLoc || esRiv) {
                const pCopy = { ...p };
                pCopy.permitido = true;
                if (esLoc && esRiv) pCopy.es_derby = true;

                todosPartidos.push(pCopy);

                const pCartelera = { ...pCopy };
                let noTimestamp = !pCartelera.timestamp;
                let isTooFarFuture = pCartelera.timestamp && (pCartelera.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000);
                
                let hasMvpAssignment = ((Array.isArray(pCartelera.mvp_candidatos) && pCartelera.mvp_candidatos.length > 0) || Boolean(pCartelera.mvp_oficial) || Boolean(pCartelera.mvp_publicacion_ts > 0)) && pCartelera.mvp_visible !== false;
                let isTooOld = false;

                if (hasMvpAssignment) {
                    if (pCartelera.mvp_oficial) {
                        let baseTime = pCartelera.mvp_proclamado_ts || pCartelera.mvp_publicacion_ts || pCartelera.timestamp || 0;
                        if (baseTime && (Date.now() - baseTime > 24 * 60 * 60 * 1000)) {
                            isTooOld = true;
                        }
                    } else if (pCartelera.mvp_publicacion_ts && pCartelera.mvp_publicacion_ts > Date.now()) {
                        isTooOld = false;
                    } else if (pCartelera.timestamp && (Date.now() - pCartelera.timestamp > 72 * 60 * 60 * 1000)) {
                        isTooOld = true;
                    } else {
                        isTooOld = false;
                    }
                } else {
                    isTooOld = pCartelera.timestamp && (Date.now() - pCartelera.timestamp > 36 * 60 * 60 * 1000);
                }
                
                if (noTimestamp || isTooFarFuture || isTooOld) {
                    pCartelera.visibilidad = "OCULTAR";
                } else {
                    pCartelera.visibilidad = "MOSTRAR";
                }

                // Si la hora de publicación del ganador aún no ha llegado, ocultar al MVP oficial a invitados
                if (pCartelera.mvp_publicacion_ts && pCartelera.mvp_publicacion_ts > Date.now()) {
                    pCartelera.mvp_oficial = "";
                    pCartelera.mvp_stats = [];
                    pCartelera.mvp_votos_recuento = [];
                    pCopy.mvp_oficial = "";
                    pCopy.mvp_stats = [];
                    pCopy.mvp_votos_recuento = [];
                }

                if (pCartelera.visibilidad === "MOSTRAR") {
                    if (!idsEnCartelera[pCartelera.id_partido]) {
                        cartelera.push(pCartelera);
                        idsEnCartelera[pCartelera.id_partido] = pCartelera;
                    }
                }
            }
        }

        const guestCacheMap = {};
        if (cacheGuestRes && cacheGuestRes.results) {
            for (const cr of cacheGuestRes.results) guestCacheMap[cr.clave] = cr.valor;
        }
        // Notificaciones públicas (usando lecturas prefetched)
        let notificaciones = await getNotificacionesPublicas(db, env, context, {
            notifRows: notifRes ? (notifRes.results || []) : null,
            hasOverride: Boolean(cacheGuestRes),
            overrideRow: guestCacheMap['FREEZE_OVERRIDE'] !== undefined ? { valor: guestCacheMap['FREEZE_OVERRIDE'] } : null,
            hasAuto: Boolean(cacheGuestRes),
            autoRow: guestCacheMap[autoKeyGuest] !== undefined ? { valor: guestCacheMap[autoKeyGuest] } : null
        });

        return jsonResponse({
            status: "success",
            usuario: "Invitado",
            nombre_real: "Modo Invitado",
            equipos: cartelera,
            todos_partidos: todosPartidos,
            mis_equipos_siguiendo: Object.keys(misPermisos),
            notificaciones: notificaciones
        });
    }

    // 3. CAMBIO DE CONTRASEÑA
    if (action === "change_password") {
        const oldPwd = (body.old_password || "").trim();
        const newPwd = (body.new_password || "").trim();
        const user = await verifyAndMigrateUser(db, usuario, oldPwd);
        if (!user) {
            return jsonResponse({ status: "error", message: "La contraseña actual no es correcta." });
        }
        if (!newPwd || newPwd.length < 3) {
            return jsonResponse({ status: "error", message: "La nueva contraseña debe tener al menos 3 caracteres." });
        }
        const hashedNew = await hashPassword(newPwd);
        await db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(hashedNew, usuario).run();
        return jsonResponse({ status: "success", message: "¡Contraseña actualizada con éxito!" });
    }

    // 4. GUARDAR PREDICCIONES (Porras)
    if (action === "save") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const preds = body.predicciones || {};
        const nowMs = Date.now();
        const predIds = Object.keys(preds).filter(Boolean);

        // Validar seguridad en 1 sola consulta por lote: partido no cerrado ni iniciado
        for (let i = 0; i < predIds.length; i += 80) {
            const chunk = predIds.slice(i, i + 80);
            const placeholders = chunk.map(() => '?').join(',');
            const { results: partidosCheck } = await db.prepare(`SELECT "ID_Partido", "Estado", "timestamp" FROM "Ajustes" WHERE "ID_Partido" IN (${placeholders})`).bind(...chunk).all();
            for (const partido of partidosCheck || []) {
                if (partido.Estado === "CERRADO" || (partido.timestamp && nowMs >= partido.timestamp)) {
                    return jsonResponse({ status: "error", message: `⚠️ Seguridad: El partido ${partido.ID_Partido} ya ha comenzado o está cerrado.` });
                }
            }
        }

        // Optimización: agrupar sentencias DELETE e INSERT en db.batch para ejecutarlas en 1 solo viaje a SQLite
        const batchStmts = [];
        const nowStr = new Date().toLocaleString("es-ES");
        for (const idPart of predIds) {
            batchStmts.push(db.prepare('DELETE FROM "Porras" WHERE "Usuario" = ? AND "ID Partido" = ?').bind(usuario, idPart));
            const p = preds[idPart];
            if (p && p.sets) {
                batchStmts.push(db.prepare('INSERT INTO "Porras" ("Timestamp", "Usuario", "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local") VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(nowStr, usuario, idPart, p.sets, p.puntos, p.signo));
            }
        }
        await flushBatch(db, batchStmts);
        return jsonResponse({ status: "success", message: "Predicciones guardadas correctamente." });
    }

    // 5. GUARDAR PREDICCIONES SECRETAS (Puntos totales temporada)
    if (action === "save_totales") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const deadline = new Date("2026-10-10T12:00:00").getTime();
        if (Date.now() >= deadline) {
            return jsonResponse({ status: "error", message: "El plazo para enviar predicciones totales ha cerrado." });
        }

        const totals = body.predicciones_totales || {};
        const batchTotales = [];
        const nowStrTotales = new Date().toLocaleString("es-ES");
        for (const eq in totals) {
            batchTotales.push(db.prepare('DELETE FROM "Predicciones_Secretas" WHERE "Usuario" = ? AND "Equipo" = ?').bind(usuario, eq));
            const pts = totals[eq];
            if (pts !== "" && !isNaN(parseInt(pts))) {
                batchTotales.push(db.prepare('INSERT INTO "Predicciones_Secretas" ("Fecha", "Usuario", "Equipo", "Puntos Predichos") VALUES (?, ?, ?, ?)')
                    .bind(nowStrTotales, usuario, eq, pts.toString()));
            }
        }
        await flushBatch(db, batchTotales);
        return jsonResponse({ status: "success", message: "¡Tus predicciones a final de temporada han sido guardadas!" });
    }

    // 6. HISTORIAL DE PARTIDOS
    if (action === "get_history") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const [rawPartidosRes, resOfRes, misPorrasRes, ligasEqRes] = await Promise.all([
            db.prepare('SELECT * FROM "Ajustes" ORDER BY "timestamp" ASC').all(),
            db.prepare('SELECT * FROM "Resultados_Oficiales"').all(),
            db.prepare('SELECT "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local" FROM "Porras" WHERE "Usuario" = ?').bind(usuario).all(),
            db.prepare('SELECT * FROM "Ligas_Equipos"').all()
        ]);

        const rawPartidos = (rawPartidosRes && rawPartidosRes.results) || [];
        const resOf = (resOfRes && resOfRes.results) || [];
        const resMap = {};
        for (const ro of resOf) resMap[ro["ID Partido"]] = ro;
        const partidos = rawPartidos.map(r => formatMatch(r, resMap));

        const porrasMap = {};
        for (const pr of (misPorrasRes && misPorrasRes.results) || []) porrasMap[pr["ID Partido"]] = pr;

        const ligasMap = {};
        for (const row of (ligasEqRes && ligasEqRes.results) || []) {
            const lName = row.Liga;
            if (!ligasMap[lName]) ligasMap[lName] = [];
            for (const col in row) {
                if (col !== "Liga" && row[col] && row[col].toString().toUpperCase() === "X") {
                    ligasMap[lName].push(col);
                }
            }
        }

        const matchdaysMap = {};
        for (const p of partidos) {
            const rg = p.ronda_global || "1";
            if (!matchdaysMap[rg]) matchdaysMap[rg] = [];

            const uPred = porrasMap[p.id_partido] || null;
            const ligasEq = [];
            for (const lName in ligasMap) {
                if (ligasMap[lName].includes(p.equipo_local) || ligasMap[lName].includes(p.rival)) ligasEq.push(lName);
            }

            matchdaysMap[rg].push({
                partido: p,
                prediccion: uPred ? { sets: uPred.Sets, puntos: uPred["Puntos Dif"], signo: uPred["a favor o en contra del local"] } : null,
                puntos_ganados: 0,
                motivos: [],
                ligas_afectadas: ligasEq
            });
        }

        const miHistorial = [];
        for (const rg in matchdaysMap) {
            miHistorial.push({ ronda: rg, partidos: matchdaysMap[rg] });
        }
        return jsonResponse({ status: "success", historial: miHistorial });
    }

    // 7. LOGIN Y CARGA PRINCIPAL (action === "login" || action === "get_data")
    if (action === "login" || action === "get_data") {
        // Paso A: Autenticación + Modo mantenimiento en paralelo (Insignias solo si mantenimiento está activo)
        const [userRow, mantenimientoActivo] = await Promise.all([
            getAuthUser(),
            isModoMantenimientoActivo(db)
        ]);
        if (!userRow) {
            return jsonResponse({ status: "error", message: "Usuario o contraseña incorrectos." });
        }

        // CONTROL DE MODO MANTENIMIENTO: Restringido exclusivamente a administradores
        if (mantenimientoActivo) {
            const adminCheckBadge = usuario
                ? await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first().catch(() => null)
                : null;
            const esAdmin = adminCheckBadge && adminCheckBadge["Admin Web"] === "X";
            if (!esAdmin) {
                return jsonResponse({
                    status: "error",
                    code: "MODO_MANTENIMIENTO",
                    message: "🚧 La plataforma se encuentra temporalmente en modo mantenimiento. El acceso está restringido exclusivamente a administradores del club."
                }, 403);
            }
        }

        // Horario de apagón por defecto para prefetchear exactamente las claves de Cache_App correctas
        const now = new Date();
        const utcDay = now.getUTCDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
        let defaultIsFrozen = false;
        let freezeCutoff = 0;
        let unfreezeTime = 0;

        if (utcDay === 6 || utcDay === 0 || utcDay === 1) {
            let u = new Date(now);
            if (utcDay === 6) u.setUTCDate(u.getUTCDate() + 2);
            if (utcDay === 0) u.setUTCDate(u.getUTCDate() + 1);
            if (utcDay === 1) u.setUTCDate(u.getUTCDate() + 0);
            u.setUTCHours(16, 0, 0, 0);
            unfreezeTime = u.getTime();

            if (now.getTime() < unfreezeTime) {
                defaultIsFrozen = true;
                let d = new Date(now);
                if (utcDay === 6) d.setUTCDate(d.getUTCDate() - 1);
                if (utcDay === 0) d.setUTCDate(d.getUTCDate() - 2);
                if (utcDay === 1) d.setUTCDate(d.getUTCDate() - 3);
                d.setUTCHours(23, 59, 59, 999);
                freezeCutoff = d.getTime();
            }
        }

        const autoKeyLogin = 'AUTO_UNFREEZE_' + getLunesSemanaClave(now);
        const defaultCacheKey = defaultIsFrozen ? 'userPointsInLiga_FROZEN_v2' : 'userPointsInLiga_v2';
        const defaultStatsCacheKey = defaultIsFrozen ? 'statsLigas_FROZEN_v2' : 'statsLigas_v2';

        // Paso B: Ola única paralela con todas las lecturas principales
        const [
            rawPartidosRes,
            resOfRes,
            rawMvpVotesRes,
            rowPerm,
            allLigasRes,
            ligasEqRes,
            misPorrasRes,
            allInsigniasRes,
            plantillaRowsRes,
            rowSec,
            rawSecretasRes,
            regRowsRes,
            allUsersRes,
            cacheAppRes,
            ligasCfgRes,
            monRow,
            rawNotifRes,
            pushRow
        ] = await Promise.all([
            db.prepare('SELECT * FROM "Ajustes" ORDER BY "timestamp" ASC').all(),
            db.prepare('SELECT * FROM "Resultados_Oficiales"').all(),
            db.prepare('SELECT id_partido, usuario, jugador FROM MVP_Votos').all().catch(() => null),
            db.prepare('SELECT * FROM "Permisos_Equipos" WHERE "Jugador" = ?').bind(usuario).first(),
            db.prepare('SELECT * FROM "Ligas"').all(),
            db.prepare('SELECT * FROM "Ligas_Equipos"').all(),
            db.prepare('SELECT "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local" FROM "Porras" WHERE "Usuario" = ?').bind(usuario).all(),
            db.prepare('SELECT * FROM "Insignias"').all(),
            db.prepare('SELECT id, dorsal, nombre, apodo, posicion, usuario FROM Plantilla_Superliga_2_Masc ORDER BY dorsal ASC, id ASC').all()
                .catch(async () => db.prepare('SELECT dorsal, nombre, apodo, posicion FROM Plantilla_Superliga ORDER BY dorsal ASC').all().catch(() => ({ results: [] }))),
            db.prepare('SELECT * FROM "Permisos_Secreta" WHERE "Usuario" = ?').bind(usuario).first(),
            db.prepare('SELECT "Usuario", "Equipo", "Puntos Predichos" FROM "Predicciones_Secretas" WHERE "Usuario" = ?').bind(usuario).all(),
            db.prepare('SELECT "Regla", "Puntos" FROM "Reglas_Puntuacion"').all(),
            db.prepare('SELECT "Usuario", "Nombre Real" FROM "Usuarios"').all(),
            db.prepare("SELECT clave, valor FROM Cache_App WHERE clave IN ('FREEZE_OVERRIDE', 'NOTIF_SOLO_ADMIN', ?, ?, ?)").bind(autoKeyLogin, defaultCacheKey, defaultStatsCacheKey).all().catch(() => null),
            db.prepare('SELECT * FROM "Ligas_Config"').all().catch(() => null),
            db.prepare('SELECT activo FROM "Monitor_Usuarios" WHERE "usuario" = ?').bind(usuario).first().catch(() => null),
            db.prepare('SELECT * FROM "Notificaciones" WHERE "Visibilidad" IS NULL OR ("Visibilidad" != \'OCULTAR\' AND "Visibilidad" != \'BORRADA\' AND "Visibilidad" != \'ELIMINADA\') ORDER BY "timestamp" DESC, "ID" DESC').all().catch(() => null),
            db.prepare('SELECT "Suscripcion_JSON", "Opciones_Viernes", "Opciones_2Horas", "Opciones_SoloOlvidos", "Opciones_Descongelacion", "Opciones_Mvp", "Equipos_Permitidos" FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ? ORDER BY "Ultima_Actualizacion" DESC LIMIT 1').bind(usuario).first()
                .catch(async (err) => isSchemaMissingErr(err)
                    ? db.prepare('SELECT "Suscripcion_JSON", "Opciones_Viernes", "Opciones_2Horas", "Opciones_SoloOlvidos", "Equipos_Permitidos" FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ? ORDER BY "Ultima_Actualizacion" DESC LIMIT 1').bind(usuario).first().catch(() => null)
                    : null)
        ]);

        // Escrituras no críticas en segundo plano (sin bloquear respuesta del login)
        if (action === "login") {
            let shouldUpdateLastAccess = true;
            if (userRow.ultimo_acceso) {
                const lastAcc = new Date(userRow.ultimo_acceso + 'Z').getTime();
                if (!isNaN(lastAcc) && (Date.now() - lastAcc < 3600000)) {
                    shouldUpdateLastAccess = false;
                }
            }
            const shouldLogMonitor = Boolean(monRow && monRow.activo === 1);
            if (shouldUpdateLastAccess || shouldLogMonitor) {
                runInBg(context, (async () => {
                    if (shouldUpdateLastAccess) {
                        try {
                            await db.prepare('UPDATE "Usuarios" SET ultimo_acceso = CURRENT_TIMESTAMP WHERE "Usuario" = ?').bind(usuario).run();
                        } catch(e) {}
                    }
                    if (shouldLogMonitor) {
                        try {
                            const nowTs = Date.now();
                            const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
                            const uAgent = context && context.request ? (context.request.headers.get("user-agent") || "Desconocido") : "Desconocido";
                            const origen = (body && body.is_auto_reconnect) ? "Sesión guardada (Auto)" : "Inicio manual";
                            const disp = (body && body.dispositivo && typeof body.dispositivo === 'string' && body.dispositivo.trim() !== '')
                                ? body.dispositivo.substring(0, 150)
                                : uAgent.substring(0, 150);
                            await db.prepare('INSERT INTO "Log_Accesos" ("usuario", "fecha_hora", "timestamp", "origen", "dispositivo") VALUES (?, ?, ?, ?, ?)')
                                .bind(usuario, nowMadrid, nowTs, origen, disp).run();
                        } catch(e) {}
                    }
                })());
            }
        }

        // Partidos, Resultados oficiales y MVP_Votos (una única consulta compartida)
        const rawPartidos = (rawPartidosRes && rawPartidosRes.results) || [];
        const resOf = (resOfRes && resOfRes.results) || [];
        const resMap = {};
        for (const ro of resOf) resMap[ro["ID Partido"]] = ro;

        const rawMvpVotes = rawMvpVotesRes ? (rawMvpVotesRes.results || []) : null;
        let mvpVotesByMatchMap = null;
        const misVotosMvp = {};
        const userMvpVotesLookup = {};
        const userMvpVotesLowerLookup = {};
        if (rawMvpVotes !== null) {
            mvpVotesByMatchMap = {};
            const mvpCountsByMatch = {};
            for (const mv of rawMvpVotes) {
                if (!mv || !mv.id_partido || !mv.jugador) continue;
                const idP = mv.id_partido;
                const mvUser = String(mv.usuario || '').trim();
                if (!mvpCountsByMatch[idP]) mvpCountsByMatch[idP] = {};
                mvpCountsByMatch[idP][mv.jugador] = (mvpCountsByMatch[idP][mv.jugador] || 0) + 1;
                if (mv.usuario === usuario) {
                    misVotosMvp[idP] = mv.jugador;
                }
                userMvpVotesLookup[`${idP}_${mv.usuario}`] = mv.jugador;
                if (mvUser) userMvpVotesLowerLookup[`${idP}_${mvUser.toLowerCase()}`] = mv.jugador;
            }
            for (const idP in mvpCountsByMatch) {
                const list = Object.keys(mvpCountsByMatch[idP]).map(jug => ({
                    jugador: jug,
                    total: mvpCountsByMatch[idP][jug]
                }));
                list.sort((a, b) => b.total - a.total);
                mvpVotesByMatchMap[idP] = list;
            }
        }
        const partidos = rawPartidos.map(r => formatMatch(r, resMap, mvpVotesByMatchMap));

        // Permisos Equipos del usuario (leer fila de Permisos_Equipos)
        const misPermisos = {};
        if (rowPerm) {
            for (const col in rowPerm) {
                if (col !== "Jugador" && rowPerm[col] && rowPerm[col].toString().toUpperCase() === "X") {
                    misPermisos[col] = true;
                }
            }
        }

        // Ligas del usuario y catálogo completo (una única lectura de Ligas)
        const allLigasRows = (allLigasRes && allLigasRes.results) || [];
        const rowLigas = allLigasRows.find(r => r.Jugador === usuario) || null;
        const misLigas = [];
        if (rowLigas) {
            for (const col in rowLigas) {
                if (col !== "Jugador" && rowLigas[col] && rowLigas[col].toString().toUpperCase() === "X") {
                    misLigas.push(col);
                }
            }
        }
        const sampleLigas = allLigasRows[0] || null;
        const todasLasLigas = sampleLigas ? Object.keys(sampleLigas).filter(k => k !== "Jugador") : [];

        // Ligas_Equipos mapping
        const ligasEqRows = (ligasEqRes && ligasEqRes.results) || [];
        const ligasMap = {};
        for (const row of ligasEqRows) {
            const lName = row.Liga;
            if (!ligasMap[lName]) ligasMap[lName] = [];
            for (const col in row) {
                if (col !== "Liga" && row[col] && row[col].toString().toUpperCase() === "X") {
                    ligasMap[lName].push(col);
                }
            }
        }

        // Porras del usuario actual
        const misPorras = (misPorrasRes && misPorrasRes.results) || [];
        const prediccionesUsuario = {};
        for (const p of misPorras) {
            prediccionesUsuario[p["ID Partido"]] = { sets: p.Sets, puntos: p["Puntos Dif"], signo: p["a favor o en contra del local"] };
        }

        // Insignias
        const allInsignias = (allInsigniasRes && allInsigniasRes.results) || [];
        const insigniasMap = {};
        const plantillaSuperliga = (plantillaRowsRes && plantillaRowsRes.results) || [];
        for (const b of allInsignias || []) {
            const u = b.Usuario;
            if (!u) continue;
            if (!insigniasMap[u]) insigniasMap[u] = [];
            
            const isF = b["Genero"] === "F";
            const lblEnt = isF ? "Entrenadora" : "Entrenador";
            const lblJug = isF ? "Jugadora" : "Jugador";
            const lblExj = isF ? "Exjugadora de VCV" : "Exjugador de VCV";

            const addBadge = (type, text, extra = {}) => {
                if (!insigniasMap[u].some(badge => badge.type === type && badge.text === text)) {
                    insigniasMap[u].push({ type, text, ...extra });
                }
            };
            if (b["Admin Web"] === "X") addBadge('admin', 'Admin Web');
            if (b["Directiva / Staff"]) addBadge('staff', b["Directiva / Staff"]);
            
            // Helper para separar múltiples equipos manteniendo equipo y categoría en el mismo punto
            const parseTeamsString = (raw) => {
                if (!raw) return [];
                let rawStr = String(raw).trim();
                if (!rawStr) return [];
                let initialChunks = rawStr.split(/[;\n]|\s+y\s+/i).map(s => s.trim()).filter(Boolean);
                let teams = [];
                initialChunks.forEach(chunk => {
                    const parts = chunk.split(',').map(p => p.trim()).filter(Boolean);
                    for (let i = 0; i < parts.length; i++) {
                        let part = parts[i];
                        let nextPart = parts[i + 1];
                        const isStrictCategoryOnly = nextPart && /^(SM2|SF2|Superliga\s*2|1[ªa]\s*Nacional(\s*(Masc\.?|Fem\.?))?|2[ªa]\s*(División\s*)?(Masc\.?|Fem\.?))$/i.test(nextPart.trim());
                        const partAlreadyHasCat = part.includes(' - ') || part.includes(' – ');
                        if (isStrictCategoryOnly && !partAlreadyHasCat) {
                            teams.push(part + ' - ' + nextPart);
                            i++;
                        } else {
                            teams.push(part);
                        }
                    }
                });
                return teams.filter(Boolean);
            };

            // Entrenador / Entrenadora de
            if (b["Entrenador de"]) {
                const teamsEnt = parseTeamsString(b["Entrenador de"]);
                if (teamsEnt.length > 1) {
                    addBadge('entrenador', `${lblEnt} de:`, {
                        roleTitle: `${lblEnt} de:`,
                        items: teamsEnt
                    });
                } else if (teamsEnt.length === 1) {
                    addBadge('entrenador', `${lblEnt} de ${teamsEnt[0]}`);
                }
            }

            // Jugador / Jugadora de
            if (b["Jugador de"]) {
                const teamsJug = parseTeamsString(b["Jugador de"]);
                if (teamsJug.length > 1) {
                    addBadge('jugador', `${lblJug} de:`, {
                        roleTitle: `${lblJug} de:`,
                        items: teamsJug
                    });
                } else if (teamsJug.length === 1) {
                    addBadge('jugador', `${lblJug} de ${teamsJug[0]}`);
                }
            }

            if (b.Exjugador === "X") addBadge('exjugador', lblExj);
            if (b.Lesionado === "X") addBadge('lesionado', b.Lesion_Desc || 'Lesionado');
            if (b.Custom_Badge === "X") {
                if (!insigniasMap[u].some(badge => badge.type === 'custom' && badge.text === (b.Custom_Desc || 'Insignia'))) {
                    insigniasMap[u].push({ type: 'custom', text: (b.Custom_Desc || 'Insignia'), emoji: (b.Custom_Emoji || '✨') });
                }
            }
            if (b.Avatar === "X" && b.Avatar_Url) {
                if (!insigniasMap[u].some(badge => badge.type === 'avatar')) {
                    insigniasMap[u].push({ type: 'avatar', emoji: b.Avatar_Url });
                }
            }
            if (b["Permiso_MVP"] === "X") addBadge('permiso_mvp', 'Gestor MVP');
            if (b["Permiso_Resultados"] && b["Permiso_Resultados"] !== "") addBadge('permiso_resultados', b["Permiso_Resultados"]);
        }

        // --- INSIGNIA ESTRELLA MVP PARA JUGADORES DE LA PLANTILLA ASOCIADOS A UN USUARIO ---
        try {
            const sm2Players = plantillaSuperliga.filter(pl => pl && pl.usuario && String(pl.usuario).trim() !== '');
            if (sm2Players.length > 0) {
                for (const pl of sm2Players) {
                    const uPlayer = pl.usuario;
                    if (!uPlayer) continue;

                    // Buscar partidos donde este jugador haya sido el MVP Oficial
                    const sm2MvpMatches = [];
                    for (const p of partidos) {
                        if (!p.mvp_oficial) continue;
                        if (p.mvp_publicacion_ts && p.mvp_publicacion_ts > Date.now()) continue;
                        const mvpOf = String(p.mvp_oficial).trim();
                        
                        // Extraer el dorsal exacto del string oficial del MVP (ej: "#21 ...")
                        const officialDorsal = extractMvpDorsal(mvpOf);
                        const plDorsal = (pl.dorsal !== undefined && pl.dorsal !== null && String(pl.dorsal).trim() !== '') ? parseInt(pl.dorsal, 10) : null;

                        let isMatch = false;
                        if (officialDorsal !== null && plDorsal !== null && !isNaN(plDorsal)) {
                            // Coincidencia exacta por número de dorsal
                            isMatch = (officialDorsal === plDorsal);
                        } else {
                            const candReconstructed = `${plDorsal !== null ? '#' + plDorsal + ' ' : ''}${pl.nombre || ''}${pl.apodo ? ' (' + pl.apodo + ')' : ''}`;
                            isMatch = isSameMvpPlayer(mvpOf, candReconstructed);
                        }

                        if (isMatch) {
                            const rivalName = (p.ubicacion === 'LOCAL') ? p.rival : p.equipo_local;
                            const jNum = p.jornada_eq || p.ronda_global || '?';
                            sm2MvpMatches.push({
                                jornada: jNum,
                                rival: rivalName,
                                id_partido: p.id_partido
                            });
                        }
                    }

                    if (sm2MvpMatches.length > 0) {
                        if (!insigniasMap[uPlayer]) insigniasMap[uPlayer] = [];
                        const count = sm2MvpMatches.length;
                        const starText = count === 1 ? `⭐ MVP VALCYL Superliga 2 (1 vez)` : `⭐ MVP VALCYL Superliga 2 (${count} veces)`;
                        const items = sm2MvpMatches.map(m => `J. ${m.jornada} vs ${m.rival}`);

                        insigniasMap[uPlayer].push({
                            type: 'mvp',
                            text: starText,
                            roleTitle: starText,
                            emoji: '⭐',
                            count: count,
                            items: items
                        });
                    }
                }
            }
        } catch(e) {
            console.error("Error calculando insignias MVP:", e);
        }

        // Cartelera y todos_partidos (preservando derbis)
        const cartelera = [];
        const todosPartidos = [];
        const idsEnCartelera = {};

        // Comprobar si el usuario es Admin o Gestor MVP para asegurar que reciba los partidos de Superliga
        const userInsignia = (allInsignias || []).find(i => i.Usuario === usuario);
        const isUserAdmin = userInsignia && (userInsignia["Admin Web"] === "X");
        const isUserGestorMvp = userInsignia && (userInsignia["Permiso_MVP"] === "X");
        const hasPermisoResultados = userInsignia && Boolean(userInsignia["Permiso_Resultados"]);

        for (const p of partidos) {
            // SI ESTÁ OCULTADO A MANO EN LA BD, IGNORAR POR COMPLETO
            if (p.visibilidad === "OCULTAR" && !isUserAdmin && !hasPermisoResultados) continue;

            const esLoc = misPermisos[p.equipo_local] === true;
            const esRiv = misPermisos[p.rival] === true;
            const catL = (p.categoria || '').toLowerCase();
            const isSm2 = catL.includes('sm2') || catL.includes('superliga');

            // Procesar si tiene permiso para el equipo, o si es Gestor MVP/Admin y el partido es de Superliga 2
            if (esLoc || esRiv || isUserAdmin || (isUserGestorMvp && isSm2)) {
                const pCopy = { ...p };
                pCopy.permitido = true;
                if (esLoc && esRiv) pCopy.es_derby = true;

                // 1. Calendario: Entran todos los permitidos
                todosPartidos.push(pCopy);

                // 2. Cartelera:
                // - Si el partido tiene votación/sección de MVP asignada:
                //   * Permanece mientras no sea definitivo (mientras esté abierta la votación o no haya MVP oficial)
                //   * Una vez proclamado el ganador (MVP oficial), aguanta 48 horas desde dicha publicación
                // - Para el resto de partidos normales: los que estén a <= 7 días y no hayan pasado más de 36h desde el inicio
                const pCartelera = { ...pCopy };
                let noTimestamp = !pCartelera.timestamp;
                let isTooFarFuture = pCartelera.timestamp && (pCartelera.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000);
                
                let hasMvpAssignment = ((Array.isArray(pCartelera.mvp_candidatos) && pCartelera.mvp_candidatos.length > 0) || Boolean(pCartelera.mvp_oficial) || Boolean(pCartelera.mvp_publicacion_ts > 0)) && pCartelera.mvp_visible !== false;
                let isTooOld = false;

                if (hasMvpAssignment) {
                    if (pCartelera.mvp_oficial) {
                        // Ya es definitivo (hay ganador). Aguanta 48 horas desde la publicación del ganador
                        let baseTime = pCartelera.mvp_proclamado_ts || pCartelera.timestamp || 0;
                        if (baseTime && (Date.now() - baseTime > 48 * 60 * 60 * 1000)) {
                            isTooOld = true;
                        }
                    } else if (pCartelera.mvp_publicacion_ts && pCartelera.mvp_publicacion_ts > Date.now()) {
                        isTooOld = false;
                    } else {
                        // Mientras no sea definitivo (no hay ganador todavía), el partido permanece activo en la cartelera
                        isTooOld = false;
                    }
                } else {
                    isTooOld = pCartelera.timestamp && (Date.now() - pCartelera.timestamp > 36 * 60 * 60 * 1000);
                }
                
                if (noTimestamp || isTooFarFuture || isTooOld) {
                    pCartelera.visibilidad = "OCULTAR";
                } else {
                    pCartelera.visibilidad = "MOSTRAR";
                }

                                // Si no es admin ni gestor MVP y aún no es la hora de publicación, ocultar el ganador oficial
                if (!isUserAdmin && !isUserGestorMvp) {
                    if (pCartelera.mvp_publicacion_ts && pCartelera.mvp_publicacion_ts > Date.now()) {
                        pCartelera.mvp_oficial = "";
                        pCartelera.mvp_stats = [];
                        pCartelera.mvp_votos_recuento = [];
                        pCopy.mvp_oficial = "";
                        pCopy.mvp_stats = [];
                        pCopy.mvp_votos_recuento = [];
                    }
                }

                if (pCartelera.visibilidad === "MOSTRAR") {
                    if (!idsEnCartelera[pCartelera.id_partido]) {
                        cartelera.push(pCartelera);
                        idsEnCartelera[pCartelera.id_partido] = pCartelera;
                    }
                }
            }
        }

        // Equipos permitidos para predicciones secretas (Permisos_Secreta prefetched)
        const misEquiposTotales = [];
        let allTeamsPublicSet = new Set();
        if (ligasEqRows) {
            for (const row of ligasEqRows) {
                Object.keys(row).forEach(k => {
                    if (k !== 'Liga' && k !== 'id') allTeamsPublicSet.add(k);
                });
            }
        }
        const equiposTotalesPublicos = Array.from(allTeamsPublicSet).sort();

        if (rowSec) {
            for (const col in rowSec) {
                if (col !== "Usuario" && rowSec[col] && rowSec[col].toString().toUpperCase() === "X") {
                    misEquiposTotales.push(col);
                }
            }
        }

        // Predicciones secretas del usuario (prefetched)
        const rawSecretas = (rawSecretasRes && rawSecretasRes.results) || [];
        const prediccionesTotalesMap = {};
        for (const s of rawSecretas) {
            if (!prediccionesTotalesMap[s.Equipo]) prediccionesTotalesMap[s.Equipo] = [];
            prediccionesTotalesMap[s.Equipo].push({ usuario: s.Usuario, puntos: parseInt(s["Puntos Predichos"]) || 0 });
        }

        // Puntos reales calculados de partidos terminados
        const puntosRealesTotales = {};
        for (const p of partidos) {
            if (p.oficial_sets && p.oficial_sets.includes("-")) {
                const sL = parseInt(p.oficial_sets.split("-")[0]);
                const sV = parseInt(p.oficial_sets.split("-")[1]);
                
                // Determinar quién jugó a la izquierda (Local real) y quién a la derecha (Visitante real)
                const leftTeam = (p.ubicacion === 'LOCAL') ? p.equipo_local : p.rival;
                const rightTeam = (p.ubicacion === 'LOCAL') ? p.rival : p.equipo_local;

                if (!puntosRealesTotales[leftTeam]) puntosRealesTotales[leftTeam] = 0;
                if (!puntosRealesTotales[rightTeam]) puntosRealesTotales[rightTeam] = 0;
                
                if (sL === 3 && sV <= 1) {
                    puntosRealesTotales[leftTeam] += 3;
                } else if (sL === 3 && sV === 2) {
                    puntosRealesTotales[leftTeam] += 2;
                    puntosRealesTotales[rightTeam] += 1;
                } else if (sL === 2 && sV === 3) {
                    puntosRealesTotales[leftTeam] += 1;
                    puntosRealesTotales[rightTeam] += 2;
                } else if (sL <= 1 && sV === 3) {
                    puntosRealesTotales[rightTeam] += 3;
                }
            }
        }

        // Reglas de puntuación (prefetched)
        const regRows = (regRowsRes && regRowsRes.results) || [];
        let ptsSets = 5, ptsGanador = 3, ptsDiffExacta = 2, maxDistancia = 10, pctMvp = 10;
        let hasMvpRuleInDb = false;
        for (const r of regRows) {
            const reg = (r.Regla || "").toLowerCase();
            const val = parseFloat(r.Puntos) || 0;
            if (reg.includes("sets")) ptsSets = Math.round(val);
            else if (reg.includes("ganador")) ptsGanador = Math.round(val);
            else if (reg.includes("exacta")) ptsDiffExacta = Math.round(val);
            else if (reg.includes("distancia") || reg.includes("max")) maxDistancia = Math.round(val);
            else if (reg.includes("mvp")) {
                pctMvp = val;
                hasMvpRuleInDb = true;
            }
        }
        // Si no existía la regla de MVP en Reglas_Puntuacion, insertarla en segundo plano para permitir editarla
        if (!hasMvpRuleInDb) {
            runInBg(context, db.prepare('INSERT OR IGNORE INTO "Reglas_Puntuacion" ("Regla", "Puntos") VALUES (\'Porcentaje Extra MVP\', 10)').run());
        }

        // Nombres reales map (prefetched solo Usuario y Nombre Real)
        const allUsers = (allUsersRes && allUsersRes.results) || [];
        const mapNombresReales = {};
        for (const u of allUsers) mapNombresReales[u.Usuario] = u["Nombre Real"] || u.Usuario;

        // CLASIFICACIONES: calcular puntos por usuario y liga (CON CACHÉ PREFETCHED)
        const cacheAppMap = {};
        if (cacheAppRes && cacheAppRes.results) {
            for (const cr of cacheAppRes.results) cacheAppMap[cr.clave] = cr.valor;
        }
        let isFrozen = defaultIsFrozen;

        // --- OVERRIDE MANUAL DE CONGELACIÓN (ADMIN INTRANET) ---
        let freezeOverride = null; // 'UNFREEZE', 'FREEZE', o null
        if (cacheAppMap['FREEZE_OVERRIDE']) {
            try {
                const parsed = JSON.parse(cacheAppMap['FREEZE_OVERRIDE']);
                if (parsed.expires_at && now.getTime() > parsed.expires_at) {
                    runInBg(context, db.prepare("DELETE FROM Cache_App WHERE clave = 'FREEZE_OVERRIDE'").run());
                } else {
                    freezeOverride = parsed.mode; // 'UNFREEZE' o 'FREEZE'
                }
            } catch(e) {
                console.error("Error comprobando freeze override:", e);
            }
        }

        if (freezeOverride === 'UNFREEZE') {
            isFrozen = false;
        } else if (freezeOverride === 'FREEZE') {
            isFrozen = true;
            if (!freezeCutoff) freezeCutoff = Date.now();
        }
        
        // --- CONFIGURACION DE LIGAS CONGELADAS (Ligas_Config prefetched) ---
        let ligasCongeladasSet = new Set(todasLasLigas);
        if (ligasCfgRes && Array.isArray(ligasCfgRes.results) && ligasCfgRes.results.length > 0) {
            ligasCongeladasSet = new Set();
            for (const row of ligasCfgRes.results) {
                const val = (row.Congelar || "").toString().trim().toUpperCase();
                if (val === "SI" || val === "X" || val === "1" || val === "TRUE") {
                    ligasCongeladasSet.add(row.Liga);
                }
            }
        } else if (todasLasLigas.length > 0) {
            runInBg(context, (async () => {
                try {
                    if (ligasCfgRes === null) {
                        await db.prepare('CREATE TABLE IF NOT EXISTS "Ligas_Config" ("Liga" TEXT PRIMARY KEY, "Congelar" TEXT DEFAULT \'SI\')').run();
                    }
                    const seedCfgStmts = todasLasLigas.map(lName =>
                        db.prepare('INSERT OR IGNORE INTO "Ligas_Config" ("Liga", "Congelar") VALUES (?, \'SI\')').bind(lName)
                    );
                    await flushBatch(db, seedCfgStmts);
                } catch(e) {}
            })());
        }

        const cacheKey = isFrozen ? 'userPointsInLiga_FROZEN_v2' : 'userPointsInLiga_v2';
        const statsCacheKey = isFrozen ? 'statsLigas_FROZEN_v2' : 'statsLigas_v2';

        let userPointsInLiga = {};
        let statsLigas = {};
        let rawPointsStr = (isFrozen === defaultIsFrozen) ? cacheAppMap[defaultCacheKey] : null;
        let rawStatsStr = (isFrozen === defaultIsFrozen) ? cacheAppMap[defaultStatsCacheKey] : null;
        if (isFrozen !== defaultIsFrozen) {
            const [cacheRow, statsCacheRow] = await Promise.all([
                db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(cacheKey).first().catch(() => null),
                db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(statsCacheKey).first().catch(() => null)
            ]);
            rawPointsStr = cacheRow && cacheRow.valor;
            rawStatsStr = statsCacheRow && statsCacheRow.valor;
        }
        if (rawPointsStr) {
            try { userPointsInLiga = JSON.parse(rawPointsStr); } catch(e) {}
        }
        if (rawStatsStr) {
            try { statsLigas = JSON.parse(rawStatsStr); } catch(e) {}
        }

        if (Object.keys(userPointsInLiga).length === 0 || Object.keys(statsLigas).length === 0) {
            userPointsInLiga = {};
            statsLigas = {};
            const { results: allPorras } = await db.prepare('SELECT "Usuario", "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local" FROM "Porras"').all();
            for (const u of allUsers) {
                userPointsInLiga[u.Usuario] = {};
                statsLigas[u.Usuario] = {};
                for (const lName of todasLasLigas) {
                    userPointsInLiga[u.Usuario][lName] = 0;
                    statsLigas[u.Usuario][lName] = { porJornada: {} };
                }
            }

            const mapPartidos = {};
            for (const p of partidos) mapPartidos[p.id_partido] = p;

            for (const pr of allPorras || []) {
                const p = mapPartidos[pr["ID Partido"]];
                if (!p || !p.oficial_sets || !p.oficial_parciales || !pr.Sets) continue;
                if (!userPointsInLiga[pr.Usuario]) continue;

                const oSets = p.oficial_sets.split("-");
                const oLocalWin = parseInt(oSets[0]) > parseInt(oSets[1]);
                const uSets = pr.Sets.split("-");
                const uLocalWin = parseInt(uSets[0]) > parseInt(uSets[1]);

                let pts = 0;
                if (uLocalWin === oLocalWin) pts += ptsGanador;
                if (pr.Sets === p.oficial_sets) pts += ptsSets;

                let oDiff = 0;
                const setsP = p.oficial_parciales.split(",");
                for (const sp of setsP) {
                    const nums = sp.split("-");
                    if (nums.length === 2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                }
                let uDiff = parseInt(pr["Puntos Dif"]) || 0;
                if (pr["a favor o en contra del local"] === "En contra") uDiff = -uDiff;

                const dist = Math.abs(oDiff - uDiff);
                if (dist === 0) pts += ptsDiffExacta;
                else if (maxDistancia > 0 && dist < maxDistancia) {
                    pts += Math.round(ptsDiffExacta * ((maxDistancia - dist) / maxDistancia));
                }

                // Bonificación MVP: Si acertó el MVP oficial, suma +pctMvp% de los puntos de este partido (redondeado hacia arriba)
                if (p.mvp_oficial && pts > 0 && pctMvp > 0) {
                    const prUserLower = String(pr.Usuario || '').trim().toLowerCase();
                    const uMvpVote = userMvpVotesLookup[`${p.id_partido}_${pr.Usuario}`] || userMvpVotesLowerLookup[`${p.id_partido}_${prUserLower}`];
                    if (uMvpVote && isSameMvpPlayer(p.mvp_oficial, uMvpVote)) {
                        pts += Math.ceil(pts * (pctMvp / 100));
                    }
                }

                // Agrupar puntos por Fin de Semana de competición sincronizado (Base: Viernes 2 Octubre 2026 00:00 CEST)
                const BASE_SEASON_TS = 1790892000000;
                const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
                let jNum = 1;
                if (p.timestamp && p.timestamp >= BASE_SEASON_TS) {
                    jNum = Math.floor((p.timestamp - BASE_SEASON_TS) / ONE_WEEK_MS) + 1;
                } else {
                    jNum = parseInt(p.ronda_global) || parseInt(p.jornada_eq) || 1;
                }

                if (isFrozen && p.timestamp >= freezeCutoff) {
                    for (const lName in ligasMap) {
                        if (ligasMap[lName].includes(p.equipo_local) || ligasMap[lName].includes(p.rival)) {
                            if (ligasCongeladasSet.has(lName)) {
                                const pendKey = "_pendientes_" + lName;
                                userPointsInLiga[pr.Usuario][pendKey] = (userPointsInLiga[pr.Usuario][pendKey] || 0) + pts;
                            } else {
                                userPointsInLiga[pr.Usuario][lName] = (userPointsInLiga[pr.Usuario][lName] || 0) + pts;
                                if (statsLigas[pr.Usuario] && statsLigas[pr.Usuario][lName]) {
                                    statsLigas[pr.Usuario][lName].porJornada[jNum] = (statsLigas[pr.Usuario][lName].porJornada[jNum] || 0) + pts;
                                }
                            }
                        }
                    }
                    continue;
                }
                for (const lName in ligasMap) {
                    if (ligasMap[lName].includes(p.equipo_local) || ligasMap[lName].includes(p.rival)) {
                        userPointsInLiga[pr.Usuario][lName] = (userPointsInLiga[pr.Usuario][lName] || 0) + pts;
                        if (statsLigas[pr.Usuario] && statsLigas[pr.Usuario][lName]) {
                            statsLigas[pr.Usuario][lName].porJornada[jNum] = (statsLigas[pr.Usuario][lName].porJornada[jNum] || 0) + pts;
                        }
                    }
                }
            }
            const writeTs = Date.now();
            runInBg(context, Promise.all([
                db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(cacheKey, JSON.stringify(userPointsInLiga), writeTs).run(),
                db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(statsCacheKey, JSON.stringify(statsLigas), writeTs).run()
            ]));
        }

        // Formatear clasificaciones por liga (reutilizando allLigasRows prefetched)
        const clasificacionesFormateadas = {};
        for (const lName of misLigas) {
            const ranking = [];
            const isThisLigaFrozen = isFrozen && ligasCongeladasSet.has(lName);
            for (const row of allLigasRows) {
                const uName = row.Jugador;
                if (row[lName] && row[lName].toString().toUpperCase() === "X") {
                    ranking.push({
                        jugador: uName,
                        nombre_real: mapNombresReales[uName] || uName,
                        puntos: (userPointsInLiga[uName] && userPointsInLiga[uName][lName]) || 0,
                        puntos_pendientes: isThisLigaFrozen ? ((userPointsInLiga[uName] && userPointsInLiga[uName]["_pendientes_" + lName]) || 0) : 0
                    });
                }
            }
            ranking.sort((a, b) => b.puntos - a.puntos);
            clasificacionesFormateadas[lName] = ranking;
        }

        // Ronda abierta (jornada activa de Ajustes)
        let maxRonda = 1;
        for (const p of cartelera) {
            if (p.visibilidad === "MOSTRAR") {
                let r = parseInt(p.ronda_global);
                if (!isNaN(r) && r > maxRonda) maxRonda = r;
            }
        }
        const rondaAbierta = maxRonda.toString();

        // Fetch Notificaciones (usando filas y Cache_App prefetched)
        let notificaciones = await getNotificacionesPublicas(db, env, context, {
            notifRows: rawNotifRes ? (rawNotifRes.results || []) : null,
            hasOverride: Boolean(cacheAppRes),
            overrideRow: cacheAppMap['FREEZE_OVERRIDE'] !== undefined ? { valor: cacheAppMap['FREEZE_OVERRIDE'] } : null,
            hasAuto: Boolean(cacheAppRes),
            autoRow: cacheAppMap[autoKeyLogin] !== undefined ? { valor: cacheAppMap[autoKeyLogin] } : null
        });

        let pushEquiposCfg = {};
        if (pushRow && pushRow.Equipos_Permitidos) {
            try { pushEquiposCfg = JSON.parse(pushRow.Equipos_Permitidos); } catch(e) {}
        }
        const pushSoloAdminVal = cacheAppMap['NOTIF_SOLO_ADMIN'];
        const pushSoloAdmin = (pushSoloAdminVal !== undefined)
            ? (pushSoloAdminVal === 'SI' || pushSoloAdminVal === '1' || pushSoloAdminVal === 'true')
            : true;
        const pushConfigPayload = {
            tiene_suscripcion: Boolean(pushRow && pushRow.Suscripcion_JSON && pushRow.Suscripcion_JSON.length > 20),
            opciones_2horas: pushRow ? Boolean(pushRow.Opciones_2Horas) : true,
            opciones_viernes: pushRow ? Boolean(pushRow.Opciones_Viernes) : true,
            opciones_solo_olvidos: pushRow ? Boolean(pushRow.Opciones_SoloOlvidos) : false,
            opciones_descongelacion: (pushRow && pushRow.Opciones_Descongelacion !== undefined) ? Boolean(pushRow.Opciones_Descongelacion) : true,
            opciones_mvp: (pushRow && pushRow.Opciones_Mvp !== undefined) ? Boolean(pushRow.Opciones_Mvp) : true,
            equipos_config: pushEquiposCfg,
            equipos_permitidos: Array.isArray(pushEquiposCfg) ? pushEquiposCfg : Object.keys(pushEquiposCfg),
            public_key: (env && env.VAPID_PUBLIC_KEY) || DEFAULT_VAPID_PUBLIC,
            solo_admin: pushSoloAdmin
        };

        return jsonResponse({
            status: "success",
            usuario: usuario,
            modo_mantenimiento: mantenimientoActivo,
            notificaciones: notificaciones,
            push_config: pushConfigPayload,
            mvp_votos: misVotosMvp,
            plantilla_superliga: plantillaSuperliga,
            is_frozen: isFrozen,
            freeze_override: freezeOverride,
            ligas_congeladas: Array.from(ligasCongeladasSet),
            unfreeze_time: unfreezeTime,
            jornada: rondaAbierta,
            equipos: cartelera,
            todos_partidos: todosPartidos,
            predicciones_usuario: prediccionesUsuario,
            ligas: misLigas,
            todas_las_ligas: todasLasLigas,
            ligas_equipos: ligasEqRows,
            clasificaciones: clasificacionesFormateadas,
            stats_ligas: statsLigas,
            nombre_real: userRow["Nombre Real"] || userRow.Usuario,
            correo: userRow["Correo"] || "",
            insignias: insigniasMap,
            mi_insignia_raw: allInsignias ? allInsignias.find(i => i.Usuario === usuario) : null,
            mis_equipos_siguiendo: Object.keys(misPermisos),
            equipos_totales: misEquiposTotales,
            equipos_totales_publicos: equiposTotalesPublicos,
            puntos_reales: puntosRealesTotales,
            predicciones_totales: prediccionesTotalesMap,
            reglas: {
                sets: ptsSets,
                ganador: ptsGanador,
                diff_exacta: ptsDiffExacta,
                max_dist: maxDistancia,
                pct_mvp: pctMvp
            }
        });
    }

    
    // ADMIN: SYNC PERMISOS
    if (action === 'sync_permisos') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        
        // 1. Fetch Ligas, Ligas_Equipos
        const { results: ligasRows } = await db.prepare('SELECT * FROM "Ligas"').all();
        const { results: ligasEqRows } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
        
        // 2. Map ligas to equipos
        const ligasMap = {};
        for (const row of ligasEqRows || []) {
            const lName = row.Liga;
            ligasMap[lName] = [];
            for (const col in row) {
                if (col !== "Liga" && row[col] && row[col].toString().toUpperCase() === "X") {
                    ligasMap[lName].push(col);
                }
            }
        }
        
        // 3. For each user, figure out which teams they should have 'X'
        const stmts = [];
        for (const userLigas of ligasRows || []) {
            const jName = userLigas.Jugador;
            const equiposToPermit = new Set();
            for (const col in userLigas) {
                if (col !== "Jugador" && userLigas[col] && userLigas[col].toString().toUpperCase() === "X") {
                    if (ligasMap[col]) {
                        ligasMap[col].forEach(eq => equiposToPermit.add(eq));
                    }
                }
            }
            // Generate UPDATE statements for this user
            for (const team of equiposToPermit) {
                stmts.push(db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = 'X' WHERE "Jugador" = ?`).bind(jName));
                stmts.push(db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = 'X' WHERE "Usuario" = ?`).bind(jName));
            }
        }
        
        await flushBatch(db, stmts);
        
        return jsonResponse({ status: 'success', message: '¡Permisos sincronizados! Las X han sido rellenadas físicamente en la base de datos.' });
    }
    
    if (action === 'fix_timestamps') {
        const { results: rawPartidos } = await db.prepare('SELECT "ID_Partido", "Fecha", "Estado", "timestamp" FROM "Ajustes"').all();
        const fixStmts = [];
        for (const r of rawPartidos || []) {
            if (r.Estado === 'CERRADO') continue;
            if (r.Fecha && r.ID_Partido) {
                const parts = r.Fecha.trim().split(' ');
                if (parts.length >= 1) {
                    const dateParts = parts[0].split('/');
                    if (dateParts.length === 3) {
                        const day = parseInt(dateParts[0], 10);
                        const month = parseInt(dateParts[1], 10) - 1;
                        const year = parseInt(dateParts[2], 10);
                        let hour = 0, minute = 0;
                        if (parts.length > 1) {
                            const timeParts = parts[1].split(':');
                            if (timeParts.length >= 2) {
                                hour = parseInt(timeParts[0], 10);
                                minute = parseInt(timeParts[1], 10);
                            }
                        }
                        const newTs = getMadridTimestamp(year, month, day, hour, minute);
                        if (r.timestamp !== newTs) {
                            fixStmts.push(db.prepare('UPDATE "Ajustes" SET timestamp = ? WHERE "ID_Partido" = ?').bind(newTs, r.ID_Partido));
                        }
                    }
                }
            }
        }
        const updatedCount = fixStmts.length;
        fixStmts.push(db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'"));
        try {
            await flushBatch(db, fixStmts);
        } catch(e) {
            if (updatedCount > 0) {
                await flushBatch(db, fixStmts.slice(0, updatedCount));
            }
        }
        return jsonResponse({ status: 'success', message: 'Timestamps corregidos y Caché borrada: ' + updatedCount });
    }

    if (action === 'save_ligas_config') {
        const { config } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const cfgStmts = [];
        for (const lName in config || {}) {
            const val = config[lName] ? 'SI' : 'NO';
            cfgStmts.push(db.prepare('INSERT OR REPLACE INTO "Ligas_Config" ("Liga", "Congelar") VALUES (?, ?)').bind(lName, val));
        }
        cfgStmts.push(db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'"));
        await flushBatch(db, cfgStmts);
        return jsonResponse({ status: 'success', message: 'Ajuste de ligas guardado y caché reseteada.' });
    }

    if (action === 'set_freeze_override') {
        const { mode } = body; // 'UNFREEZE', 'FREEZE', o 'AUTO'
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        if (mode === 'AUTO' || !mode) {
            await db.prepare("DELETE FROM Cache_App WHERE clave = 'FREEZE_OVERRIDE'").run();
        } else {
            // Calcular fecha de expiración automática: el próximo martes a las 00:00 UTC
            // de modo que el siguiente fin de semana vuelva a funcionar 100% automático sin tener que acordarse
            const expireDate = new Date();
            const currDay = expireDate.getUTCDay(); // 0=Dom, 1=Lun...
            let daysUntilTuesday = (2 - currDay + 7) % 7;
            if (daysUntilTuesday === 0) daysUntilTuesday = 7;
            expireDate.setUTCDate(expireDate.getUTCDate() + daysUntilTuesday);
            expireDate.setUTCHours(0, 0, 0, 0);

            const overrideData = JSON.stringify({
                mode: mode,
                set_by: usuario,
                set_at: Date.now(),
                expires_at: expireDate.getTime()
            });
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor) VALUES ('FREEZE_OVERRIDE', ?)").bind(overrideData).run();
        }

        // Limpiar caché de clasificaciones para que el cambio surta efecto de inmediato
        try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}

        if (mode === 'UNFREEZE') {
            const lunesClave = getLunesSemanaClave(new Date());
            const autoKey = 'AUTO_UNFREEZE_' + lunesClave;

            try {
                await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(autoKey, 'DONE_MANUAL_' + Date.now(), Date.now()).run();
            } catch(e) {}

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

            const pushPromise = broadcastPushToAll(db, env, {
                title: titUnfreeze,
                body: msgUnfreeze,
                url: '/?tab=clasificaciones',
                tipo: 'UNFREEZE_MANUAL'
            });
            if (context && typeof context.waitUntil === 'function') {
                context.waitUntil(pushPromise);
            } else {
                await pushPromise.catch(e => console.warn(e));
            }
        }

        let mensajeExito = "Horario restablecido a AUTOMÁTICO.";
        if (mode === 'UNFREEZE') mensajeExito = "Clasificaciones DESCONGELADAS con éxito. Todos los puntos se muestran en vivo.";
        if (mode === 'FREEZE') mensajeExito = "Clasificaciones CONGELADAS manualmente.";

        return jsonResponse({ status: 'success', message: mensajeExito, mode: mode });
    }

    if (action === 'clear_cache') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        
        try { 
            await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); 
        } catch(e) {}
        
        return jsonResponse({ status: 'success', message: 'Caché borrada. Las clasificaciones se recalcularán al recargar la web.' });
    }

    // ADMIN: ADD USER
    if (action === 'add_user') {
        const { new_u, new_p, new_n, ligas_seleccionadas } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 401);
        
        const hasSelectedLigas = Array.isArray(ligas_seleccionadas) && ligas_seleccionadas.length > 0;
        const [exist, ligasEqRes] = await Promise.all([
            db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ?').bind(new_u).first(),
            hasSelectedLigas ? db.prepare('SELECT * FROM "Ligas_Equipos"').all() : Promise.resolve(null)
        ]);
        if (exist) return jsonResponse({ status: 'error', message: 'El usuario ya existe' });

        const hashedNewP = await hashPassword(new_p);
        const addStmts = [
            db.prepare('INSERT INTO "Usuarios" ("Usuario", "Password", "Nombre Real") VALUES (?, ?, ?)').bind(new_u, hashedNewP, new_n || new_u),
            db.prepare('INSERT INTO "Permisos_Equipos" ("Jugador") VALUES (?)').bind(new_u),
            db.prepare('INSERT INTO "Permisos_Secreta" ("Usuario") VALUES (?)').bind(new_u),
            db.prepare('INSERT INTO "Insignias" ("Usuario") VALUES (?)').bind(new_u),
            db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(new_u)
        ];

        // Ligas and Auto-Assign Permissions
        if (hasSelectedLigas) {
            for (const l of ligas_seleccionadas) {
                addStmts.push(db.prepare(`UPDATE "Ligas" SET "${l}" = 'X' WHERE "Jugador" = ?`).bind(new_u));
            }
            const allLigasEquipos = (ligasEqRes && ligasEqRes.results) || [];
            const equiposToPermit = new Set();
            for (const row of allLigasEquipos) {
                const lName = row.Liga;
                if (ligas_seleccionadas.includes(lName)) {
                    for (const col of Object.keys(row)) {
                        if (col !== "Liga" && row[col] && row[col].toString().toUpperCase() === "X") {
                            equiposToPermit.add(col);
                        }
                    }
                }
            }
            for (const team of equiposToPermit) {
                addStmts.push(db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = 'X' WHERE "Jugador" = ?`).bind(new_u));
                addStmts.push(db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = 'X' WHERE "Usuario" = ?`).bind(new_u));
            }
        }

        await flushBatch(db, addStmts);
        return jsonResponse({ status: 'success', message: 'Usuario creado con éxito en la BD de Cloudflare' });
    }

    // PUBLIC: ESTADO MODO MANTENIMIENTO
    if (action === 'get_mantenimiento_status') {
        const activo = await isModoMantenimientoActivo(db);
        return jsonResponse({ status: 'success', activo });
    }

    // ADMIN: TOGGLE MODO MANTENIMIENTO
    if (action === 'toggle_modo_mantenimiento') {
        const authUser = await getAuthUser();
        if (!authUser) return jsonResponse({ status: 'error', message: 'Credenciales de administrador incorrectas.' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const isAdmin = adminCheck && adminCheck["Admin Web"] === "X";
        if (!isAdmin) return jsonResponse({ status: 'error', message: 'Acceso denegado. Se requieren permisos de administrador.' }, 403);

        const nuevoActivo = (body.activo === true || body.activo === 1 || body.activo === '1');
        const valStr = nuevoActivo ? '1' : '0';
        await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('MODO_MANTENIMIENTO', ?, ?)")
            .bind(valStr, Date.now()).run();

        return jsonResponse({
            status: 'success',
            activo: nuevoActivo,
            message: nuevoActivo ? 'Modo mantenimiento ACTIVADO en la plataforma' : 'Modo mantenimiento DESACTIVADO en la plataforma'
        });
    }

    // EXPORT DATA: OBTENER PRONÓSTICOS DE UN PARTIDO
    if (action === 'get_pronosticos_partido_data') {
        try {
            const idPartido = (body.id_partido || "").trim();
            if (!idPartido) return jsonResponse({ status: 'error', message: 'ID de partido requerido' }, 400);

            const partido = await db.prepare('SELECT * FROM "Ajustes" WHERE "ID_Partido" = ?').bind(idPartido).first();

            // Consulta optimizada con LEFT JOIN: solo lee las filas de este partido en lugar de toda la tabla de usuarios
            const { results: rawPronosticos } = await db.prepare(`
                SELECT 
                    p."Timestamp" as timestamp,
                    p."Usuario" as usuario,
                    COALESCE(u."Nombre Real", p."Usuario") as nombre_real,
                    p."Sets" as sets,
                    p."Puntos Dif" as puntos_dif,
                    p."a favor o en contra del local" as signo
                FROM "Porras" p
                LEFT JOIN "Usuarios" u ON p."Usuario" = u."Usuario"
                WHERE p."ID Partido" = ?
            `).bind(idPartido).all();

            const pronosticos = (rawPronosticos || []).map(pr => ({
                usuario: pr.usuario,
                nombre_real: pr.nombre_real || pr.usuario,
                sets: pr.sets || '',
                puntos_dif: pr.puntos_dif !== undefined && pr.puntos_dif !== null ? pr.puntos_dif : 0,
                signo: pr.signo || '',
                timestamp: pr.timestamp || ''
            }));

            // Ordenar por usuario
            pronosticos.sort((a, b) => (a.usuario || '').localeCompare(b.usuario || ''));

            return jsonResponse({
                status: 'success',
                id_partido: idPartido,
                partido: partido || null,
                total: pronosticos.length,
                pronosticos: pronosticos
            });
        } catch(err) {
            return jsonResponse({ status: 'error', message: err.message, stack: err.stack }, 500);
        }
    }

    // ADMIN: RESET USER PASSWORD
    if (action === 'admin_reset_password') {
        const authUser = await getAuthUser();
        if (!authUser) return jsonResponse({ status: 'error', message: 'Credenciales de administrador incorrectas.' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const isAdmin = adminCheck && adminCheck["Admin Web"] === "X";
        if (!isAdmin) return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const targetUser = (body.target_user || "").trim();
        const newPassword = (body.new_password || "").trim();

        if (!targetUser) {
            return jsonResponse({ status: 'error', message: 'Debes indicar el usuario al que cambiar la contraseña.' });
        }
        if (!newPassword || newPassword.length < 3) {
            return jsonResponse({ status: 'error', message: 'La contraseña debe tener al menos 3 caracteres.' });
        }

        const targetRow = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ?').bind(targetUser).first();
        if (!targetRow) {
            return jsonResponse({ status: 'error', message: `El usuario "${targetUser}" no existe en la base de datos.` });
        }

        const hashedNew = await hashPassword(newPassword);
        await db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(hashedNew, targetUser).run();

        return jsonResponse({
            status: 'success',
            message: `Contraseña de @${targetUser} restablecida correctamente a: ${newPassword}`,
            target_user: targetUser
        });
    }

    // ADMIN: SAVE RESULTADO OFICIAL
    if (action === 'save_resultado_admin') {
        const { id_partido, sets, parciales, streaming, mvp_candidatos, mvp_oficial, mvp_stats, mvp_publicacion_ts } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP", "Permiso_Resultados" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const isAdmin = adminCheck && adminCheck["Admin Web"] === "X";
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        const resPermStr = (adminCheck && adminCheck["Permiso_Resultados"]) ? adminCheck["Permiso_Resultados"] : "";
        
        // Verificar si tiene permiso de resultados para este partido
        let canEditMatch = isAdmin;
        let preloadedMatchRow = null;
        if (!canEditMatch && resPermStr) {
            if (resPermStr === "TODOS" || resPermStr === "X") {
                canEditMatch = true;
            } else {
                preloadedMatchRow = await db.prepare('SELECT "Equipo_Local", "Rival", "Categoria" FROM "Ajustes" WHERE "ID_Partido" = ?').bind(id_partido).first();
                if (preloadedMatchRow) {
                    const eqLoc = (preloadedMatchRow["Equipo_Local"] || "").toLowerCase();
                    const eqRiv = (preloadedMatchRow["Rival"] || "").toLowerCase();
                    const pList = resPermStr.toLowerCase().split(',').map(s => s.trim());
                    if (pList.some(p => eqLoc.includes(p) || eqRiv.includes(p))) {
                        canEditMatch = true;
                    }
                }
            }
        }
        
        const isMvpAction = (mvp_candidatos !== undefined || body.mvp_visible !== undefined || mvp_oficial !== undefined);
        if (!canEditMatch && hasMvpPerm && isMvpAction) {
            canEditMatch = true;
        }

        if (!canEditMatch) {
            return jsonResponse({ status: 'error', message: 'No tienes permisos para modificar los resultados o datos de este equipo/partido.' }, 403);
        }

        const candStr = Array.isArray(mvp_candidatos) ? JSON.stringify(mvp_candidatos) : (mvp_candidatos || '');
        const statsStr = Array.isArray(mvp_stats) ? JSON.stringify(mvp_stats) : (mvp_stats || '');
        const { mvp_visible, mvp_cierre_votacion_ts } = body;
        const visibleVal = (mvp_visible === false || mvp_visible === 0 || mvp_visible === '0' || mvp_visible === 'OCULTAR') ? 0 : 1;

        try {
            const nowTs = Date.now();
            const nowFechaHora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
            const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
            
            const buildSaveStmt = () => {
                if (!isMvpAction) {
                    if (exist) {
                        const finalSets = (sets !== undefined) ? (sets || '') : (exist["Sets Oficial"] || '');
                        const finalParc = (parciales !== undefined) ? (parciales || '') : (exist["Parciales Oficial"] || '');
                        const finalStream = (streaming !== undefined) ? (streaming || '') : (exist["Streaming"] || '');
                        return db.prepare('UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ? WHERE "ID Partido" = ?')
                            .bind(finalSets, finalParc, finalStream, usuario, nowTs, nowFechaHora, id_partido);
                    }
                    return db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?)')
                        .bind(id_partido, sets || '', parciales || '', streaming || '', usuario, nowTs, nowFechaHora);
                }

                if (exist) {
                    const finalSets = (sets !== undefined) ? (sets || '') : (exist["Sets Oficial"] || '');
                    const finalParc = (parciales !== undefined) ? (parciales || '') : (exist["Parciales Oficial"] || '');
                    const finalStream = (streaming !== undefined) ? (streaming || '') : (exist["Streaming"] || '');
                    const finalCand = (mvp_candidatos !== undefined) ? candStr : (exist["mvp_candidatos"] || '');

                    let sql = 'UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ?, "mvp_candidatos" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ?';
                    const params = [finalSets, finalParc, finalStream, finalCand, usuario, nowTs, nowFechaHora];
                    if (mvp_oficial !== undefined) {
                        sql += ', "mvp_oficial" = ?, "mvp_proclamado_ts" = ?';
                        params.push(mvp_oficial || '');
                        params.push((mvp_oficial && String(mvp_oficial).trim() !== '') ? Date.now() : 0);
                    }
                    if (mvp_stats !== undefined) {
                        sql += ', "mvp_stats" = ?';
                        params.push(statsStr);
                    }
                    if (mvp_visible !== undefined) {
                        sql += ', "mvp_visible" = ?';
                        params.push(visibleVal);
                    }
                    if (mvp_cierre_votacion_ts !== undefined) {
                        sql += ', "mvp_cierre_votacion_ts" = ?';
                        params.push(parseInt(mvp_cierre_votacion_ts) || 0);
                    }
                    if (mvp_publicacion_ts !== undefined) {
                        sql += ', "mvp_publicacion_ts" = ?';
                        params.push(parseInt(mvp_publicacion_ts) || 0);
                    }
                    sql += ' WHERE "ID Partido" = ?';
                    params.push(id_partido);
                    return db.prepare(sql).bind(...params);
                }

                const proclamadoTs = (mvp_oficial && String(mvp_oficial).trim() !== '') ? Date.now() : 0;
                const pubTs = (mvp_publicacion_ts !== undefined) ? (parseInt(mvp_publicacion_ts) || 0) : 0;
                const cierreTs = (mvp_cierre_votacion_ts !== undefined) ? (parseInt(mvp_cierre_votacion_ts) || 0) : 0;
                return db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "mvp_candidatos", "mvp_oficial", "mvp_stats", "mvp_visible", "mvp_proclamado_ts", "mvp_cierre_votacion_ts", "mvp_publicacion_ts", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    .bind(id_partido, sets || '', parciales || '', streaming || '', candStr, mvp_oficial || '', statsStr, visibleVal, proclamadoTs, cierreTs, pubTs, usuario, nowTs, nowFechaHora);
            };

            const postStmts = [buildSaveStmt()];
            if (sets) postStmts.push(db.prepare('UPDATE "Ajustes" SET "Estado" = \'CERRADO\' WHERE "ID_Partido" = ?').bind(id_partido));
            postStmts.push(db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'"));
            if (visibleVal === 0) {
                postStmts.push(db.prepare("DELETE FROM Cache_App WHERE clave = ?").bind('NOTIF_MVP_OPEN_' + id_partido));
            }

            try {
                await flushBatch(db, postStmts);
            } catch (saveErr) {
                if (isSchemaMissingErr(saveErr)) {
                    await ensureResultadosMvpSchema(db);
                    await flushBatch(db, postStmts);
                } else {
                    throw saveErr;
                }
            }

            // Si la votación de MVP se oculta o se proclama ganador oficial, desactivar la notificación activa
            if (visibleVal === 0 || (mvp_oficial && String(mvp_oficial).trim() !== '')) {
                try {
                    await db.prepare('UPDATE "Notificaciones" SET "Activa" = 0 WHERE "Titulo" LIKE \'%MVP VALCYL%\'').run();
                } catch(e) {}
            }

            // Comprobar si se ha iniciado/publicado la votación del MVP VALCYL de SM2
            if (isMvpAction && visibleVal === 1 && candStr && candStr.length > 5 && candStr !== '[]') {
                try {
                    const notifKey = 'NOTIF_MVP_OPEN_' + id_partido;
                    const [mMatch, alreadyNotif] = await Promise.all([
                        preloadedMatchRow
                            ? Promise.resolve(preloadedMatchRow)
                            : db.prepare('SELECT "Equipo_Local", "Rival", "Categoria" FROM "Ajustes" WHERE "ID_Partido" = ?').bind(id_partido).first(),
                        db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(notifKey).first().catch(() => null)
                    ]);
                    const cat = String(mMatch?.Categoria || '').toUpperCase();
                    const eqLoc = String(mMatch?.Equipo_Local || '').toUpperCase();
                    const isSM2 = cat.includes('SM2') || cat.includes('SUPERLIGA') || String(id_partido).startsWith('RFEVB_') || eqLoc.includes('VALCYL') || eqLoc.includes('UNIVERSIDAD DE VALLADOLID');

                    if (isSM2 && !alreadyNotif) {
                        await flushBatch(db, [
                            db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(notifKey, String(Date.now()), Date.now()),
                            db.prepare('UPDATE "Notificaciones" SET "Activa" = 0 WHERE "Titulo" LIKE \'%MVP VALCYL%\'')
                        ]).catch(async () => {
                            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(notifKey, String(Date.now()), Date.now()).run();
                        });

                        let horaCierreStr = "las 12:00";
                        const cierreTs = parseInt(mvp_cierre_votacion_ts) || (exist ? parseInt(exist.mvp_cierre_votacion_ts) : 0);
                        if (cierreTs > 0) {
                            try {
                                const dCierre = new Date(cierreTs);
                                const hh = dCierre.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
                                horaCierreStr = `las ${hh}`;
                            } catch(e) {}
                        }

                        const rivalStr = (mMatch && mMatch.Rival) ? ` contra ${mMatch.Rival}` : '';
                        const titMVP = '👑 ¡Votación MVP VALCYL abierta!';
                        const msgMVP = `¡Ya puedes votar al MVP VALCYL de Superliga 2 Masculino${rivalStr}! Entra a la Cartelera para apoyar a tu jugador favorito. Recuerda que tienes hasta ${horaCierreStr} para emitir tu voto.`;

                        await crearNotificacion(db, {
                            titulo: titMVP,
                            mensaje: msgMVP,
                            tipo: 'Aviso',
                            importancia: 'ALTA',
                            visibilidad: 'MOSTRAR',
                            activa: 1
                        });

                        const pushPromise = broadcastPushToAll(db, env, {
                            title: titMVP,
                            body: msgMVP,
                            url: `/?partido=${id_partido}`,
                            tipo: 'MVP_OPEN'
                        });
                        if (context && typeof context.waitUntil === 'function') {
                            context.waitUntil(pushPromise);
                        } else {
                            await pushPromise.catch(e => console.warn(e));
                        }
                    }
                } catch(eMvpNotif) {
                    console.warn("Error generando notificacion de MVP VALCYL:", eMvpNotif);
                }
            }

            return jsonResponse({ status: 'success', message: 'Resultados y datos guardados con éxito' });
        } catch(sqlErr) {
            console.error("Error SQL en save_resultado_admin:", sqlErr);
            return jsonResponse({ status: 'error', message: 'Error de base de datos: ' + sqlErr.message }, 500);
        }
    }

    // ADMIN: GUARDAR / PROGRAMAR HORARIOS DE CIERRE DE VOTACIÓN Y PUBLICACIÓN DEL MVP
    if (action === 'set_mvp_publicacion_ts') {
        const { id_partido, mvp_publicacion_ts, mvp_cierre_votacion_ts } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para configurar el MVP.' }, 403);

        const pubTs = parseInt(mvp_publicacion_ts) || 0;
        const cierreTs = parseInt(mvp_cierre_votacion_ts) || 0;
        const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();

        let mainStmt;
        if (exist) {
            const sqlSet = [];
            const bindParams = [];
            if (mvp_cierre_votacion_ts !== undefined) {
                sqlSet.push('"mvp_cierre_votacion_ts" = ?');
                bindParams.push(cierreTs);
            }
            if (mvp_publicacion_ts !== undefined) {
                sqlSet.push('"mvp_publicacion_ts" = ?');
                bindParams.push(pubTs);
            }
            sqlSet.push('"mvp_visible" = 1');
            bindParams.push(id_partido);
            mainStmt = db.prepare('UPDATE "Resultados_Oficiales" SET ' + sqlSet.join(', ') + ' WHERE "ID Partido" = ?').bind(...bindParams);
        } else {
            mainStmt = db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "mvp_cierre_votacion_ts", "mvp_publicacion_ts", "mvp_visible") VALUES (?, ?, ?, 1)').bind(id_partido, cierreTs, pubTs);
        }

        const stmts = [
            mainStmt,
            db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'")
        ];
        try {
            await flushBatch(db, stmts);
        } catch(err) {
            if (isSchemaMissingErr(err)) {
                await ensureResultadosMvpSchema(db);
                await flushBatch(db, stmts);
            } else {
                throw err;
            }
        }

        return jsonResponse({ status: 'success', message: 'Horarios de votación y publicación guardados con éxito', mvp_cierre_votacion_ts: cierreTs, mvp_publicacion_ts: pubTs });
    }

    // ADMIN: SET MVP OFICIAL DE JORNADA / PARTIDO
    if (action === 'set_mvp_oficial') {
        const { id_partido, mvp_oficial, mvp_stats, mvp_publicacion_ts, mvp_mostrar_porcentajes } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para proclamar el MVP.' }, 403);

        const statsStr = Array.isArray(mvp_stats) ? JSON.stringify(mvp_stats) : (mvp_stats || '');
        const proclamadoTs = (mvp_oficial && String(mvp_oficial).trim() !== '') ? Date.now() : 0;
        const publicacionTs = (mvp_publicacion_ts !== undefined && mvp_publicacion_ts !== null) ? (parseInt(mvp_publicacion_ts) || 0) : (proclamadoTs > 0 ? proclamadoTs : 0);
        const mostrarPorcentajesVal = (mvp_mostrar_porcentajes === false || mvp_mostrar_porcentajes === 0 || mvp_mostrar_porcentajes === '0') ? 0 : 1;

        const [exist, votosRes] = await Promise.all([
            db.prepare('SELECT mvp_candidatos FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first(),
            db.prepare('SELECT jugador, COUNT(*) as total FROM MVP_Votos WHERE id_partido = ? GROUP BY jugador ORDER BY total DESC').bind(id_partido).all().catch(() => null)
        ]);
        let candsList = [];
        if (exist && exist.mvp_candidatos) {
            try { candsList = JSON.parse(exist.mvp_candidatos); } catch(e) { candsList = []; }
        }

        const votosList = (votosRes && votosRes.results) || [];
        const recuentoList = buildMvpVotesRecuento(candsList, votosList);
        const recuentoJson = JSON.stringify(recuentoList);

        const mainStmt = exist
            ? db.prepare('UPDATE "Resultados_Oficiales" SET "mvp_oficial" = ?, "mvp_stats" = ?, "mvp_proclamado_ts" = ?, "mvp_publicacion_ts" = ?, "mvp_votos_recuento" = ?, "mvp_mostrar_porcentajes" = ? WHERE "ID Partido" = ?').bind(mvp_oficial || '', statsStr, proclamadoTs, publicacionTs, recuentoJson, mostrarPorcentajesVal, id_partido)
            : db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "mvp_oficial", "mvp_stats", "mvp_proclamado_ts", "mvp_publicacion_ts", "mvp_votos_recuento", "mvp_mostrar_porcentajes") VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id_partido, mvp_oficial || '', statsStr, proclamadoTs, publicacionTs, recuentoJson, mostrarPorcentajesVal);

        const stmts = [
            mainStmt,
            db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'")
        ];
        try {
            await flushBatch(db, stmts);
        } catch(err) {
            if (isSchemaMissingErr(err)) {
                await ensureResultadosMvpSchema(db);
                await flushBatch(db, stmts);
            } else {
                throw err;
            }
        }

        if (proclamadoTs > 0) {
            try {
                await db.prepare('UPDATE "Notificaciones" SET "Activa" = 0 WHERE "Titulo" LIKE \'%MVP VALCYL%\'').run();
            } catch(e) {}
        }

        return jsonResponse({ status: 'success', message: 'Ganador MVP, estadísticas y recuento de votos reales guardados con éxito en la base de datos', mvp_proclamado_ts: proclamadoTs, mvp_publicacion_ts: publicacionTs, recuento: recuentoList });
    }

    // VOTAR MVP DE PARTIDO
    if (action === 'vote_mvp') {
        const { id_partido, jugador } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        if (!id_partido || !jugador) return jsonResponse({ status: 'error', message: 'Faltan datos de votación' }, 400);

        // Leer estado de votación y voto previo en paralelo
        let [roMatch, prevVote] = await Promise.all([
            db.prepare('SELECT mvp_cierre_votacion_ts, mvp_publicacion_ts, mvp_oficial, mvp_visible FROM Resultados_Oficiales WHERE "ID Partido" = ?').bind(id_partido).first()
                .catch(async (err) => {
                    if (isSchemaMissingErr(err)) {
                        await ensureResultadosMvpSchema(db);
                        return db.prepare('SELECT mvp_cierre_votacion_ts, mvp_publicacion_ts, mvp_oficial, mvp_visible FROM Resultados_Oficiales WHERE "ID Partido" = ?').bind(id_partido).first();
                    }
                    throw err;
                }),
            db.prepare('SELECT jugador, timestamp FROM MVP_Votos WHERE id_partido = ? AND usuario = ?').bind(id_partido, usuario).first()
                .catch(() => null)
        ]);

        if (roMatch) {
            if (roMatch.mvp_visible === 0 || roMatch.mvp_visible === '0' || roMatch.mvp_visible === false) {
                return jsonResponse({ status: 'error', message: 'Las votaciones para el MVP no están activas.' }, 403);
            }
            const nowMs = Date.now();
            let cTs = roMatch.mvp_cierre_votacion_ts ? parseInt(roMatch.mvp_cierre_votacion_ts) : 0;
            let pTs = roMatch.mvp_publicacion_ts ? parseInt(roMatch.mvp_publicacion_ts) : 0;
            if (!cTs && pTs > 0) {
                cTs = pTs - 3 * 3600000;
            }
            if (cTs > 0 && nowMs >= cTs) {
                return jsonResponse({ status: 'error', message: 'Las votaciones para el MVP ya están cerradas.' }, 403);
            }
            if (roMatch.mvp_oficial && (pTs <= 0 || nowMs >= pTs)) {
                return jsonResponse({ status: 'error', message: 'El ganador del MVP ya ha sido publicado y la votación está cerrada.' }, 403);
            }
        }

        // Protección contra saturación: comprobar si el usuario ya votó hace menos de 3 segundos a este partido
        const now = Date.now();
        if (prevVote) {
            if (prevVote.jugador === jugador) {
                return jsonResponse({ status: 'success', message: 'Voto ya registrado.' });
            }
            if (prevVote.timestamp && (now - prevVote.timestamp) < 3000) {
                return jsonResponse({ status: 'error', message: 'Por favor, espera unos segundos antes de volver a cambiar tu voto.' }, 429);
            }
        }

        const formatter = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const fechaHoraStr = formatter.format(new Date(now));
        const saveVote = () => db.prepare('INSERT OR REPLACE INTO MVP_Votos (id_partido, usuario, jugador, timestamp, fecha_hora) VALUES (?, ?, ?, ?, ?)').bind(id_partido, usuario, jugador, now, fechaHoraStr).run();
        try {
            await saveVote();
        } catch(err) {
            if (isSchemaMissingErr(err)) {
                await ensureMvpVotosSchema(db);
                await saveVote();
            } else {
                throw err;
            }
        }
        return jsonResponse({ status: 'success', message: '¡Voto registrado para ' + jugador + '!' });
    }

    // ADMIN: OBTENER RECUENTO DE VOTOS MVP DE UN PARTIDO
    if (action === 'get_mvp_votos_summary') {
        const { id_partido } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para ver el recuento de MVP.' }, 403);

        const { results: rawVotos } = await db.prepare('SELECT jugador, COUNT(*) as total FROM MVP_Votos WHERE id_partido = ? GROUP BY jugador ORDER BY total DESC').bind(id_partido).all();
        const votosMerged = buildMvpVotesRecuento([], rawVotos || []).sort((a, b) => (b.total || 0) - (a.total || 0));
        return jsonResponse({ status: 'success', votos: votosMerged, raw_votos: rawVotos || [] });
    }

    // ADMIN: GESTIONAR PLANTILLA SUPERLIGA 2 MASCULINO
    if (action === 'save_plantilla_superliga') {
        const { jugadores } = body; // Array de { id?: number, dorsal: number, nombre: string, apodo: string, posicion: string, usuario: string }
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para modificar la plantilla o MVP.' }, 403);

        if (Array.isArray(jugadores)) {
            const nowTs = Date.now();
            const stmts = [db.prepare('DELETE FROM Plantilla_Superliga_2_Masc')];
            for (const j of jugadores) {
                const dor = parseInt(j.dorsal);
                const nom = (j.nombre || '').trim();
                const apod = (j.apodo || '').trim();
                const pos = (j.posicion || '').trim();
                const usr = (j.usuario || '').trim() || null;
                const pId = parseInt(j.id);
                if (!isNaN(dor) && nom) {
                    if (!isNaN(pId) && pId > 0) {
                        stmts.push(db.prepare('INSERT OR REPLACE INTO Plantilla_Superliga_2_Masc (id, dorsal, nombre, apodo, posicion, usuario, fecha_alta) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(pId, dor, nom, apod, pos, usr, nowTs));
                    } else {
                        stmts.push(db.prepare('INSERT INTO Plantilla_Superliga_2_Masc (dorsal, nombre, apodo, posicion, usuario, fecha_alta) VALUES (?, ?, ?, ?, ?, ?)').bind(dor, nom, apod, pos, usr, nowTs));
                    }
                }
            }

            try {
                await flushBatch(db, stmts);
            } catch (err) {
                if (isSchemaMissingErr(err)) {
                    await db.prepare('CREATE TABLE IF NOT EXISTS Plantilla_Superliga_2_Masc (id INTEGER PRIMARY KEY AUTOINCREMENT, dorsal INTEGER NOT NULL, nombre TEXT NOT NULL, apodo TEXT, posicion TEXT, usuario TEXT, fecha_alta INTEGER)').run();
                    try {
                        const info = await db.prepare('PRAGMA table_info(Plantilla_Superliga_2_Masc)').all();
                        const hasIdCol = (info.results || []).some(col => col.name === 'id');
                        if (!hasIdCol) {
                            await db.prepare('ALTER TABLE Plantilla_Superliga_2_Masc RENAME TO _old_plantilla_sm2').run();
                            await db.prepare('CREATE TABLE Plantilla_Superliga_2_Masc (id INTEGER PRIMARY KEY AUTOINCREMENT, dorsal INTEGER NOT NULL, nombre TEXT NOT NULL, apodo TEXT, posicion TEXT, usuario TEXT, fecha_alta INTEGER)').run();
                            await db.prepare('INSERT INTO Plantilla_Superliga_2_Masc (dorsal, nombre, apodo, posicion, usuario, fecha_alta) SELECT dorsal, nombre, apodo, posicion, usuario, ? FROM _old_plantilla_sm2').bind(nowTs).run();
                            await db.prepare('DROP TABLE IF EXISTS _old_plantilla_sm2').run();
                        }
                    } catch(migErr) {}
                    await flushBatch(db, stmts);
                } else {
                    throw err;
                }
            }
        }
        return jsonResponse({ status: 'success', message: 'Plantilla de Superliga 2 Masculino actualizada con éxito.' });
    }

    
    // BUZÓN DE SUGERENCIAS Y REPORTE DE ERRORES (GUARDADO EN BASE DE DATOS)
    if (action === 'enviar_sugerencia' || action === 'submit_feedback') {
        const { tipo, mensaje } = body;
        const targetUser = usuario || body.usuario || 'Invitado';

        if (!mensaje || !mensaje.trim()) {
            return jsonResponse({ status: 'error', message: 'El mensaje no puede estar vacío.' }, 400);
        }

        const now = new Date();
        const fechaHora = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
        const ts = Date.now();
        const insertSug = () => db.prepare(`INSERT INTO "Sugerencias_Errores" ("usuario", "tipo", "mensaje", "fecha_hora", "timestamp", "estado") VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(targetUser, tipo || 'Sugerencia', mensaje.trim(), fechaHora, ts, 'PENDIENTE').run();

        try {
            await insertSug();
            return jsonResponse({ status: 'success', message: '¡Muchas gracias! Tu mensaje ha sido enviado correctamente.' });
        } catch(e) {
            if (isSchemaMissingErr(e)) {
                try {
                    await ensureSugerenciasSchema(db);
                    await insertSug();
                    return jsonResponse({ status: 'success', message: '¡Muchas gracias! Tu mensaje ha sido enviado correctamente.' });
                } catch(e2) {
                    return jsonResponse({ status: 'error', message: 'Error al guardar en la base de datos: ' + e2.message }, 500);
                }
            }
            return jsonResponse({ status: 'error', message: 'Error al guardar en la base de datos: ' + e.message }, 500);
        }
    }

    if (action === 'get_sugerencias') {
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos de administrador'}, 403);

        try {
            const { results } = await db.prepare('SELECT * FROM "Sugerencias_Errores" ORDER BY id DESC LIMIT 50').all();
            return jsonResponse({ status: 'success', sugerencias: results || [] });
        } catch(e) {
            if (isSchemaMissingErr(e)) {
                try {
                    await ensureSugerenciasSchema(db);
                    return jsonResponse({ status: 'success', sugerencias: [] });
                } catch(e2) {
                    return jsonResponse({ status: 'error', message: e2.message }, 500);
                }
            }
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === 'marcar_sugerencia_estado' || action === 'update_sugerencia_estado') {
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos de administrador'}, 403);

        const idSug = body.id;
        const nuevoEstado = (body.nuevo_estado || 'LEÍDO').toUpperCase();
        if (!idSug) return jsonResponse({ status: 'error', message: 'ID de sugerencia requerido' }, 400);

        try {
            await db.prepare('UPDATE "Sugerencias_Errores" SET "estado" = ? WHERE "id" = ?').bind(nuevoEstado, idSug).run();
            return jsonResponse({ status: 'success', message: `Estado actualizado a ${nuevoEstado}`, nuevo_estado: nuevoEstado });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    // SAVE EMAIL
    
    
    if (action === 'request_name_change') {
        const { new_usuario, new_nombre } = body;
        
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        if (!new_usuario && !new_nombre) {
            return jsonResponse({status: 'error', message: 'Faltan datos'}, 400);
        }

        if (new_usuario) {
            const check = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE LOWER("Usuario") = LOWER(?)').bind(new_usuario).first();
            if (check) return jsonResponse({status: 'error', message: 'Ese nombre de usuario ya está cogido.'}, 400);
            
            await db.prepare('DELETE FROM "Peticiones_Nombre" WHERE "Usuario Actual" = ?').bind(usuario).run();
            await db.prepare('INSERT INTO "Peticiones_Nombre" ("Usuario Actual", "Nuevo Usuario Sol", "Nuevo Nombre Sol", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?)')
                .bind(usuario, new_usuario, new_nombre || '', new Date().toISOString(), 'PENDIENTE').run();
            
            return jsonResponse({status: 'success', message: 'Un administrador la revisará. Si tras varios días no se ha cambiado, avísanos por correo. Mientras tanto, usa tu usuario actual.'});
        } else {
            await db.prepare('UPDATE "Usuarios" SET "Nombre Real" = ? WHERE "Usuario" = ?').bind(new_nombre, usuario).run();
            return jsonResponse({status: 'success', message: 'Tu Nombre Real se ha actualizado inmediatamente.'});
        }
    }

    if (action === 'get_name_change_requests') {
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos'}, 403);

        const { results } = await db.prepare('SELECT * FROM "Peticiones_Nombre" WHERE "Estado" = \'PENDIENTE\'').all();
        // Filtrar y mapear a nuestro formato del frontend
        const mapped = (results || []).map(r => ({
            Usuario: r["Usuario Actual"],
            Nuevo_Usuario: r["Nuevo Usuario Sol"],
            Nuevo_Nombre: r["Nuevo Nombre Sol"],
            Fecha: r["Fecha"]
        }));
        return jsonResponse({status: 'success', requests: mapped});
    }

    if (action === 'resolve_name_change') {
        const { target_user, resolution } = body;
        
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos'}, 403);

        if (resolution === 'reject') {
            await db.prepare('UPDATE "Peticiones_Nombre" SET "Estado" = \'RECHAZADO\' WHERE "Usuario Actual" = ?').bind(target_user).run();
            return jsonResponse({status: 'success', message: 'Petición rechazada.'});
        }

                if (resolution === 'approve') {
            const peticion = await db.prepare('SELECT * FROM "Peticiones_Nombre" WHERE "Usuario Actual" = ?').bind(target_user).first();
            if (!peticion) return jsonResponse({status: 'error', message: 'No se encontró la petición.'}, 404);

            const oldU = peticion["Usuario Actual"];
            const newU = peticion["Nuevo Usuario Sol"];
            const newN = peticion["Nuevo Nombre Sol"];
            
            const stmts = [];

            if (newU) {
                const tables = [
                    "Usuarios", "Porras", "Ligas", "Permisos_Equipos", 
                    "Permisos_Secreta", "Insignias", "Predicciones_Secretas", "Plantilla_Superliga_2_Masc", "Resultados_Oficiales"
                ];
                
                for (const table of tables) {
                    let col = (table === "Ligas" || table === "Permisos_Equipos") ? "Jugador" : "Usuario";
                    if (table === "Plantilla_Superliga_2_Masc") col = "usuario";
                    if (table === "Resultados_Oficiales") col = "actualizado_por";
                    stmts.push(db.prepare(`UPDATE OR IGNORE "${table}" SET "${col}" = ? WHERE "${col}" = ?`).bind(newU, oldU));
                    if (table !== "Plantilla_Superliga_2_Masc" && table !== "Resultados_Oficiales") {
                        stmts.push(db.prepare(`DELETE FROM "${table}" WHERE "${col}" = ?`).bind(oldU));
                    }
                }
            }
            
            const targetU = newU ? newU : oldU;

            if (newN) {
                stmts.push(db.prepare(`UPDATE "Usuarios" SET "Nombre Real" = ? WHERE "Usuario" = ?`).bind(newN, targetU));
            }
            
            stmts.push(db.prepare(`UPDATE "Peticiones_Nombre" SET "Estado" = 'APROBADO' WHERE "Usuario Actual" = ?`).bind(oldU));
            stmts.push(db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'"));

            await flushBatch(db, stmts);

            if (newU) {
                await Promise.allSettled([
                    db.prepare('UPDATE OR IGNORE "MVP_Votos" SET "usuario" = ? WHERE "usuario" = ?').bind(newU, oldU).run()
                        .then(() => db.prepare('DELETE FROM "MVP_Votos" WHERE "usuario" = ?').bind(oldU).run()),
                    db.prepare('UPDATE "Suscripciones_Push_Dispositivos" SET "Usuario" = ? WHERE "Usuario" = ?').bind(newU, oldU).run(),
                    db.prepare('UPDATE OR IGNORE "Monitor_Usuarios" SET "usuario" = ? WHERE "usuario" = ?').bind(newU, oldU).run()
                        .then(() => db.prepare('DELETE FROM "Monitor_Usuarios" WHERE "usuario" = ?').bind(oldU).run())
                ]);
            }

            let msg = 'Petición aprobada con éxito.';
            if (newU) msg = `Usuario ${oldU} renombrado a ${newU} con éxito.`;
            return jsonResponse({status: 'success', message: msg});
        }
    }
    if (action === 'delete_avatar') {
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        await db.prepare('UPDATE "Insignias" SET "Avatar" = \'\', "Avatar_Url" = \'\' WHERE "Usuario" = ?').bind(usuario).run();
        return jsonResponse({status: 'success', message: 'Foto borrada.'});
    }

    if (action === 'delete_custom_badge') {
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        await db.prepare('UPDATE "Insignias" SET "Custom_Badge" = \'\', "Custom_Emoji" = \'\', "Custom_Desc" = \'\' WHERE "Usuario" = ?').bind(usuario).run();
        return jsonResponse({status: 'success', message: 'Insignia borrada.'});
    }

    if (action === 'request_badge_update') {
        const { payload } = body;
        const auth = await getAuthUser();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        await db.prepare('INSERT INTO "Peticiones_Insignias" ("Usuario", "Tipo", "Equipo_Externo", "Estado", "Fecha") VALUES (?, ?, ?, ?, ?)')
            .bind(usuario, 'PERFIL', payload, 'PENDIENTE', new Date().toISOString()).run();
            
        return jsonResponse({status: 'success', message: 'Petición enviada a los administradores.'});
    }

    if (action === 'get_peticiones_insignias') {
        const auth = await getAuthUser();
        if (!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos'}, 403);

        const { results } = await db.prepare('SELECT * FROM "Peticiones_Insignias" WHERE "Estado" = \'PENDIENTE\'').all();
        return jsonResponse({status: 'success', data: results});
    }

    if (action === 'resolve_peticion_insignia') {
        const { id_peticion, resolution } = body;
        const auth = await getAuthUser();
        if (!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos'}, 403);

        if (resolution === 'reject') {
            await db.prepare('UPDATE "Peticiones_Insignias" SET "Estado" = \'RECHAZADO\' WHERE "id_peticion" = ?').bind(id_peticion).run();
            return jsonResponse({status: 'success', message: 'Petición rechazada.'});
        }

        if (resolution === 'approve') {
            const peticion = await db.prepare('SELECT * FROM "Peticiones_Insignias" WHERE "id_peticion" = ?').bind(id_peticion).first();
            if (!peticion) return jsonResponse({status: 'error', message: 'No se encontró la petición.'}, 404);

            if (peticion.Tipo === 'PERFIL') {
                const userToUpdate = peticion.Usuario;
                let payloadObj = {};
                try { payloadObj = JSON.parse(peticion.Equipo_Externo || '{}'); } catch(e) {}
                
                const existingIns = await db.prepare('SELECT * FROM "Insignias" WHERE "Usuario" = ?').bind(userToUpdate).first();
                if (!existingIns) {
                    await db.prepare('INSERT INTO "Insignias" ("Usuario") VALUES (?)').bind(userToUpdate).run();
                }
                await db.prepare('UPDATE "Insignias" SET "Genero" = ?, "Jugador de" = ?, "Entrenador de" = ?, "Exjugador" = ?, "Directiva / Staff" = ?, "Lesionado" = ?, "Lesion_Desc" = ?, "Custom_Badge" = ?, "Custom_Emoji" = ?, "Custom_Desc" = ?, "Avatar" = ?, "Avatar_Url" = ? WHERE "Usuario" = ?')
                    .bind(payloadObj.genero || 'M', payloadObj.jugador_de || '', payloadObj.entrenador_de || '', payloadObj.exjugador || '', payloadObj.staff || '', payloadObj.lesionado || '', payloadObj.lesionado_desc || '', payloadObj.custom || '', payloadObj.custom_emoji || '', payloadObj.custom_desc || '', payloadObj.avatar || '', payloadObj.avatar_url || '', userToUpdate).run();
            } else {
                const userToUpdate = peticion.Usuario;
                const tipo = peticion.Tipo; 
                const eqExt = peticion.Equipo_Externo;
                const userInsignias = await db.prepare('SELECT * FROM "Insignias" WHERE "Usuario" = ?').bind(userToUpdate).first();
                let current = (userInsignias && userInsignias[tipo]) ? userInsignias[tipo] : '';
                if (current && !current.includes(eqExt)) {
                    current += ", " + eqExt;
                } else if (!current) {
                    current = eqExt;
                }
                await db.prepare(`UPDATE "Insignias" SET "${tipo}" = ? WHERE "Usuario" = ?`).bind(current, userToUpdate).run();
            }

            await db.prepare('UPDATE "Peticiones_Insignias" SET "Estado" = \'APROBADO\' WHERE "id_peticion" = ?').bind(id_peticion).run();
            return jsonResponse({status: 'success', message: 'Petición aprobada con éxito.'});
        }
    }

    if (action === 'save_email') {
        const { email } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        
        try {
            await db.prepare('UPDATE "Usuarios" SET "Correo" = ? WHERE "Usuario" = ?').bind(email, usuario).run();
            return jsonResponse({ status: 'success', message: 'Correo guardado con éxito.' });
        } catch(e) {
            if (e.message && e.message.includes('no such column')) {
                return jsonResponse({ status: 'error', message: 'Error interno: La columna Correo aún no existe en la BD de Cloudflare. Por favor avisa al administrador.' }, 500);
            }
            return jsonResponse({ status: 'error', message: 'Error al guardar el correo.' }, 500);
        }
    }

    // GESTIÓN DE PERMISOS ESPECÍFICOS (MVP Y RESULTADOS/LINKS)
    if (action === 'get_usuarios_permisos') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const [usersRes, insRes, samplePerm] = await Promise.all([
            db.prepare('SELECT "Usuario", "Nombre Real" FROM "Usuarios" ORDER BY "Usuario" ASC').all(),
            db.prepare('SELECT "Usuario", "Admin Web", "Permiso_MVP", "Permiso_Resultados" FROM "Insignias"').all(),
            db.prepare('SELECT * FROM "Permisos_Equipos" LIMIT 1').first().catch(() => null)
        ]);
        const users = (usersRes && usersRes.results) || [];
        const ins = (insRes && insRes.results) || [];
        const insMap = {};
        for (const i of ins) insMap[i.Usuario] = i;

        const list = users.map(u => ({
            usuario: u.Usuario,
            nombre_real: u["Nombre Real"] || u.Usuario,
            admin_web: (insMap[u.Usuario] && insMap[u.Usuario]["Admin Web"] === "X") ? "X" : "",
            permiso_mvp: (insMap[u.Usuario] && insMap[u.Usuario]["Permiso_MVP"] === "X") ? "X" : "",
            permiso_resultados: (insMap[u.Usuario] && insMap[u.Usuario]["Permiso_Resultados"]) ? insMap[u.Usuario]["Permiso_Resultados"] : ""
        }));

        let equiposDisponibles = [];
        if (samplePerm) {
            equiposDisponibles = Object.keys(samplePerm).filter(k => k !== "Jugador" && k !== "id").sort();
        }
        
        // Fallback a Ligas_Equipos si Permisos_Equipos no estuviera poblada
        if (equiposDisponibles.length === 0) {
            try {
                const { results: ligasEqRows } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
                let teamSet = new Set();
                for (const row of ligasEqRows || []) {
                    Object.keys(row).forEach(k => {
                        if (k !== 'Liga' && k !== 'id') teamSet.add(k);
                    });
                }
                equiposDisponibles = Array.from(teamSet).sort();
            } catch(e) {}
        }

        return jsonResponse({ status: 'success', usuarios: list, equipos_disponibles: equiposDisponibles });
    }

    if (action === 'save_usuario_permisos') {
        const { target_usuario, permiso_mvp, permiso_resultados } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        if (!target_usuario) return jsonResponse({ status: 'error', message: 'Usuario objetivo no especificado' }, 400);

        const existIns = await db.prepare('SELECT * FROM "Insignias" WHERE "Usuario" = ?').bind(target_usuario).first();
        if (!existIns) {
            await db.prepare('INSERT INTO "Insignias" ("Usuario", "Permiso_MVP", "Permiso_Resultados") VALUES (?, ?, ?)').bind(target_usuario, permiso_mvp || '', permiso_resultados || '').run();
        } else {
            await db.prepare('UPDATE "Insignias" SET "Permiso_MVP" = ?, "Permiso_Resultados" = ? WHERE "Usuario" = ?').bind(permiso_mvp || '', permiso_resultados || '', target_usuario).run();
        }

        return jsonResponse({ status: 'success', message: `Permisos actualizados para @${target_usuario}` });
    }

    
    // -------------------------------------------------------------
    // 🔔 ACCIONES DE NOTIFICACIONES WEB PUSH
    // -------------------------------------------------------------

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

            // Si es solo actualización de preferencias (cambio de checkbox o equipos), hacer 1 solo UPDATE ultra-rápido sin tocar suscripciones
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

            // Insertar/actualizar este dispositivo y sincronizar preferencias multidispositivo en 1 lote atómico
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
        // Margen exacto: 121 minutos (permite enviar exactamente a las 2 horas antes y nunca con 2 horas y cuarto de antelación)
        const margenMinutos = parseInt(body.margen_minutos) || 121;
        const maxTs = now + (margenMinutos * 60 * 1000);
        // Filtro mínimo: solo partidos que estén a más de 45 minutos (para que el mensaje 'en 2 horas' tenga sentido y no avise tarde)
        const minTs = now + (45 * 60 * 1000);

        // Ola 1 paralela: configuración solo_admin, partidos de Ajustes y suscripciones activas
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

        // Ola 2 paralela (solo columnas necesarias): Permisos, Insignias (Admin Web), Porras (Sets) y Log previos
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

        // Procesar en paralelo el recordatorio de 1h para cierre MVP y el resumen de jornada de los viernes
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

    return jsonResponse({ status: "error", message: `Acción desconocida: ${action}` }, 400);
}
