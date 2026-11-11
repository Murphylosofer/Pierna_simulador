// Revisión visual antes de cada commit (CLAUDE.md): PC 1440x900 y teléfono 390x844.
// Uso: npm run build && npm run revisar [-- pestaña ...]   → capturas en capturas/
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const URL = 'http://localhost:4173/';
const PESTANAS = process.argv.slice(2).length ? process.argv.slice(2) : ['simulacion', 'mecanismo', 'diagramas', 'planos', 'normas', 'supuestos'];
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
    const navegador = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    for (const { nombre, width, height, ...resto } of VISTAS) {
      const pagina = await navegador.newPage({ viewport: { width, height }, ...resto });
      const errores = [];
      pagina.on('pageerror', (e) => errores.push(e.message));
      pagina.on('console', (m) => m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text()) && errores.push(m.text()));
      for (const p of PESTANAS) {
        await pagina.goto(URL + '#' + p, { waitUntil: 'load' });
        await pagina.reload({ waitUntil: 'load' });
        await pagina.waitForTimeout(1500);
        const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        await pagina.screenshot({ path: `capturas/${nombre}-${p}.png`, fullPage: process.env.COMPLETA === '1' });
        if (desborde) errores.push(`desborde horizontal en ${p}`);
      }
      console.log(`${nombre} ${width}x${height}: ${errores.length ? 'ERRORES → ' + [...new Set(errores)].join(' | ') : 'sin errores'}`);
      fallo ||= errores.length > 0;
      await pagina.close();
    }
    await navegador.close();
  } finally {
    servidor.kill();
  }
  process.exit(fallo ? 1 : 0);
})();
