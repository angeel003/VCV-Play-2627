with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()
    
start = text.find('RESULTADO OFICIAL</div><div style="font-size: 1.25rem;')
print(text[start+150:start+1200])
