with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('class="inputs-eq"')
print(text[start-100:start+2500])
