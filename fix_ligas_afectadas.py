import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """                if (ligasMap[lName].includes(p.equipo_local)) ligasEq.push(lName);"""

new_logic = """                if (ligasMap[lName].includes(p.equipo_local) || ligasMap[lName].includes(p.rival)) ligasEq.push(lName);"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Fixed ligas_afectadas calculation for Away matches and Derbys.")
else:
    print("Could not find the ligas_afectadas calculation logic.")
