// Después de compilar: deja la página como dist/index.html y la copia a index.html en la raíz,
// que es lo que GitHub Pages sirve cuando publica directamente desde la rama.
const fs = require('node:fs');
fs.renameSync('dist/app.html', 'dist/index.html');
fs.copyFileSync('dist/index.html', 'index.html');
console.log('index.html actualizado:', (fs.statSync('index.html').size / 1024).toFixed(0) + ' kB');
