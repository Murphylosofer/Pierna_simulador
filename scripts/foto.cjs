// Captura puntual: node scripts/foto.cjs <salida.png> <ancho> <alto> "<js a evaluar>" [#pestaña]
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
(async () => {
  const [, , salida, w = '1440', h = '900', js = '', hash = ''] = process.argv;
  const servidor = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch('http://localhost:4174/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
    const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const p = await b.newPage({ viewport: { width: +w, height: +h }, isMobile: +w < 600, hasTouch: +w < 600 });
    p.on('pageerror', (e) => console.log('ERROR', e.message));
    p.on('console', (m) => m.type() === 'error' && !/ERR_|Failed to load/.test(m.text()) && console.log('consola', m.text()));
    await p.goto('http://localhost:4174/' + hash, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log(JSON.stringify(r)); }
    await p.waitForTimeout(700);
    await p.screenshot({ path: salida, fullPage: process.env.COMPLETA === '1' });
    await b.close();
  } finally { servidor.kill(); }
})();
