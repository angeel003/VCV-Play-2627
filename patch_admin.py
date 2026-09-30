import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

admin_code = """
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
"""

text = text.replace('return jsonResponse({ status: "error", message: `Acci', admin_code + '\n    return jsonResponse({ status: "error", message: `Acci')

with open('functions/api/vcv.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("vcv.js patched.")
