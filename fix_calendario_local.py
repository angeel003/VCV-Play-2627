import os
import re

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    old_filter = """    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        return esFuturo;
    });"""

    new_filter = """    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        let localPermitido = misEquipos.includes(p.equipo_local);
        return esFuturo && localPermitido;
    });"""

    text = text.replace(old_filter, new_filter)

    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)

print("Calendario filter updated.")
