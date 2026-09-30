import re

files = ['dev.html', 'index.html']

new_ui_block = """
        <div style="background: var(--bg-general); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h3 style="font-size:1rem; margin-top:0; color:var(--vcv-morado); display:flex; align-items:center; gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Recuperación de Cuenta (Opcional)
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Guarda tu correo electrónico para poder recuperar tu cuenta en caso de que olvides tu usuario o contraseña más adelante.</p>
          <div id="currentEmailDisplay" style="font-size: 0.85rem; margin-bottom: 10px; color: var(--text-main); display:none;"><strong>Correo actual:</strong> <span id="currentEmailText"></span></div>
          <form id="formSaveEmail">
            <input type="email" id="txtEmail" class="form-control" placeholder="Introduce tu correo" required style="width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main);">
            <button type="submit" class="btn" style="width: 100%; padding: 10px; font-size: 0.85rem; background: var(--vcv-morado); color: white; border: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(44,62,80,0.2);">Guardar Correo</button>
          </form>
        </div>
"""

new_js_logic = """
document.getElementById('formSaveEmail').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const email = document.getElementById('txtEmail').value.trim();
    if(!email) return;
    
    btn.disabled = true; btn.innerText = "Guardando...";
    
    fetchSeguro(scriptURL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'save_email', usuario: currentUser, password: currentPassword, email: email }), 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    })
    .then(res => res.json())
    .then(d => {
        if(d.status === "success") { 
            mostrarToast(d.message); 
            document.getElementById('currentEmailDisplay').style.display = 'block';
            document.getElementById('currentEmailText').innerText = email;
            document.getElementById('txtEmail').value = "";
        } else { 
            alert("Error: " + (d.message || JSON.stringify(d))); 
        }
    })
    .catch(err => alert("Error de conexin: " + err))
    .finally(() => { btn.disabled = false; btn.innerText = "Guardar Correo"; });
});
"""

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Inject UI below Cambiar Contraseña block
    # Look for </form>\n        </div> (which closes the formChangePwd block)
    ui_anchor = "        <!-- Botones de Control Servidor -->"
    if ui_anchor in text:
        text = text.replace(ui_anchor, new_ui_block + "\n" + ui_anchor)
    else:
        # fallback
        text = text.replace('<div id="adminPanelWrapper"', new_ui_block + '\n        <div id="adminPanelWrapper"')

    # 2. Inject JS logic
    js_anchor = "document.getElementById('formChangePwd').addEventListener"
    text = text.replace(js_anchor, new_js_logic + "\n\n" + js_anchor)

    # 3. Add `data.correo` logic to `renderPerfil`
    # In function renderPerfil, find `document.getElementById('profileRealName').innerText`
    render_anchor = "document.getElementById('profileRealName').innerText = window.appData.nombre_real || currentUser;"
    new_render = render_anchor + "\n    if (window.appData.correo) { document.getElementById('currentEmailDisplay').style.display = 'block'; document.getElementById('currentEmailText').innerText = window.appData.correo; }"
    text = text.replace(render_anchor, new_render)

    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)

print("UI patched in index.html and dev.html.")
