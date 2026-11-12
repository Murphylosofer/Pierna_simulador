// Revisa interferencias entre piezas de cuerpos distintos en todo el rango de flexión (prismas convexos).
import { construirPiezas } from '../src/piezas.js';
import { rot, sum } from '../src/mat.js';
export function revisar() { const { piezas, mec } = construirPiezas();
const ext = (c) => { const us = c.contorno.map((p) => p[0]), vs = c.contorno.map((p) => p[1]); return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]; };
const proy = (pts, n) => { let a = Infinity, b = -Infinity; for (const p of pts) { const d = p[0] * n[0] + p[1] * n[1]; a = Math.min(a, d); b = Math.max(b, d); } return [a, b]; };
function penetra(A, B) { // SAT: devuelve la penetración mínima (>0 si chocan)
  let min = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], n = [q[1] - p[1], p[0] - q[0]], L = Math.hypot(...n) || 1; n[0] /= L; n[1] /= L;
    const [a0, a1] = proy(A, n), [b0, b1] = proy(B, n); const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0; min = Math.min(min, o);
  } return min;
}
const res = {};
for (let g = 0; g <= 135; g += 1) {
  const s = mec.resolver(g);
  const M = { muslo: s.muslo, pierna: { ang: 0, t: [0, 0] }, c1: { ang: s.phi1, t: s.D }, c2: { ang: s.phi2, t: s.C } };
  const cuerpos = piezas.flatMap((pz) => pz.cuerpos.map((c, ci) => { const e = ext(c), m = M[pz.cuerpo];
    const poli = (c.eje === 'z' ? c.contorno.map(([u, v]) => [u, v]) : [[e[0], c.a0], [e[1], c.a0], [e[1], c.a1], [e[0], c.a1]]).map((p) => sum(rot(p, m.ang), m.t));
    const z = c.eje === 'z' ? [c.a0, c.a1] : [e[2], e[3]]; return { id: pz.id + (pz.cuerpos.length > 1 ? '#' + ci : ''), cuerpo: pz.cuerpo, poli, z }; }));
  for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
    const a = cuerpos[i], b = cuerpos[j]; if (a.cuerpo === b.cuerpo) continue;
    if (Math.min(a.z[1], b.z[1]) - Math.max(a.z[0], b.z[0]) <= 0.01) continue;
    const p = penetra(a.poli, b.poli); if (p > 0.3) { const k = a.id + ' × ' + b.id; (res[k] ||= { desde: g, hasta: g, max: 0 }); res[k].hasta = g; res[k].max = Math.max(res[k].max, p); }
  }
}
return res; }
if ((process.argv[1] || "").endsWith("interferencias.mjs")) { const r = revisar(); console.log(Object.keys(r).length ? r : "Sin interferencias entre piezas de 0° a 135°"); }
