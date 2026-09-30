import os

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    old_logic = """    let equiposSet = new Set();
    futuros.forEach(p => {
        equiposSet.add(p.equipo_local);
        equiposSet.add(p.rival);
    });"""

    new_logic = """    let equiposSet = new Set();
    futuros.forEach(p => {
        if (p.equipo_local) equiposSet.add(p.equipo_local);
    });"""

    if old_logic in text:
        text = text.replace(old_logic, new_logic)
        with open(filename, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print(f"Updated {filename}")
    else:
        print(f"Could not find old logic in {filename}")
