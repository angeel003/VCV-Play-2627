// ============================================================================
// Cloudflare Pages Function: /api/vcv
// Backend principal modularizado con base de datos Cloudflare D1
// ============================================================================

import {
    jsonResponse,
    getMadridTimestamp,
    formatTsToMadridStr,
    hashPassword,
    verifyPasswordHash,
    flushBatch,
    runInBg,
    isSchemaMissingErr,
    runInChunks,
    parseReglasPuntuacion,
    isModoMantenimientoActivo
} from './_modules/shared.js';

import {
    handleMvp,
    ensureMvpVotosSchema,
    ensureResultadosMvpSchema,
    normalizeMvpStr,
    extractMvpDorsal,
    isSameMvpPlayer,
    buildMvpVotesRecuento
} from './_modules/mvp.js';

import {
    formatMatch,
    handleMatches
} from './_modules/matches.js';

import {
    DEFAULT_VAPID_PUBLIC,
    handlePush,
    sendWebPushNotification,
    ensureSuscripcionesPushSchema,
    ensureNotificacionesSchema,
    ensureLogNotificacionesSchema,
    writePushLogsAndCleanup,
    broadcastPushToAll,
    notifyAdminsPush,
    crearNotificacion,
    getLunesSemanaClave,
    verificarDescongelacionAutomatica,
    getNotificacionesPublicas
} from './_modules/push.js';

import {
    handleAdmin,
    ensureUsuarioAliasSchema,
    isUsernameTakenOrReserved,
    ensureSugerenciasSchema,
    ensureSolicitudesRegistroSchema,
    purgeUserFromAllTablesExceptSolicitud,
    purgeUserFromAllTables,
    renameUserInAllTables,
    ensureMonitorSchema
} from './_modules/admin.js';

