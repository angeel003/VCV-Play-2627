import re

with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = r"const scriptURL = window\.location\.hostname.*?\/api\/vcv'\);"
new_logic = """const scriptURL = (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('vcvplay.com')) 
    ? '/api/vcv' 
    : 'https://vcv-play-2627.pages.dev/api/vcv';"""

text = re.sub(old_logic, new_logic, text, flags=re.DOTALL)

with open('dev.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print("Logic updated")
