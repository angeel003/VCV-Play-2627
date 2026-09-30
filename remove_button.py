import os
import re

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Find the specific sync_permisos button
    # Looks like: <button type="button" class="..." onclick="...">Actualizar Permisos</button>
    old_text = text
    
    # We can search for the action sync_permisos or similar
    lines = text.splitlines()
    new_lines = []
    skip = False
    for line in lines:
        if 'sync_permisos' in line and '<button' in line:
            continue
        if 'Actualizar Permisos' in line and '<button' in line:
            continue
        if 'forzarCachePermisos' in line and '<button' in line:
            continue
        new_lines.append(line)
        
    text = '\n'.join(new_lines)
    
    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)

print("Removed Actualizar Permisos button from HTML.")
