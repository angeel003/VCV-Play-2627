import html

files = ['index.html', 'dev.html']

def encode_dotnet_cp1252(text):
    # .NET reads Windows-1252 and creates a string.
    # We must convert that string back to the original UTF-8 bytes.
    # For valid cp1252 chars, we use cp1252.
    # For chars like \x8d, \x81, \x8f, \x90, \x9d which are undefined in cp1252 but .NET keeps as is, we map them directly.
    
    # Actually, we can just replace the decoded unicode chars with their cp1252 bytes.
    # And encode the string into bytes!
    
    res = bytearray()
    for char in text:
        try:
            # Try cp1252
            b = char.encode('cp1252')
            res.extend(b)
        except UnicodeEncodeError:
            # If it's one of the undefined control characters, or an emoji
            # Wait, if it's an emoji (e.g. 🥳), it was NOT double encoded. We can just use xmlcharrefreplace for those!
            o = ord(char)
            if o in [0x81, 0x8d, 0x8f, 0x90, 0x9d]:
                res.append(o)
            else:
                # Encode as xmlcharrefreplace
                res.extend(f'&#{o};'.encode('ascii'))
    return bytes(res)

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    encoded_bytes = encode_dotnet_cp1252(text)
    
    try:
        fixed_text = encoded_bytes.decode('utf-8')
    except UnicodeDecodeError as e:
        print(f"Error decoding {filename}: {e}")
        # Find the context
        idx = e.start
        print(f"Context: {encoded_bytes[max(0, idx-10):idx+10]}")
        continue
    
    fixed_text = html.unescape(fixed_text)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(fixed_text)

print("Files fixed via custom cp1252 decode!")
