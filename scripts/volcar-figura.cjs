// Vuelca la figura isométrica en varias poses a páginas estáticas, para la auditoría de líneas de la skill "anatomy".
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
(async () => {
  const dir = process.argv[2] || 'capturas/figura';
  fs.mkdirSync(dir, { recursive: true });
  const servidor = spawn('npx', ['vite', 'preview', '--port', '4176', '--strictPort'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch('http://localhost:4176/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
    await p.goto('http://localhost:4176/#mecanismo', { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const poses = [[0, 45], [45, 45], [90, 60], [135, 45], [20, 120], [110, 135], [60, 90]];
    for (const [theta, azimut] of poses) {
      const html = await p.evaluate(({ theta, azimut }) => {
        window.__iso({ theta, azimut, resaltada: null, color: 'normal' });
        const css = [...document.querySelectorAll('#sec-mecanismo style')].map((s) => s.textContent).join('\n');
        return `<!doctype html><meta charset="utf-8"><style>${css} body{margin:20px;background:#fafaf8}</style><div style="width:700px">${document.querySelector('#sec-mecanismo .iso').outerHTML}</div>`;
      }, { theta, azimut });
      fs.writeFileSync(`${dir}/pose-${theta}-${azimut}.html`, html);
    }
    await b.close();
  } finally { servidor.kill(); }
})();
