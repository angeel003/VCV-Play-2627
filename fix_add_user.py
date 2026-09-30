import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_add_user = """        await db.prepare('INSERT INTO "Usuarios" ("Usuario", "Password", "Nombre Real") VALUES (?, ?, ?)').bind(new_u, new_p, new_n || new_u).run();
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
        }"""

new_add_user = """        await db.prepare('INSERT INTO "Usuarios" ("Usuario", "Password", "Nombre Real") VALUES (?, ?, ?)').bind(new_u, new_p, new_n || new_u).run();
        await db.prepare('INSERT INTO "Permisos_Equipos" ("Jugador") VALUES (?)').bind(new_u).run();
        await db.prepare('INSERT INTO "Permisos_Secreta" ("Usuario") VALUES (?)').bind(new_u).run();

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
        }"""

if old_add_user in text:
    text = text.replace(old_add_user, new_add_user)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("add_user logic successfully updated.")
else:
    print("Could not find the old block.")
