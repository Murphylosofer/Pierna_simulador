// Revisa interferencias entre piezas de cuerpos distintos en todo el rango de flexión.
// Cada cuerpo es un prisma convexo: dos chocan si se traslapan en la dirección lateral y sus
// polígonos del plano sagital se enciman (teorema del eje separador).
import { construirPiezas } from './piezas.js';
import { rot, sum } from './mat.js';

let base = null;
const datos = () => (base ||= construirPiezas());

const ext = (c) => { const us = c.contorno.map((p) => p[0]), vs = c.contorno.map((p) => p[1]); return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]; };
const proy = (pts, n) => { let a = Infinity, b = -Infinity; for (const p of pts) { const d = p[0] * n[0] + p[1] * n[1]; a = Math.min(a, d); b = Math.max(b, d); } return [a, b]; };
function penetra(A, B) {
  let min = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], n = [q[1] - p[1], p[0] - q[0]], L = Math.hypot(...n) || 1;
    n[0] /= L; n[1] /= L;
    const [a0, a1] = proy(A, n), [b0, b1] = proy(B, n), o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0;
    min = Math.min(min, o);
  }
  return min;
}

// Choques en un ángulo: lista de { a, b, ids, p } (p = penetración en mm, en el plano lateral).
function choquesEn(piezas, mec, g, tolerancia) {
  const s = mec.resolver(g);
  const M = { muslo: s.muslo, pierna: { ang: 0, t: [0, 0] }, c1: { ang: s.phi1, t: s.D }, c2: { ang: s.phi2, t: s.C } };
  const cuerpos = piezas.flatMap((pz) => pz.cuerpos.filter((c) => !c.isla).map((c) => {
    const e = ext(c), m = M[pz.cuerpo];
    const poli = (c.eje === 'z' ? c.contorno.map(([u, v]) => [u, v]) : [[e[0], c.a0], [e[1], c.a0], [e[1], c.a1], [e[0], c.a1]]).map((p) => sum(rot(p, m.ang), m.t));
    return { nombre: c.tope ? 'Tope escondido' : pz.nombre, id: pz.id, tope: !!c.tope, cuerpo: pz.cuerpo, conecta: pz.conecta || [pz.cuerpo], poli, z: c.eje === 'z' ? [c.a0, c.a1] : [e[2], e[3]] };
  }));
  const out = [];
  for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
    const a = cuerpos[i], b = cuerpos[j];
    if (a.conecta.includes(b.cuerpo) || b.conecta.includes(a.cuerpo) || Math.min(a.z[1], b.z[1]) - Math.max(a.z[0], b.z[0]) <= 0.01) continue;
    const p = penetra(a.poli, b.poli);
    if (p > tolerancia) out.push({ a, b, p });
  }
  return out;
}

let cacheLimites = null;
/**
 * Primer ángulo de flexión en que algo choca (paso de 0.1°) y qué piezas. Con los STL tal cual, el eslabón
 * diagonal pega primero con el eje de 70 mm del punto B y después con la placa del AFS1.
 */
export function limitesChoque(hasta = 140) {
  if (cacheLimites) return cacheLimites;
  const { piezas, mec } = datos();
  const primeros = {};
  for (let g = 0.1; g <= hasta + 1e-9; g += 0.1) {
    for (const c of choquesEn(piezas, mec, g, 0.01)) {
      const k = `${c.a.nombre} × ${c.b.nombre}`;
      if (!primeros[k]) primeros[k] = { desde: Math.round(g * 10) / 10, ids: [c.a.id, c.b.id], tope: c.a.tope || c.b.tope };
    }
  }
  const lista = Object.entries(primeros).map(([par, v]) => ({ par, ...v })).sort((x, y) => x.desde - y.desde);
  return (cacheLimites = { lista, flexionLibre: lista.length ? lista[0].desde : hasta, primero: lista[0] || null });
}

// Piezas que chocan en un ángulo dado (para pintarlas en rojo en la vista 3D).
export function piezasEnChoque(g) {
  const { piezas, mec } = datos();
  const ids = new Set();
  for (const c of choquesEn(piezas, mec, g, 0.05)) { ids.add(c.a.id); ids.add(c.b.id); }
  return ids;
}

export function revisarInterferencias(hasta = 135, tolerancia = 0.3) {
  const { piezas, mec } = construirPiezas();
  const res = {};
  for (let g = 0; g <= hasta; g += 1) {
    for (const { a, b, p } of choquesEn(piezas, mec, g, tolerancia)) {
      const k = `${a.nombre} × ${b.nombre}`; (res[k] ||= { desde: g, hasta: g, max: 0, tope: a.tope || b.tope }); res[k].hasta = g; res[k].max = Math.max(res[k].max, p);
    }
  }
  return res;
}
