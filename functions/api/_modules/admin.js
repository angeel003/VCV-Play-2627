// ============================================================================
// ADMIN MODULE: GESTIÓN DE USUARIOS, REGISTROS, INSIGNIAS, SUGERENCIAS Y CONFIG
// ============================================================================
import {
    jsonResponse,
    flushBatch,
    runInBg,
    isSchemaMissingErr,
    hashPassword,
    verifyPasswordHash,
    isModoMantenimientoActivo
} from './shared.js';
import { notifyAdminsPush } from './push.js';

async function ensureUsuarioAliasSchema(db) {
    try {
        await db.prepare(`CREATE TABLE IF NOT EXISTS "Usuario_Alias" (
            "usuario_actual" TEXT NOT NULL,
            "usuario_antiguo" TEXT NOT NULL,
            "activo" INTEGER DEFAULT 1,
            "fecha_creacion" INTEGER NOT NULL,
            "usos" INTEGER DEFAULT 0,
            PRIMARY KEY ("usuario_actual", "usuario_antiguo")
        )`).run();
        await db.prepare('CREATE INDEX IF NOT EXISTS idx_usuario_alias_antiguo ON "Usuario_Alias"("usuario_antiguo")').run();
    } catch(e) {}
}

async function isUsernameTakenOrReserved(db, usernameCandidate, excludeUser = null) {
    if (!usernameCandidate) return { taken: true, reason: 'Nombre de usuario no válido.' };
    const uClean = usernameCandidate.toString().trim().replace(/^@/, '');
    if (!uClean || uClean.length < 3) return { taken: true, reason: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    if (/\s/.test(uClean)) return { taken: true, reason: 'El nombre de usuario no puede contener espacios.' };

    await ensureUsuarioAliasSchema(db);

    const [existUser, existPendingReq, existPendingName, existAlias] = await Promise.all([
        db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE lower("Usuario") = lower(?)').bind(uClean).first().catch(() => null),
        db.prepare('SELECT "Usuario" FROM "Solicitudes_Registro" WHERE lower("Usuario") = lower(?) AND "Estado" = \'PENDIENTE\'').bind(uClean).first().catch(() => null),
        db.prepare('SELECT "Usuario Actual", "Nuevo Usuario Sol" FROM "Peticiones_Nombre" WHERE lower("Nuevo Usuario Sol") = lower(?) AND "Estado" = \'PENDIENTE\'').bind(uClean).first().catch(() => null),
        db.prepare('SELECT "usuario_actual", "usuario_antiguo", "activo" FROM "Usuario_Alias" WHERE lower("usuario_antiguo") = lower(?)').bind(uClean).first().catch(() => null)
    ]);

    if (existUser && (!excludeUser || existUser.Usuario.toLowerCase() !== excludeUser.toLowerCase())) {
        return { taken: true, reason: `El nombre de usuario @${uClean} ya está en uso por otra persona.` };
    }

    if (existPendingReq && (!excludeUser || existPendingReq.Usuario.toLowerCase() !== excludeUser.toLowerCase())) {
        return { taken: true, reason: `El nombre de usuario @${uClean} está reservado por una solicitud de registro pendiente de aprobación.` };
    }

    if (existPendingName && (!excludeUser || existPendingName["Usuario Actual"].toLowerCase() !== excludeUser.toLowerCase())) {
        return { taken: true, reason: `El nombre de usuario @${uClean} ha sido solicitado por otro usuario (@${existPendingName["Usuario Actual"]}) y está pendiente de aprobación.` };
    }

    if (existAlias && (!excludeUser || existAlias.usuario_actual.toLowerCase() !== excludeUser.toLowerCase())) {
        if (existAlias.activo === 1) {
            return { taken: true, reason: `El nombre de usuario @${uClean} pertenece a una cuenta en periodo de transición y no está disponible.` };
        } else {
            return { taken: true, reason: `El nombre de usuario @${uClean} ya ha pertenecido a otro usuario del club y permanece reservado por seguridad.` };
        }
    }

    return { taken: false, cleanUsername: uClean };
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

async function ensureSolicitudesRegistroSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Solicitudes_Registro" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "Usuario" TEXT UNIQUE NOT NULL,
        "Password_Hash" TEXT NOT NULL,
        "Nombre_Real" TEXT NOT NULL,
        "Email" TEXT NOT NULL,
        "Equipo_Club" TEXT,
        "Ligas_Solicitadas" TEXT,
        "Estado" TEXT DEFAULT 'PENDIENTE',
        "Fecha_Solicitud" INTEGER NOT NULL,
        "Fecha_Resolucion" INTEGER,
        "Revisado_Por" TEXT
    )`).run().catch(() => {});
    try { await db.prepare('ALTER TABLE "Solicitudes_Registro" ADD COLUMN "Equipo_Club" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Solicitudes_Registro" ADD COLUMN "Usuario_Original" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Solicitudes_Registro" ADD COLUMN "Motivo_Rechazo" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Solicitudes_Registro" ADD COLUMN "IP" TEXT').run(); } catch(e) {}
    try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_solicitudes_ip_fecha ON "Solicitudes_Registro" ("IP", "Fecha_Solicitud")').run(); } catch(e) {}
    try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON "Solicitudes_Registro" ("Estado")').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Verificado" TEXT DEFAULT \'APROBADO\'').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Equipo_Club" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Aviso_Moderacion" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Baneado" INTEGER DEFAULT 0').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Motivo_Baneo" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Fecha_Baneo" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Lesionado" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Lesion_Desc" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Custom_Emoji" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Custom_Desc" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Insignias" ADD COLUMN "Custom_Badge" TEXT').run(); } catch(e) {}
    try { await db.prepare('ALTER TABLE "Usuarios" ADD COLUMN "Correo" TEXT').run(); } catch(e) {}
    await ensureUsuarioAliasSchema(db);
    try {
        await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'PURGED_%'").run();
    } catch(e) {}
}

async function purgeUserFromAllTablesExceptSolicitud(db, targetUser) {
    if (!targetUser) return;
    const u = targetUser.trim();
    const tables = [
        { table: "Usuarios", col: "Usuario" },
        { table: "Insignias", col: "Usuario" },
        { table: "Porras", col: "Usuario" },
        { table: "Ligas", col: "Jugador" },
        { table: "Permisos_Equipos", col: "Jugador" },
        { table: "Permisos_Secreta", col: "Usuario" },
        { table: "Predicciones_Secretas", col: "Usuario" },
        { table: "MVP_Votos", col: "usuario" },
        { table: "Suscripciones_Push_Dispositivos", col: "Usuario" },
        { table: "Monitor_Usuarios", col: "usuario" },
        { table: "Log_Accesos", col: "usuario" },
        { table: "Notificaciones", col: "Usuario" },
        { table: "Peticiones_Nombre", col: "Usuario Actual" },
        { table: "Peticiones_Insignias", col: "Usuario" },
        { table: "Sugerencias_Errores", col: "Usuario" }
    ];
    for (const t of tables) {
        try {
            await db.prepare(`DELETE FROM "${t.table}" WHERE lower("${t.col}") = lower(?)`).bind(u).run();
        } catch(e) {}
    }
    try {
        await db.prepare('DELETE FROM "Usuario_Alias" WHERE lower("usuario_actual") = lower(?) OR lower("usuario_antiguo") = lower(?)').bind(u, u).run();
    } catch(e) {}
    try {
        await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run();
    } catch(e) {}
}

async function purgeUserFromAllTables(db, targetUser) {
    if (!targetUser) return;
    const u = targetUser.trim();
    await purgeUserFromAllTablesExceptSolicitud(db, u);
    try {
        await db.prepare('DELETE FROM "Solicitudes_Registro" WHERE lower("Usuario") = lower(?) OR lower("Usuario_Original") = lower(?)').bind(u, u).run();
    } catch(e) {}
}

async function renameUserInAllTables(db, oldU, newU) {
    if (!oldU || !newU || oldU.toLowerCase() === newU.toLowerCase()) return;
    
    const tables = [
        { table: "Usuarios", col: "Usuario" },
        { table: "Insignias", col: "Usuario" },
        { table: "Porras", col: "Usuario" },
        { table: "Ligas", col: "Jugador" },
        { table: "Permisos_Equipos", col: "Jugador" },
        { table: "Permisos_Secreta", col: "Usuario" },
        { table: "Predicciones_Secretas", col: "Usuario" },
        { table: "Plantilla_Superliga_2_Masc", col: "usuario" },
        { table: "Resultados_Oficiales", col: "actualizado_por" },
        { table: "MVP_Votos", col: "usuario" },
        { table: "Suscripciones_Push_Dispositivos", col: "Usuario" },
        { table: "Monitor_Usuarios", col: "usuario" },
        { table: "Log_Accesos", col: "usuario" },
        { table: "Notificaciones", col: "Usuario" },
        { table: "Solicitudes_Registro", col: "Usuario" },
        { table: "Peticiones_Nombre", col: "Usuario Actual" },
        { table: "Peticiones_Insignias", col: "Usuario" },
        { table: "Sugerencias_Errores", col: "Usuario" }
    ];

    for (const t of tables) {
        try {
            await db.prepare(`UPDATE OR IGNORE "${t.table}" SET "${t.col}" = ? WHERE "${t.col}" = ?`).bind(newU, oldU).run();
            if (["Usuarios", "Insignias", "Ligas", "Permisos_Equipos", "Permisos_Secreta", "Monitor_Usuarios"].includes(t.table)) {
                await db.prepare(`DELETE FROM "${t.table}" WHERE "${t.col}" = ?`).bind(oldU).run().catch(() => {});
            }
        } catch(e) {
            console.warn(`Error renombrando en ${t.table}:`, e);
        }
    }

    try {
        await db.prepare('UPDATE OR IGNORE "Usuario_Alias" SET "usuario_actual" = ? WHERE "usuario_actual" = ?').bind(newU, oldU).run();
    } catch(e) {}

    try {
        await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run();
    } catch(e) {}
}

async function ensureMonitorSchema(db) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Monitor_Usuarios" ("usuario" TEXT PRIMARY KEY, "activo" INTEGER DEFAULT 1, "fecha_alta" TEXT, "notas" TEXT)`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS "Log_Accesos" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "usuario" TEXT, "fecha_hora" TEXT, "timestamp" INTEGER, "origen" TEXT, "dispositivo" TEXT)`).run();
    try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_log_accesos_user_ts ON "Log_Accesos" ("usuario", "timestamp" DESC)`).run(); } catch(e) {}
}

