import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_jornada = """        // Ronda abierta (jornada activa de Ajustes)
        const primerAbierto = partidos.find(p => p.estado === "ABIERTO");
        const rondaAbierta = primerAbierto ? primerAbierto.ronda_global : "1";"""

new_jornada = """        // Ronda abierta (jornada activa de Ajustes)
        let maxRonda = 1;
        for (const p of cartelera) {
            if (p.visibilidad === "MOSTRAR") {
                let r = parseInt(p.ronda_global);
                if (!isNaN(r) && r > maxRonda) maxRonda = r;
            }
        }
        const rondaAbierta = maxRonda.toString();"""

if old_jornada in text:
    text = text.replace(old_jornada, new_jornada)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Jornada fixed.")
else:
    print("Could not find old jornada block.")
