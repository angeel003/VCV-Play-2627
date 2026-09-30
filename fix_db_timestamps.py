import json
import subprocess
import datetime
import re

# Get all from Ajustes
cmd = 'npx wrangler d1 execute vcv_database --remote --command="SELECT ID_Partido, Fecha, Visibilidad FROM Ajustes" --json'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

try:
    data = json.loads(result.stdout)
    rows = data[0]['results']
except Exception as e:
    print("Error parsing JSON:", e)
    print("Stdout:", result.stdout)
    exit(1)

sql_statements = []
now = datetime.datetime.now().timestamp() * 1000

for row in rows:
    id_part = row['ID_Partido']
    fecha = row['Fecha']
    vis = row['Visibilidad']
    
    ts = None
    if fecha and fecha != 'Por definir' and ' ' in fecha:
        try:
            date_str, time_str = fecha.split(' ')
            d, m, y = date_str.split('/')
            h, min = time_str.split(':')
            dt = datetime.datetime(int(y), int(m), int(d), int(h), int(min))
            ts = int(dt.timestamp() * 1000)
        except:
            pass
            
    if ts:
        sql_statements.append(f"UPDATE Ajustes SET timestamp = {ts} WHERE ID_Partido = '{id_part}';")
        if (ts - now > 7 * 24 * 60 * 60 * 1000) and vis == 'MOSTRAR':
            sql_statements.append(f"UPDATE Ajustes SET Visibilidad = 'OCULTAR' WHERE ID_Partido = '{id_part}';")
    else:
        # Por definir -> Ocultar
        if vis == 'MOSTRAR':
            sql_statements.append(f"UPDATE Ajustes SET Visibilidad = 'OCULTAR' WHERE ID_Partido = '{id_part}';")

with open('update_timestamps.sql', 'w', encoding='utf-8') as f:
    for sql in sql_statements:
        f.write(sql + '\n')

print(f"Generated {len(sql_statements)} statements.")
