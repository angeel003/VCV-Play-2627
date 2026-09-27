with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('let isPredicted = false;')
print(text[start:start+1000])
