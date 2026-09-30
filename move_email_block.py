import re

for filename in ['dev.html', 'index.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Extract the block
    m = re.search(r'(\s*<div style="background: var\(--bg-general\); border: 1px solid var\(--border-color\); border-radius: 8px; padding: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba\(0,0,0,0\.05\);">\s*<h3.*?Recuperaci.n de Cuenta.*?</form>\s*</div>)', text, re.DOTALL)
    
    if m:
        block = m.group(1)
        # Remove it from its current location
        text = text.replace(block, '')
        
        # Insert it after msgChangePwd
        anchor = '<div id="msgChangePwd" class="alert-box mt-2" style="padding:10px; display:none; margin-top:10px;"></div>\n      </div>'
        text = text.replace(anchor, anchor + '\n' + block)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Moved block in {filename}")
    else:
        print(f"Could not find block in {filename}")
