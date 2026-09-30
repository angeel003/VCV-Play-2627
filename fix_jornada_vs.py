import os

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

old_html = """                                <div class="vs-divider-v2" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                                  <div>VS</div>
                                  ${btnStreaming}
                                </div>"""

new_html = """                                <div class="vs-divider-v2" style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                                  <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; background:var(--bg-general); padding:2px 8px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:-4px; white-space:nowrap;">J. ${eq.jornada_eq}</div>
                                  <div>VS</div>
                                  ${btnStreaming}
                                </div>"""

if old_html in text:
    text = text.replace(old_html, new_html)
    with open('index.html', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print("Added J.n above VS in index.html.")
else:
    print("Could not find the HTML snippet in index.html.")

with open('dev.html', 'r', encoding='utf-8') as f:
    text2 = f.read()
if old_html in text2:
    text2 = text2.replace(old_html, new_html)
    with open('dev.html', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text2)
    print("Added J.n above VS in dev.html.")
