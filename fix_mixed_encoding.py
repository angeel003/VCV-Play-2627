import re

files = ['index.html', 'dev.html']

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # We will encode to windows-1252 using 'backslashreplace'
    # This turns '“' into '\\u201c', while 'Ã³' becomes b'\xc3\xb3'
    # Wait, 'backslashreplace' for ENCODE produces bytes like b'\\u201c' (which is literally the bytes '\', 'u', '2', etc.)
    
    # Let's do it safely:
    # 1. Replace known un-encodable characters with safe placeholders
    placeholders = {
        '“': '__LEFT_QUOTE__',
        '”': '__RIGHT_QUOTE__',
        '✅': '__CHECK__', # Wait, if ✅ is NOT double encoded, it will be replaced here. But if it IS double encoded, it's 'âœ…' which IS encodable!
        '🥳': '__PARTY__',
    }
    
    # Wait, instead of placeholders, we can just find all continuous sequences of characters that CAN be encoded to windows-1252,
    # and decode them as utf-8. But wait! Pure ASCII characters CAN be encoded to windows-1252!
    # If we decode pure ASCII as utf-8, it remains identical!
    # Let's just encode EVERYTHING to windows-1252 with 'surrogateescape' or 'xmlcharrefreplace'.
    
    encoded_bytes = text.encode('windows-1252', errors='xmlcharrefreplace')
    
    try:
        fixed_text = encoded_bytes.decode('utf-8')
    except UnicodeDecodeError as e:
        print(f"Error decoding {filename}: {e}")
        continue
    
    # Restore the xml char refs
    import html
    fixed_text = html.unescape(fixed_text)
    
    # We must also handle the previous patch where we replaced 'Clasificaci\xc3\xb3n' with 'Clasificaci\xc3\xb3n'.
    # Because if we double-encoded 'Clasificaci\xc3\xb3n' in `patch_mojibake.py`, it might be ruined.
    # Fortunately, I ran `git reset --hard HEAD` so `index.html` is exactly `71b0e9b`.
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(fixed_text)

print("Files fixed via XML charref replace!")
