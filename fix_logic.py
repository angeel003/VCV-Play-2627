import os
import re

# 1. Update index.html and dev.html
for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Progress bar fix
    text = text.replace('if(eq.estado !== "CERRADO") {', 'if(eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR") {')
    
    # Admin Panel fix
    old_admin = "if (now - ts < 48 * 60 * 60 * 1000) {"
    new_admin = """let isAvailable = eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR";
        let endedRecently = (eq.estado === "FINALIZADO" || eq.estado === "BLOQUEADO") && (now - (eq.timestamp_bloqueo || ts)) < 48 * 60 * 60 * 1000;
        if (isAvailable || endedRecently) {"""
    text = text.replace(old_admin, new_admin)
    
    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)

# 2. Update vcv.js for 7 days logic
with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    vcv_text = f.read()

old_vcv = """                const pCopy = { ...p };
                pCopy.permitido = true;"""
new_vcv = """                const pCopy = { ...p };
                pCopy.permitido = true;
                
                // VISIBILIDAD AUTOMATICA 7 DIAS ANTES
                if (pCopy.visibilidad !== "OCULTAR" && pCopy.timestamp && (pCopy.timestamp - Date.now() <= 7 * 24 * 60 * 60 * 1000)) {
                    pCopy.visibilidad = "MOSTRAR";
                }"""
vcv_text = vcv_text.replace(old_vcv, new_vcv)

with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(vcv_text)

print("All fixes applied.")
