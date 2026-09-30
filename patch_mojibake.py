import os
import re

fixes = {
    'Clasificaciǟ?oN': 'Clasificación',
    'CLASIFICACIǟ?oN': 'CLASIFICACIÓN',
    'Clasificaciǟn': 'Clasificación',
    'clasificaciǟn': 'clasificación',
    'querǟis': 'queréis',
    'puntuarǟn': 'puntuarán',
    'aparecerǟ': 'aparecerá',
    'valdrǟn': 'valdrán',
    "'Aprovecha": "¡Aprovecha",
    'podrǟs': 'podrás',
    'Sabas qu?': '¿Sabías qué?',
    'estadsticas histricas': 'estadísticas históricas',
    'posicin': 'posición',
    'rcord': 'récord',
    'En construccin!': '¡En construcción!',
    'construccin': 'construcción',
    'ms adelante': 'más adelante',
    'numrica': 'numérica',
    'Qu gano con esto?': '¿Qué gano con esto?',
    'ganars': 'ganarás',
    'lmite': 'límite',
    'ganaras': 'ganarías',
    'Estoy trabajando': '¡Estoy trabajando',
    '??</p>': '🥳</p>',
    'Clasificacin': 'Clasificación',
    'clasificacin': 'clasificación',
    'queris': 'queréis',
    'puntuarn': 'puntuarán',
    'aparecer': 'aparecerá',
    'valdrn': 'valdrán',
    'podrs': 'podrás',
    'Aprovecha': '¡Aprovecha',
    'Rubn': 'Rubén',
    'Fernndez': 'Fernández',
    'Ga': 'Gaë',
    '?ngel': 'Ángel',
    'Iigo': 'Iñigo',
    'San Jos': 'San José',
    'RubǸn': 'Rubén',
    'Fernǭndez': 'Fernández',
    'GaǮ': 'Gaë',
    'ngel': 'Ángel',
    'San JosǸ': 'San José',
    'ǭ': 'á',
    'Ǹ': 'é',
    'ǟ': 'í',
    '': 'ó',
    'Ǯ': 'ë',
    'Clasificació"N': 'Clasificación',
    'ClasificaciÃ³N': 'Clasificación',
    'ClasificaciÃ³n': 'Clasificación'
}

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for bad, good in fixes.items():
        content = content.replace(bad, good)
        
    # Extra generic fixes
    content = content.replace('Clasificaci\u01df\ufffd?oN', 'Clasificación')
    content = content.replace('Clasificaci\u01df\ufffdn', 'Clasificación')
    content = content.replace('clasificaci\u01df\ufffdn', 'clasificación')
    content = content.replace('\u01df\ufffd', 'á')
    content = content.replace('\ufffd', 'ó') # Be careful with this, might replace all unknown
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

print("Files patched.")
