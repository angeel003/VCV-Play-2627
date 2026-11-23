// ============================================================================
// MATCHES MODULE: FORMAT MATCH, OFICIAL SCRAPER & RESULTADOS
// ============================================================================
import { jsonResponse, flushBatch, getMadridTimestamp, formatTsToMadridStr, isSchemaMissingErr, fetchJson, fetchText } from './shared.js';
import { buildMvpVotesRecuento, ensureResultadosMvpSchema } from './mvp.js';

export     function formatMatch(r, resOficialMap = {}, mvpVotesMap = null, includeMvpVotes = false) {
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

        const mvpCandidatos = oRes.mvp_candidatos ? (function(){ try { return JSON.parse(oRes.mvp_candidatos); } catch(e){ return []; } })() : [];
        const savedRecuento = (includeMvpVotes && oRes.mvp_votos_recuento) ? (function(){ try { return JSON.parse(oRes.mvp_votos_recuento); } catch(e){ return []; } })() : [];
        const liveOrSavedRecuento = includeMvpVotes
            ? ((mvpVotesMap !== null)
                ? buildMvpVotesRecuento(mvpCandidatos, mvpVotesMap[idPart] || [])
                : buildMvpVotesRecuento(mvpCandidatos, savedRecuento))
            : [];

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
            acta: oRes.Acta || r.Acta || "",
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
            mvp_mostrar_porcentajes: false,
            mvp_visible: oRes.mvp_visible !== undefined ? (oRes.mvp_visible === 1 || oRes.mvp_visible === '1' || oRes.mvp_visible === true || oRes.mvp_visible === 'true' || oRes.mvp_visible === 'SI') : true
        };
    }

