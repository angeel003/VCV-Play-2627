import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """        for (const p of partidos) {
            const esLoc = misPermisos[p.equipo_local] === true;
            const esRiv = misPermisos[p.rival] === true;

            if (esLoc || esRiv) {
                const pCopy = { ...p };
                pCopy.permitido = true;
                
                // VISIBILIDAD AUTOMATICA 7 DIAS ANTES
                if (!pCopy.timestamp || (pCopy.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000)) {
                    pCopy.visibilidad = "OCULTAR";
                } else if (pCopy.visibilidad !== "OCULTAR") {
                    pCopy.visibilidad = "MOSTRAR";
                }
                if (esLoc && esRiv) pCopy.es_derby = true;
                if (!idsEnCartelera[p.id_partido]) {
                    cartelera.push(pCopy);
                    idsEnCartelera[p.id_partido] = pCopy;
                } else if (esLoc && esRiv) {
                    idsEnCartelera[p.id_partido].es_derby = true;
                }
            }

            if (p.visibilidad !== "OCULTAR") {
                todosPartidos.push(p);
            }
        }"""

new_logic = """        for (const p of partidos) {
            // SI ESTÁ OCULTADO A MANO EN LA BD, IGNORAR POR COMPLETO
            if (p.visibilidad === "OCULTAR") continue;

            const esLoc = misPermisos[p.equipo_local] === true;
            const esRiv = misPermisos[p.rival] === true;

            // SOLO PROCESAR SI EL USUARIO TIENE PERMISO PARA ALGUNO DE LOS DOS EQUIPOS
            if (esLoc || esRiv) {
                const pCopy = { ...p };
                pCopy.permitido = true;
                if (esLoc && esRiv) pCopy.es_derby = true;

                // 1. Calendario: Entran todos los permitidos
                todosPartidos.push(pCopy);

                // 2. Cartelera: Solo los que están a <= 7 días o ya pasados
                const pCartelera = { ...pCopy };
                if (!pCartelera.timestamp || (pCartelera.timestamp - Date.now() > 7 * 24 * 60 * 60 * 1000)) {
                    pCartelera.visibilidad = "OCULTAR";
                } else {
                    pCartelera.visibilidad = "MOSTRAR";
                }

                if (pCartelera.visibilidad === "MOSTRAR") {
                    if (!idsEnCartelera[pCartelera.id_partido]) {
                        cartelera.push(pCartelera);
                        idsEnCartelera[pCartelera.id_partido] = pCartelera;
                    }
                }
            }
        }"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Fixed logic in vcv.js")
else:
    print("Could not find old logic in vcv.js")


for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    old_filter = """    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        let localPermitido = misEquipos.includes(p.equipo_local);
        return esFuturo && localPermitido;
    });"""

    new_filter = """    let futuros = window.appData.todos_partidos.filter(p => {
        let esFuturo = p.estado !== "FINALIZADO" && p.estado !== "CERRADO";
        return esFuturo;
    });"""

    if old_filter in text:
        text = text.replace(old_filter, new_filter)
        with open(filename, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print(f"Fixed logic in {filename}")
    else:
        print(f"Could not find old filter logic in {filename}")
