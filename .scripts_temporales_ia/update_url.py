def update_script_url(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    old_url = 'const scriptURL = "https://script.google.com/macros/s/AKfycbyw9L6Te3q2ibdRBaaAwaiPpEPWLbsNdb8JA9yO272DBHgxaZA2l3TLkH9ofAXlQiWfAg/exec";'
    new_url = 'const scriptURL = "https://script.google.com/macros/s/AKfycbypusqyphzLfam-6xra5BCVAFXqGxOA-RMjVuZOAJyp4OQ5CCR_xZs-dT5tIy4EcZIEKQ/exec";'

    if old_url in text:
        text = text.replace(old_url, new_url)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(text)
        print("Updated scriptURL!")
    else:
        print("Could not find old scriptURL")

update_script_url('dev.html')
