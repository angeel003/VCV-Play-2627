// ============================================================================
// MVP MODULE: VOTACIONES, ESCRUTINIO, PLANTILLA SUPERLIGA 2 Y CANDIDATOS
// ============================================================================
import { jsonResponse, flushBatch } from './shared.js';

export function normalizeMvpStr(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, ' ');
}

export function extractMvpDorsal(str) {
    if (!str) return null;
    const m = String(str).match(/#(\d+)/);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    return isNaN(num) ? null : num;
}

export function isSameMvpPlayer(a, b) {
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

export function buildMvpVotesRecuento(candsList, rawVotesList) {
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

export async function ensureMvpVotosSchema(db) {
    await db.prepare('CREATE TABLE IF NOT EXISTS "MVP_Votos" (id_partido TEXT, usuario TEXT, jugador TEXT, timestamp INTEGER, fecha_hora TEXT, PRIMARY KEY (id_partido, usuario))').run();
    try { await db.prepare('ALTER TABLE "MVP_Votos" ADD COLUMN "fecha_hora" TEXT').run(); } catch(e) {}
}

export async function ensureResultadosMvpSchema(db) {
    const alters = [
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_por" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "actualizado_fecha" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "Acta" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "Streaming" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_candidatos" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_oficial" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_stats" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_proclamado_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_visible" INTEGER DEFAULT 1',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_cierre_votacion_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_publicacion_ts" INTEGER',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_votos_recuento" TEXT',
        'ALTER TABLE "Resultados_Oficiales" ADD COLUMN "mvp_mostrar_porcentajes" INTEGER DEFAULT 0',
        'ALTER TABLE "Ajustes" ADD COLUMN "Acta" TEXT'
    ];
    await Promise.allSettled(alters.map(sql => db.prepare(sql).run()));
}

function isSchemaMissingErr(err) {
    if (!err || !err.message) return false;
    const msg = err.message.toLowerCase();
    return msg.includes('no such table') || msg.includes('no such column') || msg.includes('has no column');
}

export async function handleMvp(action, ctx) {
    const { db, body, usuario, getAuthUser } = ctx;

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
        const { id_partido, mvp_oficial, mvp_stats, mvp_publicacion_ts } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);

        const adminCheck = await db.prepare('SELECT "Admin Web", "Permiso_MVP" FROM "Insignias" WHERE "Usuario" = ?').bind(usuario).first();
        const hasMvpPerm = adminCheck && (adminCheck["Admin Web"] === "X" || adminCheck["Permiso_MVP"] === "X");
        if (!hasMvpPerm) return jsonResponse({ status: 'error', message: 'No tienes permisos para proclamar el MVP.' }, 403);

        const statsStr = Array.isArray(mvp_stats) ? JSON.stringify(mvp_stats) : (mvp_stats || '');
        const proclamadoTs = (mvp_oficial && String(mvp_oficial).trim() !== '') ? Date.now() : 0;
        const publicacionTs = (mvp_publicacion_ts !== undefined && mvp_publicacion_ts !== null) ? (parseInt(mvp_publicacion_ts) || 0) : (proclamadoTs > 0 ? proclamadoTs : 0);
        const mostrarPorcentajesVal = 0;

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

        return jsonResponse({ 
            status: 'success', 
            message: 'Ganador MVP, estadísticas y recuento de votos reales guardados con éxito en la base de datos', 
            mvp_proclamado_ts: proclamadoTs, 
            mvp_publicacion_ts: publicacionTs, 
            recuento: recuentoList 
        });
    }

    // VOTAR MVP DE PARTIDO
    if (action === 'vote_mvp') {
        const { id_partido, jugador } = body;
        const user = await getAuthUser();
        if (!user) return jsonResponse({ status: 'error', message: 'Credenciales incorrectas' }, 401);
        if (user.is_banned) {
            return jsonResponse({ status: 'error', code: 'USUARIO_BANEADO', message: 'Tu cuenta ha sido bloqueada / suspendida.', motivo_baneo: user.motivo_baneo }, 403);
        }
        if (!id_partido || !jugador) return jsonResponse({ status: 'error', message: 'Faltan datos de votación' }, 400);

        // Bloquear voto si el usuario está en estado provisional PENDIENTE
        const userInsignia = await db.prepare('SELECT "Verificado" FROM "Insignias" WHERE "Usuario" = ?').bind(user.Usuario).first().catch(() => null);
        if (userInsignia && userInsignia.Verificado === 'PENDIENTE') {
            return jsonResponse({
                status: 'error',
                message: 'Tu cuenta aún está pendiente de verificación por el administrador. Solo los usuarios aprobados pueden votar por el MVP.'
            }, 403);
        }

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
        const { jugadores } = body;
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

    return null;
}
