import os

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    old_logic = 'if(eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR") {'
    new_logic = 'if(eq.estado === "ABIERTO" && eq.visibilidad === "MOSTRAR" && eq.permitido) {'

    text = text.replace(old_logic, new_logic)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

print("Progress bar logic fixed.")
