with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('<div class="faq-content-v2">')
print(text[start:start+200])
