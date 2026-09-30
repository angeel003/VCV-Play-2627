import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """                for (const lName in ligasMap) {
                    if (ligasMap[lName].includes(p.equipo_local)) {
                        userPointsInLiga[pr.Usuario][lName] = (userPointsInLiga[pr.Usuario][lName] || 0) + pts;
                    }
                }"""

new_logic = """                for (const lName in ligasMap) {
                    if (ligasMap[lName].includes(p.equipo_local) || ligasMap[lName].includes(p.rival)) {
                        userPointsInLiga[pr.Usuario][lName] = (userPointsInLiga[pr.Usuario][lName] || 0) + pts;
                    }
                }"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Fixed league points calculation for Away matches and Derbys.")
else:
    print("Could not find the points calculation logic.")