async function verifyAndMigrateUser(db, usuario, password) {
    if (!usuario || !password) return null;
    let userRow = await db.prepare('SELECT * FROM "Usuarios" WHERE lower("Usuario") = lower(?) OR lower("Correo") = lower(?)').bind(usuario, usuario).first();
    let isViaAlias = false;
    let aliasAntiguo = null;
    
    // Si no se encuentra directamente, comprobar si usó un alias antiguo activo en Usuario_Alias
    if (!userRow) {
        try {
            await ensureUsuarioAliasSchema(db);
            const aliasRow = await db.prepare('SELECT * FROM "Usuario_Alias" WHERE lower("usuario_antiguo") = lower(?) AND "activo" = 1').bind(usuario).first().catch(() => null);
            if (aliasRow && aliasRow.usuario_actual) {
                userRow = await db.prepare('SELECT * FROM "Usuarios" WHERE lower("Usuario") = lower(?)').bind(aliasRow.usuario_actual).first().catch(() => null);
                if (userRow) {
                    isViaAlias = true;
                    aliasAntiguo = aliasRow.usuario_antiguo;
                }
            }
        } catch(e) {}
    }

    // Si aún no se encuentra directamente, comprobar si usó un Usuario_Original previo renombrado por moderación
    if (!userRow) {
        const origReq = await db.prepare('SELECT "Usuario" FROM "Solicitudes_Registro" WHERE lower("Usuario_Original") = lower(?) LIMIT 1').bind(usuario).first().catch(() => null);
        if (origReq && origReq.Usuario) {
            userRow = await db.prepare('SELECT * FROM "Usuarios" WHERE lower("Usuario") = lower(?)').bind(origReq.Usuario).first().catch(() => null);
        }
    }
    if (!userRow) return null;

    const canonicalUsuario = userRow.Usuario;
    const storedPwd = (userRow.Password || "").toString().trim();
    const inputPwd = password.toString().trim();

    let isPasswordValid = false;

    // 1. Si la contraseña ya está en formato hash v1$
    if (storedPwd.startsWith("v1$")) {
        isPasswordValid = await verifyPasswordHash(inputPwd, storedPwd);
    } else if (storedPwd === inputPwd) {
        // 2. Si es contraseña legacy en texto plano
        isPasswordValid = true;
        try {
            const newHashed = await hashPassword(inputPwd);
            await db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(newHashed, canonicalUsuario).run();
            userRow.Password = newHashed;
        } catch(e) {
            console.error("Error en lazy migration de contraseña:", e);
        }
    }

    if (!isPasswordValid) return null;

    // Si el usuario inició sesión utilizando su alias antiguo, DESACTIVARLO de inmediato tras este primer uso
    if (isViaAlias && aliasAntiguo) {
        try {
            await db.prepare('UPDATE "Usuario_Alias" SET "usos" = "usos" + 1, "activo" = 0 WHERE lower("usuario_antiguo") = lower(?)').bind(aliasAntiguo).run();
            userRow.alias_migrado = true;
            userRow.alias_antiguo = aliasAntiguo;
        } catch(e) {
            console.error("Error desactivando alias de usuario:", e);
        }
    }

    return userRow;
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
        if (res && res.Usuario) {
            const insBan = await db.prepare('SELECT "Baneado", "Motivo_Baneo", "Verificado" FROM "Insignias" WHERE lower("Usuario") = lower(?)').bind(res.Usuario).first().catch(() => null);
            if (insBan && (insBan.Baneado === 1 || insBan.Baneado === '1' || insBan.Verificado === 'BANEADO')) {
                res.is_banned = true;
                res.motivo_baneo = insBan.Motivo_Baneo || 'Tu cuenta ha sido bloqueada temporal o indefinidamente por la administración del club.';
            }
        }
        if (targetU === usuario && targetP === password) {
            authUserCache = res;
        }
        return res;
    }


    const ctx = {
        db,
        env,
        body,
        usuario,
        password,
        getAuthUser,
        context,
        waitUntil: (typeof context.waitUntil === 'function') ? context.waitUntil.bind(context) : undefined,
        crearNotificacion,
        broadcastPushToAll
    };

    // Delegación modular a módulos independientes
    let modRes = await handleMvp(action, ctx);
    if (modRes) return modRes;

    modRes = await handleMatches(action, ctx);
    if (modRes) return modRes;

    modRes = await handlePush(action, ctx);
    if (modRes) return modRes;

    modRes = await handleAdmin(action, ctx);
    if (modRes) return modRes;

    // Acciones principales del núcleo (Migraciones, Sincronización, Ping, Partidas, Pronósticos y Login)
    if (action === 'migrate_db' || action === 'apply_indexes') {
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Genero TEXT DEFAULT 'M'").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Avatar TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Avatar_Url TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Permiso_MVP TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Permiso_Resultados TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Verificado TEXT DEFAULT 'APROBADO'").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Insignias ADD COLUMN Equipo_Club TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Usuarios ADD COLUMN Correo TEXT").run(); } catch(e) {}
        try { await db.prepare("ALTER TABLE Solicitudes_Registro ADD COLUMN Equipo_Club TEXT").run(); } catch(e) {}
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
        try { await db.prepare("ALTER TABLE Resultados_Oficiales ADD COLUMN mvp_mostrar_porcentajes INTEGER DEFAULT 0").run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_por" TEXT').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_ts" INTEGER').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_fecha" TEXT').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Resultados_Oficiales" ADD COLUMN "Acta" TEXT').run(); } catch(e) {}

        // Columnas de equipos en Porras (y limpieza de columnas redundantes Rival / Ubicacion_Club)
        try { await db.prepare('ALTER TABLE "Porras" ADD COLUMN "Equipo_Local" TEXT').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Porras" ADD COLUMN "Equipo_Visitante" TEXT').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Porras" DROP COLUMN "Rival"').run(); } catch(e) {}
        try { await db.prepare('ALTER TABLE "Porras" DROP COLUMN "Ubicacion_Club"').run(); } catch(e) {}
        try {
            await db.prepare(`
                UPDATE "Porras"
                SET "Equipo_Local" = (
                        SELECT CASE WHEN "Ajustes"."Ubicacion" = 'VISITANTE' THEN "Ajustes"."Rival" ELSE "Ajustes"."Equipo_Local" END
                        FROM "Ajustes" WHERE "Ajustes"."ID_Partido" = "Porras"."ID Partido"
                    ),
                    "Equipo_Visitante" = (
                        SELECT CASE WHEN "Ajustes"."Ubicacion" = 'VISITANTE' THEN "Ajustes"."Equipo_Local" ELSE "Ajustes"."Rival" END
                        FROM "Ajustes" WHERE "Ajustes"."ID_Partido" = "Porras"."ID Partido"
                    )
                WHERE EXISTS (SELECT 1 FROM "Ajustes" WHERE "Ajustes"."ID_Partido" = "Porras"."ID Partido")
            `).run();
        } catch(e) {}

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
        // Asegurar tabla de plantilla Superliga 2 si no existiera
        try {
            await db.prepare('CREATE TABLE IF NOT EXISTS Plantilla_Superliga_2_Masc (id INTEGER PRIMARY KEY AUTOINCREMENT, dorsal INTEGER NOT NULL, nombre TEXT NOT NULL, apodo TEXT, posicion TEXT, usuario TEXT, fecha_alta INTEGER)').run();
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
            // Sincronizar columnas de equipos en Porras y eliminar columnas redundantes
            try { await db.prepare('ALTER TABLE "Porras" ADD COLUMN "Equipo_Local" TEXT').run(); } catch(e) {}
            try { await db.prepare('ALTER TABLE "Porras" ADD COLUMN "Equipo_Visitante" TEXT').run(); } catch(e) {}
            try { await db.prepare('ALTER TABLE "Porras" DROP COLUMN "Rival"').run(); } catch(e) {}
            try { await db.prepare('ALTER TABLE "Porras" DROP COLUMN "Ubicacion_Club"').run(); } catch(e) {}

            // Limpieza de usuarios de pruebas automatizadas
            try {
                const testUsers = ['botuser123', 'speeduser123', 'tempuser123'];
                for (const tu of testUsers) {
                    await db.prepare('DELETE FROM "Usuarios" WHERE "Usuario" = ?').bind(tu).run();
                    await db.prepare('DELETE FROM "Insignias" WHERE "Usuario" = ?').bind(tu).run();
                    await db.prepare('DELETE FROM "Ligas" WHERE "Jugador" = ?').bind(tu).run();
                    await db.prepare('DELETE FROM "Permisos_Equipos" WHERE "Jugador" = ?').bind(tu).run();
                    await db.prepare('DELETE FROM "Permisos_Secreta" WHERE "Usuario" = ?').bind(tu).run();
                    await db.prepare('DELETE FROM "Solicitudes_Registro" WHERE "Usuario" = ?').bind(tu).run();
                }
            } catch(e) {}
            try {
                await db.prepare(`
                    UPDATE "Porras"
                    SET "Equipo_Local" = (
                            SELECT CASE WHEN "Ajustes"."Ubicacion" = 'VISITANTE' THEN "Ajustes"."Rival" ELSE "Ajustes"."Equipo_Local" END
                            FROM "Ajustes" WHERE "Ajustes"."ID_Partido" = "Porras"."ID Partido"
                        ),
                        "Equipo_Visitante" = (
                            SELECT CASE WHEN "Ajustes"."Ubicacion" = 'VISITANTE' THEN "Ajustes"."Equipo_Local" ELSE "Ajustes"."Rival" END
                            FROM "Ajustes" WHERE "Ajustes"."ID_Partido" = "Porras"."ID Partido"
                        )
                    WHERE EXISTS (SELECT 1 FROM "Ajustes" WHERE "Ajustes"."ID_Partido" = "Porras"."ID Partido")
                `).run();
            } catch(e) {}

            return jsonResponse({ status: "success", message: "Todos los partidos y datos han sido sincronizados en la base de datos." });
        } catch(err) {
            return jsonResponse({ status: "error", message: err.message }, 500);
        }
    }

    if (action === "ping") {
        return jsonResponse({ status: "ok" });
    }

    // HELPERS CANÓNICOS MVP: Comparación fiable por dorsal/apodo/nombre y recuento real sin perder nominados con 0 votos

    if (action === "login_guest") {
        const autoKeyGuest = 'AUTO_UNFREEZE_' + getLunesSemanaClave(new Date());
        const [
            rawPartidosRes,
            resOfRes,
            rowPerm,
            notifRes,
            cacheGuestRes,
            regGuestRes
        ] = await Promise.all([
            db.prepare('SELECT * FROM "Ajustes" WHERE "Visibilidad" != \'OCULTAR\' ORDER BY "timestamp" ASC').all(),
            db.prepare('SELECT * FROM "Resultados_Oficiales"').all(),
            db.prepare('SELECT * FROM "Permisos_Equipos" WHERE lower("Jugador") = \'invitado\'').first(),
            db.prepare(`
                SELECT * FROM "Notificaciones" 
                WHERE "Visibilidad" IS NULL OR ("Visibilidad" != 'OCULTAR' AND "Visibilidad" != 'BORRADA' AND "Visibilidad" != 'ELIMINADA') 
                ORDER BY "timestamp" DESC, "ID" DESC
            `).all().catch(() => null),
            db.prepare("SELECT clave, valor FROM Cache_App WHERE clave IN ('FREEZE_OVERRIDE', ?)").bind(autoKeyGuest).all().catch(() => null),
            db.prepare('SELECT "Regla", "Puntos" FROM "Reglas_Puntuacion"').all().catch(() => null)
        ]);

        const rawPartidos = (rawPartidosRes && rawPartidosRes.results) || [];
        const resOf = (resOfRes && resOfRes.results) || [];
        const resMap = {};
        for (const ro of resOf) resMap[ro["ID Partido"]] = ro;

        const partidos = rawPartidos.map(r => formatMatch(r, resMap, null, false));

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

        const guestReglas = parseReglasPuntuacion((regGuestRes && regGuestRes.results) || []);

        return jsonResponse({
            status: "success",
            usuario: "Invitado",
            nombre_real: "Modo Invitado",
            equipos: cartelera,
            todos_partidos: todosPartidos,
            mis_equipos_siguiendo: Object.keys(misPermisos),
            notificaciones: notificaciones,
            reglas: {
                sets: guestReglas.ptsSets,
                ganador: guestReglas.ptsGanador,
                diff_exacta: guestReglas.ptsDiffExacta,
                max_dist: guestReglas.maxDistancia,
                pct_mvp: guestReglas.pctMvp
            }
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
        await db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(hashedNew, user.Usuario).run();
        return jsonResponse({ status: "success", message: "¡Contraseña actualizada con éxito!" });
    }

    // 4. GUARDAR PREDICCIONES (Porras)
    if (action === "save") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });
        if (user.is_banned) {
            return jsonResponse({ status: "error", code: "USUARIO_BANEADO", message: "Tu cuenta ha sido bloqueada / suspendida.", motivo_baneo: user.motivo_baneo }, 403);
        }

        const preds = body.predicciones || {};
        const nowMs = Date.now();
        const predIds = Object.keys(preds).filter(Boolean);

        // Validar seguridad en 1 sola consulta por lote: partido no cerrado ni iniciado
        const matchInfoMap = {};
        for (let i = 0; i < predIds.length; i += 80) {
            const chunk = predIds.slice(i, i + 80);
            const placeholders = chunk.map(() => '?').join(',');
            const { results: partidosCheck } = await db.prepare(`SELECT "ID_Partido", "Equipo_Local", "Rival", "Ubicacion", "Estado", "timestamp" FROM "Ajustes" WHERE "ID_Partido" IN (${placeholders})`).bind(...chunk).all();
            for (const partido of partidosCheck || []) {
                matchInfoMap[partido.ID_Partido] = partido;
                if (partido.Estado === "CERRADO" || (partido.timestamp && nowMs >= partido.timestamp)) {
                    return jsonResponse({ status: "error", message: `⚠️ Seguridad: El partido ${partido.ID_Partido} ya ha comenzado o está cerrado.` });
                }
            }
        }

        // Optimización: agrupar sentencias DELETE e INSERT en db.batch para ejecutarlas en 1 solo viaje a SQLite
        const batchStmts = [];
        const nowStr = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        for (const idPart of predIds) {
            batchStmts.push(db.prepare('DELETE FROM "Porras" WHERE "Usuario" = ? AND "ID Partido" = ?').bind(usuario, idPart));
            const p = preds[idPart];
            if (p && p.sets) {
                const m = matchInfoMap[idPart] || {};
                const isVis = (m.Ubicacion || '').toUpperCase() === 'VISITANTE';
                const eqCasa = isVis ? (m.Rival || '') : (m.Equipo_Local || '');
                const eqFuera = isVis ? (m.Equipo_Local || '') : (m.Rival || '');
                batchStmts.push(db.prepare('INSERT INTO "Porras" ("Timestamp", "Usuario", "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local", "Equipo_Local", "Equipo_Visitante") VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    .bind(nowStr, usuario, idPart, p.sets, p.puntos, p.signo, eqCasa, eqFuera));
            }
        }
        await flushBatch(db, batchStmts);
        return jsonResponse({ status: "success", message: "Predicciones guardadas correctamente." });
    }

    // 5. GUARDAR PREDICCIONES SECRETAS (Puntos totales temporada)
    if (action === "save_totales") {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });
        if (user.is_banned) {
            return jsonResponse({ status: "error", code: "USUARIO_BANEADO", message: "Tu cuenta ha sido bloqueada / suspendida.", motivo_baneo: user.motivo_baneo }, 403);
        }

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
            // A. Comprobar si introdujo un nuevo usuario que todavía está pendiente de aprobación por el admin
            try {
                const peticionPendiente = await db.prepare('SELECT * FROM "Peticiones_Nombre" WHERE lower("Nuevo Usuario Sol") = lower(?) AND "Estado" = \'PENDIENTE\'').bind(usuario).first().catch(() => null);
                if (peticionPendiente) {
                    return jsonResponse({
                        status: "error",
                        code: "USUARIO_CAMBIO_PENDIENTE",
                        message: `⏳ Tu solicitud para usar el nuevo usuario @${peticionPendiente["Nuevo Usuario Sol"]} aún está pendiente de aprobación por el administrador. Por favor, inicia sesión con tu usuario actual (@${peticionPendiente["Usuario Actual"]}).`
                    }, 403);
                }
            } catch(e) {}

            // B. Comprobar si introdujo un alias antiguo que ya agotó su inicio de sesión único
            try {
                await ensureUsuarioAliasSchema(db);
                const aliasExpirado = await db.prepare('SELECT * FROM "Usuario_Alias" WHERE lower("usuario_antiguo") = lower(?) AND "activo" = 0').bind(usuario).first().catch(() => null);
                if (aliasExpirado) {
                    return jsonResponse({
                        status: "error",
                        code: "ALIAS_EXPIRADO",
                        message: `⚠️ El nombre de usuario @${aliasExpirado.usuario_antiguo} ya no está activo porque completaste la transición a @${aliasExpirado.usuario_actual}. Por favor, inicia sesión con tu usuario actual (@${aliasExpirado.usuario_actual}) o con tu correo electrónico.`
                    }, 403);
                }
            } catch(e) {}

            const rejected = await db.prepare('SELECT "Motivo_Rechazo" FROM "Solicitudes_Registro" WHERE (lower("Usuario") = lower(?) OR lower("Email") = lower(?) OR lower("Usuario_Original") = lower(?)) AND "Estado" = \'RECHAZADA\' ORDER BY "Fecha_Resolucion" DESC LIMIT 1').bind(usuario, usuario, usuario).first().catch(() => null);
            if (rejected) {
                const mot = rejected.Motivo_Rechazo ? ` (${rejected.Motivo_Rechazo})` : '';
                return jsonResponse({
                    status: "error",
                    code: "REGISTRO_RECHAZADO",
                    message: `❌ Tu solicitud de registro fue rechazada por la administración del club${mot}. Contacta con el club si consideras que es un error.`
                }, 403);
            }
            return jsonResponse({ status: "error", message: "Usuario o contraseña incorrectos." });
        }

        const canonicalUsuario = userRow.Usuario;

        // CONTROL DE CUENTA BANEADA / SUSPENDIDA
        if (userRow.is_banned) {
            return jsonResponse({
                status: "error",
                code: "USUARIO_BANEADO",
                message: "🚫 Tu cuenta ha sido bloqueada / suspendida por la administración del club.",
                motivo_baneo: userRow.motivo_baneo || "Tu cuenta ha sido bloqueada temporal o indefinidamente por la administración del club."
            }, 403);
        }

        // CONTROL DE MODO MANTENIMIENTO: Restringido exclusivamente a administradores
        if (mantenimientoActivo) {
            const adminCheckBadge = canonicalUsuario
                ? await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE lower("Usuario") = lower(?)').bind(canonicalUsuario).first().catch(() => null)
                : null;
            const esAdmin = adminCheckBadge && adminCheckBadge["Admin Web"] === "X";
            if (!esAdmin) {
                return jsonResponse({
                    status: "error",
                    code: "MODO_MANTENIMIENTO",
                    message: "🚧 La plataforma se encuentra temporalmente en modo mantenimiento. El acceso está restringido exclusivamente a administradores del club. Por favor, vuelve a intentarlo en 5 minutos."
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
            
            // 10:00 hora peninsular española (Europe/Madrid)
            try {
                const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(u);
                const testDate = new Date(`${datePart}T10:00:00Z`);
                const madridHourAtUtc10 = parseInt(new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }).format(testDate), 10);
                const offsetHours = madridHourAtUtc10 - 10;
                u.setUTCHours(10 - offsetHours, 0, 0, 0);
            } catch(e) {
                u.setUTCHours(9, 0, 0, 0); // Fallback invierno Madrid (UTC+1)
            }
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
            db.prepare('SELECT * FROM "Permisos_Equipos" WHERE "Jugador" = ?').bind(canonicalUsuario).first(),
            db.prepare('SELECT * FROM "Ligas"').all(),
            db.prepare('SELECT * FROM "Ligas_Equipos"').all(),
            db.prepare('SELECT "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local" FROM "Porras" WHERE "Usuario" = ?').bind(canonicalUsuario).all(),
            db.prepare('SELECT * FROM "Insignias"').all(),
            db.prepare('SELECT id, dorsal, nombre, apodo, posicion, usuario FROM Plantilla_Superliga_2_Masc ORDER BY dorsal ASC, id ASC').all()
                .catch(async () => db.prepare('SELECT dorsal, nombre, apodo, posicion FROM Plantilla_Superliga ORDER BY dorsal ASC').all().catch(() => ({ results: [] }))),
            db.prepare('SELECT * FROM "Permisos_Secreta" WHERE "Usuario" = ?').bind(canonicalUsuario).first(),
            db.prepare('SELECT "Usuario", "Equipo", "Puntos Predichos" FROM "Predicciones_Secretas" WHERE "Usuario" = ?').bind(canonicalUsuario).all(),
            db.prepare('SELECT "Regla", "Puntos" FROM "Reglas_Puntuacion"').all(),
            db.prepare('SELECT "Usuario", "Nombre Real" FROM "Usuarios"').all(),
            db.prepare("SELECT clave, valor FROM Cache_App WHERE clave IN ('FREEZE_OVERRIDE', 'NOTIF_SOLO_ADMIN', ?, ?, ?)").bind(autoKeyLogin, defaultCacheKey, defaultStatsCacheKey).all().catch(() => null),
            db.prepare('SELECT * FROM "Ligas_Config"').all().catch(() => null),
            db.prepare('SELECT activo FROM "Monitor_Usuarios" WHERE "usuario" = ?').bind(canonicalUsuario).first().catch(() => null),
            db.prepare('SELECT * FROM "Notificaciones" WHERE "Visibilidad" IS NULL OR ("Visibilidad" != \'OCULTAR\' AND "Visibilidad" != \'BORRADA\' AND "Visibilidad" != \'ELIMINADA\') ORDER BY "timestamp" DESC, "ID" DESC').all().catch(() => null),
            db.prepare('SELECT "Suscripcion_JSON", "Opciones_Viernes", "Opciones_2Horas", "Opciones_SoloOlvidos", "Opciones_Descongelacion", "Opciones_Mvp", "Equipos_Permitidos" FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ? ORDER BY "Ultima_Actualizacion" DESC LIMIT 1').bind(canonicalUsuario).first()
                .catch(async (err) => isSchemaMissingErr(err)
                    ? db.prepare('SELECT "Suscripcion_JSON", "Opciones_Viernes", "Opciones_2Horas", "Opciones_SoloOlvidos", "Equipos_Permitidos" FROM "Suscripciones_Push_Dispositivos" WHERE "Usuario" = ? ORDER BY "Ultima_Actualizacion" DESC LIMIT 1').bind(canonicalUsuario).first().catch(() => null)
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
                            await db.prepare('UPDATE "Usuarios" SET ultimo_acceso = CURRENT_TIMESTAMP WHERE "Usuario" = ?').bind(canonicalUsuario).run();
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
                                .bind(canonicalUsuario, nowMadrid, nowTs, origen, disp).run();
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

        const allInsignias = (allInsigniasRes && allInsigniasRes.results) || [];
        const userInsignia = allInsignias.find(i => i.Usuario === canonicalUsuario || (i.Usuario && i.Usuario.toLowerCase() === canonicalUsuario.toLowerCase()));
        if (userInsignia && userInsignia.Verificado === 'RECHAZADA') {
            return jsonResponse({
                status: "error",
                message: "Esta solicitud de cuenta fue rechazada por el administrador. Contacta con adminfantasyvcv@gmail.com si crees que es un error."
            }, 403);
        }
        const isUserAdmin = Boolean(userInsignia && (userInsignia["Admin Web"] === "X"));
        const isUserGestorMvp = Boolean(userInsignia && (userInsignia["Permiso_MVP"] === "X"));
        const hasPermisoResultados = Boolean(userInsignia && Boolean(userInsignia["Permiso_Resultados"]));
        const canViewMvpVotes = isUserAdmin || isUserGestorMvp;

        const rawMvpVotes = rawMvpVotesRes ? (rawMvpVotesRes.results || []) : null;
        let mvpVotesByMatchMap = null;
        const misVotosMvp = {};
        const userMvpVotesLookup = {};
        const userMvpVotesLowerLookup = {};
        if (rawMvpVotes !== null) {
            if (canViewMvpVotes) mvpVotesByMatchMap = {};
            const mvpCountsByMatch = {};
            for (const mv of rawMvpVotes) {
                if (!mv || !mv.id_partido || !mv.jugador) continue;
                const idP = mv.id_partido;
                const mvUser = String(mv.usuario || '').trim();
                if (canViewMvpVotes) {
                    if (!mvpCountsByMatch[idP]) mvpCountsByMatch[idP] = {};
                    mvpCountsByMatch[idP][mv.jugador] = (mvpCountsByMatch[idP][mv.jugador] || 0) + 1;
                }
                if (mv.usuario === canonicalUsuario) {
                    misVotosMvp[idP] = mv.jugador;
                }
                userMvpVotesLookup[`${idP}_${mv.usuario}`] = mv.jugador;
                if (mvUser) userMvpVotesLowerLookup[`${idP}_${mvUser.toLowerCase()}`] = mv.jugador;
            }
            if (canViewMvpVotes) {
                for (const idP in mvpCountsByMatch) {
                    const list = Object.keys(mvpCountsByMatch[idP]).map(jug => ({
                        jugador: jug,
                        total: mvpCountsByMatch[idP][jug]
                    }));
                    list.sort((a, b) => b.total - a.total);
                    mvpVotesByMatchMap[idP] = list;
                }
            }
        }
        const partidos = rawPartidos.map(r => formatMatch(r, resMap, canViewMvpVotes ? mvpVotesByMatchMap : null, canViewMvpVotes));

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
        const rowLigas = allLigasRows.find(r => r.Jugador === canonicalUsuario) || null;
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
            if (b.Custom_Badge === "X" || (b.Custom_Emoji && String(b.Custom_Emoji).trim() !== "")) {
                const cDesc = b.Custom_Desc || 'Insignia';
                const cEmo = (b.Custom_Emoji && String(b.Custom_Emoji).trim()) || '✨';
                if (!insigniasMap[u].some(badge => badge.type === 'custom' && badge.text === cDesc)) {
                    insigniasMap[u].push({ type: 'custom', text: cDesc, emoji: cEmo });
                }
            }
            if ((b.Avatar === "X" || b.Avatar_Url) && b.Avatar_Url && String(b.Avatar_Url).trim() !== "") {
                if (!insigniasMap[u].some(badge => badge.type === 'avatar')) {
                    insigniasMap[u].push({ type: 'avatar', emoji: String(b.Avatar_Url).trim() });
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
        const {
            ptsSets,
            ptsGanador,
            ptsDiffExacta,
            maxDistancia,
            pctMvp,
            hasMvpRuleInDb,
            rulesCacheSig
        } = parseReglasPuntuacion(regRows);
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
            try {
                const parsedPts = JSON.parse(rawPointsStr);
                if (parsedPts && parsedPts.__reglas_sig === rulesCacheSig && parsedPts.data) {
                    userPointsInLiga = parsedPts.data;
                }
            } catch(e) {}
        }
        if (Object.keys(userPointsInLiga).length > 0 && rawStatsStr) {
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
                db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(cacheKey, JSON.stringify({ __reglas_sig: rulesCacheSig, data: userPointsInLiga }), writeTs).run(),
                db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES (?, ?, ?)").bind(statsCacheKey, JSON.stringify(statsLigas), writeTs).run()
            ]));
        }

        // Mapeo de estado de verificación de usuarios
        const userVerificadoMap = {};
        for (const b of allInsignias || []) {
            if (b.Usuario) userVerificadoMap[b.Usuario] = b.Verificado || 'APROBADO';
        }

        // Formatear clasificaciones por liga (reutilizando allLigasRows prefetched)
        const clasificacionesFormateadas = {};
        for (const lName of misLigas) {
            const ranking = [];
            const isThisLigaFrozen = isFrozen && ligasCongeladasSet.has(lName);
            for (const row of allLigasRows) {
                const uName = row.Jugador;
                if (row[lName] && row[lName].toString().toUpperCase() === "X") {
                    // Los usuarios provisionales (PENDIENTE) solo son visibles para sí mismos, no para el resto de usuarios
                    if (userVerificadoMap[uName] === 'PENDIENTE' && uName !== usuario) {
                        continue;
                    }
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

        let avisoNombrePendiente = null;
        try {
            const petPendiente = await db.prepare('SELECT * FROM "Peticiones_Nombre" WHERE lower("Usuario Actual") = lower(?) AND "Estado" = \'PENDIENTE\'').bind(canonicalUsuario).first().catch(() => null);
            if (petPendiente && petPendiente["Nuevo Usuario Sol"]) {
                avisoNombrePendiente = `ℹ️ Tienes una solicitud para cambiar tu nombre de usuario a @${petPendiente["Nuevo Usuario Sol"]} pendiente de revisión por el administrador. Mientras tanto, tu usuario activo sigue siendo @${canonicalUsuario}.`;
            }
        } catch(e) {}

        let avisoAliasMigrado = null;
        if (userRow.alias_migrado) {
            avisoAliasMigrado = `📢 ¡Atención! Tu cambio de nombre a @${canonicalUsuario} ya está activo. Esta ha sido tu última sesión permitida con tu antiguo usuario (@${userRow.alias_antiguo}). A partir de tu próximo inicio de sesión, deberás usar exclusivamente @${canonicalUsuario} o tu correo electrónico.`;
        }

        const avisoModDb = (userInsignia && userInsignia.Aviso_Moderacion) ? String(userInsignia.Aviso_Moderacion).trim() : '';
        let avisoModeracionFinal = '';
        if (avisoAliasMigrado) {
            avisoModeracionFinal = avisoModDb ? `${avisoAliasMigrado}\n\n${avisoModDb}` : avisoAliasMigrado;
        } else if (avisoNombrePendiente) {
            avisoModeracionFinal = avisoModDb ? `${avisoNombrePendiente}\n\n${avisoModDb}` : avisoNombrePendiente;
        } else {
            avisoModeracionFinal = avisoModDb;
        }

        return jsonResponse({
            status: "success",
            usuario: canonicalUsuario,
            alias_migrado: Boolean(userRow.alias_migrado),
            usuario_anterior: userRow.alias_antiguo || null,
            aviso_cambio_usuario: avisoAliasMigrado || avisoNombrePendiente || null,
            es_provisional: Boolean(userInsignia && userInsignia.Verificado === 'PENDIENTE'),
            verificado: (userInsignia && userInsignia.Verificado) || 'APROBADO',
            equipo_club: (userInsignia && userInsignia.Equipo_Club) || '',
            aviso_moderacion: avisoModeracionFinal,
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
            mi_insignia_raw: allInsignias ? allInsignias.find(i => i.Usuario === canonicalUsuario) : null,
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

    return jsonResponse({ status: "error", message: `Acción desconocida: ${action}` }, 400);
}
