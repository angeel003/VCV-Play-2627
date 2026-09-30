import os

new_js_logic = """
const formSaveEmailEl = document.getElementById('formSaveEmail');
if(formSaveEmailEl) {
    formSaveEmailEl.addEventListener('submit', function(e) {
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
        .catch(err => alert("Error de conexión: " + err))
        .finally(() => { btn.disabled = false; btn.innerText = "Guardar Correo"; });
    });
}
"""

for filename in ['dev.html', 'index.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Find the btnChangePwd listener
    anchor1 = "document.getElementById('btnChangePwd').addEventListener"
    anchor2 = 'document.getElementById("btnChangePwd").addEventListener'
    
    if anchor1 in text:
        text = text.replace(anchor1, new_js_logic + "\n\n" + anchor1)
    elif anchor2 in text:
        text = text.replace(anchor2, new_js_logic + "\n\n" + anchor2)
    else:
        print(f"Warning: anchor not found in {filename}")

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

print("JS Logic injected.")
