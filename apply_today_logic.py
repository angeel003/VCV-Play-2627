import os

with open('index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

with open('dev.html', 'r', encoding='utf-8') as f:
    dev_content = f.read()

# 1. Change 'App no oficial' to 'App oficial' in index.html only?
# Actually, the user asked to change it in dev.html as well. Let's do both.
idx_content = idx_content.replace('App no oficial del club', 'App oficial del club')
dev_content = dev_content.replace('App no oficial del club', 'App oficial del club')

# 2. Add the Cloudflare API logic to dev.html ONLY!
gas_url_decl = 'const scriptURL = "https://script.google.com/macros/s/AKfycbyw9L6Te3q2ibdRBaaAwaiPpEPWLbsNdb8JA9yO272DBHgxaZA2l3TLkH9ofAXlQiWfAg/exec";'

cf_url_logic = """// Nueva API ultrarrápida conectada a Cloudflare D1
const scriptURL = window.location.hostname.includes('pages.dev') || window.location.hostname.includes('vcvplay.com') 
    ? '/api/vcv' 
    : (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
        ? 'https://vcv-play-2627.pages.dev/api/vcv' 
        : '/api/vcv');

// Pre-calentar el servidor en segundo plano
try {
    fetch(scriptURL + (scriptURL.includes('?') ? '&' : '?') + 'ping=1', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' }),
        mode: 'no-cors'
    }).catch(() => {});
} catch(e) {}"""

dev_content = dev_content.replace(gas_url_decl, cf_url_logic)

# 3. Add the Cold Start retry logic to both if it wasn't there
retry_logic_old = """        } else if (data.status === "ok") {
            msgBox.className = "alert-box alert-warning"; msgBox.innerText = "El servidor se estaba despertando (Cold Start). Vuelve a pulsar Iniciar Sesión."; msgBox.style.display = "block";
          updateProgressBar();"""

retry_logic_new = """        } else if (data.status === "ok") {
            console.log("Servidor despertado con éxito (Cold Start). Reintentando login automáticamente...");
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Conectando...';
            setTimeout(() => {
                btn.disabled = false;
                btn.click();
            }, 400);
            return;"""

idx_content = idx_content.replace(retry_logic_old, retry_logic_new)
dev_content = dev_content.replace(retry_logic_old, retry_logic_new)

# Write them back safely
with open('index.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(idx_content)

with open('dev.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(dev_content)

print("Restored pristine files and applied today's logic updates safely.")
