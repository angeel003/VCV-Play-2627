import re

new_url = 'https://dash.cloudflare.com/49df16c2f6224b401932bb3250eddb1d/workers/d1/databases/42b0ddfe-a3d7-49e1-b24f-84754af63215/metrics'

for filename in ['index.html', 'dev.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    
    text = re.sub(r'href="https://dash\.cloudflare\.com/[^"]*workers/d1/databases/[^"]*"', f'href="{new_url}"', text)
    
    with open(filename, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)

print('Database link corrected.')
