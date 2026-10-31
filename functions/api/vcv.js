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
    return btoa(str).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=/g, "");
}

function fromB64url(str) {
    str = (str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function pubKeyToJwk(pubBytes) {
    return {
        kty: "EC",
        crv: "P-256",
        x: b64url(pubBytes.slice(1, 33)),
        y: b64url(pubBytes.slice(33, 65)),
        ext: true
    };
}

function vapidToJwk(pubBytes, privBytes) {
    const jwk = pubKeyToJwk(pubBytes);
    jwk.d = b64url(privBytes);
    return jwk;
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
    const dataToSign = new TextEncoder().encode(`${encHeader}.${encPayload}`);

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        privKey,
        dataToSign
    );

    const jwt = `${encHeader}.${encPayload}.${b64url(signature)}`;
    return `vapid t=${jwt}, k=${b64url(pubKeyBytes)}`;
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

    const subPubKey = await crypto.subtle.importKey(
        "jwk",
        pubKeyToJwk(subscriberPubBytes),
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

    const keyInfoPrefix = new TextEncoder().encode("WebPush: info\\0");
    const keyInfo = new Uint8Array(keyInfoPrefix.length + 65 + 65);
    keyInfo.set(keyInfoPrefix, 0);
    keyInfo.set(subscriberPubBytes, keyInfoPrefix.length);
    keyInfo.set(localPubBytes, keyInfoPrefix.length + 65);

    const authKey = await crypto.subtle.importKey("raw", subscriberAuthBytes, { name: "HKDF" }, false, ["deriveBits"]);
    const ikm = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: keyInfo },
        authKey,
        256
    );

    const prkKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);

    const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\\0");
    const cekBits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: salt, info: cekInfo },
        prkKey,
        128
    );
    const cek = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);

    const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\\0");
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
    if (!subObj || !subObj.endpoint) {
        return { success: false, error: "Subscripción inválida: falta endpoint" };
    }

    const pubKeyStr = (env && env.VAPID_PUBLIC_KEY) || DEFAULT_VAPID_PUBLIC;
    const privKeyStr = (env && env.VAPID_PRIVATE_KEY) || DEFAULT_VAPID_PRIVATE;
    const subject = (env && env.VAPID_SUBJECT) || DEFAULT_VAPID_SUBJECT;

    const pubKeyBytes = fromB64url(pubKeyStr);
    const privKeyBytes = fromB64url(privKeyStr);

    const urlObj = new URL(subObj.endpoint);
    const audience = `${urlObj.protocol}//${urlObj.host}`;

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

    try {
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
        return { success: false, error: e.message };
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

export async function onRequestGet() {
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
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_publicacion_ts INTEGER").run(); } catch(e) {}
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
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '25/10/2026 12:30', "timestamp" = 1792927800000, "Pabellon" = 'PILAR FDEZ VALDERRAMA' WHERE "ID_Partido" = 'RFEVB_2555'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/02/2027 12:45', "timestamp" = 1802000700000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2623'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '06/02/2027 16:00', "timestamp" = 1801926000000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2755'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '31/10/2026 16:00', "timestamp" = 1793458800000 WHERE "ID_Partido" = 'RFEVB_2561'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '19/12/2026 18:30', "timestamp" = 1797701400000 WHERE "ID_Partido" = 'RFEVB_2753'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 10:30', "timestamp" = 1797154200000, "Pabellon" = 'P. San Antonio, ÁÁvila' WHERE "ID_Partido" = 'FVCL_2F005'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 13:00', "timestamp" = 1806836400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2F007'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 13:30', "timestamp" = 1800793800000, "Pabellon" = 'Pabellón Escuela Juvenil Castilla' WHERE "ID_Partido" = 'FVCL_2F008'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2F014'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 12:30', "timestamp" = 1797161400000, "Pabellon" = 'P. San Antonio, ÁÁvila' WHERE "ID_Partido" = 'FVCL_2M005_MES'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 15:00', "timestamp" = 1806843600000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2M007_MES'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 17:00', "timestamp" = 1800806400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID', "Equipo_Local" = 'VCV Meseta', "Rival" = 'Pegamo Abanto', "Ubicacion" = 'LOCAL' WHERE "ID_Partido" = 'FVCL_2M008'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '31/01/2027 20:00', "timestamp" = 1801422000000, "Pabellon" = 'POLIDEPORTIVO, JULIÁN SÁNCHEZ EL CHARRO, SALAMANCA' WHERE "ID_Partido" = 'FVCL_2M009_MES'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2M014_MES'`).run();
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
                for (const [dor, nom, apod, pos] of initialPlayers) {
                    await db.prepare("INSERT INTO Plantilla_Superliga_2_Masc (dorsal, nombre, apodo, posicion, usuario, fecha_alta) VALUES (?, ?, ?, ?, NULL, ?)").bind(dor, nom, apod, pos, Date.now()).run();
                }
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
            'CREATE INDEX IF NOT EXISTS idx_log_accesos_ts ON "Log_Accesos"("timestamp" DESC)'
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
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '25/10/2026 12:30', "timestamp" = 1792927800000, "Pabellon" = 'PILAR FDEZ VALDERRAMA' WHERE "ID_Partido" = 'RFEVB_2555'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '07/02/2027 12:45', "timestamp" = 1802000700000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2623'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '06/02/2027 16:00', "timestamp" = 1801926000000, "Pabellon" = 'PABELLÓN FUENTE DE LA MORA' WHERE "ID_Partido" = 'RFEVB_2755'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 10:30', "timestamp" = 1797154200000, "Pabellon" = 'P. San Antonio, ÁÁvila' WHERE "ID_Partido" = 'FVCL_2F005'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 13:00', "timestamp" = 1806836400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2F007'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 13:30', "timestamp" = 1800793800000, "Pabellon" = 'Pabellón Escuela Juvenil Castilla' WHERE "ID_Partido" = 'FVCL_2F008'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2F014'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '13/12/2026 12:30', "timestamp" = 1797161400000, "Pabellon" = 'P. San Antonio, ÁÁvila' WHERE "ID_Partido" = 'FVCL_2M005_MES'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '04/04/2027 15:00', "timestamp" = 1806843600000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID' WHERE "ID_Partido" = 'FVCL_2M007_MES'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '24/01/2027 17:00', "timestamp" = 1800806400000, "Pabellon" = 'POLIDEPORTIVO CRISTO REY, VALLADOLID', "Equipo_Local" = 'VCV Meseta', "Rival" = 'Pegamo Abanto', "Ubicacion" = 'LOCAL' WHERE "ID_Partido" = 'FVCL_2M008'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '31/01/2027 20:00', "timestamp" = 1801422000000, "Pabellon" = 'POLIDEPORTIVO, JULIÁN SÁNCHEZ EL CHARRO, SALAMANCA' WHERE "ID_Partido" = 'FVCL_2M009_MES'`).run();
            await db.prepare(`UPDATE "Ajustes" SET "Fecha" = '16/01/2027 20:00', "timestamp" = 1800126000000, "Pabellon" = 'FCAFD, León' WHERE "ID_Partido" = 'FVCL_2M014_MES'`).run();
            return jsonResponse({ status: "success", message: "Todos los partidos han sido sincronizados en la base de datos." });
        } catch(err) {
            return jsonResponse({ status: "error", message: err.message }, 500);
        }
    }
        // ADMIN: OBTENER LISTA DE MONITORIZACIÓN Y SUS ACCESOS
    if (action === "get_monitor_data") {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { target_user } = body;
        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Monitor_Usuarios" ("usuario" TEXT PRIMARY KEY, "activo" INTEGER DEFAULT 1, "fecha_alta" TEXT, "notas" TEXT)`).run();
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Accesos" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "usuario" TEXT, "fecha_hora" TEXT, "timestamp" INTEGER, "origen" TEXT, "dispositivo" TEXT)`).run();

            const { results: vigilados } = await db.prepare('SELECT * FROM "Monitor_Usuarios" ORDER BY "usuario" ASC').all();
            let logs = [];
            if (target_user) {
                const { results: l } = await db.prepare('SELECT * FROM "Log_Accesos" WHERE "usuario" = ? ORDER BY "timestamp" DESC LIMIT 100').bind(target_user).all();
                logs = l || [];
            } else if (vigilados && vigilados.length > 0) {
                const firstUser = vigilados[0].usuario;
                const { results: l } = await db.prepare('SELECT * FROM "Log_Accesos" WHERE "usuario" = ? ORDER BY "timestamp" DESC LIMIT 100').bind(firstUser).all();
                logs = l || [];
            }
            return jsonResponse({ status: 'success', vigilados: vigilados || [], logs: logs });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    // ADMIN: AÑADIR O QUITAR USUARIO DE LA LISTA DE MONITORIZACIÓN
    if (action === "toggle_monitor_user") {
        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Monitor_Usuarios" ("usuario" TEXT PRIMARY KEY, "activo" INTEGER DEFAULT 1, "fecha_alta" TEXT, "notas" TEXT)`).run();
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Accesos" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "usuario" TEXT, "fecha_hora" TEXT, "timestamp" INTEGER, "origen" TEXT, "dispositivo" TEXT)`).run();
        } catch(e) {}
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { target_user, activo, remove } = body;
        if (!target_user) return jsonResponse({ status: 'error', message: 'Falta usuario objetivo' }, 400);

        try {
            if (remove) {
                await db.prepare('DELETE FROM "Monitor_Usuarios" WHERE "usuario" = ?').bind(target_user).run();
                return jsonResponse({ status: 'success', message: `Usuario @${target_user} eliminado del monitor silencioso.` });
            } else {
                const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
                await db.prepare('INSERT INTO "Monitor_Usuarios" ("usuario", "activo", "fecha_alta") VALUES (?, ?, ?) ON CONFLICT("usuario") DO UPDATE SET "activo" = ?')
                    .bind(target_user, activo ? 1 : 0, nowMadrid, activo ? 1 : 0).run();
                return jsonResponse({ status: 'success', message: `Seguimiento de @${target_user} actualizado.` });
            }
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === "ping") {
        try {
            await db.prepare('INSERT OR IGNORE INTO "Reglas_Puntuacion" ("Regla", "Puntos") VALUES (\'Porcentaje Extra MVP\', \'10\')').run();
        } catch(e) {}
        return jsonResponse({ status: "ok" });
    }

    // HELPER: Formatear fila de Ajustes al objeto que espera el frontend
    function formatMatch(r, resOficialMap = {}) {
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
        }

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
            mvp_candidatos: oRes.mvp_candidatos ? (function(){ try { return JSON.parse(oRes.mvp_candidatos); } catch(e){ return []; } })() : [],
            mvp_oficial: oRes.mvp_oficial || "",
            mvp_stats: oRes.mvp_stats ? (function(){ try { return JSON.parse(oRes.mvp_stats); } catch(e){ return []; } })() : [],
            mvp_proclamado_ts: oRes.mvp_proclamado_ts ? parseInt(oRes.mvp_proclamado_ts) : 0,
            mvp_publicacion_ts: oRes.mvp_publicacion_ts ? parseInt(oRes.mvp_publicacion_ts) : 0,
            mvp_votos_recuento: oRes.mvp_votos_recuento ? (function(){ try { return JSON.parse(oRes.mvp_votos_recuento); } catch(e){ return []; } })() : [],
            mvp_visible: oRes.mvp_visible !== undefined ? (oRes.mvp_visible === 1 || oRes.mvp_visible === '1' || oRes.mvp_visible === true || oRes.mvp_visible === 'true' || oRes.mvp_visible === 'SI') : true
        };
    }

    // 2. LOGIN INVITADO
    if (action === "login_guest") {
        const { results: rawPartidos } = await db.prepare('SELECT * FROM "Ajustes" WHERE "Visibilidad" != \'OCULTAR\' ORDER BY "timestamp" ASC').all();
        const { results: resOf } = await db.prepare('SELECT * FROM "Resultados_Oficiales"').all();
        const resMap = {};
        for (const ro of resOf || []) resMap[ro["ID Partido"]] = ro;

        const partidos = (rawPartidos || []).map(r => formatMatch(r, resMap));

        // Permisos Equipos del usuario 'Invitado'
        const rowPerm = await db.prepare('SELECT * FROM "Permisos_Equipos" WHERE lower("Jugador") = \'invitado\'').first();
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
                        let baseTime = pCartelera.mvp_proclamado_ts || pCartelera.timestamp || 0;
                        if (baseTime && (Date.now() - baseTime > 48 * 60 * 60 * 1000)) {
                            isTooOld = true;
                        }
                    } else if (pCartelera.mvp_publicacion_ts && pCartelera.mvp_publicacion_ts > Date.now()) {
                        isTooOld = false;
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

                if (pCartelera.visibilidad === "MOSTRAR") {
                    if (!idsEnCartelera[pCartelera.id_partido]) {
                        cartelera.push(pCartelera);
                        idsEnCartelera[pCartelera.id_partido] = pCartelera;
                    }
                }
            }
        }

        // Notificaciones públicas
        let notificaciones = [];
        try {
            const { results } = await db.prepare('SELECT * FROM "Notificaciones" WHERE "Visibilidad" = \'MOSTRAR\' ORDER BY "timestamp" DESC, "ID" DESC').all();
            notificaciones = results || [];
        } catch (e) {}

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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, oldPwd).first();
        if (!user) {
            return jsonResponse({ status: "error", message: "La contraseña actual no es correcta." });
        }
        await db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(newPwd, usuario).run();
        return jsonResponse({ status: "success", message: "¡Contraseña actualizada con éxito!" });
    }

    // 4. GUARDAR PREDICCIONES (Porras)
    if (action === "save") {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const preds = body.predicciones || {};
        const nowMs = Date.now();

        // Validar seguridad: partido no cerrado
        for (const idPart in preds) {
            const partido = await db.prepare('SELECT "Estado", "timestamp" FROM "Ajustes" WHERE "ID_Partido" = ?').bind(idPart).first();
            if (partido && (partido.Estado === "CERRADO" || (partido.timestamp && nowMs >= partido.timestamp))) {
                return jsonResponse({ status: "error", message: `⚠️ Seguridad: El partido ${idPart} ya ha comenzado o está cerrado.` });
            }
        }

        // Optimización: agrupar sentencias DELETE e INSERT en db.batch para ejecutarlas en 1 solo viaje a SQLite
        const batchStmts = [];
        const nowStr = new Date().toLocaleString("es-ES");
        for (const idPart in preds) {
            batchStmts.push(db.prepare('DELETE FROM "Porras" WHERE "Usuario" = ? AND "ID Partido" = ?').bind(usuario, idPart));
            const p = preds[idPart];
            if (p.sets) {
                batchStmts.push(db.prepare('INSERT INTO "Porras" ("Timestamp", "Usuario", "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local") VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(nowStr, usuario, idPart, p.sets, p.puntos, p.signo));
            }
        }
        if (batchStmts.length > 0) {
            await db.batch(batchStmts);
        }
        return jsonResponse({ status: "success", message: "Predicciones guardadas correctamente." });
    }

    // 5. GUARDAR PREDICCIONES SECRETAS (Puntos totales temporada)
    if (action === "save_totales") {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        if (batchTotales.length > 0) {
            await db.batch(batchTotales);
        }
        return jsonResponse({ status: "success", message: "¡Tus predicciones a final de temporada han sido guardadas!" });
    }

    // 6. HISTORIAL DE PARTIDOS
    if (action === "get_history") {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const { results: rawPartidos } = await db.prepare('SELECT * FROM "Ajustes" ORDER BY "timestamp" ASC').all();
        const { results: resOf } = await db.prepare('SELECT * FROM "Resultados_Oficiales"').all();
        const resMap = {};
        for (const ro of resOf || []) resMap[ro["ID Partido"]] = ro;
        const partidos = (rawPartidos || []).map(r => formatMatch(r, resMap));

        const { results: misPorras } = await db.prepare('SELECT * FROM "Porras" WHERE "Usuario" = ?').bind(usuario).all();
        const porrasMap = {};
        for (const pr of misPorras || []) porrasMap[pr["ID Partido"]] = pr;

        const { results: ligasEqRows } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
        const ligasMap = {};
        for (const row of ligasEqRows || []) {
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
                            if (isFrozen && p.timestamp >= freezeCutoff) {
                    userPointsInLiga[pr.Usuario]["_pendientes"] = (userPointsInLiga[pr.Usuario]["_pendientes"] || 0) + pts;
                    continue;
                }
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
        const userRow = await db.prepare('SELECT * FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!userRow) {
            return jsonResponse({ status: "error", message: "Usuario o contraseña incorrectos." });
        }

                // Actualizar último acceso si es un inicio de sesión (throttled a 1 hora para ahorrar escrituras)
        if (action === "login" || action === "get_data") {
            try {
                let shouldUpdate = true;
                if (userRow.ultimo_acceso) {
                    const lastAcc = new Date(userRow.ultimo_acceso + 'Z').getTime();
                    if (!isNaN(lastAcc) && (Date.now() - lastAcc < 3600000)) {
                        shouldUpdate = false;
                    }
                }
                if (shouldUpdate && action === "login") {
                    await db.prepare('UPDATE "Usuarios" SET ultimo_acceso = CURRENT_TIMESTAMP WHERE "Usuario" = ?').bind(usuario).run();
                }

                // Monitorización silenciosa si el usuario está vigilado
                const monRow = await db.prepare('SELECT activo FROM "Monitor_Usuarios" WHERE "usuario" = ?').bind(usuario).first();
                if (monRow && monRow.activo === 1) {
                    const nowTs = Date.now();
                    const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
                    const uAgent = context && context.request ? (context.request.headers.get("user-agent") || "Desconocido") : "Desconocido";
                    const origen = (body && body.is_auto_reconnect) ? "Sesión guardada (Auto)" : "Inicio manual";
                    const disp = (body && body.dispositivo && typeof body.dispositivo === 'string' && body.dispositivo.trim() !== '')
                        ? body.dispositivo.substring(0, 150)
                        : uAgent.substring(0, 150);
                    await db.prepare('INSERT INTO "Log_Accesos" ("usuario", "fecha_hora", "timestamp", "origen", "dispositivo") VALUES (?, ?, ?, ?, ?)')
                        .bind(usuario, nowMadrid, nowTs, origen, disp).run();
                }
            } catch(e) { console.error("Error en monitor silencioso:", e); }
        }

        // Partidos y Resultados oficiales
        const { results: rawPartidos } = await db.prepare('SELECT * FROM "Ajustes" ORDER BY "timestamp" ASC').all();
        const { results: resOf } = await db.prepare('SELECT * FROM "Resultados_Oficiales"').all();
        const resMap = {};
        for (const ro of resOf || []) resMap[ro["ID Partido"]] = ro;
        const partidos = (rawPartidos || []).map(r => formatMatch(r, resMap));

        // Permisos Equipos del usuario (leer fila de Permisos_Equipos)
        const rowPerm = await db.prepare('SELECT * FROM "Permisos_Equipos" WHERE "Jugador" = ?').bind(usuario).first();
        const misPermisos = {};
        if (rowPerm) {
            for (const col in rowPerm) {
                if (col !== "Jugador" && rowPerm[col] && rowPerm[col].toString().toUpperCase() === "X") {
                    misPermisos[col] = true;
                }
            }
        }

        // Ligas del usuario (leer fila de Ligas)
        const rowLigas = await db.prepare('SELECT * FROM "Ligas" WHERE "Jugador" = ?').bind(usuario).first();
        const misLigas = [];
        if (rowLigas) {
            for (const col in rowLigas) {
                if (col !== "Jugador" && rowLigas[col] && rowLigas[col].toString().toUpperCase() === "X") {
                    misLigas.push(col);
                }
            }
        }

        // Obtener todas las ligas disponibles
        const sampleLigas = await db.prepare('SELECT * FROM "Ligas" LIMIT 1').first();
        const todasLasLigas = sampleLigas ? Object.keys(sampleLigas).filter(k => k !== "Jugador") : [];

        // Ligas_Equipos mapping
        const { results: ligasEqRows } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
        const ligasMap = {};
        for (const row of ligasEqRows || []) {
            const lName = row.Liga;
            if (!ligasMap[lName]) ligasMap[lName] = [];
            for (const col in row) {
                if (col !== "Liga" && row[col] && row[col].toString().toUpperCase() === "X") {
                    ligasMap[lName].push(col);
                }
            }
        }

        // Porras del usuario actual
        const { results: misPorras } = await db.prepare('SELECT * FROM "Porras" WHERE "Usuario" = ?').bind(usuario).all();
        const prediccionesUsuario = {};
        for (const p of misPorras || []) {
            prediccionesUsuario[p["ID Partido"]] = { sets: p.Sets, puntos: p["Puntos Dif"], signo: p["a favor o en contra del local"] };
        }

        // Insignias
        const { results: allInsignias } = await db.prepare('SELECT * FROM "Insignias"').all();
        const insigniasMap = {};
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
                let chunks = String(raw).split(/\s+y\s+|;\s*|\n/i).map(t => t.trim()).filter(Boolean);
                let finalTeams = [];
                chunks.forEach(chunk => {
                    const parts = chunk.split(',').map(p => p.trim()).filter(Boolean);
                    if (parts.length <= 2) {
                        finalTeams.push(chunk);
                    } else {
                        for (let i = 0; i < parts.length; i++) {
                            if (i + 1 < parts.length && /^(1ª|2ª|superliga|sm2|sf2|primera|segunda|división|nacional|masc|fem|juvenil|cadete|infantil)/i.test(parts[i+1])) {
                                finalTeams.push(parts[i] + ', ' + parts[i+1]);
                                i++;
                            } else {
                                finalTeams.push(parts[i]);
                            }
                        }
                    }
                });
                return finalTeams;
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
                    insigniasMap[u].push({ type: 'custom', text: (b.Custom_Desc || 'Insignia'), emoji: (b.Custom_Emoji || 'Ô£¿') });
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
            const { results: sm2Players } = await db.prepare('SELECT dorsal, nombre, apodo, usuario FROM Plantilla_Superliga_2_Masc WHERE usuario IS NOT NULL AND usuario != \'\'').all();
            if (sm2Players && sm2Players.length > 0) {
                for (const pl of sm2Players) {
                    const uPlayer = pl.usuario;
                    if (!uPlayer) continue;

                    // Buscar partidos donde este jugador haya sido el MVP Oficial
                    const sm2MvpMatches = [];
                    for (const p of partidos) {
                        if (!p.mvp_oficial) continue;
                        const mvpOf = String(p.mvp_oficial).trim();
                        
                        // Extraer el dorsal exacto del string oficial del MVP (ej: "#21 ...")
                        const dorMatch = mvpOf.match(/#(\d+)/);
                        const officialDorsal = dorMatch ? parseInt(dorMatch[1]) : null;
                        const plDorsal = parseInt(pl.dorsal) || null;

                        let isMatch = false;
                        if (officialDorsal !== null && plDorsal !== null) {
                            // Coincidencia exacta por número de dorsal
                            isMatch = (officialDorsal === plDorsal);
                        } else {
                            // Si no hay dorsal en el MVP oficial, comparar por nombre completo
                            const plNombre = String(pl.nombre || '').trim().toLowerCase();
                            const cleanedMvp = mvpOf.replace(/#\d+\s*/, '').replace(/\s*\([^)]+\)/, '').replace(/\s*\[[^\]]+\]/, '').trim().toLowerCase();
                            if (plNombre && cleanedMvp && (cleanedMvp === plNombre || cleanedMvp.startsWith(plNombre) || plNombre.startsWith(cleanedMvp))) {
                                isMatch = true;
                            }
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

                if (pCartelera.visibilidad === "MOSTRAR") {
                    if (!idsEnCartelera[pCartelera.id_partido]) {
                        cartelera.push(pCartelera);
                        idsEnCartelera[pCartelera.id_partido] = pCartelera;
                    }
                }
            }
        }

        // Equipos permitidos para predicciones secretas (Permisos_Secreta)
        const rowSec = await db.prepare('SELECT * FROM "Permisos_Secreta" WHERE "Usuario" = ?').bind(usuario).first();
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

        // Predicciones secretas del usuario
        const { results: rawSecretas } = await db.prepare('SELECT * FROM "Predicciones_Secretas" WHERE "Usuario" = ?').bind(usuario).all();
        const prediccionesTotalesMap = {};
        for (const s of rawSecretas || []) {
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

        // Reglas de puntuación
        const { results: regRows } = await db.prepare('SELECT * FROM "Reglas_Puntuacion"').all();
        let ptsSets = 5, ptsGanador = 3, ptsDiffExacta = 2, maxDistancia = 10, pctMvp = 10;
        let hasMvpRuleInDb = false;
        for (const r of regRows || []) {
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
        // Si no existía la regla de MVP en Reglas_Puntuacion, insertarla por defecto para permitir editarla
        if (!hasMvpRuleInDb) {
            try {
                await db.prepare('INSERT OR IGNORE INTO "Reglas_Puntuacion" ("Regla", "Puntos") VALUES (\'Porcentaje Extra MVP\', 10)').run();
            } catch(e) {}
        }

        // Nombres reales map
        const { results: allUsers } = await db.prepare('SELECT * FROM "Usuarios"').all();
        const mapNombresReales = {};
        for (const u of allUsers || []) mapNombresReales[u.Usuario] = u["Nombre Real"] || u.Usuario;

        // CLASIFICACIONES: calcular puntos por usuario y liga (CON CACHÉ)
        
        // --- LOGICA DE APAGON DE RANKINGS (FIN DE SEMANA) ---
        const now = new Date();
        const utcDay = now.getUTCDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
        let isFrozen = false;
        let freezeCutoff = 0;
        let unfreezeTime = 0;

        if (utcDay === 6 || utcDay === 0 || utcDay === 1) {
            // Unfreeze: Lunes a las 18:00 hora española (16:00 UTC en verano, 17:00 UTC en invierno)
            let u = new Date(now);
            if (utcDay === 6) u.setUTCDate(u.getUTCDate() + 2);
            if (utcDay === 0) u.setUTCDate(u.getUTCDate() + 1);
            if (utcDay === 1) u.setUTCDate(u.getUTCDate() + 0);
            u.setUTCHours(16, 0, 0, 0); // 18:00 verano / 17:00 invierno
            unfreezeTime = u.getTime();

            // Si todavía no hemos superado la hora de descongelación del lunes
            if (now.getTime() < unfreezeTime) {
                isFrozen = true;
                // Cutoff: Viernes a las 23:59:59 UTC
                let d = new Date(now);
                if (utcDay === 6) d.setUTCDate(d.getUTCDate() - 1);
                if (utcDay === 0) d.setUTCDate(d.getUTCDate() - 2);
                if (utcDay === 1) d.setUTCDate(d.getUTCDate() - 3);
                d.setUTCHours(23, 59, 59, 999);
                freezeCutoff = d.getTime();
            }
        }

        // --- OVERRIDE MANUAL DE CONGELACIÓN (ADMIN INTRANET) ---
        let freezeOverride = null; // 'UNFREEZE', 'FREEZE', o null
        try {
            const rowOverride = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'FREEZE_OVERRIDE'").first();
            if (rowOverride && rowOverride.valor) {
                const parsed = JSON.parse(rowOverride.valor);
                // Si el override expiró (por ejemplo super├│ unfreeze_until o expires_at), se descarta automáticamente
                if (parsed.expires_at && now.getTime() > parsed.expires_at) {
                    await db.prepare("DELETE FROM Cache_App WHERE clave = 'FREEZE_OVERRIDE'").run();
                } else {
                    freezeOverride = parsed.mode; // 'UNFREEZE' o 'FREEZE'
                }
            }
        } catch(e) {
            console.error("Error comprobando freeze override:", e);
        }

        if (freezeOverride === 'UNFREEZE') {
            isFrozen = false;
        } else if (freezeOverride === 'FREEZE') {
            isFrozen = true;
            if (!freezeCutoff) freezeCutoff = Date.now();
        }
        
        // --- CONFIGURACION DE LIGAS CONGELADAS (Ligas_Config) ---
        let ligasCongeladasSet = new Set(todasLasLigas);
        try {
            await db.prepare('CREATE TABLE IF NOT EXISTS "Ligas_Config" ("Liga" TEXT PRIMARY KEY, "Congelar" TEXT DEFAULT \'SI\')').run();
            const { results: cfgRows } = await db.prepare('SELECT * FROM "Ligas_Config"').all();
            if (cfgRows && cfgRows.length > 0) {
                ligasCongeladasSet = new Set();
                for (const row of cfgRows) {
                    const val = (row.Congelar || "").toString().trim().toUpperCase();
                    if (val === "SI" || val === "X" || val === "1" || val === "TRUE") {
                        ligasCongeladasSet.add(row.Liga);
                    }
                }
            } else {
                for (const lName of todasLasLigas) {
                    await db.prepare('INSERT OR IGNORE INTO "Ligas_Config" ("Liga", "Congelar") VALUES (?, \'SI\')').bind(lName).run();
                }
            }
        } catch(e) {
            console.error("Error Ligas_Config:", e);
        }

        const cacheKey = isFrozen ? 'userPointsInLiga_FROZEN_v2' : 'userPointsInLiga_v2';
        const statsCacheKey = isFrozen ? 'statsLigas_FROZEN_v2' : 'statsLigas_v2';

        let userPointsInLiga = {};
        let statsLigas = {};
        const cacheRow = await db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(cacheKey).first();
        if (cacheRow && cacheRow.valor) {
            try { userPointsInLiga = JSON.parse(cacheRow.valor); } catch(e) {}
        }
        const statsCacheRow = await db.prepare("SELECT valor FROM Cache_App WHERE clave = ?").bind(statsCacheKey).first();
        if (statsCacheRow && statsCacheRow.valor) {
            try { statsLigas = JSON.parse(statsCacheRow.valor); } catch(e) {}
        }

        if (Object.keys(userPointsInLiga).length === 0 || Object.keys(statsLigas).length === 0) {
            userPointsInLiga = {};
            statsLigas = {};
            const { results: allPorras } = await db.prepare('SELECT * FROM "Porras"').all();
            for (const u of allUsers || []) {
                userPointsInLiga[u.Usuario] = {};
                statsLigas[u.Usuario] = {};
                for (const lName of todasLasLigas) {
                    userPointsInLiga[u.Usuario][lName] = 0;
                    statsLigas[u.Usuario][lName] = { porJornada: {} };
                }
            }

            const mapPartidos = {};
            for (const p of partidos) mapPartidos[p.id_partido] = p;

            // Cargar todos los votos de MVP para bonificaciones
            const { results: allMvpVotes } = await db.prepare('SELECT id_partido, usuario, jugador FROM MVP_Votos').all();
            const mvpVotesMap = {}; // `${id_partido}_${usuario}` -> jugador
            for (const mv of allMvpVotes || []) {
                mvpVotesMap[`${mv.id_partido}_${mv.usuario}`] = mv.jugador;
            }

            for (const pr of allPorras || []) {
                const p = mapPartidos[pr["ID Partido"]];
                if (!p || !p.oficial_sets || !p.oficial_parciales || !pr.Sets) continue;
                if (!userPointsInLiga[pr.Usuario]) continue;
                // Si estamos en apagón y el partido se jugó después del viernes a las 23:59, NO suma al ranking



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
                    const uMvpVote = mvpVotesMap[`${p.id_partido}_${pr.Usuario}`];
                    if (uMvpVote) {
                        const mOficial = String(p.mvp_oficial).trim().toLowerCase();
                        const mVoted = String(uMvpVote).trim().toLowerCase();
                        let dorOficial = (mOficial.match(/#(\d+)/) || [])[1];
                        let dorVoted = (mVoted.match(/#(\d+)/) || [])[1];
                        let isMvpHit = false;
                        if (dorOficial && dorVoted && dorOficial === dorVoted) {
                            isMvpHit = true;
                        } else if (mOficial === mVoted || mOficial.includes(mVoted) || mVoted.includes(mOficial)) {
                            isMvpHit = true;
                        }
                        if (isMvpHit) {
                            pts += Math.ceil(pts * (pctMvp / 100));
                        }
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
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(cacheKey, JSON.stringify(userPointsInLiga), Date.now()).run();
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(statsCacheKey, JSON.stringify(statsLigas), Date.now()).run();
        }

        // Formatear clasificaciones por liga
        const { results: allLigasRows } = await db.prepare('SELECT * FROM "Ligas"').all();
        const clasificacionesFormateadas = {};
        for (const lName of misLigas) {
            const ranking = [];
            const isThisLigaFrozen = isFrozen && ligasCongeladasSet.has(lName);
            for (const row of allLigasRows || []) {
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

        // MVP: Obtener votos del usuario y plantilla superliga
        let misVotosMvp = {};
        let plantillaSuperliga = [];
        try {
            const { results: vRows } = await db.prepare('SELECT id_partido, jugador FROM MVP_Votos WHERE usuario = ?').bind(usuario).all();
            for (const vr of vRows || []) {
                misVotosMvp[vr.id_partido] = vr.jugador;
            }
        } catch(e) {}
        try {
            const { results: pRows } = await db.prepare('SELECT id, dorsal, nombre, apodo, posicion, usuario FROM Plantilla_Superliga_2_Masc ORDER BY dorsal ASC, id ASC').all();
            plantillaSuperliga = pRows || [];
        } catch(e) {
            try {
                const { results: pRowsOld } = await db.prepare('SELECT dorsal, nombre, apodo, posicion FROM Plantilla_Superliga ORDER BY dorsal ASC').all();
                plantillaSuperliga = pRowsOld || [];
            } catch(e2) {}
        }

        // Fetch Notificaciones
        let notificaciones = [];
        try {
            const { results } = await db.prepare('SELECT * FROM "Notificaciones" WHERE "Visibilidad" = \'MOSTRAR\' ORDER BY "timestamp" DESC, "ID" DESC').all();
            notificaciones = results || [];
        } catch (e) {
            // Table might not exist yet
        }

        return jsonResponse({
            status: "success",
            usuario: usuario,
            notificaciones: notificaciones,
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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        
        if (stmts.length > 0) {
            // Batch them in chunks of 50 to avoid D1 limits
            for (let i = 0; i < stmts.length; i += 50) {
                await db.batch(stmts.slice(i, i + 50));
            }
        }
        
        return jsonResponse({ status: 'success', message: '¡Permisos sincronizados! Las X han sido rellenadas f├¡sicamente en la base de datos.' });
    }
    
    if (action === 'fix_timestamps') {
        const { results: rawPartidos } = await db.prepare('SELECT * FROM "Ajustes"').all();
        let updatedCount = 0;
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
                            await db.prepare('UPDATE "Ajustes" SET timestamp = ? WHERE "ID_Partido" = ?').bind(newTs, r.ID_Partido).run();
                            updatedCount++;
                        }
                    }
                }
            }
        }
        try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}
        return jsonResponse({ status: 'success', message: 'Timestamps corregidos y Cach├® borrada: ' + updatedCount });
    }

    if (action === 'save_ligas_config') {
        const { config } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        for (const lName in config || {}) {
            const val = config[lName] ? 'SI' : 'NO';
            await db.prepare('INSERT OR REPLACE INTO "Ligas_Config" ("Liga", "Congelar") VALUES (?, ?)').bind(lName, val).run();
        }
        try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}
        return jsonResponse({ status: 'success', message: 'Ajuste de ligas guardado y caché reseteada.' });
    }

    if (action === 'set_freeze_override') {
        const { mode } = body; // 'UNFREEZE', 'FREEZE', o 'AUTO'
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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

        let mensajeExito = "Horario restablecido a AUTOMÁTICO.";
        if (mode === 'UNFREEZE') mensajeExito = "Clasificaciones DESCONGELADAS con éxito. Todos los puntos se muestran en vivo.";
        if (mode === 'FREEZE') mensajeExito = "Clasificaciones CONGELADAS manualmente.";

        return jsonResponse({ status: 'success', message: mensajeExito, mode: mode });
    }

    if (action === 'clear_cache') {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        
        try { 
            await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); 
        } catch(e) {}
        
        return jsonResponse({ status: 'success', message: 'Cach├® borrada. Las clasificaciones se recalcular├ín al recargar la web.' });
    }

    // ADMIN: ADD USER
    if (action === 'add_user') {
        const { new_u, new_p, new_n, ligas_seleccionadas } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 401);
        
        const exist = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ?').bind(new_u).first();
        if (exist) return jsonResponse({ status: 'error', message: 'El usuario ya existe' });

        await db.prepare('INSERT INTO "Usuarios" ("Usuario", "Password", "Nombre Real") VALUES (?, ?, ?)').bind(new_u, new_p, new_n || new_u).run();
        await db.prepare('INSERT INTO "Permisos_Equipos" ("Jugador") VALUES (?)').bind(new_u).run();
        await db.prepare('INSERT INTO "Permisos_Secreta" ("Usuario") VALUES (?)').bind(new_u).run();
        await db.prepare('INSERT INTO "Insignias" ("Usuario") VALUES (?)').bind(new_u).run();

        // Ligas and Auto-Assign Permissions
        if (ligas_seleccionadas && ligas_seleccionadas.length > 0) {
            try {
                await db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(new_u).run();
                for (const l of ligas_seleccionadas) {
                    await db.prepare(`UPDATE "Ligas" SET "${l}" = 'X' WHERE "Jugador" = ?`).bind(new_u).run();
                }

                // Auto-assign permissions based on selected leagues
                const { results: allLigasEquipos } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
                const equiposToPermit = new Set();
                
                for (const row of allLigasEquipos || []) {
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
                    try {
                        await db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = 'X' WHERE "Jugador" = ?`).bind(new_u).run();
                        await db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = 'X' WHERE "Usuario" = ?`).bind(new_u).run();
                    } catch(e) {}
                }
            } catch(e) {}
        } else {
            await db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(new_u).run();
        }

        return jsonResponse({ status: 'success', message: 'Usuario creado con éxito en la BD de Cloudflare' });
    }

    // ADMIN: SAVE RESULTADO OFICIAL
    if (action === 'save_resultado_admin') {
        const { id_partido, sets, parciales, streaming, mvp_candidatos, mvp_oficial, mvp_stats, mvp_publicacion_ts } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP", "Permiso_Resultados" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const isAdmin = adminCheck && adminCheck["Admin Web"] === "X";
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        const resPermStr = (adminCheck && adminCheck["Permiso_Resultados"]) ? adminCheck["Permiso_Resultados"] : "";
        
        // Verificar si tiene permiso de resultados para este partido
        let canEditMatch = isAdmin;
        if (!canEditMatch && resPermStr) {
            if (resPermStr === "TODOS" || resPermStr === "X") {
                canEditMatch = true;
            } else {
                // Verificar si coincide con equipo local o rival del partido
                const matchRow = await db.prepare('SELECT "Equipo_Local", "Rival", "Categoria" FROM "Ajustes" WHERE "ID_Partido" = ?').bind(id_partido).first();
                if (matchRow) {
                    const eqLoc = (matchRow["Equipo_Local"] || "").toLowerCase();
                    const eqRiv = (matchRow["Rival"] || "").toLowerCase();
                    const pList = resPermStr.toLowerCase().split(',').map(s => s.trim());
                    if (pList.some(p => eqLoc.includes(p) || eqRiv.includes(p))) {
                        canEditMatch = true;
                    }
                }
            }
        }
        
        // Si tiene permiso de MVP y se está modificando candidatos o visibilidad de MVP
        const isMvpAction = (mvp_candidatos !== undefined || body.mvp_visible !== undefined || mvp_oficial !== undefined);
        if (!canEditMatch && hasMvpPerm && isMvpAction) {
            canEditMatch = true;
        }

        if (!canEditMatch) {
            return jsonResponse({ status: 'error', message: 'No tienes permisos para modificar los resultados o datos de este equipo/partido.' }, 403);
        }

        const candStr = Array.isArray(mvp_candidatos) ? JSON.stringify(mvp_candidatos) : (mvp_candidatos || '');
        const statsStr = Array.isArray(mvp_stats) ? JSON.stringify(mvp_stats) : (mvp_stats || '');
        const { mvp_visible } = body;
        const visibleVal = (mvp_visible === false || mvp_visible === 0 || mvp_visible === '0' || mvp_visible === 'OCULTAR') ? 0 : 1;

        try {
            try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_por" TEXT').run(); } catch(e) {}
            try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_ts" INTEGER').run(); } catch(e) {}
            try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_fecha" TEXT').run(); } catch(e) {}
            const nowTs = Date.now();
            const nowFechaHora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
            const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
            
            // Si solo se están guardando datos estándar de partido (sets, parciales, streaming)
            if (!isMvpAction) {
                if (exist) {
                    let finalSets = (sets !== undefined) ? (sets || '') : (exist["Sets Oficial"] || '');
                    let finalParc = (parciales !== undefined) ? (parciales || '') : (exist["Parciales Oficial"] || '');
                    let finalStream = (streaming !== undefined) ? (streaming || '') : (exist["Streaming"] || '');
                    await db.prepare('UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ? WHERE "ID Partido" = ?')
                        .bind(finalSets, finalParc, finalStream, usuario, nowTs, nowFechaHora, id_partido).run();
                } else {
                    await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?)')
                        .bind(id_partido, sets || '', parciales || '', streaming || '', usuario, nowTs, nowFechaHora).run();
                }
            } else {
                // Se están guardando datos de MVP: asegurar que las columnas existen silenciosamente si hace falta
                try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_candidatos" TEXT').run(); } catch(e) {}
                try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_oficial" TEXT').run(); } catch(e) {}
                try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_stats" TEXT').run(); } catch(e) {}
                try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_proclamado_ts" INTEGER').run(); } catch(e) {}
                try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_visible" INTEGER DEFAULT 1').run(); } catch(e) {}

                if (exist) {
                    let finalSets = (sets !== undefined) ? (sets || '') : (exist["Sets Oficial"] || '');
                    let finalParc = (parciales !== undefined) ? (parciales || '') : (exist["Parciales Oficial"] || '');
                    let finalStream = (streaming !== undefined) ? (streaming || '') : (exist["Streaming"] || '');
                    let finalCand = (mvp_candidatos !== undefined) ? candStr : (exist["mvp_candidatos"] || '');

                    let sql = 'UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ?, "mvp_candidatos" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ?';
                    let params = [finalSets, finalParc, finalStream, finalCand, usuario, nowTs, nowFechaHora];
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
                    if (mvp_publicacion_ts !== undefined) {
                        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_publicacion_ts" INTEGER').run(); } catch(e) {}
                        sql += ', "mvp_publicacion_ts" = ?';
                        params.push(parseInt(mvp_publicacion_ts) || 0);
                    }
                    sql += ' WHERE "ID Partido" = ?';
                    params.push(id_partido);
                    await db.prepare(sql).bind(...params).run();
                } else {
                    try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_publicacion_ts" INTEGER').run(); } catch(e) {}
                    const proclamadoTs = (mvp_oficial && String(mvp_oficial).trim() !== '') ? Date.now() : 0;
                    const pubTs = (mvp_publicacion_ts !== undefined) ? (parseInt(mvp_publicacion_ts) || 0) : 0;
                    await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "mvp_candidatos", "mvp_oficial", "mvp_stats", "mvp_visible", "mvp_proclamado_ts", "mvp_publicacion_ts", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id_partido, sets || '', parciales || '', streaming || '', candStr, mvp_oficial || '', statsStr, visibleVal, proclamadoTs, pubTs, usuario, nowTs, nowFechaHora).run();
                }
            }
            
            if (sets) { try { await db.prepare('UPDATE "Ajustes" SET "Estado" = \'CERRADO\' WHERE "ID_Partido" = ?').bind(id_partido).run(); } catch(e) {} }
            try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}

            return jsonResponse({ status: 'success', message: 'Resultados y datos guardados con éxito' });
        } catch(sqlErr) {
            console.error("Error SQL en save_resultado_admin:", sqlErr);
            return jsonResponse({ status: 'error', message: 'Error de base de datos: ' + sqlErr.message }, 500);
        }
    }

    // ADMIN: GUARDAR / PROGRAMAR HORA DE PUBLICACIÓN DEL MVP (sin requerir ganador definitivo aún)
    if (action === 'set_mvp_publicacion_ts') {
        const { id_partido, mvp_publicacion_ts } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para configurar el MVP.' }, 403);

        const pubTs = parseInt(mvp_publicacion_ts) || 0;
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_publicacion_ts" INTEGER').run(); } catch(e) {}

        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_visible" INTEGER DEFAULT 1').run(); } catch(e) {}

        const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
        if (exist) {
            await db.prepare('UPDATE "Resultados_Oficiales" SET "mvp_publicacion_ts" = ?, "mvp_visible" = 1 WHERE "ID Partido" = ?').bind(pubTs, id_partido).run();
        } else {
            await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "mvp_publicacion_ts", "mvp_visible") VALUES (?, ?, 1)').bind(id_partido, pubTs).run();
        }
        try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}

        return jsonResponse({ status: 'success', message: 'Hora de publicación guardada con éxito', mvp_publicacion_ts: pubTs });
    }

    // ADMIN: SET MVP OFICIAL DE JORNADA / PARTIDO
    if (action === 'set_mvp_oficial') {
        const { id_partido, mvp_oficial, mvp_stats, mvp_publicacion_ts } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para proclamar el MVP oficial.' }, 403);

        const statsStr = Array.isArray(mvp_stats) ? JSON.stringify(mvp_stats) : (mvp_stats || '');
        const proclamadoTs = (mvp_oficial && String(mvp_oficial).trim() !== '') ? Date.now() : 0;
        const publicacionTs = (mvp_publicacion_ts !== undefined && mvp_publicacion_ts !== null) ? (parseInt(mvp_publicacion_ts) || 0) : (proclamadoTs > 0 ? proclamadoTs : 0);

        // Asegurar que las columnas existen en Resultados_Oficiales
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_votos_recuento" TEXT').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_publicacion_ts" INTEGER').run(); } catch(e) {}

        // Obtener el recuento definitivo de votos para congelarlo en el resultado oficial
        let recuentoJson = '[]';
        try {
            const { results: votosList } = await db.prepare('SELECT jugador, COUNT(*) as total FROM MVP_Votos WHERE id_partido = ? GROUP BY jugador ORDER BY total DESC').bind(id_partido).all();
            if (votosList && votosList.length > 0) recuentoJson = JSON.stringify(votosList);
        } catch(e) {}

        const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
        if (exist) {
            await db.prepare('UPDATE "Resultados_Oficiales" SET "mvp_oficial" = ?, "mvp_stats" = ?, "mvp_proclamado_ts" = ?, "mvp_publicacion_ts" = ?, "mvp_votos_recuento" = ? WHERE "ID Partido" = ?').bind(mvp_oficial || '', statsStr, proclamadoTs, publicacionTs, recuentoJson, id_partido).run();
        } else {
            await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "mvp_oficial", "mvp_stats", "mvp_proclamado_ts", "mvp_publicacion_ts", "mvp_votos_recuento") VALUES (?, ?, ?, ?, ?, ?)').bind(id_partido, mvp_oficial || '', statsStr, proclamadoTs, publicacionTs, recuentoJson).run();
        }

        // Invalidar caché de clasificaciones y estadísticas para reflejar el +10% de bonus de inmediato
        try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}

        return jsonResponse({ status: 'success', message: 'MVP Oficial, estadísticas y recuento de votos guardados con éxito en la base de datos', mvp_proclamado_ts: proclamadoTs, mvp_publicacion_ts: publicacionTs, recuento: JSON.parse(recuentoJson) });
    }

    // VOTAR MVP DE PARTIDO
    if (action === 'vote_mvp') {
        const { id_partido, jugador } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        if (!id_partido || !jugador) return jsonResponse({ status: 'error', message: 'Faltan datos de votación' }, 400);

        // Protección contra saturación: comprobar si el usuario ya votó hace menos de 3 segundos a este partido
        const prevVote = await db.prepare('SELECT jugador, timestamp FROM MVP_Votos WHERE id_partido = ? AND usuario = ?').bind(id_partido, usuario).first();
        const now = Date.now();
        if (prevVote) {
            if (prevVote.jugador === jugador) {
                return jsonResponse({ status: 'success', message: 'Voto ya registrado.' });
            }
            if (prevVote.timestamp && (now - prevVote.timestamp) < 3000) {
                return jsonResponse({ status: 'error', message: 'Por favor, espera unos segundos antes de volver a cambiar tu voto.' }, 429);
            }
        }

        try { await db.prepare('ALTER TABLE MVP_Votos ADD COLUMN fecha_hora TEXT').run(); } catch(e) {}
        const formatter = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const fechaHoraStr = formatter.format(new Date(now));
        await db.prepare('INSERT OR REPLACE INTO MVP_Votos (id_partido, usuario, jugador, timestamp, fecha_hora) VALUES (?, ?, ?, ?, ?)').bind(id_partido, usuario, jugador, now, fechaHoraStr).run();
        return jsonResponse({ status: 'success', message: '¡Voto registrado para ' + jugador + '!' });
    }

    // ADMIN: OBTENER RECUENTO DE VOTOS MVP DE UN PARTIDO
    if (action === 'get_mvp_votos_summary') {
        const { id_partido } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para ver el recuento de MVP.' }, 403);

        const { results: votos } = await db.prepare('SELECT jugador, COUNT(*) as total FROM MVP_Votos WHERE id_partido = ? GROUP BY jugador ORDER BY total DESC').bind(id_partido).all();
        return jsonResponse({ status: 'success', votos: votos || [] });
    }

    // ADMIN: GESTIONAR PLANTILLA SUPERLIGA 2 MASCULINO
    if (action === 'save_plantilla_superliga') {
        const { jugadores } = body; // Array de { id?: number, dorsal: number, nombre: string, apodo: string, posicion: string, usuario: string }
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para modificar la plantilla o MVP.' }, 403);

        if (Array.isArray(jugadores)) {
            // Asegurar que la tabla existe con id como clave primaria independiente
            await db.prepare('CREATE TABLE IF NOT EXISTS Plantilla_Superliga_2_Masc (id INTEGER PRIMARY KEY AUTOINCREMENT, dorsal INTEGER NOT NULL, nombre TEXT NOT NULL, apodo TEXT, posicion TEXT, usuario TEXT, fecha_alta INTEGER)').run();
            
            // Si la tabla antigua tenía dorsal como PRIMARY KEY, migrar datos si fuera necesario
            try {
                const info = await db.prepare('PRAGMA table_info(Plantilla_Superliga_2_Masc)').all();
                const hasIdCol = (info.results || []).some(col => col.name === 'id');
                if (!hasIdCol) {
                    await db.prepare('ALTER TABLE Plantilla_Superliga_2_Masc RENAME TO _old_plantilla_sm2').run();
                    await db.prepare('CREATE TABLE Plantilla_Superliga_2_Masc (id INTEGER PRIMARY KEY AUTOINCREMENT, dorsal INTEGER NOT NULL, nombre TEXT NOT NULL, apodo TEXT, posicion TEXT, usuario TEXT, fecha_alta INTEGER)').run();
                    await db.prepare('INSERT INTO Plantilla_Superliga_2_Masc (dorsal, nombre, apodo, posicion, usuario, fecha_alta) SELECT dorsal, nombre, apodo, posicion, usuario, ? FROM _old_plantilla_sm2').bind(Date.now()).run();
                    await db.prepare('DROP TABLE IF EXISTS _old_plantilla_sm2').run();
                }
            } catch(migErr) {}

            await db.prepare('DELETE FROM Plantilla_Superliga_2_Masc').run();
            for (const j of jugadores) {
                const dor = parseInt(j.dorsal);
                const nom = (j.nombre || '').trim();
                const apod = (j.apodo || '').trim();
                const pos = (j.posicion || '').trim();
                const usr = (j.usuario || '').trim() || null;
                const pId = parseInt(j.id);
                if (!isNaN(dor) && nom) {
                    if (!isNaN(pId) && pId > 0) {
                        await db.prepare('INSERT OR REPLACE INTO Plantilla_Superliga_2_Masc (id, dorsal, nombre, apodo, posicion, usuario, fecha_alta) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(pId, dor, nom, apod, pos, usr, Date.now()).run();
                    } else {
                        await db.prepare('INSERT INTO Plantilla_Superliga_2_Masc (dorsal, nombre, apodo, posicion, usuario, fecha_alta) VALUES (?, ?, ?, ?, ?, ?)').bind(dor, nom, apod, pos, usr, Date.now()).run();
                    }
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

        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Sugerencias_Errores" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "usuario" TEXT NOT NULL,
                "tipo" TEXT NOT NULL,
                "mensaje" TEXT NOT NULL,
                "fecha_hora" TEXT NOT NULL,
                "timestamp" INTEGER NOT NULL,
                "estado" TEXT DEFAULT 'PENDIENTE'
            )`).run();
        } catch(e) {}

        const now = new Date();
        const fechaHora = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
        const ts = Date.now();

        try {
            await db.prepare(`INSERT INTO "Sugerencias_Errores" ("usuario", "tipo", "mensaje", "fecha_hora", "timestamp", "estado") VALUES (?, ?, ?, ?, ?, ?)`)
                .bind(targetUser, tipo || 'Sugerencia', mensaje.trim(), fechaHora, ts, 'PENDIENTE').run();

            return jsonResponse({ status: 'success', message: '¡Muchas gracias! Tu mensaje ha sido enviado correctamente.' });
        } catch(e) {
            return jsonResponse({ status: 'error', message: 'Error al guardar en la base de datos: ' + e.message }, 500);
        }
    }

    if (action === 'get_sugerencias') {
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos de administrador'}, 403);

        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Sugerencias_Errores" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "usuario" TEXT NOT NULL,
                "tipo" TEXT NOT NULL,
                "mensaje" TEXT NOT NULL,
                "fecha_hora" TEXT NOT NULL,
                "timestamp" INTEGER NOT NULL,
                "estado" TEXT DEFAULT 'PENDIENTE'
            )`).run();
            const { results } = await db.prepare('SELECT * FROM "Sugerencias_Errores" ORDER BY id DESC LIMIT 50').all();
            return jsonResponse({ status: 'success', sugerencias: results || [] });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === 'marcar_sugerencia_estado' || action === 'update_sugerencia_estado') {
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
            
            return jsonResponse({status: 'success', message: 'Un administrador la revisará. Si tras varios días no se ha cambiado, av├¡sanos por correo. Mientras tanto, usa tu usuario actual.'});
        } else {
            await db.prepare('UPDATE "Usuarios" SET "Nombre Real" = ? WHERE "Usuario" = ?').bind(new_nombre, usuario).run();
            return jsonResponse({status: 'success', message: 'Tu Nombre Real se ha actualizado inmediatamente.'});
        }
    }

    if (action === 'get_name_change_requests') {
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
            
            await db.batch(stmts);
            
            let msg = 'Petición aprobada con éxito.';
            if (newU) msg = `Usuario ${oldU} renombrado a ${newU} con éxito.`;
            return jsonResponse({status: 'success', message: msg});
        }
    }
    if (action === 'delete_avatar') {
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        await db.prepare('UPDATE "Insignias" SET "Avatar" = \'\', "Avatar_Url" = \'\' WHERE "Usuario" = ?').bind(usuario).run();
        return jsonResponse({status: 'success', message: 'Foto borrada.'});
    }

    if (action === 'delete_custom_badge') {
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        await db.prepare('UPDATE "Insignias" SET "Custom_Badge" = \'\', "Custom_Emoji" = \'\', "Custom_Desc" = \'\' WHERE "Usuario" = ?').bind(usuario).run();
        return jsonResponse({status: 'success', message: 'Insignia borrada.'});
    }

    if (action === 'request_badge_update') {
        const { payload } = body;
        const auth = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if(!auth) return jsonResponse({status: 'error', message: 'Credenciales inválidas'}, 401);

        await db.prepare('INSERT INTO "Peticiones_Insignias" ("Usuario", "Tipo", "Equipo_Externo", "Estado", "Fecha") VALUES (?, ?, ?, ?, ?)')
            .bind(usuario, 'PERFIL', payload, 'PENDIENTE', new Date().toISOString()).run();
            
        return jsonResponse({status: 'success', message: 'Petición enviada a los administradores.'});
    }

    if (action === 'get_peticiones_insignias') {
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({status: 'error', message: 'No tienes permisos'}, 403);

        const { results } = await db.prepare('SELECT * FROM "Peticiones_Insignias" WHERE "Estado" = \'PENDIENTE\'').all();
        return jsonResponse({status: 'success', data: results});
    }

    if (action === 'resolve_peticion_insignia') {
        const { id_peticion, resolution } = body;
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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { results: users } = await db.prepare('SELECT "Usuario", "Nombre Real" FROM "Usuarios" ORDER BY "Usuario" ASC').all();
        const { results: ins } = await db.prepare('SELECT "Usuario", "Admin Web", "Permiso_MVP", "Permiso_Resultados" FROM "Insignias"').all();
        const insMap = {};
        for (const i of ins || []) insMap[i.Usuario] = i;

        const list = (users || []).map(u => ({
            usuario: u.Usuario,
            nombre_real: u["Nombre Real"] || u.Usuario,
            admin_web: (insMap[u.Usuario] && insMap[u.Usuario]["Admin Web"] === "X") ? "X" : "",
            permiso_mvp: (insMap[u.Usuario] && insMap[u.Usuario]["Permiso_MVP"] === "X") ? "X" : "",
            permiso_resultados: (insMap[u.Usuario] && insMap[u.Usuario]["Permiso_Resultados"]) ? insMap[u.Usuario]["Permiso_Resultados"] : ""
        }));

        let equiposDisponibles = [];
        try {
            const samplePerm = await db.prepare('SELECT * FROM "Permisos_Equipos" LIMIT 1').first();
            if (samplePerm) {
                equiposDisponibles = Object.keys(samplePerm).filter(k => k !== "Jugador" && k !== "id").sort();
            }
        } catch(e) {}
        
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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        const { suscripcion, opciones_2horas, opciones_viernes, opciones_solo_olvidos, equipos_permitidos } = body;
        if (!usuario) return jsonResponse({ status: 'error', message: 'Usuario no autenticado' }, 401);
        if (!suscripcion) return jsonResponse({ status: 'error', message: 'Datos de suscripción requeridos' }, 400);

        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Suscripciones_Push" (
                "Usuario" TEXT PRIMARY KEY,
                "Suscripcion_JSON" TEXT NOT NULL,
                "Opciones_Viernes" INTEGER DEFAULT 1,
                "Opciones_2Horas" INTEGER DEFAULT 1,
                "Opciones_SoloOlvidos" INTEGER DEFAULT 0,
                "Equipos_Permitidos" TEXT DEFAULT '[]',
                "Ultima_Actualizacion" TEXT
            )`).run();

            const subJson = typeof suscripcion === 'string' ? suscripcion : JSON.stringify(suscripcion);
            const op2h = (opciones_2horas !== undefined) ? (opciones_2horas ? 1 : 0) : 1;
            const opVie = (opciones_viernes !== undefined) ? (opciones_viernes ? 1 : 0) : 1;
            const opOlv = (opciones_solo_olvidos !== undefined) ? (opciones_solo_olvidos ? 1 : 0) : 0;
            const eqPerm = Array.isArray(equipos_permitidos) ? JSON.stringify(equipos_permitidos) : (typeof equipos_permitidos === 'string' ? equipos_permitidos : '[]');
            const nowIso = new Date().toISOString();

            await db.prepare(`INSERT OR REPLACE INTO "Suscripciones_Push" 
                ("Usuario", "Suscripcion_JSON", "Opciones_Viernes", "Opciones_2Horas", "Opciones_SoloOlvidos", "Equipos_Permitidos", "Ultima_Actualizacion")
                VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(usuario, subJson, opVie, op2h, opOlv, eqPerm, nowIso).run();

            return jsonResponse({ status: 'success', message: 'Suscripción y preferencias guardadas correctamente' });
        } catch(e) {
            return jsonResponse({ status: 'error', message: 'Error guardando suscripción: ' + e.message }, 500);
        }
    }

    if (action === 'obtener_config_push') {
        if (!usuario) return jsonResponse({ status: 'error', message: 'Usuario no autenticado' }, 401);
        const pubKey = (env && env.VAPID_PUBLIC_KEY) || DEFAULT_VAPID_PUBLIC;

        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Suscripciones_Push" (
                "Usuario" TEXT PRIMARY KEY,
                "Suscripcion_JSON" TEXT NOT NULL,
                "Opciones_Viernes" INTEGER DEFAULT 1,
                "Opciones_2Horas" INTEGER DEFAULT 1,
                "Opciones_SoloOlvidos" INTEGER DEFAULT 0,
                "Equipos_Permitidos" TEXT DEFAULT '[]',
                "Ultima_Actualizacion" TEXT
            )`).run();

            const row = await db.prepare('SELECT * FROM "Suscripciones_Push" WHERE "Usuario" = ?').bind(usuario).first();
            let config = {
                tiene_suscripcion: Boolean(row && row.Suscripcion_JSON && row.Suscripcion_JSON.length > 20),
                opciones_2horas: row ? Boolean(row.Opciones_2Horas) : true,
                opciones_viernes: row ? Boolean(row.Opciones_Viernes) : true,
                opciones_solo_olvidos: row ? Boolean(row.Opciones_SoloOlvidos) : false,
                equipos_permitidos: (row && row.Equipos_Permitidos) ? (function(){ try { return JSON.parse(row.Equipos_Permitidos); } catch(e){ return []; } })() : [],
                public_key: pubKey
            };
            return jsonResponse({ status: 'success', config });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    if (action === 'eliminar_suscripcion_push') {
        if (!usuario) return jsonResponse({ status: 'error', message: 'Usuario no autenticado' }, 401);
        try {
            await db.prepare('UPDATE "Suscripciones_Push" SET "Opciones_2Horas" = 0, "Opciones_Viernes" = 0, "Suscripcion_JSON" = "" WHERE "Usuario" = ?').bind(usuario).run();
            return jsonResponse({ status: 'success', message: 'Notificaciones desactivadas para este usuario' });
        } catch(e) {
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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
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
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const targetUser = (body.target_usuario || usuario).trim();
        const subRow = await db.prepare('SELECT Suscripcion_JSON FROM "Suscripciones_Push" WHERE "Usuario" = ?').bind(targetUser).first();
        if (!subRow || !subRow.Suscripcion_JSON || subRow.Suscripcion_JSON.length < 20) {
            return jsonResponse({ status: 'error', message: `El usuario @${targetUser} no tiene ninguna suscripción Push registrada en su dispositivo aún.` }, 400);
        }

        let subObj;
        try { subObj = JSON.parse(subRow.Suscripcion_JSON); } catch(e) { return jsonResponse({ status: 'error', message: 'Formato de suscripción corrupto' }, 500); }

        const testPayload = {
            title: body.titulo || "🏐 Notificación de Prueba VCV Play",
            body: body.mensaje || `¡Hola @${targetUser}! Las notificaciones Push nativas funcionan correctamente en tu dispositivo.`,
            data: { url: "/dev.html" }
        };

        const pushRes = await sendWebPushNotification(subObj, testPayload, env);

        const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Notificaciones" (
                "ID" INTEGER PRIMARY KEY AUTOINCREMENT, "Usuario" TEXT, "Tipo" TEXT, "Titulo" TEXT, "Mensaje" TEXT, "Fecha" TEXT, "Estado" TEXT
            )`).run();
            await db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                .bind(targetUser, 'PRUEBA_ADMIN', testPayload.title, testPayload.body, nowMadrid, pushRes.success ? 'ENVIADO' : `FALLIDO (${pushRes.status || pushRes.error})`).run();
        } catch(e) {}

        if (pushRes.success) {
            return jsonResponse({ status: 'success', message: `✅ Notificación enviada con éxito a @${targetUser}` });
        } else {
            return jsonResponse({ status: 'error', message: `❌ Error enviando Push: ${pushRes.error || ('HTTP ' + pushRes.status)}` }, 500);
        }
    }

    if (action === 'cron_recordatorio_2horas') {
        let isTriggeredByAdmin = false;
        if (usuario && password) {
            const adminCheck = await db.prepare('SELECT i."Admin Web" FROM "Usuarios" u LEFT JOIN "Insignias" i ON u.Usuario = i.Usuario WHERE u.Usuario = ? AND u.Password = ?').bind(usuario, password).first();
            if (adminCheck && adminCheck["Admin Web"] === "X") isTriggeredByAdmin = true;
        }

        let soloAdmin = true;
        try {
            const rowModo = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'NOTIF_SOLO_ADMIN'").first();
            if (rowModo && rowModo.valor !== undefined) {
                soloAdmin = (rowModo.valor === 'SI' || rowModo.valor === '1' || rowModo.valor === 'true');
            }
        } catch(e) {}
        if (body.solo_admin !== undefined) {
            soloAdmin = Boolean(body.solo_admin);
        }

        const now = Date.now();
        const margenMinutos = parseInt(body.margen_minutos) || 135;
        const maxTs = now + (margenMinutos * 60 * 1000);

        const { results: rawPartidos } = await db.prepare('SELECT * FROM "Ajustes" WHERE "Visibilidad" = \'MOSTRAR\'').all();
        const resMap = {};
        const partidos = (rawPartidos || []).map(r => formatMatch(r, resMap));

        let partidosObjetivo = [];
        if (body.forzar_partido_id) {
            partidosObjetivo = partidos.filter(p => p.id_partido === body.forzar_partido_id);
        } else {
            partidosObjetivo = partidos.filter(p => p.timestamp && p.timestamp > now && p.timestamp <= maxTs);
        }

        if (partidosObjetivo.length === 0) {
            return jsonResponse({
                status: 'success',
                message: 'No hay partidos programados en las próximas 2 horas.',
                partidos_encontrados: 0,
                enviados: 0,
                solo_admin: soloAdmin
            });
        }

        await db.prepare(`CREATE TABLE IF NOT EXISTS "Suscripciones_Push" (
            "Usuario" TEXT PRIMARY KEY, "Suscripcion_JSON" TEXT NOT NULL, "Opciones_Viernes" INTEGER DEFAULT 1, "Opciones_2Horas" INTEGER DEFAULT 1, "Opciones_SoloOlvidos" INTEGER DEFAULT 0, "Equipos_Permitidos" TEXT DEFAULT '[]', "Ultima_Actualizacion" TEXT
        )`).run();
        await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Notificaciones" (
            "ID" INTEGER PRIMARY KEY AUTOINCREMENT, "Usuario" TEXT, "Tipo" TEXT, "Titulo" TEXT, "Mensaje" TEXT, "Fecha" TEXT, "Estado" TEXT
        )`).run();

        const { results: subs } = await db.prepare('SELECT * FROM "Suscripciones_Push" WHERE "Opciones_2Horas" = 1 AND LENGTH("Suscripcion_JSON") > 20').all();
        if (!subs || subs.length === 0) {
            return jsonResponse({
                status: 'success',
                message: 'Hay partidos en 2 horas, pero ningún usuario tiene activada la suscripción de 2h.',
                partidos_encontrados: partidosObjetivo.length,
                enviados: 0,
                solo_admin: soloAdmin
            });
        }

        const { results: permRows } = await db.prepare('SELECT * FROM "Permisos_Equipos"').all();
        const permMap = {};
        for (const pr of permRows || []) permMap[pr.Jugador] = pr;

        const { results: insRows } = await db.prepare('SELECT * FROM "Insignias"').all();
        const insMap = {};
        for (const ir of insRows || []) insMap[ir.Usuario] = ir;

        const { results: allPorras } = await db.prepare('SELECT * FROM "Porras"').all();
        const porrasMap = {};
        for (const po of allPorras || []) porrasMap[`${po.Usuario}_${po["ID Partido"]}`] = po;

        const { results: recentLogs } = await db.prepare('SELECT Usuario, Tipo FROM "Log_Notificaciones" WHERE "Estado" = \'ENVIADO\'').all();
        const sentSet = new Set((recentLogs || []).map(l => `${l.Usuario}_${l.Tipo}`));

        let totalEnviados = 0;
        let detalleEnvios = [];
        const nowMadrid = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

        for (const p of partidosObjetivo) {
            const loc = p.equipo_local;
            const riv = p.rival;
            const tipoLog = `2HORAS_${p.id_partido}`;

            for (const subRow of subs) {
                const u = subRow.Usuario;
                const userIns = insMap[u] || {};
                const isUserAdmin = (userIns["Admin Web"] === "X");

                // FILTRO CLAVE: Si el modo pruebas está activo, SOLO enviar a administradores
                if (soloAdmin && !isUserAdmin) {
                    continue;
                }

                if (sentSet.has(`${u}_${tipoLog}`)) {
                    continue;
                }

                const uPerm = permMap[u] || {};
                const hasTeamPerm = isUserAdmin || Boolean(uPerm[loc] && uPerm[loc].toString().toUpperCase() === 'X') || Boolean(uPerm[riv] && uPerm[riv].toString().toUpperCase() === 'X');
                if (!hasTeamPerm) continue;

                const userPred = porrasMap[`${u}_${p.id_partido}`];
                const hasPredicted = Boolean(userPred && userPred.Sets);

                if (subRow.Opciones_SoloOlvidos === 1 && hasPredicted) {
                    continue;
                }

                let subObj;
                try { subObj = JSON.parse(subRow.Suscripcion_JSON); } catch(e) { continue; }

                let title = `🏐 ¡Tu partido empieza en 2 horas!`;
                let bodyNotif = hasPredicted
                    ? `Tienes pronosticado (${userPred.Sets}): ${loc} vs ${riv}. ¡A punto de comenzar!`
                    : `⚠️ ¡Aún no has pronosticado el ${loc} vs ${riv}! Entra a pronosticar antes de que empiece.`;

                const payload = {
                    title: title,
                    body: bodyNotif,
                    data: { url: "/dev.html" }
                };

                const pushRes = await sendWebPushNotification(subObj, payload, env);

                await db.prepare('INSERT INTO "Log_Notificaciones" ("Usuario", "Tipo", "Titulo", "Mensaje", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(u, tipoLog, title, bodyNotif, nowMadrid, pushRes.success ? 'ENVIADO' : `FALLIDO (${pushRes.status || pushRes.error})`).run();

                if (pushRes.success) {
                    totalEnviados++;
                    sentSet.add(`${u}_${tipoLog}`);
                    detalleEnvios.push({ usuario: u, partido: p.id_partido, estado: 'ENVIADO' });
                } else {
                    detalleEnvios.push({ usuario: u, partido: p.id_partido, estado: 'FALLIDO', error: pushRes.error });
                }
            }
        }

        return jsonResponse({
            status: 'success',
            message: `Proceso completado: ${totalEnviados} notificaciones enviadas.`,
            partidos_encontrados: partidosObjetivo.length,
            enviados: totalEnviados,
            solo_admin: soloAdmin,
            detalles: detalleEnvios
        });
    }

    if (action === 'obtener_log_notificaciones') {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        try {
            await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Notificaciones" (
                "ID" INTEGER PRIMARY KEY AUTOINCREMENT, "Usuario" TEXT, "Tipo" TEXT, "Titulo" TEXT, "Mensaje" TEXT, "Fecha" TEXT, "Estado" TEXT
            )`).run();
            const { results } = await db.prepare('SELECT * FROM "Log_Notificaciones" ORDER BY "ID" DESC LIMIT 50').all();
            return jsonResponse({ status: 'success', logs: results || [] });
        } catch(e) {
            return jsonResponse({ status: 'error', message: e.message }, 500);
        }
    }

    return jsonResponse({ status: "error", message: `Acción desconocida: ${action}` }, 400);
}
