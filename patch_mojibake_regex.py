import re

files = ['index.html', 'dev.html']

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Base replacements
    replacements = [
        (r'Clasificaci.*?n', 'Clasificación', re.IGNORECASE),
        (r'Clasificaci.*?N', 'CLASIFICACIÓN', re.IGNORECASE),
        (r'quer.*?is', 'queréis', re.IGNORECASE),
        (r'puntuar.*?n\b', 'puntuarán', re.IGNORECASE),
        (r'aparecer.*?\b', 'aparecerá', re.IGNORECASE),
        (r'valdr.*?n\b', 'valdrán', re.IGNORECASE),
        (r'\?Aprovecha', '¡Aprovecha', 0),
        (r'podr.*?s\b', 'podrás', re.IGNORECASE),
        (r'Sab.*?as qu\?', '¿Sabías qué?', 0),
        (r'estad.*?sticas hist.*?ricas', 'estadísticas históricas', re.IGNORECASE),
        (r'posici.*?n\b', 'posición', re.IGNORECASE),
        (r'r.*?cord\b', 'récord', re.IGNORECASE),
        (r'En construcci.*?n!', '¡En construcción!', 0),
        (r'construcci.*?n', 'construcción', re.IGNORECASE),
        (r'm.*?s adelante', 'más adelante', re.IGNORECASE),
        (r'num.*?rica\b', 'numérica', re.IGNORECASE),
        (r'Qu.*? gano con esto\?', '¿Qué gano con esto?', 0),
        (r'ganar.*?s\b', 'ganarás', re.IGNORECASE),
        (r'l.*?mite\b', 'límite', re.IGNORECASE),
        (r'ganar.*?as\b', 'ganarías', re.IGNORECASE),
        (r'Estoy trabajando', '¡Estoy trabajando', 0),
        (r'Rub.*?n Fern.*?ndez', 'Rubén Fernández', 0),
        (r'Ga.*?\b', 'Gaë', 0),
        (r'\?ngel', 'Ángel', 0),
        (r'I.*?igo\b', 'Iñigo', 0),
        (r'San Jos.*?\b', 'San José', 0)
    ]
    
    for pattern, rep, flags in replacements:
        content = re.sub(pattern, rep, content, flags=flags)
        
    content = content.replace('¿Sabías qué?ías qu¿Sabías qué?', '¿Sabías qué?')
    content = content.replace('Clasificaciónón', 'Clasificación')
    content = content.replace('TABLA Clasificación', 'TABLA CLASIFICACIÓN')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("Regex patch complete.")
