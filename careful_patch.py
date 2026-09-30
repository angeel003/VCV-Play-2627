import os

files = ['index.html', 'dev.html']

fixes = {
    'Clasificaci\ufffdn': 'Clasificación',
    'Clasificaci\ufffdN': 'CLASIFICACIÓN',
    'quer\ufffdis': 'queréis',
    'puntuar\ufffdn': 'puntuarán',
    'aparecer\ufffd ': 'aparecerá ',
    'valdr\ufffdn': 'valdrán',
    '\ufffdAprovecha': '¡Aprovecha',
    'podr\ufffds': 'podrás',
    'Sab\ufffdas qu\ufffd': '¿Sabías qué?',
    'estad\ufffdsticas hist\ufffdricas': 'estadísticas históricas',
    'posici\ufffdn': 'posición',
    'r\ufffdcord': 'récord',
    'En construcci\ufffdn!': '¡En construcción!',
    'construcci\ufffdn': 'construcción',
    'm\ufffds adelante': 'más adelante',
    'num\ufffdrica': 'numérica',
    'Qu\ufffd gano con esto': '¿Qué gano con esto',
    'ganar\ufffds': 'ganarás',
    'l\ufffdmite': 'límite',
    'ganar\ufffdas': 'ganarías',
    '\ufffdEstoy trabajando': '¡Estoy trabajando',
    '??</p>': '🥳</p>',
    'Rub\ufffdn': 'Rubén',
    'Fern\ufffdndez': 'Fernández',
    'Ga\ufffd': 'Gaë',
    '\ufffdngel': 'Ángel',
    'I\ufffdigo': 'Iñigo',
    'San Jos\ufffd': 'San José'
}

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    for bad, good in fixes.items():
        content = content.replace(bad, good)
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacement complete.")
