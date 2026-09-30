import os

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
        
    old_filter = """    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = (p.timestamp && p.timestamp > ahora) || (!p.oficial_sets);
        let meToca = misEquipos.includes(p.equipo_local) || misEquipos.includes(p.rival);
        return esFuturo && meToca;
    });"""
    
    new_filter = """    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        return esFuturo;
    });"""
    
    text = text.replace(old_filter, new_filter)
    
    text = text.replace('<option value="">-- Todos mis equipos --</option>', '<option value="">-- Todos los equipos --</option>')
    
    old_set = """    futuros.forEach(p => {
        if(misEquipos.includes(p.equipo_local)) equiposSet.add(p.equipo_local);
        if(misEquipos.includes(p.rival)) equiposSet.add(p.rival);
    });"""
    
    new_set = """    futuros.forEach(p => {
        equiposSet.add(p.equipo_local);
        equiposSet.add(p.rival);
    });"""
    
    text = text.replace(old_set, new_set)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

print('Calendario logic updated!')
