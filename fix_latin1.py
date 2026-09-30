import html

files = ['index.html', 'dev.html']

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Encode with latin-1 to perfectly recover the original bytes for mojibake,
    # and replace non-latin-1 chars (like emojis that weren't double encoded) with XML entities
    encoded_bytes = text.encode('latin-1', errors='xmlcharrefreplace')
    
    try:
        fixed_text = encoded_bytes.decode('utf-8')
    except UnicodeDecodeError as e:
        print(f"Error decoding {filename}: {e}")
        continue
    
    fixed_text = html.unescape(fixed_text)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(fixed_text)

print("Files fixed via latin-1 decode!")
