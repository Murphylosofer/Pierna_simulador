// Convierte dist/index.html en el formato que pide el publicador de artifacts de Claude:
// solo el contenido (título, estilos y cuerpo), sin <!doctype>, <html>, <head> ni <body>.
const fs = require('node:fs');
const [, , salida = 'dist/artefacto.html'] = process.argv;
const html = fs.readFileSync('dist/index.html', 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>')).replace(/<meta charset[^>]*>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
// El script en línea del <head> debe ejecutarse después de que exista #app.
const scripts = [], resto = head.replace(/<script[\s\S]*?<\/script>/g, (m) => { scripts.push(m); return ''; });
fs.writeFileSync(salida, resto.trim() + '\n' + body.trim() + '\n' + scripts.join('\n') + '\n');
console.log(salida, (fs.statSync(salida).size / 1024).toFixed(0) + ' kB');
