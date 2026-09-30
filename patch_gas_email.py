import os

with open('script-v2/Código.js', 'r', encoding='utf-8') as f:
    text = f.read()

email_logic_post = """
  } else if (action === "save_email") {
    var email = req.email || "";
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Usuarios");
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var colUser = headers.indexOf("Usuario");
    var colPass = headers.indexOf("Password");
    var colCorreo = headers.indexOf("Correo");
    
    if (colCorreo === -1) {
      colCorreo = headers.length;
      sh.getRange(1, colCorreo + 1).setValue("Correo");
    }
    
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][colUser] == req.usuario && data[i][colPass] == req.password) {
        sh.getRange(i + 1, colCorreo + 1).setValue(email);
        found = true;
        break;
      }
    }
    if (found) return resSuccess("Correo guardado con éxito.");
    else return resError("Credenciales incorrectas.");
"""

text = text.replace('} else if (action === "change_password") {', email_logic_post + '} else if (action === "change_password") {')

# Find where it returns `nombre_real: userRow[colNombreReal] || userRow[colUser],` and add correo
text = text.replace('nombre_real: userRow[colNombreReal] || userRow[colUser],', 'nombre_real: userRow[colNombreReal] || userRow[colUser],\n      correo: (colCorreo !== -1 && userRow[colCorreo]) ? userRow[colCorreo] : "",')

# In login function, I need to make sure `colCorreo` is defined.
# I can just look for `var colNombreReal = headers.indexOf("Nombre Real");` and add `var colCorreo = headers.indexOf("Correo");`
text = text.replace('var colNombreReal = headers.indexOf("Nombre Real");', 'var colNombreReal = headers.indexOf("Nombre Real");\n  var colCorreo = headers.indexOf("Correo");')

with open('script-v2/Código.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Código.js patched.")
