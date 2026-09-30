import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_clear_cache = """    if (action === 'clear_cache') {
        return jsonResponse({ status: 'success', message: 'Cloudflare D1 está sincronizado siempre en tiempo real! No hay caché.' });
    }"""

new_clear_cache = """    if (action === 'clear_cache') {
        await db.prepare('DELETE FROM Cache_App').run();
        return jsonResponse({ status: 'success', message: 'Caché de clasificaciones forzada a recalcularse con éxito.' });
    }"""

text = text.replace(old_clear_cache, new_clear_cache)


old_save_admin = """        // Update Streaming in Ajustes
        if (streaming !== undefined) {
            await db.prepare('UPDATE "Ajustes" SET "streaming" = ? WHERE "id_partido" = ?').bind(streaming, id_partido).run();
        }

        return jsonResponse({ status: 'success', message: 'Resultados y/o streaming guardados con éxito' });"""

new_save_admin = """        // Update Streaming in Ajustes
        if (streaming !== undefined) {
            await db.prepare('UPDATE "Ajustes" SET "streaming" = ? WHERE "id_partido" = ?').bind(streaming, id_partido).run();
        }
        
        // Invalidate cache
        await db.prepare("DELETE FROM Cache_App WHERE clave = 'userPointsInLiga'").run();

        return jsonResponse({ status: 'success', message: 'Resultados y/o streaming guardados con éxito' });"""

text = text.replace(old_save_admin, new_save_admin)

old_logic = """        // CLASIFICACIONES: calcular puntos por usuario y liga
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
        }"""

new_logic = """        // CLASIFICACIONES: calcular puntos por usuario y liga (CON CACHÉ)
        let userPointsInLiga = {};
        const cacheRow = await db.prepare("SELECT valor FROM Cache_App WHERE clave = 'userPointsInLiga'").first();
        if (cacheRow && cacheRow.valor) {
            try { userPointsInLiga = JSON.parse(cacheRow.valor); } catch(e) {}
        }

        if (Object.keys(userPointsInLiga).length === 0) {
            const { results: allPorras } = await db.prepare('SELECT * FROM "Porras"').all();
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
            await db.prepare("INSERT OR REPLACE INTO Cache_App (clave, valor, timestamp) VALUES ('userPointsInLiga', ?, ?)").bind(JSON.stringify(userPointsInLiga), Date.now()).run();
        }"""

text = text.replace(old_logic, new_logic)

with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print('vcv.js Cache logic patched!')
