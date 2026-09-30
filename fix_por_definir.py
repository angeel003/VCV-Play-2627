import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """                // VISIBILIDAD AUTOMATICA 7 DIAS ANTES
                if (pCopy.timestamp && (pCopy.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000)) {
                    pCopy.visibilidad = "OCULTAR";
                } else if (pCopy.visibilidad !== "OCULTAR") {
                    pCopy.visibilidad = "MOSTRAR";
                }"""

new_logic = """                // VISIBILIDAD AUTOMATICA 7 DIAS ANTES
                if (!pCopy.timestamp || (pCopy.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000)) {
                    pCopy.visibilidad = "OCULTAR";
                } else if (pCopy.visibilidad !== "OCULTAR") {
                    pCopy.visibilidad = "MOSTRAR";
                }"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Por definir matches will now be hidden too.")
else:
    print("Could not find the old 7-day logic.")
