import os

new_progress = """window.updateProgressBar = function() {
        if(!window.appData) return;
        let totalOpen = 0;
        let predictedOpen = 0;
        if(window.appData.equipos) {
            window.appData.equipos.forEach(eq => {
                if(eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR" && eq.permitido) {
                    totalOpen++;
                    let savedVal = (window.appData.predicciones_usuario && window.appData.predicciones_usuario[eq.id_partido]) ? window.appData.predicciones_usuario[eq.id_partido] : null;
                    let hasSaved = (savedVal && savedVal.sets);
                    
                    let elSet = document.getElementById(`e${eq.id_partido}_sets`);
                    let hasInput = elSet && elSet.value.trim() !== "";
                    
                    if(hasSaved || hasInput) predictedOpen++;
                }
            });
        }
        let porcentaje = totalOpen > 0 ? Math.round((predictedOpen / totalOpen) * 100) : 100;
        let bar = document.getElementById('user-progress-bar');
        let lbl = document.getElementById('user-progress-label');
        if(bar) bar.style.width = porcentaje + '%';
        if(lbl) lbl.innerText = porcentaje + '% Listo';
    };"""

import re
for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    text = re.sub(r'window\.updateProgressBar = function\(\) \{.*?    \};', new_progress, text, flags=re.DOTALL)
    
    # Add event listeners after rendering
    old_render = "updateProgressBar();\n        } else {"
    new_render = """updateProgressBar();
            
            data.equipos.forEach(eq => {
                let elSet = document.getElementById(`e${eq.id_partido}_sets`);
                if (elSet) elSet.addEventListener('input', updateProgressBar);
            });
        } else {"""
    text = text.replace(old_render, new_render)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

print("Progress bar rewritten with live input support!")
