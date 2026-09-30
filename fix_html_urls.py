import os

# Update dev.html to support vcvplay.com
with open('dev.html', 'r', encoding='utf-8') as f:
    dev_content = f.read()

dev_content = dev_content.replace(
    "window.location.hostname.includes('pages.dev')",
    "window.location.hostname.includes('pages.dev') || window.location.hostname.includes('vcvplay.com')"
)

with open('dev.html', 'w', encoding='utf-8') as f:
    f.write(dev_content)

# Update index.html to use Cloudflare API
with open('index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

import re
idx_content = re.sub(
    r'const scriptURL = "https://script\.google\.com[^"]+";',
    "const scriptURL = window.location.hostname.includes('pages.dev') || window.location.hostname.includes('vcvplay.com') ? '/api/vcv' : 'https://vcv-play-2627.pages.dev/api/vcv';",
    idx_content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(idx_content)

print("Files updated safely with Python and UTF-8 encoding.")
