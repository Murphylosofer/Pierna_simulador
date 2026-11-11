// Revisión visual antes de cada commit (CLAUDE.md): PC 1440x900 y teléfono 390x844.
// Uso: npm run build && npm run revisar   → capturas en capturas/
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const URL = 'http://localhost:4173/';
const VISTAS = [
  { nombre: 'pc', width: 1440, height: 900 },
  { nombre: 'telefono', width: 390, height: 844, isMobile: true, hasTouch: true },
];

(async () => {
  const servidor = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  let fallo = false;
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(URL)).ok) break; } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    fs.mkdirSync('capturas', { recursive: true });
    const navegador = await chromium.launch();
    for (const { nombre, width, height, ...resto } of VISTAS) {
      const pagina = await navegador.newPage({ viewport: { width, height }, ...resto });
      const errores = [];
      pagina.on('pageerror', (e) => errores.push(e.message));
      pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
      await pagina.goto(URL, { waitUntil: 'networkidle' });
      const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      await pagina.screenshot({ path: `capturas/${nombre}.png` });
      if (desborde) errores.push('desborde horizontal');
      console.log(`${nombre} ${width}x${height}: ${errores.length ? 'ERRORES → ' + errores.join(' | ') : 'sin errores'}`);
      fallo ||= errores.length > 0;
      await pagina.close();
    }
    await navegador.close();
  } finally {
    servidor.kill();
  }
  process.exit(fallo ? 1 : 0);
})();
