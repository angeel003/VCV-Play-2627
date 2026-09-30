import os

files = ['index.html']
gas_url = 'const scriptURL = "https://script.google.com/macros/s/AKfycbyw9L6Te3q2ibdRBaaAwaiPpEPWLbsNdb8JA9yO272DBHgxaZA2l3TLkH9ofAXlQiWfAg/exec";'

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Replace the Cloudflare URL with the Google Apps Script URL
    import re
    text = re.sub(r"const scriptURL = window.location.hostname.*?/api/vcv';", gas_url, text)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

print("Restored Google Apps Script URL.")
