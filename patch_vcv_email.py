import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

email_action = """
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
"""

text = text.replace('return jsonResponse({ status: "error", message: `Acci', email_action + '\n    return jsonResponse({ status: "error", message: `Acci')

text = text.replace('nombre_real: userRow["Nombre Real"] || userRow.Usuario,', 'nombre_real: userRow["Nombre Real"] || userRow.Usuario,\n            correo: userRow["Correo"] || "",')

with open('functions/api/vcv.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("vcv.js updated.")
