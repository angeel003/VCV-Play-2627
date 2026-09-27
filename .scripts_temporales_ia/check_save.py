with open('script-v2/Código.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'action === "save"' in line or "action === 'save'" in line:
        for j in range(i, min(i+40, len(lines))):
            print(lines[j].strip())
        break
