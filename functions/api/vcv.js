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
        try { await db.prepare("CREATE TABLE IF NOT EXISTS Peticiones_Insignias (id_peticion INTEGER PRIMARY KEY AUTOINCREMENT, Usuario TEXT, Tipo TEXT, Equipo_Externo TEXT, Estado TEXT, Fecha TEXT)").run(); } catch(e) {}
        
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
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_ligas_config_liga ON "Ligas_Config"("Liga")'
        ];
        for (const iq of indexQueries) {
            try { await db.prepare(iq).run(); } catch(e) {}
        }
        return jsonResponse({status: 'success', message: 'Migración e índices optimizados aplicados con éxito.'});
    }
    if (action === "ping") {
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
            streaming: oRes.Streaming || ""
        };
    }

    // 2. LOGIN INVITADO
    if (action === "login_guest") {
        const { results: rawPartidos } = await db.prepare('SELECT * FROM "Ajustes" WHERE "Visibilidad" != \'OCULTAR\' ORDER BY "timestamp" ASC').all();
        const { results: resOf } = await db.prepare('SELECT * FROM "Resultados_Oficiales"').all();
        const resMap = {};
        for (const ro of resOf || []) resMap[ro["ID Partido"]] = ro;

        const equipos = (rawPartidos || []).map(r => formatMatch(r, resMap));
        return jsonResponse({ status: "success", equipos });
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
        if (action === "login") {
            try {
                let shouldUpdate = true;
                if (userRow.ultimo_acceso) {
                    // El servidor guarda en UTC via CURRENT_TIMESTAMP
                    const lastAcc = new Date(userRow.ultimo_acceso + 'Z').getTime();
                    if (!isNaN(lastAcc) && (Date.now() - lastAcc < 3600000)) {
                        shouldUpdate = false; // Ha pasado menos de 1 hora
                    }
                }
                if (shouldUpdate) {
                    await db.prepare('UPDATE "Usuarios" SET ultimo_acceso = CURRENT_TIMESTAMP WHERE "Usuario" = ?').bind(usuario).run();
                }
            } catch(e) {}
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
            const lblExj = isF ? "Exjugadora VCV" : "Exjugador VCV";

            const addBadge = (type, text) => {
                if (!insigniasMap[u].some(badge => badge.type === type && badge.text === text)) {
                    insigniasMap[u].push({ type, text });
                }
            };
            if (b["Admin Web"] === "X") addBadge('admin', 'Admin Web');
            if (b["Directiva / Staff"]) addBadge('staff', b["Directiva / Staff"]);
            if (b["Entrenador de"]) addBadge('entrenador', b["Entrenador de"]);
            if (b["Jugador de"]) addBadge('jugador', b["Jugador de"]);
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
        }

        // Cartelera y todos_partidos (preservando derbis)
        const cartelera = [];
        const todosPartidos = [];
        const idsEnCartelera = {};

        for (const p of partidos) {
            // SI ESTÁ OCULTADO A MANO EN LA BD, IGNORAR POR COMPLETO
            if (p.visibilidad === "OCULTAR") continue;

            const esLoc = misPermisos[p.equipo_local] === true;
            const esRiv = misPermisos[p.rival] === true;

            // SOLO PROCESAR SI EL USUARIO TIENE PERMISO PARA ALGUNO DE LOS DOS EQUIPOS
            if (esLoc || esRiv) {
                const pCopy = { ...p };
                pCopy.permitido = true;
                if (esLoc && esRiv) pCopy.es_derby = true;

                // 1. Calendario: Entran todos los permitidos
                todosPartidos.push(pCopy);

                // 2. Cartelera: Solo los que están a <= 7 días, que tengan fecha, y que no hayan pasado más de 36h desde el inicio
                const pCartelera = { ...pCopy };
                let noTimestamp = !pCartelera.timestamp;
                let isTooFarFuture = pCartelera.timestamp && (pCartelera.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000);
                let isTooOld = pCartelera.timestamp && (Date.now() - pCartelera.timestamp > 36 * 60 * 60 * 1000);
                
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
        const nowPointsMs = Date.now();
        for (const p of partidos) {
            // Solo computar si el partido está oficialmente CERRADO o ya se ha jugado/comenzado en el tiempo
            const yaJugado = p.estado === "CERRADO" || (p.timestamp && nowPointsMs >= p.timestamp);
            if (yaJugado && p.oficial_sets && p.oficial_sets.includes("-")) {
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
        let ptsSets = 5, ptsGanador = 3, ptsDiffExacta = 2, maxDistancia = 10;
        for (const r of regRows || []) {
            const reg = (r.Regla || "").toLowerCase();
            const val = parseInt(r.Puntos) || 0;
            if (reg.includes("sets")) ptsSets = val;
            else if (reg.includes("ganador")) ptsGanador = val;
            else if (reg.includes("exacta")) ptsDiffExacta = val;
            else if (reg.includes("distancia") || reg.includes("max")) maxDistancia = val;
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
                // Si el override expiró (por ejemplo superó unfreeze_until o expires_at), se descarta automáticamente
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
            const { results: cfgRows } = await db.prepare('SELECT * FROM "Ligas_Config"').all();
            if (cfgRows && cfgRows.length > 0) {
                ligasCongeladasSet = new Set();
                for (const row of cfgRows) {
                    const val = (row.Congelar || "").toString().trim().toUpperCase();
                    if (val === "SI" || val === "X" || val === "1" || val === "TRUE") {
                        ligasCongeladasSet.add(row.Liga);
                    }
                }
            }
        } catch(e) {
            console.error("Error Ligas_Config:", e);
        }

        const cacheKey = isFrozen ? 'userPointsInLiga_FROZEN' : 'userPointsInLiga';
        const statsCacheKey = isFrozen ? 'statsLigas_FROZEN' : 'statsLigas';

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

                const jNum = parseInt(p.ronda_global) || parseInt(p.jornada_eq) || 1;

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
            notificaciones: notificaciones,
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
                max_dist: maxDistancia
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
        
        return jsonResponse({ status: 'success', message: '¡Permisos sincronizados! Las X han sido rellenadas físicamente en la base de datos.' });
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
        return jsonResponse({ status: 'success', message: 'Timestamps corregidos y Caché borrada: ' + updatedCount });
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
        
        return jsonResponse({ status: 'success', message: 'Caché borrada. Las clasificaciones se recalcularán al recargar la web.' });
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
        const { id_partido, sets, parciales, streaming } = body;
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        // Update Resultados_Oficiales
        const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
        if (exist) {
            await db.prepare('UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ? WHERE "ID Partido" = ?').bind(sets || '', parciales || '', streaming || '', id_partido).run();
        } else {
            await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming") VALUES (?, ?, ?, ?)').bind(id_partido, sets || '', parciales || '', streaming || '').run();
        }
        
        if (sets) { try { await db.prepare('UPDATE "Ajustes" SET "Estado" = \'CERRADO\' WHERE "ID_Partido" = ?').bind(id_partido).run(); } catch(e) {} }
        try { await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run(); } catch(e) {}

        return jsonResponse({ status: 'success', message: 'Resultados y/o streaming guardados con éxito' });
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
            
            return jsonResponse({status: 'success', message: 'Un administrador la revisará. Si tras varios días no se ha cambiado, avísanos por correo. Mientras tanto, usa tu usuario actual.'});
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
                    "Permisos_Secreta", "Insignias", "Predicciones_Secretas"
                ];
                
                for (const table of tables) {
                    let col = (table === "Ligas" || table === "Permisos_Equipos") ? "Jugador" : "Usuario";
                    stmts.push(db.prepare(`UPDATE OR IGNORE "${table}" SET "${col}" = ? WHERE "${col}" = ?`).bind(newU, oldU));
                    stmts.push(db.prepare(`DELETE FROM "${table}" WHERE "${col}" = ?`).bind(oldU));
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

    return jsonResponse({ status: "error", message: `Acción desconocida: ${action}` }, 400);
}