export async function handleMatches(action, ctx) {
    const { db, env, body, usuario, password, getAuthUser, context, crearNotificacion, broadcastPushToAll } = ctx;

    if (action === 'get_pronosticos_partido_data') {
        try {
            let idPartido = (body.id_partido || "").trim();
            const equipo = (body.equipo || "").trim();
            const categoria = (body.categoria || "").trim();
            const jornada = (body.jornada !== undefined && body.jornada !== null) ? String(body.jornada).trim() : "";

            let partido = null;
            if (idPartido) {
                partido = await db.prepare('SELECT * FROM "Ajustes" WHERE "ID_Partido" = ?').bind(idPartido).first();
            } else if (equipo && jornada) {
                partido = await db.prepare('SELECT * FROM "Ajustes" WHERE (lower("Equipo_Local") = lower(?) OR lower("Rival") = lower(?)) AND ("Jornada_Eq" = ? OR "Ronda_Global" = ?) LIMIT 1')
                    .bind(equipo, equipo, jornada, jornada).first();
                if (!partido) {
                    partido = await db.prepare('SELECT * FROM "Ajustes" WHERE (lower("Equipo_Local") LIKE lower(?) OR lower("Rival") LIKE lower(?)) AND ("Jornada_Eq" = ? OR "Ronda_Global" = ?) LIMIT 1')
                        .bind(`%${equipo}%`, `%${equipo}%`, jornada, jornada).first();
                }
                if (partido) idPartido = partido.ID_Partido;
            } else if (categoria && jornada) {
                partido = await db.prepare('SELECT * FROM "Ajustes" WHERE lower("Categoria") = lower(?) AND ("Jornada_Eq" = ? OR "Ronda_Global" = ?) LIMIT 1')
                    .bind(categoria, jornada, jornada).first();
                if (partido) idPartido = partido.ID_Partido;
            }

            if (!idPartido) return jsonResponse({ status: 'error', message: 'ID de partido requerido o no encontrado.' }, 400);

            if (usuario && password) {
                const user = await getAuthUser();
                if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
                const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP", "Permiso_Resultados" FROM "Insignias" WHERE lower("Usuario") = lower(?)').bind(usuario).first();
                const isAdmin = adminCheck && adminCheck["Admin Web"] === "X";
                const hasPerm = adminCheck && (adminCheck["Permiso_MVP"] === "X" || !!adminCheck["Permiso_Resultados"]);
                if (!isAdmin && !hasPerm) {
                    return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);
                }
            }

            const { results: rawPronosticos } = await db.prepare(`
                SELECT 
                    p."Timestamp" as timestamp,
                    p."Usuario" as usuario,
                    COALESCE(u."Nombre Real", p."Usuario") as nombre_real,
                    p."Sets" as sets,
                    p."Puntos Dif" as puntos_dif,
                    p."a favor o en contra del local" as signo,
                    p."Equipo_Local" as equipo_local,
                    p."Equipo_Visitante" as equipo_visitante
                FROM "Porras" p
                LEFT JOIN "Usuarios" u ON p."Usuario" = u."Usuario"
                WHERE p."ID Partido" = ?
            `).bind(idPartido).all();

            const isVis = partido && (partido.Ubicacion || '').toUpperCase() === 'VISITANTE';
            const defaultEqLocal = partido ? (isVis ? partido.Rival : partido.Equipo_Local) : '';
            const defaultEqVisitante = partido ? (isVis ? partido.Equipo_Local : partido.Rival) : '';
            const defaultUbiClub = isVis ? 'FUERA' : 'CASA';

            const pronosticos = (rawPronosticos || []).map(pr => ({
                usuario: pr.usuario,
                nombre_real: pr.nombre_real || pr.usuario,
                sets: pr.sets || '',
                puntos_dif: pr.puntos_dif !== undefined && pr.puntos_dif !== null ? pr.puntos_dif : 0,
                signo: pr.signo || '',
                timestamp: pr.timestamp || '',
                equipo_local: pr.equipo_local || defaultEqLocal,
                equipo_visitante: pr.equipo_visitante || defaultEqVisitante,
                ubicacion_club: defaultUbiClub,
                rival: partido ? partido.Rival : ''
            }));

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

    if (action === 'save_resultado_admin') {
        const { id_partido, sets, parciales, streaming, acta, acta_url, mvp_candidatos, mvp_oficial, mvp_stats, mvp_publicacion_ts } = body;
        const finalActa = (acta !== undefined) ? (acta || '') : ((acta_url !== undefined) ? (acta_url || '') : undefined);
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
                        const finalActaStr = (finalActa !== undefined) ? finalActa : (exist["Acta"] || '');
                        return db.prepare('UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ?, "Acta" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ? WHERE "ID Partido" = ?')
                            .bind(finalSets, finalParc, finalStream, finalActaStr, usuario, nowTs, nowFechaHora, id_partido);
                    }
                    return db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "Acta", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                        .bind(id_partido, sets || '', parciales || '', streaming || '', finalActa || '', usuario, nowTs, nowFechaHora);
                }

                if (exist) {
                    const finalSets = (sets !== undefined) ? (sets || '') : (exist["Sets Oficial"] || '');
                    const finalParc = (parciales !== undefined) ? (parciales || '') : (exist["Parciales Oficial"] || '');
                    const finalStream = (streaming !== undefined) ? (streaming || '') : (exist["Streaming"] || '');
                    const finalCand = (mvp_candidatos !== undefined) ? candStr : (exist["mvp_candidatos"] || '');

                    let sql = 'UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ?, "mvp_candidatos" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ?';
                    const params = [finalSets, finalParc, finalStream, finalCand, usuario, nowTs, nowFechaHora];
                    if (finalActa !== undefined) {
                        sql += ', "Acta" = ?';
                        params.push(finalActa);
                    }
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
                return db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "Acta", "mvp_candidatos", "mvp_oficial", "mvp_stats", "mvp_visible", "mvp_proclamado_ts", "mvp_cierre_votacion_ts", "mvp_publicacion_ts", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    .bind(id_partido, sets || '', parciales || '', streaming || '', finalActa || '', candStr, mvp_oficial || '', statsStr, visibleVal, proclamadoTs, cierreTs, pubTs, usuario, nowTs, nowFechaHora);
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

            if (typeof ctx.invalidateIsolateCache === 'function') {
                ctx.invalidateIsolateCache();
            }

            return jsonResponse({ status: 'success', message: 'Resultados y datos guardados con éxito' });
        } catch(sqlErr) {
            console.error("Error SQL en save_resultado_admin:", sqlErr);
            return jsonResponse({ status: 'error', message: 'Error de base de datos: ' + sqlErr.message }, 500);
        }
    }

    if (action === 'admin_check_official_schedules') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") {
            return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);
        }

        const incluirPasados = Boolean(body.incluir_pasados);

        const formatTsToMadridStr = (ts) => {
            if (!ts || isNaN(ts)) return 'Sin fecha';
            const d = new Date(Number(ts));
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Madrid',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).formatToParts(d);
            const get = (t) => (parts.find(p => p.type === t) || {}).value || '';
            const hh = get('hour') === '24' ? '00' : get('hour');
            return `${get('day')}/${get('month')}/${get('year')} ${hh}:${get('minute')}`;
        };

        const normText = (s) => String(s || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const normVenueCore = (s) => {
            let n = normText(s);
            // Expandir abreviaturas españolas habituales
            n = n.replace(/\bfdez\b/g, 'fernandez')
                 .replace(/\bavda\b/g, 'avenida')
                 .replace(/\bsta\b/g, 'santa')
                 .replace(/\bsto\b/g, 'santo')
                 .replace(/\bntra\b/g, 'nuestra')
                 .replace(/\bsra\b/g, 'senora')
                 .replace(/\buniv\b/g, 'universitario');
            // Quitar prefijos comunes de instalaciones para comparar el nombre real
            n = n.replace(/\b(polideportivo|pabellon|pab|p|municipal|campus|deportivo|colegio|pista|cdm|cp)\b/g, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
            return n;
        };

        const isVenueDifferent = (dbPab, fedPab) => {
            const fedClean = String(fedPab || '').replace(/,\s*$/, '').trim();
            if (!fedClean) return false;
            const dbClean = String(dbPab || '').replace(/,\s*$/, '').trim();
            if (!dbClean || normText(dbClean) === 'por definir' || normText(dbClean) === 'sin definir') return true;
            const nDb = normText(dbClean);
            const nFed = normText(fedClean);
            if (nDb === nFed || nDb.includes(nFed) || nFed.includes(nDb)) return false;
            const cDb = normVenueCore(dbClean);
            const cFed = normVenueCore(fedClean);
            if (!cDb || !cFed) return false;
            if (cDb === cFed || cDb.includes(cFed) || cFed.includes(cDb)) return false;
            // Comparación por tokens clave (al menos el 70% de tokens significativos del más corto coinciden)
            const tDb = cDb.split(' ').filter(w => w.length >= 3);
            const tFed = cFed.split(' ').filter(w => w.length >= 3);
            if (tDb.length > 0 && tFed.length > 0) {
                const shorter = tDb.length <= tFed.length ? tDb : tFed;
                const longer = tDb.length <= tFed.length ? tFed : tDb;
                let hits = 0;
                for (const w of shorter) {
                    if (longer.some(lw => lw === w || (w.length >= 5 && lw.length >= 5 && (lw.includes(w.slice(0, 5)) || w.includes(lw.slice(0, 5)))))) {
                        hits++;
                    }
                }
                if (hits / shorter.length >= 0.7) return false;
            }
            return true;
        };

        try {
            const [dbRowsRes, resOfRes] = await Promise.all([
                db.prepare('SELECT * FROM "Ajustes" ORDER BY "timestamp" ASC').all(),
                db.prepare('SELECT "ID Partido", "Sets Oficial" FROM "Resultados_Oficiales"').all()
            ]);
            const dbRows = (dbRowsRes && dbRowsRes.results) || [];
            const resOfMap = {};
            for (const ro of ((resOfRes && resOfRes.results) || [])) {
                resOfMap[ro["ID Partido"]] = ro;
            }

            // 7 peticiones en paralelo: 3 RFEVB (EsVoley) + 4 FVCyL (Leverade JSON API)
            const fetchJson = async (url) => {
                const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'VCVPlay-ScheduleCheck/1.0' } });
                if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
                return await r.json();
            };

            const [
                rSm2, r1M, r1F,
                rF2Teams, rF2Group,
                rM2Teams, rM2Group
            ] = await Promise.allSettled([
                fetchJson('https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=87'),
                fetchJson('https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=100'),
                fetchJson('https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=237'),
                fetchJson('https://api.leverade.com/tournaments/1340439?include=teams'),
                fetchJson('https://api.leverade.com/groups/3714977?include=rounds.matches.facility'),
                fetchJson('https://api.leverade.com/tournaments/1340440?include=teams'),
                fetchJson('https://api.leverade.com/groups/3706780?include=rounds.matches.facility')
            ]);

            const sourceErrors = [];

            // 1. Indexar partidos RFEVB por ID ('RFEVB_' + id)
            const rfevbMap = new Map();
            const rfevbSources = [
                { label: 'RFEVB SM2', res: rSm2 },
                { label: 'RFEVB 1ª Masc.', res: r1M },
                { label: 'RFEVB 1ª Fem.', res: r1F }
            ];
            for (const src of rfevbSources) {
                if (src.res.status !== 'fulfilled') {
                    sourceErrors.push(`${src.label}: ${src.res.reason ? src.res.reason.message : 'Error de red'}`);
                    continue;
                }
                const jornadas = (src.res.value && src.res.value.content) || [];
                for (const j of jornadas) {
                    for (const p of (j.partidos || [])) {
                        const rawFecha = String(p.fecha || '').trim(); // DD/MM/YYYY
                        const rawHora = String(p.hora || '').trim();   // HH:mm o "12:00 (13:00 en la Península)"
                        const penMatch = rawHora.match(/\((\d{1,2}:\d{2})\s*en\s*la\s*pen[ií]nsula\)/i);
                        const baseMatch = rawHora.match(/(\d{1,2}:\d{2})/);
                        const esCanarias = Boolean(penMatch);
                        const horaFinal = penMatch ? penMatch[1].padStart(5, '0') : (baseMatch ? baseMatch[1].padStart(5, '0') : '');

                        let fedTs = 0;
                        let fedFechaStr = 'Sin fecha';
                        if (rawFecha && horaFinal) {
                            const fParts = rawFecha.split('/').map(Number);
                            const hParts = horaFinal.split(':').map(Number);
                            if (fParts.length === 3 && hParts.length === 2 && !fParts.some(isNaN) && !hParts.some(isNaN)) {
                                let [d, mo, y] = fParts;
                                let [hh, mm] = hParts;
                                // Por seguridad si un partido en Canarias empezara a las 23:xx local (00:xx peninsular del día siguiente)
                                if (esCanarias && baseMatch) {
                                    const localH = parseInt(baseMatch[1].split(':')[0], 10);
                                    if (localH >= 23 && hh === 0) {
                                        const nextDay = new Date(Date.UTC(y, mo - 1, d + 1));
                                        y = nextDay.getUTCFullYear();
                                        mo = nextDay.getUTCMonth() + 1;
                                        d = nextDay.getUTCDate();
                                    }
                                }
                                fedTs = getMadridTimestamp(y, mo - 1, d, hh, mm);
                                fedFechaStr = formatTsToMadridStr(fedTs);
                            }
                        }
                        rfevbMap.set('RFEVB_' + p.id, {
                            id: 'RFEVB_' + p.id,
                            jornada: j.numero,
                            fed_fecha: fedFechaStr,
                            fed_ts: fedTs,
                            pabellon: String(p.pabellon || '').trim(),
                            es_canarias: esCanarias,
                            raw_hora: rawHora,
                            local: p.equipo_local || p.nombre_equipo_local || '',
                            visitante: p.equipo_visitante || p.nombre_equipo_visitante || '',
                            postponed: Boolean(p.esAplazado),
                            canceled: Boolean(p.esSuspendido)
                        });
                    }
                }
            }

            // 2. Parsear partidos FVCyL (2ª Fem. Oro y 2ª Masc.)
            const fvclMatches = { '2F': [], '2M': [] };
            const fvclSources = [
                { code: '2F', label: 'FVCyL 2ª Fem. Oro', tRes: rF2Teams, gRes: rF2Group },
                { code: '2M', label: 'FVCyL 2ª Masc.', tRes: rM2Teams, gRes: rM2Group }
            ];
            for (const src of fvclSources) {
                if (src.tRes.status !== 'fulfilled' || src.gRes.status !== 'fulfilled') {
                    const errMsg = src.tRes.status !== 'fulfilled'
                        ? (src.tRes.reason && src.tRes.reason.message)
                        : (src.gRes.reason && src.gRes.reason.message);
                    sourceErrors.push(`${src.label}: ${errMsg || 'Error de red'}`);
                    continue;
                }
                const teamsMap = {};
                for (const inc of ((src.tRes.value && src.tRes.value.included) || [])) {
                    if (inc.type === 'team') teamsMap[inc.id] = (inc.attributes && inc.attributes.name) || '';
                }
                const facilitiesMap = {};
                const roundsMap = {};
                const gIncluded = (src.gRes.value && src.gRes.value.included) || [];
                for (const inc of gIncluded) {
                    if (inc.type === 'facility' && inc.attributes) {
                        const fn = String(inc.attributes.name || '').replace(/,\s*$/, '').trim();
                        const fc = String(inc.attributes.city || '').trim();
                        facilitiesMap[inc.id] = fc && !normText(fn).includes(normText(fc)) ? `${fn}, ${fc}` : fn;
                    } else if (inc.type === 'round' && inc.attributes) {
                        roundsMap[inc.id] = { order: inc.attributes.order, name: inc.attributes.name };
                    }
                }
                for (const inc of gIncluded) {
                    if (inc.type !== 'match' || !inc.attributes) continue;
                    const homeId = inc.meta && inc.meta.home_team;
                    const awayId = inc.meta && inc.meta.away_team;
                    const homeName = teamsMap[homeId] || '';
                    const awayName = teamsMap[awayId] || '';
                    if (!homeName || !awayName) continue;

                    const facId = inc.relationships && inc.relationships.facility && inc.relationships.facility.data && inc.relationships.facility.data.id;
                    const roundId = inc.relationships && inc.relationships.round && inc.relationships.round.data && inc.relationships.round.data.id;
                    const roundInfo = roundsMap[roundId] || {};

                    const rawDt = inc.attributes.datetime || inc.attributes.date || '';
                    let fedTs = 0;
                    let fedFechaStr = 'Sin fecha';
                    if (rawDt) {
                        const parsed = Date.parse(String(rawDt).replace(' ', 'T') + 'Z');
                        if (!isNaN(parsed)) {
                            fedTs = parsed;
                            fedFechaStr = formatTsToMadridStr(parsed);
                        }
                    }

                    fvclMatches[src.code].push({
                        matchId: inc.id,
                        roundOrder: roundInfo.order || 0,
                        roundName: roundInfo.name || '',
                        homeTeam: homeName,
                        awayTeam: awayName,
                        fed_ts: fedTs,
                        fed_fecha: fedFechaStr,
                        pabellon: facilitiesMap[facId] || '',
                        finished: Boolean(inc.attributes.finished),
                        postponed: Boolean(inc.attributes.postponed),
                        canceled: Boolean(inc.attributes.canceled),
                        updated_at: inc.attributes.updated_at || ''
                    });
                }
            }

            // 3. Cotejar todos los partidos de la tabla Ajustes
            const getFvclTeamKey = (name) => {
                const n = normText(name);
                if (!n) return '';
                if (n.includes('molina') || (n.includes('vcv') && n.includes('maria'))) return 'vcv_maria_molina';
                if (n.includes('meseta')) return 'vcv_meseta';
                if (n.includes('abanto') || n.includes('pegamo')) return 'pegamo_abanto';
                if (n.includes('santo domingo') || n.includes('canada') || n.includes('sporting')) return 'sporting_soria';
                if (n.includes('duero') || n.includes('soria')) return 'rio_duero';
                if (n.includes('palencia')) return 'palencia';
                if (n.includes('maristas') || n.includes('inmaculada')) return 'maristas';
                if (n.includes('avila') || n.includes('muralla')) return 'avila';
                if (n.includes('burgos') || n.includes('ubu')) return 'burgos';
                if (n.includes('aule')) return 'aule';
                if (n.includes('segovoley') || n.includes('segovia')) return 'segovoley';
                if (n.includes('salamanca')) return 'salamanca';
                return n.replace(/\s+/g, '');
            };
            const nowMs = Date.now();
            const changes = [];
            let rfevbChecked = 0;
            let fvclChecked = 0;

            for (const rawRow of dbRows) {
                const m = formatMatch(rawRow, resOfMap, null, false);
                const id = m.id_partido || '';
                const estado = String(m.estado || '').toUpperCase();
                const hasOfficialResult = Boolean(m.oficial_sets && String(m.oficial_sets).trim() !== '');
                const dbTs = Number(m.timestamp || 0);
                const isPast = hasOfficialResult || estado === 'CERRADO' || estado === 'FINALIZADO' || (dbTs > 0 && dbTs < nowMs - 12 * 3600 * 1000);
                if (!incluirPasados && isPast) continue;

                const cat = m.categoria || '';
                const dbFechaStr = dbTs > 0 ? formatTsToMadridStr(dbTs) : (rawRow.Fecha || 'Sin fecha');
                const dbPabellon = String(m.pabellon || '').trim();
                const dbUbicacion = String(m.ubicacion || '').toUpperCase() === 'LOCAL' ? 'LOCAL' : 'VISITANTE';
                const isLocalDb = dbUbicacion === 'LOCAL';
                const dbHomeName = isLocalDb ? (m.equipo_local || '') : (m.rival || '');
                const dbAwayName = isLocalDb ? (m.rival || '') : (m.equipo_local || '');
                const partidoLabel = `${dbHomeName} vs ${dbAwayName}`;

                if (id.startsWith('RFEVB_')) {
                    const fed = rfevbMap.get(id);
                    if (!fed) continue;
                    rfevbChecked++;

                    const cambioFechaHora = fed.fed_ts > 0
                        ? (dbTs <= 0 || Math.abs(fed.fed_ts - dbTs) >= 60000 || dbFechaStr !== fed.fed_fecha)
                        : false;
                    const cambioPabellon = isVenueDifferent(dbPabellon, fed.pabellon);

                    // Detectar inversión de campo en RFEVB
                    const nDbHome = normText(dbHomeName);
                    const nDbAway = normText(dbAwayName);
                    const nFedHome = normText(fed.local);
                    const nFedAway = normText(fed.visitante);
                    const sameSide = (nDbHome && nFedHome && (nDbHome.includes(nFedHome) || nFedHome.includes(nDbHome))) ||
                                     (nDbAway && nFedAway && (nDbAway.includes(nFedAway) || nFedAway.includes(nDbAway)));
                    const swappedSide = (nDbHome && nFedAway && (nDbHome.includes(nFedAway) || nFedAway.includes(nDbHome))) &&
                                        (nDbAway && nFedHome && (nDbAway.includes(nFedHome) || nFedHome.includes(nDbAway)));
                    const campoInvertido = !sameSide && swappedSide;
                    const fedUbicacion = campoInvertido ? (isLocalDb ? 'VISITANTE' : 'LOCAL') : dbUbicacion;
                    const fedFinalizado = Boolean(fed.fed_ts > 0 && fed.fed_ts < nowMs - 4 * 3600 * 1000);

                    if (cambioFechaHora || cambioPabellon || campoInvertido || fed.canceled || (fedFinalizado && !isPast)) {
                        changes.push({
                            id_partido: id,
                            federacion: 'RFEVB',
                            categoria: cat,
                            jornada: m.jornada_eq || fed.jornada || '',
                            partido: (fed.local && fed.visitante) ? `${fed.local} vs ${fed.visitante}` : partidoLabel,
                            db_fecha: dbFechaStr,
                            fed_fecha: fed.fed_fecha,
                            fed_timestamp: fed.fed_ts,
                            db_pabellon: dbPabellon || 'Por definir',
                            fed_pabellon: fed.pabellon || dbPabellon,
                            db_ubicacion: dbUbicacion,
                            fed_ubicacion: fedUbicacion,
                            cambio_fecha_hora: cambioFechaHora,
                            cambio_pabellon: cambioPabellon,
                            campo_invertido: campoInvertido,
                            fed_finalizado: fedFinalizado,
                            es_canarias: fed.es_canarias,
                            postponed: Boolean(fed.postponed),
                            canceled: Boolean(fed.canceled),
                            updated_at: ''
                        });
                    }
                } else if (id.startsWith('FVCL_')) {
                    const code = cat.toLowerCase().includes('fem') ? '2F' : '2M';
                    const candidates = fvclMatches[code] || [];
                    if (candidates.length === 0) continue;

                    const dbHomeKey = getFvclTeamKey(dbHomeName);
                    const dbAwayKey = getFvclTeamKey(dbAwayName);

                    const sameOrderMatch = candidates.find(f =>
                        getFvclTeamKey(f.homeTeam) === dbHomeKey &&
                        getFvclTeamKey(f.awayTeam) === dbAwayKey
                    );
                    const swappedOrderMatch = candidates.find(f =>
                        getFvclTeamKey(f.homeTeam) === dbAwayKey &&
                        getFvclTeamKey(f.awayTeam) === dbHomeKey
                    );

                    // Detección inteligente de intercambio de campo (ida <-> vuelta):
                    // Si el partido con el mismo orden ya figura finalizado (o está a >45 días de distancia)
                    // y el partido con el campo invertido NO está finalizado y encaja con la fecha actual de la BD (<30 días),
                    // entonces el club/federación invirtió localía.
                    let fMatch = sameOrderMatch;
                    let campoInvertido = false;
                    if (swappedOrderMatch) {
                        const sameDiffDays = (sameOrderMatch && sameOrderMatch.fed_ts > 0 && dbTs > 0)
                            ? Math.abs(sameOrderMatch.fed_ts - dbTs) / 86400000
                            : Infinity;
                        const swapDiffDays = (swappedOrderMatch.fed_ts > 0 && dbTs > 0)
                            ? Math.abs(swappedOrderMatch.fed_ts - dbTs) / 86400000
                            : Infinity;
                        const sameAlreadyDone = !sameOrderMatch || sameOrderMatch.finished || (sameOrderMatch.fed_ts > 0 && sameOrderMatch.fed_ts < nowMs - 4 * 3600 * 1000);
                        const swapIsOpen = !swappedOrderMatch.finished && (swappedOrderMatch.fed_ts <= 0 || swappedOrderMatch.fed_ts >= nowMs - 4 * 3600 * 1000);

                        if (!isPast && swapIsOpen && ((sameAlreadyDone && swapDiffDays <= 35) || (sameDiffDays > 45 && swapDiffDays <= 14))) {
                            fMatch = swappedOrderMatch;
                            campoInvertido = true;
                        }
                    }

                    if (!fMatch) continue;
                    fvclChecked++;

                    const cambioFechaHora = fMatch.fed_ts > 0
                        ? (dbTs <= 0 || Math.abs(fMatch.fed_ts - dbTs) >= 60000 || dbFechaStr !== fMatch.fed_fecha)
                        : false;
                    const cambioPabellon = isVenueDifferent(dbPabellon, fMatch.pabellon);
                    const fedUbicacion = campoInvertido ? (isLocalDb ? 'VISITANTE' : 'LOCAL') : dbUbicacion;
                    const fedFinalizado = Boolean(fMatch.finished || (fMatch.fed_ts > 0 && fMatch.fed_ts < nowMs - 4 * 3600 * 1000));

                    if (cambioFechaHora || cambioPabellon || campoInvertido || fMatch.canceled || (fedFinalizado && !isPast)) {
                        changes.push({
                            id_partido: id,
                            federacion: 'FVCyL',
                            categoria: cat,
                            jornada: m.jornada_eq || String(fMatch.roundOrder || ''),
                            partido: `${fMatch.homeTeam} vs ${fMatch.awayTeam}`,
                            db_fecha: dbFechaStr,
                            fed_fecha: fMatch.fed_fecha,
                            fed_timestamp: fMatch.fed_ts,
                            db_pabellon: dbPabellon || 'Por definir',
                            fed_pabellon: fMatch.pabellon || dbPabellon,
                            db_ubicacion: dbUbicacion,
                            fed_ubicacion: fedUbicacion,
                            cambio_fecha_hora: cambioFechaHora,
                            cambio_pabellon: cambioPabellon,
                            campo_invertido: campoInvertido,
                            fed_finalizado: fedFinalizado,
                            es_canarias: false,
                            postponed: fMatch.postponed,
                            canceled: fMatch.canceled,
                            updated_at: fMatch.updated_at || ''
                        });
                    }
                }
            }

            return jsonResponse({
                status: 'success',
                checked_at: formatTsToMadridStr(Date.now()),
                incluir_pasados: incluirPasados,
                summary: {
                    total_checked: rfevbChecked + fvclChecked,
                    rfevb_checked: rfevbChecked,
                    fvcl_checked: fvclChecked,
                    changes_count: changes.length,
                    errors: sourceErrors
                },
                changes
            });
        } catch (e) {
            return jsonResponse({ status: 'error', message: 'Error al consultar federaciones: ' + e.message }, 500);
        }
    }

    if (action === 'admin_apply_official_schedule_changes') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") {
            return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);
        }

        const cambios = Array.isArray(body.cambios) ? body.cambios : [];
        if (cambios.length === 0) {
            return jsonResponse({ status: 'error', message: 'No se han enviado cambios para aplicar.' }, 400);
        }

        try {
            const stmts = [];
            const appliedIds = [];

            for (const c of cambios) {
                const idPartido = String(c.id_partido || '').trim();
                if (!idPartido) continue;

                const setCols = [];
                const bindVals = [];

                if (c.aplicar_fecha && c.fecha && Number(c.timestamp) > 0) {
                    setCols.push('"Fecha" = ?', '"timestamp" = ?');
                    bindVals.push(String(c.fecha).trim(), Number(c.timestamp));
                }
                if (c.aplicar_pabellon && c.pabellon && String(c.pabellon).trim()) {
                    setCols.push('"Pabellon" = ?');
                    bindVals.push(String(c.pabellon).trim());
                }
                if (c.aplicar_ubicacion && (c.ubicacion === 'LOCAL' || c.ubicacion === 'VISITANTE')) {
                    setCols.push('"Ubicacion" = ?');
                    bindVals.push(c.ubicacion);
                }

                if (setCols.length > 0) {
                    bindVals.push(idPartido);
                    stmts.push(db.prepare(`UPDATE "Ajustes" SET ${setCols.join(', ')} WHERE "ID_Partido" = ?`).bind(...bindVals));
                    appliedIds.push(idPartido);
                }
            }

            if (stmts.length === 0) {
                return jsonResponse({ status: 'error', message: 'Ningún cambio válido para actualizar.' }, 400);
            }

            await flushBatch(db, stmts);

            // Invalidar caché relacionada para que los usuarios vean los nuevos horarios de inmediato
            try {
                await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run();
            } catch (ce) {}

            if (typeof ctx.invalidateIsolateCache === 'function') {
                ctx.invalidateIsolateCache();
            }

            return jsonResponse({
                status: 'success',
                updated: appliedIds.length,
                applied_ids: appliedIds,
                message: appliedIds.length === 1
                    ? `Partido ${appliedIds[0]} actualizado con los datos oficiales de la federación.`
                    : `Se han actualizado ${appliedIds.length} partidos con los datos oficiales de la federación.`
            });
        } catch (e) {
            return jsonResponse({ status: 'error', message: 'Error aplicando cambios en BD: ' + e.message }, 500);
        }
    }

    // ========================================================================
    // VERIFICADOR DE RESULTADOS OFICIALES (RFEVB EsVoley + FVCyL Leverade)
    // ========================================================================
    if (action === 'admin_check_official_results') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") {
            return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);
        }

        const soloPendientes = body.solo_pendientes !== false;

        const formatTsToMadridStr = (ts) => {
            if (!ts || isNaN(ts)) return 'Sin fecha';
            const d = new Date(Number(ts));
            const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Madrid',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).formatToParts(d);
            const get = (t) => (parts.find(p => p.type === t) || {}).value || '';
            const hh = get('hour') === '24' ? '00' : get('hour');
            return `${get('day')}/${get('month')}/${get('year')} ${hh}:${get('minute')}`;
        };

        const normText = (s) => String(s || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const normParciales = (s) => String(s || '').replace(/\s+/g, '').replace(/;/g, ',');

        const getFvclTeamKey = (name) => {
            const n = normText(name);
            if (!n) return '';
            if (n.includes('molina') || (n.includes('vcv') && n.includes('maria'))) return 'vcv_maria_molina';
            if (n.includes('meseta')) return 'vcv_meseta';
            if (n.includes('abanto') || n.includes('pegamo')) return 'pegamo_abanto';
            if (n.includes('santo domingo') || n.includes('canada') || n.includes('sporting')) return 'sporting_soria';
            if (n.includes('duero') || n.includes('soria')) return 'rio_duero';
            if (n.includes('palencia')) return 'palencia';
            if (n.includes('maristas') || n.includes('inmaculada')) return 'maristas';
            if (n.includes('avila') || n.includes('muralla')) return 'avila';
            if (n.includes('burgos') || n.includes('ubu')) return 'burgos';
            if (n.includes('aule')) return 'aule';
            if (n.includes('segovoley') || n.includes('segovia')) return 'segovoley';
            if (n.includes('salamanca')) return 'salamanca';
            return n.replace(/\s+/g, '');
        };

        try {
            const [dbRowsRes, resOfRes] = await Promise.all([
                db.prepare('SELECT * FROM "Ajustes" ORDER BY "timestamp" ASC').all(),
                db.prepare('SELECT "ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "Acta" FROM "Resultados_Oficiales"').all()
            ]);
            const dbRows = (dbRowsRes && dbRowsRes.results) || [];
            const resOfMap = {};
            for (const ro of ((resOfRes && resOfRes.results) || [])) {
                resOfMap[ro["ID Partido"]] = ro;
            }

            const fetchJson = async (url) => {
                const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'VCVPlay-ResultsCheck/1.0' } });
                if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
                return await r.json();
            };

            const sourceErrors = [];

            // 1. Peticiones en paralelo para Leverade y calendarios RFEVB
            const [
                rSm2, r1M, r1F,
                rF2Teams, rF2Group,
                rM2Teams, rM2Group
            ] = await Promise.allSettled([
                fetchJson('https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=87'),
                fetchJson('https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=100'),
                fetchJson('https://intranet.esvoley.es/api/competiciones/getJornadasCalendario?grupoId=237'),
                fetchJson('https://api.leverade.com/tournaments/1340439?include=teams'),
                fetchJson('https://api.leverade.com/groups/3714977?include=rounds.matches.results,rounds.matches.periods.results'),
                fetchJson('https://api.leverade.com/tournaments/1340440?include=teams'),
                fetchJson('https://api.leverade.com/groups/3706780?include=rounds.matches.results,rounds.matches.periods.results')
            ]);

            // 2. Parsear Leverade (2F y 2M)
            const parseLeveradeGroup = (tRes, gRes, label) => {
                if (tRes.status !== 'fulfilled' || gRes.status !== 'fulfilled') {
                    const err = tRes.status !== 'fulfilled' ? tRes.reason?.message : gRes.reason?.message;
                    sourceErrors.push(`${label}: ${err || 'Error de red'}`);
                    return [];
                }
                const teamsMap = {};
                for (const inc of ((tRes.value && tRes.value.included) || [])) {
                    if (inc.type === 'team') teamsMap[inc.id] = (inc.attributes && inc.attributes.name) || '';
                }
                const gInc = (gRes.value && gRes.value.included) || [];
                const roundsMap = {};
                for (const inc of gInc) {
                    if (inc.type === 'round' && inc.attributes) {
                        roundsMap[inc.id] = { order: inc.attributes.order, name: inc.attributes.name };
                    }
                }
                const matches = gInc.filter(x => x.type === 'match' && x.attributes && x.attributes.finished);
                const results = gInc.filter(x => x.type === 'result');
                const periods = gInc.filter(x => x.type === 'period');

                return matches.map(m => {
                    const homeId = m.meta && m.meta.home_team;
                    const awayId = m.meta && m.meta.away_team;
                    const roundId = m.relationships && m.relationships.round && m.relationships.round.data && m.relationships.round.data.id;
                    const roundInfo = roundsMap[roundId] || {};
                    const rawDt = m.attributes.datetime || m.attributes.date || '';
                    let fedTs = 0;
                    if (rawDt) {
                        const parsed = Date.parse(String(rawDt).replace(' ', 'T') + 'Z');
                        if (!isNaN(parsed)) fedTs = parsed;
                    }
                    const mRes = results.filter(r => r.relationships?.match?.data?.id === m.id && !r.relationships?.period?.data);
                    const hRes = mRes.find(r => r.relationships?.team?.data?.id === homeId);
                    const aRes = mRes.find(r => r.relationships?.team?.data?.id === awayId);
                    const mPeriods = periods.filter(p => p.relationships?.periodable?.data?.id === m.id)
                        .sort((a, b) => (a.attributes?.order || 0) - (b.attributes?.order || 0));
                    const parcs = [];
                    for (const p of mPeriods) {
                        const pRes = results.filter(r => r.relationships?.parent?.data?.id === p.id);
                        const pH = pRes.find(r => r.relationships?.team?.data?.id === homeId);
                        const pA = pRes.find(r => r.relationships?.team?.data?.id === awayId);
                        const valH = Number(pH?.attributes?.value || 0);
                        const valA = Number(pA?.attributes?.value || 0);
                        if (valH > 0 || valA > 0) {
                            parcs.push(`${valH}-${valA}`);
                        }
                    }
                    const valSetsH = hRes?.attributes?.value;
                    const valSetsA = aRes?.attributes?.value;
                    const hasValidSets = valSetsH != null && valSetsA != null && (Number(valSetsH) + Number(valSetsA) >= 3);
                    return {
                        id: m.id,
                        homeTeam: teamsMap[homeId] || '',
                        awayTeam: teamsMap[awayId] || '',
                        homeKey: getFvclTeamKey(teamsMap[homeId]),
                        awayKey: getFvclTeamKey(teamsMap[awayId]),
                        roundOrder: roundInfo.order || 0,
                        fed_ts: fedTs,
                        sets: hasValidSets ? `${valSetsH}-${valSetsA}` : '',
                        parciales: parcs.join(', '),
                        updated_at: m.attributes.updated_at || ''
                    };
                }).filter(x => Boolean(x.sets));
            };

            const fvcl2F = parseLeveradeGroup(rF2Teams, rF2Group, 'FVCyL 2ª Fem.');
            const fvcl2M = parseLeveradeGroup(rM2Teams, rM2Group, 'FVCyL 2ª Masc.');

            // 3. Obtener detalle de partidos RFEVB candidatos
            const nowMs = Date.now();
            const rfevbCandidates = [];
            const rfevbSources = [
                { label: 'RFEVB SM2', res: rSm2 },
                { label: 'RFEVB 1ª Masc.', res: r1M },
                { label: 'RFEVB 1ª Fem.', res: r1F }
            ];
            for (const src of rfevbSources) {
                if (src.res.status !== 'fulfilled') {
                    sourceErrors.push(`${src.label}: ${src.res.reason?.message || 'Error de red'}`);
                    continue;
                }
                const jornadas = (src.res.value && src.res.value.content) || [];
                for (const j of jornadas) {
                    for (const p of (j.partidos || [])) {
                        const mId = 'RFEVB_' + p.id;
                        const dbMatchRow = dbRows.find(r => (r.ID_Partido || '') === mId);
                        if (!dbMatchRow) continue;

                        const ro = resOfMap[mId] || {};
                        const dbSets = String(ro["Sets Oficial"] || '').trim();
                        if (soloPendientes && dbSets !== '') continue;

                        let tsEst = Number(dbMatchRow.timestamp || 0);
                        if (tsEst > nowMs + 72 * 3600 * 1000) continue;

                        rfevbCandidates.push({ pId: p.id, mId: mId, jornada: j.numero });
                    }
                }
            }

            // Consultar getPartido en paralelo para candidatos RFEVB
            const rfevbDetails = await Promise.all(rfevbCandidates.map(async (c) => {
                try {
                    const data = await fetchJson(`https://intranet.esvoley.es/api/competiciones/getPartido?partidoId=${c.pId}`);
                    return { ...c, data: data?.content || null };
                } catch (e) {
                    return { ...c, data: null };
                }
            }));

            const rfevbResultsMap = new Map();
            for (const item of rfevbDetails) {
                if (!item.data) continue;
                const d = item.data;
                const sL = Number(d.sets_local || 0);
                const sV = Number(d.sets_visitante || 0);
                const p1L = Number(d.puntos_local_juego_1 || 0);
                const p1V = Number(d.puntos_visitante_juego_1 || 0);
                if (sL + sV >= 3 && (p1L > 0 || p1V > 0)) {
                    const parcs = [];
                    for (let k = 1; k <= 5; k++) {
                        const l = Number(d['puntos_local_juego_' + k] || 0);
                        const v = Number(d['puntos_visitante_juego_' + k] || 0);
                        if (l > 0 || v > 0) parcs.push(`${l}-${v}`);
                    }
                    let actaUrl = null;
                    if (d.imagenActa) {
                        const rawActa = String(d.imagenActa).trim();
                        const hrefMatch = rawActa.match(/href=['"]([^'"]+)['"]/i);
                        if (hrefMatch && hrefMatch[1]) {
                            actaUrl = hrefMatch[1];
                        } else if (rawActa.startsWith('http://') || rawActa.startsWith('https://')) {
                            actaUrl = rawActa;
                        }
                    }
                    rfevbResultsMap.set(item.mId, {
                        mId: item.mId,
                        sets: `${sL}-${sV}`,
                        parciales: parcs.join(', '),
                        acta_url: actaUrl,
                        streaming: d.linkStreaming || null,
                        local: d.equipo_local || '',
                        visitante: d.equipo_visitante || ''
                    });
                }
            }

            // 4. Comparar resultados con la BD
            const resultsDiff = [];
            let rfevbChecked = 0;
            let fvclChecked = 0;

            for (const rawRow of dbRows) {
                const m = formatMatch(rawRow, resOfMap, null, false);
                const id = m.id_partido || '';
                const dbSets = String(m.oficial_sets || '').trim();
                const dbParc = String(m.oficial_parciales || '').trim();
                const dbTs = Number(m.timestamp || 0);

                // Un partido en el futuro (más de 2 horas tras el inicio esperado) aún no se ha jugado
                if (dbTs > nowMs + 2 * 3600 * 1000) continue;

                if (soloPendientes && dbSets !== '') continue;

                const cat = m.categoria || '';
                const dbUbicacion = String(m.ubicacion || '').toUpperCase() === 'LOCAL' ? 'LOCAL' : 'VISITANTE';
                const isLocalDb = dbUbicacion === 'LOCAL';
                const dbHomeName = isLocalDb ? (m.equipo_local || '') : (m.rival || '');
                const dbAwayName = isLocalDb ? (m.rival || '') : (m.equipo_local || '');
                const partidoLabel = `${dbHomeName} vs ${dbAwayName}`;

                if (id.startsWith('RFEVB_')) {
                    rfevbChecked++;
                    const fed = rfevbResultsMap.get(id);
                    if (!fed) continue;

                    let fedSets = fed.sets;
                    let fedParc = fed.parciales;
                    let campoInvertido = false;

                    const nDbHome = normText(dbHomeName);
                    const nFedHome = normText(fed.local);
                    const nDbAway = normText(dbAwayName);
                    const nFedAway = normText(fed.visitante);
                    const sameSide = (nDbHome && nFedHome && (nDbHome.includes(nFedHome) || nFedHome.includes(nDbHome))) ||
                                     (nDbAway && nFedAway && (nDbAway.includes(nFedAway) || nFedAway.includes(nDbAway)));
                    const swappedSide = (nDbHome && nFedAway && (nDbHome.includes(nFedAway) || nFedAway.includes(nDbHome))) &&
                                        (nDbAway && nFedHome && (nDbAway.includes(nFedHome) || nFedHome.includes(nDbAway)));
                    if (!sameSide && swappedSide) {
                        campoInvertido = true;
                    }

                    const dbActa = String(m.acta || '').trim();
                    const fedActa = String(fed.acta_url || '').trim();
                    const actaDiff = fedActa !== '' && dbActa === '';

                    const setsDiff = dbSets !== fedSets;
                    const parcDiff = normParciales(dbParc) !== normParciales(fedParc);

                    if (dbSets === '' || setsDiff || parcDiff || actaDiff) {
                        resultsDiff.push({
                            id_partido: id,
                            federacion: 'RFEVB',
                            categoria: cat,
                            jornada: m.jornada_eq || '',
                            partido: partidoLabel,
                            db_home: dbHomeName,
                            db_away: dbAwayName,
                            db_sets: dbSets,
                            fed_sets: fedSets,
                            db_parciales: dbParc,
                            fed_parciales: fedParc,
                            db_estado: m.estado || 'ABIERTO',
                            tipo_diferencia: dbSets === '' ? 'NUEVO' : (actaDiff && !setsDiff && !parcDiff ? 'ACTA' : 'CORRECCION'),
                            sets_diferentes: setsDiff,
                            parciales_diferentes: parcDiff,
                            acta_url: fed.acta_url || null,
                            db_acta: dbActa || null,
                            streaming: fed.streaming || null,
                            campo_invertido: campoInvertido
                        });
                    }
                } else if (id.startsWith('FVCL_')) {
                    fvclChecked++;
                    const code = cat.toLowerCase().includes('fem') ? '2F' : '2M';
                    const candidates = code === '2F' ? fvcl2F : fvcl2M;
                    if (candidates.length === 0) continue;

                    const dbHomeKey = getFvclTeamKey(dbHomeName);
                    const dbAwayKey = getFvclTeamKey(dbAwayName);
                    const dbJornada = parseInt(m.jornada_eq || m.ronda_global, 10) || 0;

                    const sameOrderCandidates = candidates.filter(f => f.homeKey === dbHomeKey && f.awayKey === dbAwayKey);
                    const swappedOrderCandidates = candidates.filter(f => f.homeKey === dbAwayKey && f.awayKey === dbHomeKey);

                    // Buscar coincidencia en el mismo orden que encaje en jornada o fecha cercana (máx 15 días)
                    let fMatch = sameOrderCandidates.find(f =>
                        (dbJornada > 0 && f.roundOrder === dbJornada) ||
                        (dbTs > 0 && f.fed_ts > 0 && Math.abs(f.fed_ts - dbTs) <= 15 * 86400000)
                    ) || (sameOrderCandidates.length === 1 && !sameOrderCandidates[0].roundOrder ? sameOrderCandidates[0] : null);

                    let campoInvertido = false;

                    // Solo considerar campo invertido si NO hubo coincidencia en el mismo orden y la fecha o jornada encaja
                    if (!fMatch && swappedOrderCandidates.length > 0) {
                        const swapClose = swappedOrderCandidates.find(f =>
                            (dbJornada > 0 && f.roundOrder === dbJornada) ||
                            (dbTs > 0 && f.fed_ts > 0 && Math.abs(f.fed_ts - dbTs) <= 15 * 86400000)
                        );
                        if (swapClose) {
                            fMatch = swapClose;
                            campoInvertido = true;
                        }
                    }

                    if (!fMatch) continue;

                    let fedSets = fMatch.sets;
                    let fedParc = fMatch.parciales;

                    if (campoInvertido) {
                        const [sH, sA] = fedSets.split('-').map(Number);
                        fedSets = `${sA}-${sH}`;
                        fedParc = fedParc.split(',').map(chip => {
                            const [pH, pA] = chip.trim().split('-').map(Number);
                            return `${pA}-${pH}`;
                        }).join(', ');
                    }

                    const setsDiff = dbSets !== fedSets;
                    const parcDiff = normParciales(dbParc) !== normParciales(fedParc);

                    if (dbSets === '' || setsDiff || parcDiff) {
                        resultsDiff.push({
                            id_partido: id,
                            federacion: 'FVCyL',
                            categoria: cat,
                            jornada: m.jornada_eq || '',
                            partido: partidoLabel,
                            db_home: dbHomeName,
                            db_away: dbAwayName,
                            db_sets: dbSets,
                            fed_sets: fedSets,
                            db_parciales: dbParc,
                            fed_parciales: fedParc,
                            db_estado: m.estado || 'ABIERTO',
                            tipo_diferencia: dbSets === '' ? 'NUEVO' : 'CORRECCION',
                            sets_diferentes: setsDiff,
                            parciales_diferentes: parcDiff,
                            acta_url: null,
                            streaming: null,
                            campo_invertido: campoInvertido
                        });
                    }
                }
            }

            return jsonResponse({
                status: 'success',
                checked_at: formatTsToMadridStr(Date.now()),
                solo_pendientes: soloPendientes,
                summary: {
                    total_checked: rfevbChecked + fvclChecked,
                    rfevb_checked: rfevbChecked,
                    fvcl_checked: fvclChecked,
                    results_found: resultsDiff.length,
                    new_count: resultsDiff.filter(r => r.tipo_diferencia === 'NUEVO').length,
                    correction_count: resultsDiff.filter(r => r.tipo_diferencia === 'CORRECCION').length,
                    acta_count: resultsDiff.filter(r => r.tipo_diferencia === 'ACTA').length,
                    errors: sourceErrors
                },
                results: resultsDiff
            });
        } catch (e) {
            return jsonResponse({ status: 'error', message: 'Error al comprobar resultados oficiales: ' + e.message }, 500);
        }
    }

    // ========================================================================
    // APLICAR RESULTADOS OFICIALES EN BD (RFEVB + FVCyL)
    // ========================================================================
    if (action === 'admin_apply_official_results') {
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales inválidas' }, 401);
        const adminCheck = await db.prepare('SELECT "Admin Web" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        if (!adminCheck || adminCheck["Admin Web"] !== "X") {
            return jsonResponse({ status: 'error', message: 'No tienes permisos de administrador.' }, 403);
        }

        const items = Array.isArray(body.resultados) ? body.resultados : [];
        if (items.length === 0) {
            return jsonResponse({ status: 'error', message: 'No se han enviado resultados para aplicar.' }, 400);
        }

        const nowTs = Date.now();
        const nowFechaHora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        const appliedIds = [];
        const stmts = [];

        for (const item of items) {
            const idPart = String(item.id_partido || '').trim();
            const sets = String(item.sets || '').trim();
            const parciales = String(item.parciales || '').trim();
            const stream = String(item.streaming || '').trim();
            const acta = String(item.acta_url || item.acta || '').trim();
            const cerrar = item.cerrar_partido !== false;

            if (!idPart || !sets) continue;

            const exist = await db.prepare('SELECT "ID Partido", "Streaming", "Acta" FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(idPart).first();
            if (exist) {
                let sql = 'UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "actualizado_por" = ?, "actualizado_ts" = ?, "actualizado_fecha" = ?';
                const params = [sets, parciales, usuario, nowTs, nowFechaHora];
                if (stream && (!exist["Streaming"] || String(exist["Streaming"]).trim() === '')) {
                    sql += ', "Streaming" = ?';
                    params.push(stream);
                }
                if (acta && (!exist["Acta"] || String(exist["Acta"]).trim() === '' || acta !== exist["Acta"])) {
                    sql += ', "Acta" = ?';
                    params.push(acta);
                }
                sql += ' WHERE "ID Partido" = ?';
                params.push(idPart);
                stmts.push(db.prepare(sql).bind(...params));
            } else {
                stmts.push(db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming", "Acta", "actualizado_por", "actualizado_ts", "actualizado_fecha") VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    .bind(idPart, sets, parciales, stream, acta, usuario, nowTs, nowFechaHora));
            }

            if (cerrar) {
                stmts.push(db.prepare('UPDATE "Ajustes" SET "Estado" = \'CERRADO\' WHERE "ID_Partido" = ?').bind(idPart));
            }
            appliedIds.push(idPart);
        }

        if (stmts.length === 0) {
            return jsonResponse({ status: 'error', message: 'Ningún resultado válido para guardar.' }, 400);
        }

        try {
            await flushBatch(db, stmts);

            // Limpiar caché de puntuaciones para recalcular clasificaciones de inmediato
            try {
                await db.prepare("DELETE FROM Cache_App WHERE clave LIKE 'userPointsInLiga%' OR clave LIKE 'statsLigas%'").run();
            } catch (ce) {}

            if (typeof ctx.invalidateIsolateCache === 'function') {
                ctx.invalidateIsolateCache();
            }

            return jsonResponse({
                status: 'success',
                updated: appliedIds.length,
                applied_ids: appliedIds,
                message: appliedIds.length === 1
                    ? `Resultado oficial del partido ${appliedIds[0]} aplicado correctamente y partido cerrado.`
                    : `Se han aplicado los resultados oficiales de ${appliedIds.length} partidos y actualizado las clasificaciones.`
            });
        } catch (e) {
            return jsonResponse({ status: 'error', message: 'Error aplicando resultados en BD: ' + e.message }, 500);
        }
    }

    return null;
}
