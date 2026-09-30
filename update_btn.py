import re

with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the Google Sheets link with Cloudflare D1 link
old_btn = r'<a href="https://docs\.google\.com/spreadsheets/".*?Abrir Excel.*?</a>'
new_btn = """<a href="https://dash.cloudflare.com/49df16c2f6224b401932bb3250eddb1d/workers/d1/databases/03bebf64-ad4b-4355-8ec0-7b5af5205517" target="_blank" class="btn" style="flex: 1; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.85rem; text-decoration: none; border:1px solid #e67e22; background:rgba(230, 126, 34, 0.1); color:#e67e22; font-weight:bold;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="database" aria-hidden="true" style="width: 14px; height: 14px;" class="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg> Base de Datos
          </a>"""

text = re.sub(old_btn, new_btn, text, flags=re.DOTALL)

with open('dev.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print("Button updated.")
