const fs = require('fs');
const path = require('path');

console.log('--- Construyendo VCV Play Modular ---');

// Archivos de scripts en orden de inclusión
const scriptFiles = [
  'src/legacy_script_0.js',
  'src/legacy_script_1.js',
  'src/legacy_script_2.js',
  'src/legacy_script_3.js',
  'src/legacy_script_4.js'
];

let bundleJs = scriptFiles.map(f => {
  const code = fs.readFileSync(f, 'utf8');
  return '// === FILE: ' + f + ' ===\n' + code;
}).join('\n;\n');

// Validar sintaxis del bundle JS
try {
  new Function(bundleJs);
  console.log('✅ Sintaxis JS verificada con éxito (' + bundleJs.length + ' bytes)');
} catch(e) {
  console.error('❌ Error de sintaxis en el bundle JS:', e);
  process.exit(1);
}

// Cargar plantilla HTML
let templateHtml = fs.readFileSync('src/template.html', 'utf8');

// Insertar el bloque de script antes del cierre de </body>
const insertionTag = '</body>';
const fullHtml = templateHtml.replace(insertionTag, '<script>\n' + bundleJs + '\n</script>\n' + insertionTag);

// Escribir a dev.html e index.html
fs.writeFileSync('dev.html', fullHtml, 'utf8');
fs.writeFileSync('index.html', fullHtml, 'utf8');
console.log('✅ dev.html e index.html generados y sincronizados correctamente');
