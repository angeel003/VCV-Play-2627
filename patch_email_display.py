import os

for filename in ['dev.html', 'index.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    anchor = "let nameEl = document.getElementById('h2-user-name'); if(nameEl) nameEl.innerText = data.nombre_real || usr;"
    new_code = anchor + "\n            if (data.correo) { let emlDisp = document.getElementById('currentEmailDisplay'); let emlTxt = document.getElementById('currentEmailText'); if(emlDisp && emlTxt) { emlDisp.style.display = 'block'; emlTxt.innerText = data.correo; } }"
    
    if anchor in text:
        text = text.replace(anchor, new_code)
        with open(filename, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print(f"Patched {filename}")
    else:
        print(f"Anchor not found in {filename}")