export {
    ensureUsuarioAliasSchema,
    isUsernameTakenOrReserved,
    ensureSugerenciasSchema,
    ensureSolicitudesRegistroSchema,
    purgeUserFromAllTablesExceptSolicitud,
    purgeUserFromAllTables,
    renameUserInAllTables,
    ensureMonitorSchema
};

export async function handleAdmin(action, ctx) {
    const { db, env, body, usuario, password, getAuthUser, context } = ctx;

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
            const autoKeyActual = 'AUTO_UNFREEZE_' + getLunesSemanaClave(new Date());
            await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); 
            await db.prepare(`DELETE FROM Cache_App WHERE 
                clave LIKE 'NOTIF_VIERNES_ENVIADO_%' 
                OR (clave LIKE 'AUTO_UNFREEZE_%' AND clave != ?)
                OR clave LIKE 'NOTIF_MVP_OPEN_%'
                OR clave LIKE 'PURGED_%'
            `).bind(autoKeyActual).run();
        } catch(e) {}
        
        return jsonResponse({ status: 'success', message: 'Caché depurada con éxito. Se han recalculado las clasificaciones y limpiado todos los datos temporales obsoletos.' });
    }

    // ADMIN: ADD USER
    if (action === 'add_user') {
        const { new_u, new_p, new_n, ligas_seleccionadas } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 401);
        
        const checkU = await isUsernameTakenOrReserved(db, new_u);
        if (checkU.taken) return jsonResponse({ status: 'error', message: checkU.reason }, 400);
        const cleanUser = checkU.cleanUsername;

        const hasSelectedLigas = Array.isArray(ligas_seleccionadas) && ligas_seleccionadas.length > 0;
        const ligasEqRes = hasSelectedLigas ? await db.prepare('SELECT * FROM "Ligas_Equipos"').all() : null;

        const hashedNewP = await hashPassword(new_p);
        const addStmts = [
            db.prepare('INSERT INTO "Usuarios" ("Usuario", "Password", "Nombre Real") VALUES (?, ?, ?)').bind(cleanUser, hashedNewP, new_n || cleanUser),
            db.prepare('INSERT INTO "Permisos_Equipos" ("Jugador") VALUES (?)').bind(cleanUser),
            db.prepare('INSERT INTO "Permisos_Secreta" ("Usuario") VALUES (?)').bind(cleanUser),
            db.prepare('INSERT INTO "Insignias" ("Usuario") VALUES (?)').bind(cleanUser),
            db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(cleanUser)
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

    // ==============================================================================
    // 📝 SOLICITUDES DE REGISTRO Y GESTIÓN DE ACCESO A LIGAS
    // ==============================================================================

    // PUBLIC: SOLICITAR REGISTRO DE CUENTA (CREA CUENTA Y SOLICITUD DE VALIDACIÓN)
    if (action === 'request_registration') {
        await ensureSolicitudesRegistroSchema(db);

        // 1. TRAMPA ANTIBOTS (HONEYPOT): Los bots rellenan todos los campos ocultos
        const honeypot = (body.honeypot || body.vcv_security_check || '').trim();
        if (honeypot) {
            return jsonResponse({
                status: 'success',
                message: '¡Cuenta creada! Ya puedes iniciar sesión con tu usuario y contraseña.',
                usuario: (body.new_u || 'usuario')
            });
        }

        // 2. DETECCIÓN DE VELOCIDAD ANÓMALA (SUB-SECOND SUBMISSION)
        const clientElapsed = Number(body.client_elapsed);
        if (!isNaN(clientElapsed) && clientElapsed > 0 && clientElapsed < 1800) {
            return jsonResponse({
                status: 'error',
                message: 'Envío de formulario demasiado rápido. Por favor, tómate unos segundos para verificar tus datos.'
            }, 429);
        }

        // 3. OBTENCIÓN Y SANITIZACIÓN DE IP DEL CLIENTE (CLOUDFLARE HEADERS)
        const clientIp = (context && context.request ? (
            context.request.headers.get('cf-connecting-ip') ||
            context.request.headers.get('x-real-ip') ||
            context.request.headers.get('x-forwarded-for') ||
            '127.0.0.1'
        ) : '127.0.0.1').split(',')[0].trim();

        const nowTs = Date.now();

        // 4. RATE LIMITING POR IP: Máximo 3 registros por IP por hora
        try {
            const oneHourAgo = nowTs - (3600 * 1000);
            const ipCount = await db.prepare('SELECT COUNT(*) as c FROM "Solicitudes_Registro" WHERE "IP" = ? AND "Fecha_Solicitud" > ?').bind(clientIp, oneHourAgo).first();
            if (ipCount && ipCount.c >= 3) {
                return jsonResponse({
                    status: 'error',
                    message: 'Has alcanzado el límite de 3 cuentas por hora desde tu conexión. Por favor, inténtalo más tarde.'
                }, 429);
            }
        } catch(e) {}

        // 5. PROTECCIÓN GLOBAL CONTRA BOTNETS / DESGASTE DE CUOTA D1 (MÁX 20 REGISTROS EN 5 MINUTOS)
        try {
            const fiveMinAgo = nowTs - (300 * 1000);
            const globalCount = await db.prepare('SELECT COUNT(*) as c FROM "Solicitudes_Registro" WHERE "Fecha_Solicitud" > ?').bind(fiveMinAgo).first();
            if (globalCount && globalCount.c >= 20) {
                return jsonResponse({
                    status: 'error',
                    message: 'El servidor está recibiendo un volumen inusual de peticiones. Por favor, espera unos minutos e inténtalo de nuevo.'
                }, 429);
            }
        } catch(e) {}

        const new_u = (body.new_u || '').trim();
        const new_p = (body.new_p || '').trim();
        const new_n = (body.new_n || '').trim();
        const new_email = (body.new_email || '').trim().toLowerCase();
        const equipo_club = (body.equipo_club || '').trim();

        if (!new_u || new_u.length < 3) {
            return jsonResponse({ status: 'error', message: 'El nombre de usuario debe tener al menos 3 caracteres.' }, 400);
        }
        if (/\s/.test(new_u)) {
            return jsonResponse({ status: 'error', message: 'El nombre de usuario no puede contener espacios.' }, 400);
        }
        if (!new_p || new_p.length < 4) {
            return jsonResponse({ status: 'error', message: 'La contraseña debe tener al menos 4 caracteres.' }, 400);
        }

        // 6. VALIDACIÓN ESTRICTA DE CORREO Y BLOQUEO DE DOMINIOS TEMPORALES
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!new_email || !emailRegex.test(new_email) || new_email.length > 100) {
            return jsonResponse({ status: 'error', message: 'Por favor, introduce un correo electrónico válido.' }, 400);
        }
        const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'throwawaymail.com', 'yopmail.com', 'dispostable.com', 'sharklasers.com', 'trashmail.com'];
        const emailDomain = new_email.split('@')[1];
        if (disposableDomains.includes(emailDomain)) {
            return jsonResponse({ status: 'error', message: 'No se permiten correos electrónicos temporales o desechables.' }, 400);
        }

        const checkU = await isUsernameTakenOrReserved(db, new_u);
        if (checkU.taken) {
            return jsonResponse({ status: 'error', message: checkU.reason }, 400);
        }
        const cleanUser = checkU.cleanUsername;

        // Comprobar si el correo electrónico ya está registrado en otra cuenta
        const existEmail = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE lower("Correo") = lower(?)').bind(new_email).first();
        if (existEmail) {
            return jsonResponse({ status: 'error', message: 'Ya existe una cuenta registrada con este correo electrónico. Solo se permite una cuenta por correo.' }, 400);
        }

        const existPendingEmail = await db.prepare('SELECT "id" FROM "Solicitudes_Registro" WHERE lower("Email") = lower(?) AND "Estado" = \'PENDIENTE\'').bind(new_email).first();
        if (existPendingEmail) {
            return jsonResponse({ status: 'error', message: 'Ya existe una solicitud pendiente registrada con este correo electrónico.' }, 400);
        }

        const hashedPwd = await hashPassword(new_p);

        // Obtener equipos pertenecientes a la liga Global desde Ligas_Equipos
        let globalTeams = [];
        try {
            const ligasEqRes = await db.prepare('SELECT * FROM "Ligas_Equipos" WHERE "Liga" = \'Global\'').first();
            if (ligasEqRes) {
                for (const col of Object.keys(ligasEqRes)) {
                    if (col !== 'Liga' && col !== 'id' && ligasEqRes[col] && ligasEqRes[col].toString().toUpperCase() === 'X') {
                        globalTeams.push(col);
                    }
                }
            }
        } catch(e) {}
        if (globalTeams.length === 0) {
            globalTeams = ["Universidad de Valladolid VCV", "VALCYL VCV", "Valladolid CV Vacceas", "VCV Maria Molina", "VCV Meseta"];
        }

        // Insertar usuario directamente con estado PENDIENTE de validación
        const stmts = [
            db.prepare('INSERT INTO "Usuarios" ("Usuario", "Password", "Nombre Real", "Correo") VALUES (?, ?, ?, ?)').bind(cleanUser, hashedPwd, new_n || cleanUser, new_email),
            db.prepare('INSERT INTO "Insignias" ("Usuario", "Verificado", "Equipo_Club") VALUES (?, \'PENDIENTE\', ?)').bind(cleanUser, equipo_club),
            db.prepare('INSERT INTO "Ligas" ("Jugador", "Global") VALUES (?, \'X\')').bind(cleanUser),
            db.prepare('INSERT INTO "Permisos_Equipos" ("Jugador") VALUES (?)').bind(cleanUser),
            db.prepare('INSERT INTO "Permisos_Secreta" ("Usuario") VALUES (?)').bind(cleanUser),
            db.prepare(`
                INSERT INTO "Solicitudes_Registro" 
                ("Usuario", "Password_Hash", "Nombre_Real", "Email", "Equipo_Club", "Ligas_Solicitadas", "Estado", "Fecha_Solicitud", "IP")
                VALUES (?, ?, ?, ?, ?, '["Global"]', 'PENDIENTE', ?, ?)
            `).bind(cleanUser, hashedPwd, new_n || cleanUser, new_email, equipo_club, nowTs, clientIp)
        ];

        for (const team of globalTeams) {
            stmts.push(db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = 'X' WHERE "Jugador" = ?`).bind(cleanUser));
            stmts.push(db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = 'X' WHERE "Usuario" = ?`).bind(cleanUser));
        }

        await flushBatch(db, stmts);

        // Notificación Push nativa ÚNICAMENTE para Administradores
        const eqLabel = equipo_club ? ` (${equipo_club})` : '';
        const notifTitle = '🏐 Nueva Solicitud de Registro';
        const notifBody = `¡${new_n || cleanUser} (@${cleanUser})${eqLabel} se ha registrado! Toca para verificar su cuenta y asignar ligas.`;
        
        runInBg(context, notifyAdminsPush(db, env, {
            title: notifTitle,
            body: notifBody,
            url: '/?admin_tab=solicitudes',
            action: 'abrirSolicitudesAdmin'
        }));

        return jsonResponse({
            status: 'success',
            message: '¡Cuenta creada! Ya puedes iniciar sesión con tu usuario y contraseña. Tu cuenta está en proceso de validación por el administrador.',
            usuario: new_u
        });
    }

    // PUBLIC: OBTENER LIGAS DISPONIBLES PARA EL FORMULARIO DE REGISTRO
    if (action === 'get_registro_ligas') {
        let ligas = [];
        try {
            const sample = await db.prepare('SELECT * FROM "Ligas" LIMIT 1').first();
            if (sample) {
                ligas = Object.keys(sample).filter(k => k !== "Jugador" && k !== "id").sort();
            }
        } catch(e) {}
        if (ligas.length === 0) {
            try {
                const { results } = await db.prepare('SELECT DISTINCT "Liga" FROM "Ligas_Equipos"').all();
                ligas = (results || []).map(r => r.Liga).filter(Boolean).sort();
            } catch(e) {}
        }
        return jsonResponse({ status: 'success', ligas });
    }

    // ADMIN: OBTENER SOLICITUDES DE REGISTRO
    if (action === 'get_solicitudes_registro') {
        await ensureSolicitudesRegistroSchema(db);

        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { results: solicitudes } = await db.prepare(`
            SELECT id, Usuario, Usuario_Original, Nombre_Real, Email, Equipo_Club, Ligas_Solicitadas, Estado, Fecha_Solicitud, Fecha_Resolucion, Revisado_Por, Motivo_Rechazo, IP
            FROM "Solicitudes_Registro"
            ORDER BY CASE WHEN Estado = 'PENDIENTE' THEN 0 ELSE 1 END, Fecha_Solicitud DESC
            LIMIT 50
        `).all();

        let ligasDisponibles = [];
        try {
            const sampleLigas = await db.prepare('SELECT * FROM "Ligas" LIMIT 1').first();
            if (sampleLigas) {
                ligasDisponibles = Object.keys(sampleLigas).filter(k => k !== 'Jugador' && k !== 'id').sort();
            }
        } catch(e) {}
        if (ligasDisponibles.length === 0) {
            try {
                const { results: leRows } = await db.prepare('SELECT DISTINCT "Liga" FROM "Ligas_Equipos"').all();
                ligasDisponibles = (leRows || []).map(r => r.Liga).filter(Boolean).sort();
            } catch(e) {}
        }

        const pendientes = (solicitudes || []).filter(s => s.Estado === 'PENDIENTE').length;

        return jsonResponse({
            status: 'success',
            solicitudes: solicitudes || [],
            ligas_disponibles: ligasDisponibles,
            pendientes
        });
    }

    // ADMIN: RESOLVER SOLICITUD DE REGISTRO (APROBAR / RECHAZAR)
    if (action === 'resolver_solicitud_registro') {
        await ensureSolicitudesRegistroSchema(db);

        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const { id, decision, ligas_seleccionadas, nombre_real, equipo_club, nuevo_usuario, aviso_moderacion, motivo_rechazo } = body;
        if (!id || !decision) {
            return jsonResponse({ status: 'error', message: 'ID y decisión son obligatorios.' }, 400);
        }

        const solicitud = await db.prepare('SELECT * FROM "Solicitudes_Registro" WHERE id = ?').bind(id).first();
        if (!solicitud) {
            return jsonResponse({ status: 'error', message: 'Solicitud no encontrada.' }, 404);
        }
        if (solicitud.Estado !== 'PENDIENTE') {
            return jsonResponse({ status: 'error', message: `Esta solicitud ya fue resuelta previamente como ${solicitud.Estado}.` }, 400);
        }

        const nowTs = Date.now();
        const uTarget = solicitud.Usuario;

        if (decision === 'RECHAZAR') {
            const motRechazo = (motivo_rechazo || '').trim();
            const uOrig = solicitud.Usuario_Original || uTarget;

            await db.prepare('UPDATE "Solicitudes_Registro" SET "Estado" = \'RECHAZADA\', "Fecha_Resolucion" = ?, "Revisado_Por" = ?, "Motivo_Rechazo" = ? WHERE id = ?')
                .bind(nowTs, usuario, motRechazo || 'Rechazado por el administrador', id).run();

            const targets = Array.from(new Set([uTarget, uOrig].filter(Boolean)));
            for (const t of targets) {
                await purgeUserFromAllTablesExceptSolicitud(db, t);
            }

            return jsonResponse({ status: 'success', message: `Solicitud de @${uTarget} rechazada correctamente. Cuenta revocada y todos sus pronósticos y votos eliminados.` });
        }

        if (decision === 'APROBAR') {
            let uFinal = uTarget;
            const nuevoUsuarioInput = (nuevo_usuario || '').trim().replace(/^@/, '');
            let usernameChanged = false;

            if (nuevoUsuarioInput && nuevoUsuarioInput.toLowerCase() !== uTarget.toLowerCase()) {
                const checkU = await isUsernameTakenOrReserved(db, nuevoUsuarioInput, uTarget);
                if (checkU.taken) {
                    return jsonResponse({ status: 'error', message: checkU.reason }, 400);
                }

                await ensureUsuarioAliasSchema(db);
                await renameUserInAllTables(db, uTarget, checkU.cleanUsername);
                await db.prepare('INSERT OR REPLACE INTO "Usuario_Alias" ("usuario_actual", "usuario_antiguo", "activo", "fecha_creacion", "usos") VALUES (?, ?, 1, ?, 0)')
                    .bind(checkU.cleanUsername, uTarget, Date.now()).run().catch(() => {});
                await db.prepare('UPDATE "Solicitudes_Registro" SET "Usuario_Original" = ? WHERE id = ?').bind(uTarget, id).run().catch(() => {});
                uFinal = checkU.cleanUsername;
                usernameChanged = true;
            }

            const nRealFinal = (nombre_real !== undefined && nombre_real !== null && String(nombre_real).trim() !== '') ? String(nombre_real).trim() : solicitud.Nombre_Real;
            const eqClubFinal = (equipo_club !== undefined && equipo_club !== null) ? String(equipo_club).trim() : (solicitud.Equipo_Club || '');
            let ligasSel = Array.isArray(ligas_seleccionadas) ? ligas_seleccionadas : [];
            if (!ligasSel.includes('Global')) {
                ligasSel.unshift('Global');
            }

            let avisoFinal = (aviso_moderacion || '').trim();
            if (!avisoFinal && usernameChanged) {
                avisoFinal = `Tu nombre de usuario original ha sido modificado a @${uFinal} por la administración del club debido a normas de la comunidad o formato.`;
            }

            const [ligasEqRes, sampleLigas, samplePerm] = await Promise.all([
                db.prepare('SELECT * FROM "Ligas_Equipos"').all(),
                db.prepare('SELECT * FROM "Ligas" LIMIT 1').first(),
                db.prepare('SELECT * FROM "Permisos_Equipos" LIMIT 1').first()
            ]);

            const updateStmts = [
                db.prepare('UPDATE "Usuarios" SET "Nombre Real" = ? WHERE "Usuario" = ?').bind(nRealFinal, uFinal),
                db.prepare('UPDATE "Insignias" SET "Verificado" = \'APROBADO\', "Equipo_Club" = ?, "Aviso_Moderacion" = ? WHERE "Usuario" = ?').bind(eqClubFinal, avisoFinal || '', uFinal),
                db.prepare('UPDATE "Solicitudes_Registro" SET "Usuario" = ?, "Estado" = \'APROBADA\', "Nombre_Real" = ?, "Equipo_Club" = ?, "Ligas_Solicitadas" = ?, "Fecha_Resolucion" = ?, "Revisado_Por" = ? WHERE id = ?')
                    .bind(uFinal, nRealFinal, eqClubFinal, JSON.stringify(ligasSel), nowTs, usuario, id)
            ];

            // Asegurar que exista fila en Ligas y Permisos si no existiera
            updateStmts.push(db.prepare('INSERT OR IGNORE INTO "Ligas" ("Jugador") VALUES (?)').bind(uFinal));
            updateStmts.push(db.prepare('INSERT OR IGNORE INTO "Permisos_Equipos" ("Jugador") VALUES (?)').bind(uFinal));
            updateStmts.push(db.prepare('INSERT OR IGNORE INTO "Permisos_Secreta" ("Usuario") VALUES (?)').bind(uFinal));

            // Actualizar todas las columnas de ligas
            const allLeagueCols = Object.keys(sampleLigas || {}).filter(k => k !== 'Jugador' && k !== 'id');
            for (const col of allLeagueCols) {
                const isX = ligasSel.includes(col);
                updateStmts.push(db.prepare(`UPDATE "Ligas" SET "${col}" = ${isX ? "'X'" : "NULL"} WHERE "Jugador" = ?`).bind(uFinal));
            }

            // Sincronizar Permisos_Equipos y Permisos_Secreta según las ligas aprobadas
            const allLigasEquipos = (ligasEqRes && ligasEqRes.results) || [];
            const equiposToPermit = new Set();
            for (const row of allLigasEquipos) {
                const lName = row.Liga;
                if (ligasSel.includes(lName)) {
                    for (const col of Object.keys(row)) {
                        if (col !== "Liga" && col !== "id" && row[col] && row[col].toString().toUpperCase() === "X") {
                            equiposToPermit.add(col);
                        }
                    }
                }
            }

            const allPermCols = Object.keys(samplePerm || {}).filter(k => k !== 'Jugador' && k !== 'id');
            for (const team of allPermCols) {
                const hasAccess = equiposToPermit.has(team);
                updateStmts.push(db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = ${hasAccess ? "'X'" : "NULL"} WHERE "Jugador" = ?`).bind(uFinal));
                updateStmts.push(db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = ${hasAccess ? "'X'" : "NULL"} WHERE "Usuario" = ?`).bind(uFinal));
            }

            await flushBatch(db, updateStmts);

            const renMsg = usernameChanged ? ` (Nombre modificado a @${uFinal})` : '';
            return jsonResponse({
                status: 'success',
                message: `¡Usuario @${uFinal} aprobado y verificado con éxito!${renMsg} Asignado a ${ligasSel.length} liga(s): ${ligasSel.join(', ')}.`
            });
        }

        return jsonResponse({ status: 'error', message: 'Decisión no válida. Debe ser APROBAR o RECHAZAR.' }, 400);
    }

    // ADMIN: OBTENER TODOS LOS USUARIOS Y SUS LIGAS ACTIVAS
    if (action === 'get_usuarios_ligas_admin') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const [usersRes, ligasRowsRes] = await Promise.all([
            db.prepare('SELECT "Usuario", "Nombre Real" FROM "Usuarios" ORDER BY "Usuario" ASC').all(),
            db.prepare('SELECT * FROM "Ligas"').all()
        ]);

        const users = (usersRes && usersRes.results) || [];
        const ligasRows = (ligasRowsRes && ligasRowsRes.results) || [];

        let ligasDisponibles = [];
        if (ligasRows.length > 0) {
            ligasDisponibles = Object.keys(ligasRows[0]).filter(k => k !== 'Jugador' && k !== 'id').sort();
        } else {
            const leRes = await db.prepare('SELECT DISTINCT "Liga" FROM "Ligas_Equipos"').all().catch(() => null);
            if (leRes && leRes.results) {
                ligasDisponibles = leRes.results.map(r => r.Liga).filter(Boolean).sort();
            }
        }

        const userLigasMap = {};
        for (const row of ligasRows) {
            const u = row.Jugador;
            userLigasMap[u] = [];
            for (const col of ligasDisponibles) {
                if (row[col] && row[col].toString().toUpperCase() === 'X') {
                    userLigasMap[u].push(col);
                }
            }
        }

        const list = users.map(u => ({
            usuario: u.Usuario,
            nombre_real: u["Nombre Real"] || u.Usuario,
            ligas: userLigasMap[u.Usuario] || []
        }));

        return jsonResponse({
            status: 'success',
            usuarios: list,
            ligas_disponibles: ligasDisponibles
        });
    }

    // ADMIN: GUARDAR / MODIFICAR LIGAS DE UN USUARIO EXISTENTE
    if (action === 'save_usuario_ligas_admin') {
        const { target_usuario, ligas_seleccionadas } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        if (!target_usuario) return jsonResponse({ status: 'error', message: 'Usuario objetivo no especificado' }, 400);

        const ligasSel = Array.isArray(ligas_seleccionadas) ? ligas_seleccionadas : [];

        let existLigasRow = await db.prepare('SELECT * FROM "Ligas" WHERE "Jugador" = ?').bind(target_usuario).first();
        if (!existLigasRow) {
            await db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(target_usuario).run();
            existLigasRow = await db.prepare('SELECT * FROM "Ligas" WHERE "Jugador" = ?').bind(target_usuario).first();
        }

        const sampleLigas = existLigasRow || await db.prepare('SELECT * FROM "Ligas" LIMIT 1').first();
        const allLeagueCols = Object.keys(sampleLigas || {}).filter(k => k !== 'Jugador' && k !== 'id');

        const stmts = [];
        for (const col of allLeagueCols) {
            const isX = ligasSel.includes(col);
            stmts.push(db.prepare(`UPDATE "Ligas" SET "${col}" = ? WHERE "Jugador" = ?`).bind(isX ? 'X' : '', target_usuario));
        }

        try {
            const { results: ligasEqRows } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
            const equiposToPermit = new Set();
            for (const row of ligasEqRows || []) {
                if (ligasSel.includes(row.Liga)) {
                    for (const col in row) {
                        if (col !== 'Liga' && col !== 'id' && row[col] && row[col].toString().toUpperCase() === 'X') {
                            equiposToPermit.add(col);
                        }
                    }
                }
            }
            for (const team of equiposToPermit) {
                stmts.push(db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = 'X' WHERE "Jugador" = ?`).bind(target_usuario));
                stmts.push(db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = 'X' WHERE "Usuario" = ?`).bind(target_usuario));
            }
        } catch(e) {}

        await flushBatch(db, stmts);

        return jsonResponse({
            status: 'success',
            message: `Ligas de @${target_usuario} actualizadas con éxito (${ligasSel.length} ligas asignadas).`
        });
    }

    // USER: DESCARTAR AVISO DE MODERACIÓN
    if (action === 'dismiss_aviso_moderacion') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'No autenticado' }, 401);
        const canonU = user.Usuario;
        await db.prepare('UPDATE "Insignias" SET "Aviso_Moderacion" = \'\' WHERE "Usuario" = ?').bind(canonU).run().catch(() => {});
        return jsonResponse({ status: 'success' });
    }

    // ADMIN: OBTENER PERFIL COMPLETO DE CUALQUIER USUARIO
    if (action === 'admin_get_user_full_profile') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const targetUser = (body.target_usuario || '').trim();
        if (!targetUser) return jsonResponse({ status: 'error', message: 'Usuario objetivo no especificado.' }, 400);

        const [userRow, insRow, ligasRow, sampleLigas, leRows] = await Promise.all([
            db.prepare('SELECT "Usuario", "Nombre Real", "Correo", "ultimo_acceso" FROM "Usuarios" WHERE lower("Usuario") = lower(?)').bind(targetUser).first(),
            db.prepare('SELECT * FROM "Insignias" WHERE lower("Usuario") = lower(?)').bind(targetUser).first(),
            db.prepare('SELECT * FROM "Ligas" WHERE lower("Jugador") = lower(?)').bind(targetUser).first(),
            db.prepare('SELECT * FROM "Ligas" LIMIT 1').first().catch(() => null),
            db.prepare('SELECT DISTINCT "Liga" FROM "Ligas_Equipos"').all().catch(() => null)
        ]);

        if (!userRow) {
            return jsonResponse({ status: 'error', message: `El usuario @${targetUser} no existe en la base de datos.` }, 404);
        }

        let ligasDisponibles = [];
        if (sampleLigas) {
            ligasDisponibles = Object.keys(sampleLigas).filter(k => k !== 'Jugador' && k !== 'id').sort();
        }
        if (ligasDisponibles.length === 0 && leRows && leRows.results) {
            ligasDisponibles = leRows.results.map(r => r.Liga).filter(Boolean).sort();
        }

        const ligasActivas = [];
        if (ligasRow) {
            for (const col of ligasDisponibles) {
                if (ligasRow[col] && ligasRow[col].toString().toUpperCase() === 'X') {
                    ligasActivas.push(col);
                }
            }
        }

        return jsonResponse({
            status: 'success',
            perfil: {
                usuario: userRow.Usuario,
                nombre_real: userRow["Nombre Real"] || '',
                correo: userRow["Correo"] || '',
                ultimo_acceso: userRow["ultimo_acceso"] || '',
                admin_web: (insRow && insRow["Admin Web"] === 'X') ? 'X' : '',
                verificado: (insRow && insRow.Verificado) || 'APROBADO',
                baneado: Boolean(insRow && (insRow.Baneado === 1 || insRow.Baneado === '1' || insRow.Verificado === 'BANEADO')),
                motivo_baneo: (insRow && insRow.Motivo_Baneo) || '',
                fecha_baneo: (insRow && insRow.Fecha_Baneo) || '',
                genero: (insRow && insRow.Genero) || 'M',
                lesionado: (insRow && (insRow.Lesionado === 'X' || insRow.Lesionado === '1')) ? 'X' : '',
                lesion_desc: (insRow && insRow.Lesion_Desc) || '',
                custom_emoji: (insRow && insRow.Custom_Emoji) || '',
                custom_desc: (insRow && insRow.Custom_Desc) || '',
                equipo_club: (insRow && insRow.Equipo_Club) || '',
                jugador_de: (insRow && insRow["Jugador de"]) || '',
                entrenador_de: (insRow && insRow["Entrenador de"]) || '',
                exjugador: (insRow && insRow["Exjugador"]) || '',
                staff: (insRow && insRow["Directiva / Staff"]) || '',
                permiso_mvp: (insRow && insRow.Permiso_MVP === 'X') ? 'X' : '',
                permiso_resultados: (insRow && insRow.Permiso_Resultados) || '',
                avatar: (insRow && insRow.Avatar) || '',
                avatar_url: (insRow && insRow.Avatar_Url) || '',
                aviso_moderacion: (insRow && insRow.Aviso_Moderacion) || '',
                ligas: ligasActivas
            },
            ligas_disponibles: ligasDisponibles
        });
    }

    // ADMIN: GUARDAR PERFIL COMPLETO DE CUALQUIER USUARIO
    if (action === 'admin_save_user_full_profile') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const targetUser = (body.target_usuario || '').trim();
        if (!targetUser) return jsonResponse({ status: 'error', message: 'Usuario objetivo no especificado.' }, 400);

        const existUser = await db.prepare('SELECT * FROM "Usuarios" WHERE lower("Usuario") = lower(?)').bind(targetUser).first();
        if (!existUser) {
            return jsonResponse({ status: 'error', message: `El usuario @${targetUser} no existe.` }, 404);
        }

        const canonicalOldU = existUser.Usuario;
        let canonicalU = canonicalOldU;
        const nuevoU = (body.nuevo_usuario || '').trim().replace(/^@/, '');

        // 1. Si se ha modificado el nombre de usuario
        let usernameChanged = false;
        if (nuevoU && nuevoU.toLowerCase() !== canonicalOldU.toLowerCase()) {
            const checkU = await isUsernameTakenOrReserved(db, nuevoU, canonicalOldU);
            if (checkU.taken) {
                return jsonResponse({ status: 'error', message: checkU.reason }, 400);
            }
            await ensureUsuarioAliasSchema(db);
            await renameUserInAllTables(db, canonicalOldU, checkU.cleanUsername);
            await db.prepare('INSERT OR REPLACE INTO "Usuario_Alias" ("usuario_actual", "usuario_antiguo", "activo", "fecha_creacion", "usos") VALUES (?, ?, 1, ?, 0)')
                .bind(checkU.cleanUsername, canonicalOldU, Date.now()).run().catch(() => {});
            canonicalU = checkU.cleanUsername;
            usernameChanged = true;
        }

        // 2. Modificar Nombre Real y Correo
        const nReal = (body.nombre_real !== undefined) ? String(body.nombre_real).trim() : existUser["Nombre Real"];
        const correo = (body.correo !== undefined) ? String(body.correo).trim().toLowerCase() : (existUser.Correo || '');

        if (correo && correo !== (existUser.Correo || '').toLowerCase()) {
            const checkEmail = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE lower("Correo") = lower(?) AND lower("Usuario") != lower(?)').bind(correo, canonicalU).first();
            if (checkEmail) {
                return jsonResponse({ status: 'error', message: `El correo ${correo} ya está asignado a otro usuario (@${checkEmail.Usuario}).` }, 400);
            }
        }

        const updateUsrStmts = [
            db.prepare('UPDATE "Usuarios" SET "Nombre Real" = ?, "Correo" = ? WHERE "Usuario" = ?').bind(nReal, correo, canonicalU)
        ];

        // 3. Modificar Contraseña (si se ha introducido una nueva)
        const newPwd = (body.new_password || '').trim();
        if (newPwd) {
            const hashed = await hashPassword(newPwd);
            updateUsrStmts.push(db.prepare('UPDATE "Usuarios" SET "Password" = ? WHERE "Usuario" = ?').bind(hashed, canonicalU));
        }
        await flushBatch(db, updateUsrStmts);

        // 4. Modificar Insignias y Perfil Deportivo
        const existIns = await db.prepare('SELECT * FROM "Insignias" WHERE "Usuario" = ?').bind(canonicalU).first();
        if (!existIns) {
            await db.prepare('INSERT INTO "Insignias" ("Usuario") VALUES (?)').bind(canonicalU).run();
        }

        const eqClub = (body.equipo_club !== undefined) ? String(body.equipo_club).trim() : (existIns?.Equipo_Club || '');
        const jugDe = (body.jugador_de !== undefined) ? String(body.jugador_de).trim() : (existIns?.["Jugador de"] || '');
        const entDe = (body.entrenador_de !== undefined) ? String(body.entrenador_de).trim() : (existIns?.["Entrenador de"] || '');
        const exj = (body.exjugador !== undefined) ? String(body.exjugador).trim() : (existIns?.["Exjugador"] || '');
        const stf = (body.staff !== undefined) ? String(body.staff).trim() : (existIns?.["Directiva / Staff"] || '');
        const admW = (body.admin_web === 'X' || body.admin_web === true || body.admin_web === 1 || body.admin_web === '1') ? 'X' : '';
        const pMvp = (body.permiso_mvp === 'X' || body.permiso_mvp === true || body.permiso_mvp === 1 || body.permiso_mvp === '1') ? 'X' : '';
        const pRes = (body.permiso_resultados !== undefined) ? String(body.permiso_resultados).trim() : (existIns?.Permiso_Resultados || '');
        const verif = (body.verificado || existIns?.Verificado || 'APROBADO').toUpperCase();
        let avMod = (body.aviso_moderacion !== undefined) ? String(body.aviso_moderacion).trim() : (existIns?.Aviso_Moderacion || '');

        if (!avMod && usernameChanged) {
            avMod = `Tu nombre de usuario ha sido modificado a @${canonicalU} por la administración.`;
        }

        let avtr = existIns?.Avatar || '';
        let avtrUrl = existIns?.Avatar_Url || '';
        if (body.borrar_avatar) {
            avtr = '';
            avtrUrl = '';
        } else if (body.avatar_url !== undefined) {
            avtrUrl = String(body.avatar_url).trim();
            avtr = avtrUrl ? 'X' : '';
        }

        const genVal = (body.genero === 'F' || body.genero === 'f') ? 'F' : 'M';
        const lesVal = (body.lesionado === 'X' || body.lesionado === true || body.lesionado === 1 || body.lesionado === '1') ? 'X' : '';
        const lesDesc = (body.lesion_desc !== undefined) ? String(body.lesion_desc).trim() : (existIns?.Lesion_Desc || '');
        const cEmoji = (body.custom_emoji !== undefined) ? String(body.custom_emoji).trim() : (existIns?.Custom_Emoji || '');
        const cDesc = (body.custom_desc !== undefined) ? String(body.custom_desc).trim() : (existIns?.Custom_Desc || '');
        const cBadge = cEmoji ? 'X' : '';
        const banVal = (body.baneado === true || body.baneado === 1 || body.baneado === '1' || body.baneado === 'X') ? 1 : 0;
        const motBan = (body.motivo_baneo !== undefined) ? String(body.motivo_baneo).trim() : (existIns?.Motivo_Baneo || '');
        const fechBan = banVal ? (existIns?.Fecha_Baneo || new Date().toISOString()) : '';

        if (targetUser.toLowerCase() === usuario.toLowerCase() && banVal === 1) {
            return jsonResponse({ status: 'error', message: 'No puedes suspender/banear tu propia cuenta de administrador.' }, 400);
        }

        let verifFinal = verif;
        if (banVal === 1) {
            verifFinal = 'BANEADO';
        } else if (verif === 'BANEADO') {
            verifFinal = 'APROBADO';
        }

        await db.prepare(`UPDATE "Insignias" 
            SET "Equipo_Club" = ?, "Jugador de" = ?, "Entrenador de" = ?, "Exjugador" = ?, "Directiva / Staff" = ?, 
                "Admin Web" = ?, "Permiso_MVP" = ?, "Permiso_Resultados" = ?, "Verificado" = ?, "Avatar" = ?, "Avatar_Url" = ?, "Aviso_Moderacion" = ?,
                "Genero" = ?, "Lesionado" = ?, "Lesion_Desc" = ?, "Custom_Badge" = ?, "Custom_Emoji" = ?, "Custom_Desc" = ?, "Baneado" = ?, "Motivo_Baneo" = ?, "Fecha_Baneo" = ?
            WHERE "Usuario" = ?`
        ).bind(eqClub, jugDe, entDe, exj, stf, admW, pMvp, pRes, verifFinal, avtr, avtrUrl, avMod, genVal, lesVal, lesDesc, cBadge, cEmoji, cDesc, banVal, motBan, fechBan, canonicalU).run();

        // 5. Modificar Ligas y Sincronizar Permisos de Equipos
        if (Array.isArray(body.ligas_seleccionadas)) {
            const ligasSel = body.ligas_seleccionadas;
            let existLigasRow = await db.prepare('SELECT * FROM "Ligas" WHERE "Jugador" = ?').bind(canonicalU).first();
            if (!existLigasRow) {
                await db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(canonicalU).run();
                existLigasRow = await db.prepare('SELECT * FROM "Ligas" WHERE "Jugador" = ?').bind(canonicalU).first();
            }

            const sampleLigas = existLigasRow || await db.prepare('SELECT * FROM "Ligas" LIMIT 1').first();
            const allLeagueCols = Object.keys(sampleLigas || {}).filter(k => k !== 'Jugador' && k !== 'id');

            const ligStmts = [];
            for (const col of allLeagueCols) {
                const isX = ligasSel.includes(col);
                ligStmts.push(db.prepare(`UPDATE "Ligas" SET "${col}" = ? WHERE "Jugador" = ?`).bind(isX ? 'X' : '', canonicalU));
            }

            try {
                const { results: ligasEqRows } = await db.prepare('SELECT * FROM "Ligas_Equipos"').all();
                const equiposToPermit = new Set();
                for (const row of ligasEqRows || []) {
                    if (ligasSel.includes(row.Liga)) {
                        for (const col in row) {
                            if (col !== 'Liga' && col !== 'id' && row[col] && row[col].toString().toUpperCase() === 'X') {
                                equiposToPermit.add(col);
                            }
                        }
                    }
                }
                const samplePerm = await db.prepare('SELECT * FROM "Permisos_Equipos" LIMIT 1').first().catch(() => null);
                const allPermCols = Object.keys(samplePerm || {}).filter(k => k !== 'Jugador' && k !== 'id');
                for (const team of allPermCols) {
                    const hasAccess = equiposToPermit.has(team);
                    ligStmts.push(db.prepare(`UPDATE "Permisos_Equipos" SET "${team}" = ? WHERE "Jugador" = ?`).bind(hasAccess ? 'X' : '', canonicalU));
                    ligStmts.push(db.prepare(`UPDATE "Permisos_Secreta" SET "${team}" = ? WHERE "Usuario" = ?`).bind(hasAccess ? 'X' : '', canonicalU));
                }
            } catch(e) {}

            await flushBatch(db, ligStmts);
        }

        return jsonResponse({
            status: 'success',
            message: `Perfil de @${canonicalU} actualizado con éxito.`,
            usuario: canonicalU
        });
    }

    // ADMIN: ELIMINAR USUARIO DEFINITIVAMENTE DE TODAS LAS TABLAS
    if (action === 'admin_delete_user') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);

        const targetUser = (body.target_usuario || '').trim();
        if (!targetUser) return jsonResponse({ status: 'error', message: 'Usuario objetivo no especificado.' }, 400);

        if (targetUser.toLowerCase() === usuario.toLowerCase()) {
            return jsonResponse({ status: 'error', message: 'No puedes eliminar tu propia cuenta de administrador.' }, 400);
        }

        await purgeUserFromAllTables(db, targetUser);
        return jsonResponse({ status: 'success', message: `El usuario @${targetUser} y todos sus datos y pronósticos han sido eliminados definitivamente.` });
    }

    // PUBLIC: ESTADO MODO MANTENIMIENTO
    if (action === 'get_mantenimiento_status') {
        const activo = await isModoMantenimientoActivo(db);
        const autoKeyActual = 'AUTO_UNFREEZE_' + getLunesSemanaClave(new Date());
        try {
            await db.prepare(`DELETE FROM Cache_App WHERE 
                clave LIKE 'NOTIF_VIERNES_ENVIADO_%' 
                OR (clave LIKE 'AUTO_UNFREEZE_%' AND clave != ?)
                OR clave LIKE 'NOTIF_MVP_OPEN_%'
                OR clave LIKE 'PURGED_%'
            `).bind(autoKeyActual).run();
        } catch(e) {}
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
            const checkU = await isUsernameTakenOrReserved(db, new_usuario, usuario);
            if (checkU.taken) return jsonResponse({ status: 'error', message: checkU.reason }, 400);
            const cleanNewU = checkU.cleanUsername;
            
            await db.prepare('DELETE FROM "Peticiones_Nombre" WHERE "Usuario Actual" = ?').bind(usuario).run();
            await db.prepare('INSERT INTO "Peticiones_Nombre" ("Usuario Actual", "Nuevo Usuario Sol", "Nuevo Nombre Sol", "Fecha", "Estado") VALUES (?, ?, ?, ?, ?)')
                .bind(usuario, cleanNewU, (new_nombre || '').trim(), new Date().toISOString(), 'PENDIENTE').run();
            
            return jsonResponse({
                status: 'success', 
                message: `Tu solicitud para cambiar tu usuario a @${cleanNewU} ha sido enviada al administrador. Mientras se revisa, debes seguir iniciando sesión con tu usuario actual (@${usuario}).`
            });
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
            await ensureUsuarioAliasSchema(db);
            const peticion = await db.prepare('SELECT * FROM "Peticiones_Nombre" WHERE "Usuario Actual" = ?').bind(target_user).first();
            if (!peticion) return jsonResponse({status: 'error', message: 'No se encontró la petición.'}, 404);

            const oldU = peticion["Usuario Actual"];
            const newU = peticion["Nuevo Usuario Sol"];
            const newN = peticion["Nuevo Nombre Sol"];
            
            if (newU && newU.toLowerCase() !== oldU.toLowerCase()) {
                const checkU = await isUsernameTakenOrReserved(db, newU, oldU);
                if (checkU.taken) {
                    return jsonResponse({ status: 'error', message: checkU.reason }, 400);
                }

                await renameUserInAllTables(db, oldU, checkU.cleanUsername);
                await db.prepare('INSERT OR REPLACE INTO "Usuario_Alias" ("usuario_actual", "usuario_antiguo", "activo", "fecha_creacion", "usos") VALUES (?, ?, 1, ?, 0)')
                    .bind(checkU.cleanUsername, oldU, Date.now()).run().catch(() => {});
            }

            const targetU = newU ? newU : oldU;
            if (newN) {
                await db.prepare('UPDATE "Usuarios" SET "Nombre Real" = ? WHERE "Usuario" = ?').bind(newN, targetU).run();
            }
            
            await db.prepare('UPDATE "Peticiones_Nombre" SET "Estado" = \'APROBADO\' WHERE "Usuario Actual" = ?').bind(oldU).run();
            await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run().catch(() => {});

            let msg = 'Petición aprobada con éxito.';
            if (newU) msg = `Usuario @${oldU} renombrado a @${newU} con éxito. El usuario podrá iniciar sesión una vez con su nombre anterior antes de migrar definitivamente al nuevo.`;
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
                const cEmojiReq = payloadObj.custom_emoji || '';
                const cBadgeReq = (payloadObj.custom === 'X' || cEmojiReq) ? 'X' : '';
                const avtrUrlReq = payloadObj.avatar_url || '';
                const avtrReq = (payloadObj.avatar === 'X' || avtrUrlReq) ? 'X' : '';

                await db.prepare('UPDATE "Insignias" SET "Genero" = ?, "Jugador de" = ?, "Entrenador de" = ?, "Exjugador" = ?, "Directiva / Staff" = ?, "Lesionado" = ?, "Lesion_Desc" = ?, "Custom_Badge" = ?, "Custom_Emoji" = ?, "Custom_Desc" = ?, "Avatar" = ?, "Avatar_Url" = ? WHERE "Usuario" = ?')
                    .bind(payloadObj.genero || 'M', payloadObj.jugador_de || '', payloadObj.entrenador_de || '', payloadObj.exjugador || '', payloadObj.staff || '', payloadObj.lesionado || '', payloadObj.lesionado_desc || '', cBadgeReq, cEmojiReq, payloadObj.custom_desc || '', avtrReq, avtrUrlReq, userToUpdate).run();
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

    return null;
}
