import os

with open('functions/api/vcv.js', 'r', encoding='utf-8') as f:
    text = f.read()

parse_logic = """        // PARSE FECHA 'DD/MM/YYYY HH:MM' TO TIMESTAMP
        let ts = r.timestamp || 0;
        if (!ts && r.Fecha) {
            const parts = r.Fecha.trim().split(' ');
            if (parts.length >= 1) {
                const dateParts = parts[0].split('/');
                if (dateParts.length === 3) {
                    const day = parseInt(dateParts[0], 10);
                    const month = parseInt(dateParts[1], 10) - 1;
                    const year = parseInt(dateParts[2], 10);
                    let hour = 0, minute = 0;
                    if (parts.length > 1) {
                        const timeParts = parts[1].split(':');
                        if (timeParts.length >= 2) {
                            hour = parseInt(timeParts[0], 10);
                            minute = parseInt(timeParts[1], 10);
                        }
                    }
                    ts = new Date(year, month, day, hour, minute).getTime();
                }
            }
        }

        return {
            id_partido: idPart,
            ronda_global: r.Ronda_Global || "1",
            equipo_local: r.Equipo_Local || "",
            rival: r.Rival || "",
            jornada_eq: r.Jornada_Eq || "1",
            timestamp: ts,"""

old_block = """        return {
            id_partido: idPart,
            ronda_global: r.Ronda_Global || "1",
            equipo_local: r.Equipo_Local || "",
            rival: r.Rival || "",
            jornada_eq: r.Jornada_Eq || "1",
            timestamp: r.timestamp || 0,"""

if old_block in text:
    text = text.replace(old_block, parse_logic)
    with open('functions/api/vcv.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('timestamp parse logic fixed.')
else:
    print('old block not found')
