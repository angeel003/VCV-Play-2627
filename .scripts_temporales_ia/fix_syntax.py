import re

with open('dev.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the syntax error in guardarResultadoAdmin
bad_code = """    .catch(err => {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        mostrarToast("Error de conexión");
    });
})
    .finally(() => { 
        btn.disabled = false; 
        btn.innerText = "💾 Guardar Todo"; 
    });"""

fixed_code = """    .catch(err => {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        mostrarToast("Error de conexión");
    });"""

if bad_code in text:
    text = text.replace(bad_code, fixed_code)
else:
    # try another way
    bad_code2 = """    .catch(err => {
        btn.disabled = false; btn.innerText = "Guardar Cambios";
        mostrarToast("Error de conexión");
    });
})
    .finally(() => { 
        btn.disabled = false; 
        btn.innerText = "💾 Guardar Todo"; 
    });
}"""
    if bad_code2 in text:
        text = text.replace(bad_code2, fixed_code + "\n}")

with open('dev.html', 'w', encoding='utf-8') as f:
    f.write(text)
