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

    // 1. PING
    if (action === "ping") {
        return jsonResponse({ status: "ok" });
    }

    // HELPER: Formatear fila de Ajustes al objeto que espera el frontend
    function formatMatch(r, resOficialMap = {}) {
        const idPart = r.ID_Partido || "";
        const oRes = resOficialMap[idPart] || {};
        return {
            id_partido: idPart,
            ronda_global: r.Ronda_Global || "1",
            equipo_local: r.Equipo_Local || "",
            rival: r.Rival || "",
            jornada_eq: r.Jornada_Eq || "1",
            timestamp: r.timestamp || 0,
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

    // 3.5. SOLICITUD DE CAMBIO DE NOMBRE
    if (action === "request_name_change") {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const newUsr = (body.new_usuario || "").trim();
        const newName = (body.new_nombre || "").trim();

        const userExists = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE LOWER("Usuario") = LOWER(?)').bind(newUsr).first();
        if (userExists) {
            return jsonResponse({ status: "error", message: "⚠️ Ese nombre de usuario ya está en uso. Por favor, elige otro." });
        }

        const nowStr = new Date().toLocaleString("es-ES");
        await db.prepare('INSERT INTO "Peticiones_Nombre" ("Fecha", "Usuario Actual", "Nuevo Usuario Sol", "Nuevo Nombre Sol", "Estado") VALUES (?, ?, ?, ?, ?)')
            .bind(nowStr, usuario, newUsr, newName, "Escribe OK para aprobar").run();

        return jsonResponse({ status: "success", message: "Solicitud enviada. El administrador revisará tu petición." });
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

        // Borrar porras previas de estos partidos para este usuario (equivalente a deleteRow)
        for (const idPart in preds) {
            await db.prepare('DELETE FROM "Porras" WHERE "Usuario" = ? AND "ID Partido" = ?').bind(usuario, idPart).run();
            const p = preds[idPart];
            if (p.sets) {
                const nowStr = new Date().toLocaleString("es-ES");
                await db.prepare('INSERT INTO "Porras" ("Timestamp", "Usuario", "ID Partido", "Sets", "Puntos Dif", "a favor o en contra del local") VALUES (?, ?, ?, ?, ?, ?)')
                    .bind(nowStr, usuario, idPart, p.sets, p.puntos, p.signo).run();
            }
        }
        return jsonResponse({ status: "success", message: "Predicciones guardadas correctamente." });
    }

    // 5. GUARDAR PREDICCIONES SECRETAS (Puntos totales temporada)
    if (action === "save_totales") {
        const user = await db.prepare('SELECT "Usuario" FROM "Usuarios" WHERE "Usuario" = ? AND "Password" = ?').bind(usuario, password).first();
        if (!user) return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        const deadline = new Date("2026-10-03T00:00:00").getTime();
        if (Date.now() >= deadline) {
            return jsonResponse({ status: "error", message: "El plazo para enviar predicciones totales ha cerrado." });
        }

        const totals = body.predicciones_totales || {};
        for (const eq in totals) {
            await db.prepare('DELETE FROM "Predicciones_Secretas" WHERE "Usuario" = ? AND "Equipo" = ?').bind(usuario, eq).run();
            const pts = totals[eq];
            if (pts !== "" && !isNaN(parseInt(pts))) {
                const nowStr = new Date().toLocaleString("es-ES");
                await db.prepare('INSERT INTO "Predicciones_Secretas" ("Fecha", "Usuario", "Equipo", "Puntos Predichos") VALUES (?, ?, ?, ?)')
                    .bind(nowStr, usuario, eq, pts.toString()).run();
            }
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
            for (const lName in ligasMap) {
                if (ligasMap[lName].includes(p.equipo_local)) ligasEq.push(lName);
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
            insigniasMap[u] = [];
            if (b["Admin Web"] === "X") insigniasMap[u].push({ type: 'admin', text: 'Admin Web' });
            if (b["Directiva / Staff"]) insigniasMap[u].push({ type: 'staff', text: b["Directiva / Staff"] });
            if (b["Entrenador de"]) insigniasMap[u].push({ type: 'entrenador', text: 'Entrenador (' + b["Entrenador de"] + ')' });
            if (b["Jugador de"]) insigniasMap[u].push({ type: 'jugador', text: 'Jugador (' + b["Jugador de"] + ')' });
            if (b.Exjugador === "X") insigniasMap[u].push({ type: 'exjugador', text: 'Exjugador VCV' });
        }

        // Cartelera y todos_partidos (preservando derbis)
        const cartelera = [];
        const todosPartidos = [];
        const idsEnCartelera = {};

        for (const p of partidos) {
            const esLoc = misPermisos[p.equipo_local] === true;
            const esRiv = misPermisos[p.rival] === true;

            if (esLoc || esRiv) {
                const pCopy = { ...p };
                pCopy.permitido = true;
                
                // VISIBILIDAD AUTOMATICA 7 DIAS ANTES
                if (pCopy.visibilidad !== "OCULTAR" && pCopy.timestamp && (pCopy.timestamp - Date.now() <= 7 * 24 * 60 * 60 * 1000)) {
                    pCopy.visibilidad = "MOSTRAR";
                }
                if (esLoc && esRiv) pCopy.es_derby = true;
                if (!idsEnCartelera[p.id_partido]) {
                    cartelera.push(pCopy);
                    idsEnCartelera[p.id_partido] = pCopy;
                } else if (esLoc && esRiv) {
                    idsEnCartelera[p.id_partido].es_derby = true;
                }
            }

            if (p.visibilidad !== "OCULTAR") {
                todosPartidos.push(p);
            }
        }

        // Equipos permitidos para predicciones secretas (Permisos_Secreta)
        const rowSec = await db.prepare('SELECT * FROM "Permisos_Secreta" WHERE "Usuario" = ?').bind(usuario).first();
        const misEquiposTotales = [];
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
            if (p.oficial_sets) {
                const sL = parseInt(p.oficial_sets.split("-")[0]);
                const sV = parseInt(p.oficial_sets.split("-")[1]);
                if (!puntosRealesTotales[p.equipo_local]) puntosRealesTotales[p.equipo_local] = 0;
                if (sL === 3 && sV <= 1) puntosRealesTotales[p.equipo_local] += 3;
                else if (sL === 3 && sV === 2) puntosRealesTotales[p.equipo_local] += 2;
                else if (sL === 2 && sV === 3) puntosRealesTotales[p.equipo_local] += 1;
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

        // CLASIFICACIONES: calcular puntos por usuario y liga
        const { results: allPorras } = await db.prepare('SELECT * FROM "Porras"').all();
        const userPointsInLiga = {};
        for (const u of allUsers || []) {
            userPointsInLiga[u.Usuario] = {};
            for (const lName of todasLasLigas) userPointsInLiga[u.Usuario][lName] = 0;
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

            for (const lName in ligasMap) {
                if (ligasMap[lName].includes(p.equipo_local)) {
                    userPointsInLiga[pr.Usuario][lName] = (userPointsInLiga[pr.Usuario][lName] || 0) + pts;
                }
            }
        }

        // Formatear clasificaciones por liga
        const { results: allLigasRows } = await db.prepare('SELECT * FROM "Ligas"').all();
        const clasificacionesFormateadas = {};
        for (const lName of misLigas) {
            const ranking = [];
            for (const row of allLigasRows || []) {
                const uName = row.Jugador;
                if (row[lName] && row[lName].toString().toUpperCase() === "X") {
                    ranking.push({
                        jugador: uName,
                        nombre_real: mapNombresReales[uName] || uName,
                        puntos: (userPointsInLiga[uName] && userPointsInLiga[uName][lName]) || 0
                    });
                }
            }
            ranking.sort((a, b) => b.puntos - a.puntos);
            clasificacionesFormateadas[lName] = ranking;
        }

        // Ronda abierta (jornada activa de Ajustes)
        const primerAbierto = partidos.find(p => p.estado === "ABIERTO");
        const rondaAbierta = primerAbierto ? primerAbierto.ronda_global : "1";

        return jsonResponse({
            status: "success",
            jornada: rondaAbierta,
            equipos: cartelera,
            todos_partidos: todosPartidos,
            predicciones_usuario: prediccionesUsuario,
            ligas: misLigas,
            todas_las_ligas: todasLasLigas,
            clasificaciones: clasificacionesFormateadas,
            stats_ligas: {},
            nombre_real: userRow["Nombre Real"] || userRow.Usuario,
            correo: userRow["Correo"] || "",
            insignias: insigniasMap,
            mis_equipos_siguiendo: Object.keys(misPermisos),
            equipos_totales: misEquiposTotales,
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
        return jsonResponse({ status: 'success', message: '¡Cloudflare D1 está sincronizado siempre en tiempo real! No hace falta forzarlo.' });
    }
    if (action === 'clear_cache') {
        return jsonResponse({ status: 'success', message: '¡Cloudflare D1 está sincronizado siempre en tiempo real! No hay caché.' });
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
        await db.prepare('INSERT INTO "Ligas_Equipos" ("Jugador") VALUES (?)').bind(new_u).run();

        // Ligas
        if (ligas_seleccionadas && ligas_seleccionadas.length > 0) {
            try {
                await db.prepare('INSERT INTO "Ligas" ("Jugador") VALUES (?)').bind(new_u).run();
                for (const l of ligas_seleccionadas) {
                    await db.prepare(`UPDATE "Ligas" SET "${l}" = 'X' WHERE "Jugador" = ?`).bind(new_u).run();
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
            await db.prepare('UPDATE "Resultados_Oficiales" SET "Oficial Sets" = ?, "Oficial Parciales" = ? WHERE "ID Partido" = ?').bind(sets || '', parciales || '', id_partido).run();
        } else {
            await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Oficial Sets", "Oficial Parciales") VALUES (?, ?, ?)').bind(id_partido, sets || '', parciales || '').run();
        }

        // Update Streaming in Ajustes
        if (streaming !== undefined) {
            await db.prepare('UPDATE "Ajustes" SET "streaming" = ? WHERE "id_partido" = ?').bind(streaming, id_partido).run();
        }

        return jsonResponse({ status: 'success', message: 'Resultados y/o streaming guardados con éxito' });
    }

    
    // SAVE EMAIL
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
