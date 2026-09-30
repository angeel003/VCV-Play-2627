import os
import re

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """        // Update Resultados_Oficiales
        const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
        if (exist) {
            await db.prepare('UPDATE "Resultados_Oficiales" SET "Oficial Sets" = ?, "Oficial Parciales" = ? WHERE "ID Partido" = ?').bind(sets || '', parciales || '', id_partido).run();
        } else {
            await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Oficial Sets", "Oficial Parciales") VALUES (?, ?, ?)').bind(id_partido, sets || '', parciales || '').run();
        }

        // Update Streaming in Ajustes
        if (streaming !== undefined) {
            await db.prepare('UPDATE "Ajustes" SET "streaming" = ? WHERE "id_partido" = ?').bind(streaming, id_partido).run();
        }"""

new_block = """        // Update Resultados_Oficiales
        const exist = await db.prepare('SELECT * FROM "Resultados_Oficiales" WHERE "ID Partido" = ?').bind(id_partido).first();
        if (exist) {
            await db.prepare('UPDATE "Resultados_Oficiales" SET "Sets Oficial" = ?, "Parciales Oficial" = ?, "Streaming" = ? WHERE "ID Partido" = ?').bind(sets || '', parciales || '', streaming || '', id_partido).run();
        } else {
            await db.prepare('INSERT INTO "Resultados_Oficiales" ("ID Partido", "Sets Oficial", "Parciales Oficial", "Streaming") VALUES (?, ?, ?, ?)').bind(id_partido, sets || '', parciales || '', streaming || '').run();
        }"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("save_resultado_admin successfully updated.")
else:
    print("Could not find the old block in save_resultado_admin.")
