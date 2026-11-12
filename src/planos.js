// Planos paramétricos generados desde las mismas piezas de CONFIG (piezas.js).
// Cada hoja es una lista de primitivas en mm de hoja (A4 horizontal, y hacia abajo) que se vuelca a SVG, PDF o DXF.
// Planos de apoyo: los oficiales para el CNC salen de SolidWorks. Aquí no se genera código G.
import { CONFIG } from './config.js';
import { rot, sum, fmt } from './mat.js';
import { geometriaCuerpo } from './escena3d.js';
import { descargar, pdfDeHojas, dxfDe, stlDe } from './exportar.js';

const HOJA = { w: 297, h: 210, margen: 8 };
const ESCALAS = [[5, '5:1'], [2, '2:1'], [1, '1:1'], [0.5, '1:2'], [0.2, '1:5']];

// ---------- primitivas ----------
const ln = (x1, y1, x2, y2, capa = 'visible') => ({ t: 'l', x1, y1, x2, y2, capa });
const pl = (pts, capa = 'visible', cerrada = true) => ({ t: 'p', pts, capa, cerrada });
const ci = (cx, cy, r, capa = 'visible') => ({ t: 'c', cx, cy, r, capa });
const tx = (x, y, s, alto = 2.5, ancla = 'start', capa = 'texto', negrita = false) => ({ t: 't', x, y, s: String(s), alto, ancla, capa, negrita });
const num = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

// ---------- geometría de vistas en mm de pieza (y hacia arriba) ----------
const ext = (c) => {
  const us = c.contorno.map((p) => p[0]), vs = c.contorno.map((p) => p[1]);
  return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
};
function cajaPieza(pz) {
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const c of pz.cuerpos) {
    const e = ext(c);
    const [x0, x1] = [e.u0, e.u1];
    const [y0, y1] = c.eje === 'z' ? [e.v0, e.v1] : [c.a0, c.a1];
    const [z0, z1] = c.eje === 'z' ? [c.a0, c.a1] : [e.v0, e.v1];
    b.x0 = Math.min(b.x0, x0); b.x1 = Math.max(b.x1, x1); b.y0 = Math.min(b.y0, y0); b.y1 = Math.max(b.y1, y1); b.z0 = Math.min(b.z0, z0); b.z1 = Math.max(b.z1, z1);
  }
  return b;
}
const rectE = (a0, b0, a1, b1, capa = 'visible') => pl([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], capa);
const cruzEje = (x, y, r) => [ln(x - r * 1.4, y, x + r * 1.4, y, 'eje'), ln(x, y - r * 1.4, x, y + r * 1.4, 'eje')];

// Devuelve entidades por vista. F: (x, y) · S: (x, −z) con z hacia abajo en la hoja · L: (−z, y)
function vistasDe(pz) {
  const F = [], S = [], L = [];
  for (const c of pz.cuerpos) {
    const e = ext(c);
    if (c.eje === 'z') {
      F.push(pl(c.contorno.map(([u, v]) => [u, v])));
      S.push(rectE(e.u0, -c.a1, e.u1, -c.a0));
      L.push(rectE(-c.a1, e.v0, -c.a0, e.v1));
      for (const b of c.barrenos) {
        F.push(ci(b.u, b.v, b.d / 2), ...cruzEje(b.u, b.v, b.d / 2));
        S.push(ln(b.u - b.d / 2, -c.a1, b.u - b.d / 2, -c.a0, 'oculta'), ln(b.u + b.d / 2, -c.a1, b.u + b.d / 2, -c.a0, 'oculta'), ln(b.u, -c.a1 - 2, b.u, -c.a0 + 2, 'eje'));
        L.push(ln(-c.a1, b.v - b.d / 2, -c.a0, b.v - b.d / 2, 'oculta'), ln(-c.a1, b.v + b.d / 2, -c.a0, b.v + b.d / 2, 'oculta'), ln(-c.a1 - 2, b.v, -c.a0 + 2, b.v, 'eje'));
      }
    } else {
      S.push(pl(c.contorno.map(([u, v]) => [u, -v])));
      F.push(rectE(e.u0, c.a0, e.u1, c.a1));
      L.push(rectE(-e.v1, c.a0, -e.v0, c.a1));
      for (const b of c.barrenos) {
        S.push(ci(b.u, -b.v, b.d / 2), ...cruzEje(b.u, -b.v, b.d / 2));
        F.push(ln(b.u - b.d / 2, c.a0, b.u - b.d / 2, c.a1, 'oculta'), ln(b.u + b.d / 2, c.a0, b.u + b.d / 2, c.a1, 'oculta'), ln(b.u, c.a0 - 2, b.u, c.a1 + 2, 'eje'));
        L.push(ln(-b.v - b.d / 2, c.a0, -b.v - b.d / 2, c.a1, 'oculta'), ln(-b.v + b.d / 2, c.a0, -b.v + b.d / 2, c.a1, 'oculta'), ln(-b.v, c.a0 - 2, -b.v, c.a1 + 2, 'eje'));
      }
    }
  }
  return { F, S, L };
}

// Corte A–A por el barreno principal: rayado a 45° con el barreno sin rayar.
function corteDe(pz) {
  const principal = pz.cuerpos.flatMap((c) => c.barrenos.map((b) => ({ c, b }))).sort((p, q) => q.b.d - p.b.d)[0];
  if (!principal) return null;
  const ejeCorte = principal.c.eje, ents = [];
  const intervalo = (c, coord, enU) => { // corte del contorno con la recta u = coord (o v = coord)
    const xs = [];
    c.contorno.forEach((p, i) => {
      const q = c.contorno[(i + 1) % c.contorno.length];
      const [a, b] = enU ? [p[0], q[0]] : [p[1], q[1]];
      if ((a - coord) * (b - coord) <= 0 && a !== b) { const t = (coord - a) / (b - a); xs.push(enU ? p[1] + t * (q[1] - p[1]) : p[0] + t * (q[0] - p[0])); }
    });
    return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
  };
  const rayar = (x0, y0, x1, y1) => {
    for (let k = x0 - (y1 - y0); k < x1; k += 2.2) {
      const xa = Math.max(x0, k), xb = Math.min(x1, k + (y1 - y0));
      if (xb > xa) ents.push(ln(xa, y0 + (xa - k), xb, y0 + (xb - k), 'rayado'));
    }
  };
  for (const c of pz.cuerpos) {
    if (c.eje !== ejeCorte) continue;
    if (ejeCorte === 'z') {
      const iv = intervalo(c, principal.b.u, true);
      if (!iv) continue;
      const bandas = c.barrenos.filter((b) => Math.abs(b.u - principal.b.u) < 0.01).map((b) => [b.v - b.d / 2, b.v + b.d / 2]).sort((a, b) => a[0] - b[0]);
      let y = iv[0];
      for (const [b0, b1] of [...bandas, [iv[1], iv[1]]]) { if (b0 > y) rayar(-c.a1, y, -c.a0, b0); y = Math.max(y, b1); }
      ents.push(rectE(-c.a1, iv[0], -c.a0, iv[1]));
      for (const [b0, b1] of bandas) ents.push(ln(-c.a1, b0, -c.a0, b0), ln(-c.a1, b1, -c.a0, b1), ln(-c.a1 - 2, (b0 + b1) / 2, -c.a0 + 2, (b0 + b1) / 2, 'eje'));
    } else {
      const iv = intervalo(c, principal.b.v, false);
      if (!iv) continue;
      const bandas = c.barrenos.filter((b) => Math.abs(b.v - principal.b.v) < 0.01).map((b) => [b.u - b.d / 2, b.u + b.d / 2]).sort((a, b) => a[0] - b[0]);
      let x = iv[0];
      for (const [b0, b1] of [...bandas, [iv[1], iv[1]]]) { if (b0 > x) rayar(x, c.a0, b0, c.a1); x = Math.max(x, b1); }
      ents.push(rectE(iv[0], c.a0, iv[1], c.a1));
      for (const [b0, b1] of bandas) ents.push(ln(b0, c.a0, b0, c.a1), ln(b1, c.a0, b1, c.a1), ln((b0 + b1) / 2, c.a0 - 2, (b0 + b1) / 2, c.a1 + 2, 'eje'));
    }
  }
  return { ents, eje: ejeCorte, plano: ejeCorte === 'z' ? principal.b.u : principal.b.v, barreno: principal.b };
}

// Isométrica de referencia en alambre (aristas de ambas tapas y generatrices en vértices vivos).
function isoDe(pz) {
  const c30 = Math.cos(Math.PI / 6), s30 = 0.5;
  const pr = ([x, y, z]) => [(x - z) * c30, y - (x + z) * s30 * 0.999];
  const ents = [];
  for (const c of pz.cuerpos) {
    const p3 = (u, v, a) => (c.eje === 'z' ? [u, v, a] : [u, a, v]);
    for (const a of [c.a0, c.a1]) {
      ents.push(pl(c.contorno.map(([u, v]) => pr(p3(u, v, a))), 'fina'));
      for (const b of c.barrenos) ents.push(pl(Array.from({ length: 24 }, (_, i) => pr(p3(b.u + (b.d / 2) * Math.cos((i / 24) * 2 * Math.PI), b.v + (b.d / 2) * Math.sin((i / 24) * 2 * Math.PI), a))), 'fina'));
    }
    const n = c.contorno.length;
    c.contorno.forEach(([u, v, vivo], i) => {
      const silueta = !vivo && (i % Math.max(1, Math.round(n / 4)) === 0) && c.forma.tipo !== 'circulo';
      if (vivo || silueta) { const a = pr(p3(u, v, c.a0)), b = pr(p3(u, v, c.a1)); ents.push(ln(a[0], a[1], b[0], b[1], 'fina')); }
    });
    if (c.forma.tipo === 'circulo') { // generatrices de contorno aparente
      const e = ext(c), cu = (e.u0 + e.u1) / 2, cv = (e.v0 + e.v1) / 2, r = (e.u1 - e.u0) / 2;
      for (const sg of [-1, 1]) { const u = cu + sg * r * Math.SQRT1_2, v = cv - sg * r * Math.SQRT1_2; const a = pr(p3(u, v, c.a0)), b = pr(p3(u, v, c.a1)); ents.push(ln(a[0], a[1], b[0], b[1], 'fina')); }
    }
  }
  return ents;
}

const cajaEnts = (ents) => {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const m = (x, y) => { b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y); };
  for (const e of ents) {
    if (e.capa === 'eje') continue;
    if (e.t === 'l') { m(e.x1, e.y1); m(e.x2, e.y2); } else if (e.t === 'p') e.pts.forEach((p) => m(p[0], p[1])); else if (e.t === 'c') { m(e.cx - e.r, e.cy - e.r); m(e.cx + e.r, e.cy + e.r); }
  }
  return b;
};
// Coloca entidades de pieza (y arriba) en la hoja: (ox, oy) = esquina inferior izquierda de su caja.
function colocar(ents, caja, ox, oy, k) {
  const X = (x) => ox + (x - caja.x0) * k, Y = (y) => oy - (y - caja.y0) * k;
  return ents.map((e) => (e.t === 'l' ? { ...e, x1: X(e.x1), y1: Y(e.y1), x2: X(e.x2), y2: Y(e.y2) } : e.t === 'p' ? { ...e, pts: e.pts.map(([x, y]) => [X(x), Y(y)]) } : e.t === 'c' ? { ...e, cx: X(e.cx), cy: Y(e.cy), r: e.r * k } : e));
}

// ---------- acotación (ASME Y14.5) ----------
function flecha(x, y, dx, dy) { // punta en (x, y), apuntando en (dx, dy)
  const L = 2.2, a = 0.42;
  return pl([[x, y], [x - dx * L + dy * a, y - dy * L - dx * a], [x - dx * L - dy * a, y - dy * L + dx * a]], 'cotaRelleno');
}
function rombo(x, y) { return pl([[x, y - 1.1], [x + 0.9, y], [x, y + 1.1], [x - 0.9, y]], 'cota'); }
function cotaH(x1, x2, yRef, yCota, texto, est) {
  const xm = (x1 + x2) / 2, sg = Math.sign(yCota - yRef) || 1;
  const out = [ln(x1, yRef + sg * 1, x1, yCota + sg * 1.5, 'cota'), ln(x2, yRef + sg * 1, x2, yCota + sg * 1.5, 'cota'), ln(x1, yCota, x2, yCota, 'cota'), flecha(x1, yCota, -1, 0), flecha(x2, yCota, 1, 0), tx(xm + (est ? 1.2 : 0), yCota - 1, texto, 2.5, 'middle', 'cotaTexto')];
  if (est) out.push(rombo(xm - texto.length * 0.72 - 1.2, yCota - 1.9));
  return out;
}
function cotaV(y1, y2, xRef, xCota, texto, est) {
  const ym = (y1 + y2) / 2, sg = Math.sign(xCota - xRef) || 1;
  const out = [ln(xRef + sg * 1, y1, xCota + sg * 1.5, y1, 'cota'), ln(xRef + sg * 1, y2, xCota + sg * 1.5, y2, 'cota'), ln(xCota, y1, xCota, y2, 'cota'), flecha(xCota, y1, 0, -1), flecha(xCota, y2, 0, 1), tx(xCota + sg * 1.2 + (sg < 0 ? 0 : 0) + (est && sg > 0 ? 2 : 0), ym + 0.9, texto, 2.5, sg > 0 ? 'start' : 'end', 'cotaTexto')];
  if (est) out.push(rombo(sg > 0 ? xCota + 2 : xCota - texto.length * 1.45 - 2.4, ym));
  return out;
}
function llamada(x, y, dx, dy, texto, est) { // directriz desde el borde de un barreno
  const x2 = x + dx, y2 = y + dy, der = dx >= 0, n = Math.hypot(dx, dy);
  const out = [ln(x, y, x2, y2, 'cota'), flecha(x, y, -dx / n, -dy / n), ln(x2, y2, x2 + (der ? 3 : -3), y2, 'cota'), tx(x2 + (der ? 4 + (est ? 2 : 0) : -4), y2 + 0.9, texto, 2.5, der ? 'start' : 'end', 'cotaTexto')];
  if (est) out.push(rombo(der ? x2 + 4.4 : x2 - 5 - texto.length * 1.45, y2));
  return out;
}

// ---------- marco, cuadro de datos y notas ----------
function marco(datos) {
  const { w, h, margen: m } = HOJA, e = [];
  e.push(rectE(m, m, w - m, h - m, 'marco'));
  const cw = 150, ch = 36, x0 = w - m - cw, y0 = h - m - ch;
  e.push(rectE(x0, y0, w - m, h - m, 'marco'));
  const filas = [9, 18, 27], cols = [62, 104];
  filas.forEach((f) => e.push(ln(x0, y0 + f, w - m, y0 + f, 'fina')));
  e.push(ln(x0 + cols[0], y0 + 9, x0 + cols[0], y0 + ch, 'fina'), ln(x0 + cols[1], y0 + 9, x0 + cols[1], y0 + ch, 'fina'));
  const celda = (x, y, rotulo, valor, alto = 2.8) => { e.push(tx(x + 1.5, y + 3, rotulo, 1.7, 'start', 'texto')); e.push(tx(x + 1.5, y + 7.4, valor, alto, 'start', 'texto', true)); };
  e.push(tx(x0 + 1.5, y0 + 3.2, 'INSTITUTO POLITÉCNICO NACIONAL · ' + CONFIG.proyecto.escuela.toUpperCase(), 1.9, 'start', 'texto'));
  e.push(tx(x0 + 1.5, y0 + 7.2, 'Prótesis transfemoral · Rodilla policéntrica de 4 barras', 2.4, 'start', 'texto', true));
  celda(x0, y0 + 9, 'PIEZA', datos.nombre, 3);
  celda(x0 + cols[0], y0 + 9, 'GRUPO', CONFIG.proyecto.grupo);
  celda(x0 + cols[1], y0 + 9, 'HOJA', datos.hoja);
  celda(x0, y0 + 18, 'MATERIAL', datos.material);
  celda(x0 + cols[0], y0 + 18, 'ESCALA', datos.escala);
  celda(x0 + cols[1], y0 + 18, 'UNIDADES', 'mm');
  celda(x0, y0 + 27, 'DIBUJÓ', 'Simulación paramétrica (plano de apoyo)', 2.2);
  celda(x0 + cols[0], y0 + 27, 'FECHA', datos.fecha);
  celda(x0 + cols[1], y0 + 27, 'REVISÓ', '');
  // símbolo de proyección de tercer ángulo
  const sx = m + 6, sy = h - m - 8;
  e.push(ci(sx, sy, 2.6, 'fina'), ci(sx, sy, 1.4, 'fina'), pl([[sx + 6, sy - 1.4], [sx + 13, sy - 2.6], [sx + 13, sy + 2.6], [sx + 6, sy + 1.4]], 'fina'), ln(sx - 4, sy, sx + 15, sy, 'eje'));
  e.push(tx(sx + 17, sy + 1, 'PROYECCIÓN DE TERCER ÁNGULO', 2, 'start', 'texto'));
  return e;
}
function notas(lineas, x, y) { return lineas.map((s, i) => tx(x, y + i * 3.6, s, 2.1, 'start', 'texto')); }
const fechaHoy = () => new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
const nombreMaterial = (app) => CONFIG.materiales[app.estado.materialId].nombre;

// ---------- hoja de una pieza ----------
export function hojaPieza(pz, app, numero, total) {
  const v = vistasDe(pz), corte = corteDe(pz), iso = isoDe(pz), b = cajaPieza(pz), est = pz.estimado;
  const dx = b.x1 - b.x0, dy = b.y1 - b.y0, dz = b.z1 - b.z0;
  const gap = 24, area = { x: 30, y: 22, w: 150, h: 134 };
  const [k, escala] = ESCALAS.find(([s]) => (dx + dz) * s + gap <= area.w && (dy + dz) * s + gap <= area.h) || ESCALAS[ESCALAS.length - 1];
  const ents = [];
  // Tercer ángulo: superior arriba de la frontal, lateral derecha a su derecha.
  const fx = area.x, fyBase = area.y + dz * k + gap + dy * k; // y de hoja del borde inferior de la frontal
  const cF = { x0: b.x0, y0: b.y0 }, cS = { x0: b.x0, y0: -b.z1 }, cL = { x0: -b.z1, y0: b.y0 };
  ents.push(...colocar(v.F, cF, fx, fyBase, k));
  ents.push(...colocar(v.S, cS, fx, area.y + dz * k, k));
  const lx = fx + dx * k + gap;
  ents.push(...colocar(v.L, cL, lx, fyBase, k));
  ents.push(tx(fx, fyBase + 14.5, 'VISTA FRONTAL', 2, 'start'), tx(fx, area.y - 4, 'VISTA SUPERIOR', 2, 'start'), tx(lx, fyBase + 14.5, 'VISTA LATERAL DERECHA', 2, 'start'));
  // cotas generales
  ents.push(...cotaH(fx, fx + dx * k, fyBase, fyBase + 8, num(dx), est));
  ents.push(...cotaV(fyBase - dy * k, fyBase, fx, fx - 9, num(dy), est));
  ents.push(...cotaH(lx, lx + dz * k, fyBase, fyBase + 8, num(dz), est));
  // barrenos: una llamada por diámetro distinto en la vista donde se ven como círculo
  const X = (x) => fx + (x - b.x0) * k, YF = (y) => fyBase - (y - b.y0) * k, YS = (z) => area.y + dz * k - (-z + b.z1) * k;
  const vistos = new Set();
  for (const c of pz.cuerpos) {
    const grupos = {};
    c.barrenos.forEach((h) => (grupos[h.d + h.ajuste] ||= []).push(h));
    for (const g of Object.values(grupos)) {
      const h = g[0], clave = c.eje + h.d + h.ajuste;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const txt = `${g.length > 1 ? g.length + '× ' : ''}Ø${num(h.d)} ${h.ajuste}`;
      const r = (h.d / 2) * k * Math.SQRT1_2;
      if (c.eje === 'z') ents.push(...llamada(X(h.u) + r, YF(h.v) - r, 9, -9, txt, est));
      else ents.push(...llamada(X(h.u) + r, YS(h.v) - r, 9, -7, txt, est));
    }
    // distancia entre centros de las barras laterales
    if (c.forma.tipo === 'estadio') ents.push(...cotaH(X(0), X(c.forma.L), YF(b.y1), YF(b.y1) - 7, num(c.forma.L), est));
  }
  // corte A–A
  if (corte) {
    const cc = cajaEnts(corte.ents), cw = (cc.x1 - cc.x0) * k, chh = (cc.y1 - cc.y0) * k;
    const cx = 196 + Math.max(0, (88 - cw) / 2), cyBase = 150 - Math.max(0, (48 - chh) / 2);
    ents.push(...colocar(corte.ents, { x0: cc.x0, y0: cc.y0 }, cx, cyBase, k));
    ents.push(tx(cx + cw / 2, cyBase + 6, `CORTE A–A · ESCALA ${escala}`, 2, 'middle'));
    // traza del plano de corte sobre la vista donde se define
    if (corte.eje === 'z') { const x = X(corte.plano); ents.push(ln(x, YF(b.y1) - 5, x, YF(b.y0) + 5, 'corte'), tx(x - 1, YF(b.y1) - 6, 'A', 2.6, 'end', 'texto', true), tx(x - 1, YF(b.y0) + 7.5, 'A', 2.6, 'end', 'texto', true)); }
    else { const y = YS(corte.plano); ents.push(ln(fx - 5, y, fx + dx * k + 5, y, 'corte'), tx(fx - 6, y + 1, 'A', 2.6, 'end', 'texto', true), tx(fx + dx * k + 6, y + 1, 'A', 2.6, 'start', 'texto', true)); }
  }
  // isométrica de referencia
  const ci_ = cajaEnts(iso), ki = Math.min(80 / (ci_.x1 - ci_.x0), 62 / (ci_.y1 - ci_.y0), k);
  ents.push(...colocar(iso, { x0: ci_.x0, y0: ci_.y0 }, 200 + (84 - (ci_.x1 - ci_.x0) * ki) / 2, 20 + (62 + (ci_.y1 - ci_.y0) * ki) / 2, ki));
  ents.push(tx(242, 90, 'ISOMÉTRICA DE REFERENCIA (sin escala)', 2, 'middle'));
  // notas
  const d = CONFIG.diseno;
  ents.push(...notas([
    'NOTAS:',
    `1. Tolerancia general ±${d.toleranciaGeneralMm} mm. Ajuste de pernos: barreno H7, perno g6.`,
    `2. Acabado superficial Ra ${d.acabadoRaUm} µm en todas las caras maquinadas.`,
    '3. Romper filos 0.3 × 45°. Acotación según ASME Y14.5-2018.',
    est ? '4. El rombo marca cotas ESTIMADAS, pendientes de las medidas reales de SolidWorks.' : '4. Cotas tomadas de SolidWorks.',
    '5. Plano de apoyo: el plano oficial para CNC se emite desde SolidWorks.',
  ], 12, 170));
  ents.push(...marco({ nombre: `${pz.item}. ${pz.nombre}`, material: nombreMaterial(app), escala, hoja: `${numero} de ${total}`, fecha: fechaHoy() }));
  return { id: pz.id, titulo: `${pz.item}. ${pz.nombre}`, ents, pieza: pz, vistasDxf: { F: v.F, S: v.S, L: v.L, corte: corte?.ents || [], caja: b } };
}

// ---------- hoja de ensamble con lista de materiales ----------
export function hojaEnsamble(app, total) {
  const M = app.modelo, sol = M.mec.resolver(0), ents = [], est = CONFIG.piezas.estimado;
  const marcos = { muslo: { ang: 0, t: [0, 0] }, pierna: { ang: 0, t: [0, 0] }, c1: { ang: sol.phi1, t: sol.D }, c2: { ang: sol.phi2, t: sol.C } };
  const k = 0.75, ox = 78, oy = 96; // origen de la rodilla en la hoja
  const P = (p, m) => { const q = sum(rot(p, m.ang), m.t); return [ox + q[0] * k, oy - q[1] * k]; };
  const centros = {};
  for (const pz of M.piezas) {
    const m = marcos[pz.cuerpo];
    let sx = 0, sy = 0, n = 0;
    for (const c of pz.cuerpos) {
      const e = ext(c);
      const poli = c.eje === 'z' ? c.contorno.map(([u, v]) => [u, v]) : [[e.u0, c.a0], [e.u1, c.a0], [e.u1, c.a1], [e.u0, c.a1]];
      ents.push(pl(poli.map((p) => P(p, m))));
      poli.forEach((p) => { const q = P(p, m); sx += q[0]; sy += q[1]; n++; });
      if (c.eje === 'z') for (const h of c.barrenos) { const q = P([h.u, h.v], m); ents.push(ci(q[0], q[1], (h.d / 2) * k), ...cruzEje(q[0], q[1], (h.d / 2) * k)); }
    }
    centros[pz.id] = [sx / n, sy / n];
  }
  // globos: las piezas simétricas (izquierda/derecha) comparten posición en la vista lateral
  const pos = { adaptador: [26, -62], supDelantera: [52, -40], supTrasera: [-52, -44], c1Der: [58, -14], c1Izq: [58, -2], c2Der: [-56, -22], c2Izq: [-56, -10], barraTrasera: [-56, 4], infDelantera: [58, 14], infTrasera: [-56, 18], base: [58, 28], tubo: [40, 50] };
  for (const pz of M.piezas) {
    const c = centros[pz.id], g = [ox + pos[pz.id][0] * 0.92, oy + pos[pz.id][1] * 0.92];
    ents.push(ln(c[0], c[1], g[0], g[1], 'cota'), ci(c[0], c[1], 0.5, 'cotaRelleno'), ci(g[0], g[1], 3.4, 'cota'), tx(g[0], g[1] + 0.95, pz.item, 2.6, 'middle', 'cotaTexto', true));
  }
  const b = cajaEnts(ents.filter((e) => e.capa === 'visible'));
  ents.push(...cotaV(b.y0, b.y1, b.x0, b.x0 - 22, num((b.y1 - b.y0) / k), est));
  ents.push(...cotaH(b.x0, b.x1, b.y1, b.y1 + 9, num((b.x1 - b.x0) / k), est));
  ents.push(tx(ox - 45, b.y1 + 17, 'VISTA LATERAL DEL ENSAMBLE A 0° DE FLEXIÓN · ESCALA 3:4', 2, 'start'));
  // lista de materiales
  const x0 = 142, y0 = 14, anchos = [10, 62, 12, 63], alto = 5.6;
  const filas = [['N.º', 'DESCRIPCIÓN', 'CANT.', 'MATERIAL'], ...M.piezas.map((p) => [p.item, p.nombre, 1, nombreMaterial(app)]),
    ['13', `Perno Ø${CONFIG.pernos.diametro} ${CONFIG.pernos.ajuste} (ejes A, B, C, D)`, 4, CONFIG.pernos.material + ' (comercial)'],
    ['14', 'Tornillo M6 de cabeza cilíndrica', 8, 'Acero clase 8.8 (comercial)'], ['15', 'Tornillo M5 del travesaño', 2, 'Acero clase 8.8 (comercial)']];
  filas.forEach((f, i) => {
    let x = x0;
    f.forEach((c, j) => { ents.push(tx(x + 1.5, y0 + i * alto + 3.9, c, 2.2, 'start', 'texto', i === 0)); x += anchos[j]; });
    ents.push(ln(x0, y0 + (i + 1) * alto, x0 + 147, y0 + (i + 1) * alto, 'fina'));
  });
  ents.push(rectE(x0, y0, x0 + 147, y0 + filas.length * alto, 'marco'));
  let x = x0; anchos.slice(0, 3).forEach((a) => { x += a; ents.push(ln(x, y0, x, y0 + filas.length * alto, 'fina')); });
  ents.push(tx(x0, y0 + filas.length * alto + 5, `Masa calculada: ${M.masa ? fmt(M.masa.totalG, 0) + ' g' : 'pendiente'} (12 piezas + pernos). Referencia del equipo: ${CONFIG.diseno.pesoRodillaG} g.`, 2.1));
  ents.push(...notas(['NOTAS:', '1. Piezas 4–5 y 6–7 son simétricas (derecha e izquierda).', '2. Rango de flexión 0° a 135°. Verificar holguras en SolidWorks.', est ? '3. Medidas ESTIMADAS, pendientes de SolidWorks.' : '3. Medidas de SolidWorks.', '4. Plano de apoyo: no sustituye al plano oficial.'], 12, 172));
  ents.push(...marco({ nombre: 'Ensamble de la rodilla', material: 'Ver lista de materiales', escala: '3:4', hoja: `1 de ${total}`, fecha: fechaHoy() }));
  return { id: 'ensamble', titulo: 'Ensamble y lista de materiales', ents };
}

// ---------- salida SVG ----------
const ESTILO = {
  visible: 'stroke-width="0.5"', oculta: 'stroke-width="0.25" stroke-dasharray="2 1.2"', eje: 'stroke-width="0.18" stroke-dasharray="6 1.2 1 1.2"',
  cota: 'stroke-width="0.18"', cotaRelleno: 'stroke-width="0.1" fill="var(--trazo,#111)"', rayado: 'stroke-width="0.13"', fina: 'stroke-width="0.25"',
  marco: 'stroke-width="0.6"', corte: 'stroke-width="0.5" stroke-dasharray="7 1.5 1.5 1.5"',
};
const esc_ = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function svgDeHoja(hoja, { independiente = false } = {}) {
  const col = independiente ? '#111' : 'var(--trazo,#111)', papel = independiente ? '#fff' : 'var(--papel,#fff)';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HOJA.w} ${HOJA.h}" ${independiente ? `width="${HOJA.w}mm" height="${HOJA.h}mm"` : ''} role="img" aria-label="Plano: ${esc_(hoja.titulo)}" style="background:${papel}" font-family="Barlow, Arial, sans-serif"><g fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round">`;
  for (const e of hoja.ents) {
    const st = (ESTILO[e.capa] || ESTILO.fina).replace('var(--trazo,#111)', col);
    if (e.t === 'l') s += `<line x1="${e.x1.toFixed(2)}" y1="${e.y1.toFixed(2)}" x2="${e.x2.toFixed(2)}" y2="${e.y2.toFixed(2)}" ${st}/>`;
    else if (e.t === 'p') s += `<path d="M${e.pts.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L')}${e.cerrada ? 'Z' : ''}" ${st}/>`;
    else if (e.t === 'c') s += `<circle cx="${e.cx.toFixed(2)}" cy="${e.cy.toFixed(2)}" r="${e.r.toFixed(2)}" ${st}/>`;
    else if (e.t === 't') s += `<text x="${e.x.toFixed(2)}" y="${e.y.toFixed(2)}" font-size="${e.alto}" text-anchor="${e.ancla}" fill="${col}" stroke="none"${e.negrita ? ' font-weight="600"' : ''}>${esc_(e.s)}</text>`;
  }
  return s + '</g></svg>';
}

// ---------- pestaña ----------
let hojas = [], actual = 0, raiz, app_;
function generar() {
  const M = app_.modelo, total = M.piezas.length + 1;
  hojas = [hojaEnsamble(app_, total), ...M.piezas.map((p, i) => hojaPieza(p, app_, i + 2, total))];
}
function pintar() {
  if (!raiz) return;
  generar();
  raiz.querySelector('#plano-lista').innerHTML = hojas.map((h, i) => `<button type="button" data-hoja="${i}" aria-pressed="${i === actual}">${h.titulo}</button>`).join('');
  raiz.querySelectorAll('[data-hoja]').forEach((b) => b.addEventListener('click', () => { actual = +b.dataset.hoja; pintar(); }));
  raiz.querySelector('#plano-hoja').innerHTML = svgDeHoja(hojas[actual]);
  raiz.querySelector('#btn-stl').disabled = !hojas[actual].pieza;
  raiz.querySelector('#btn-dxf').disabled = !hojas[actual].pieza;
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function montar(cont, app) {
  raiz = cont; app_ = app;
  cont.innerHTML = `
    <style>
      .planos{display:grid;grid-template-columns:260px minmax(0,1fr);gap:16px;align-items:start}
      .planos>*{min-width:0}
      #plano-lista{display:grid;gap:6px;padding:12px}
      #plano-lista button{text-align:left;border:1px solid var(--linea);background:var(--superficie);border-radius:var(--radio);padding:8px 12px;min-height:44px;font-weight:500}
      #plano-lista button[aria-pressed=true]{background:var(--guinda-suave);border-color:var(--guinda);color:var(--guinda)}
      .plano-marco{overflow:auto;max-height:82vh;border:1px solid var(--linea);border-radius:var(--radio);background:var(--papel);touch-action:pan-x pan-y}
      #plano-hoja{width:var(--zoom,100%);min-width:760px}
      #plano-hoja svg{display:block;width:100%;height:auto}
      .plano-acciones{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      @media(max-width:900px){.planos{grid-template-columns:minmax(0,1fr)}#plano-lista{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}}
    </style>
    <h2 class="seccion-titulo">Planos paramétricos</h2>
    <p class="seccion-intro">Se generan con las mismas dimensiones que usa la simulación: si cambian las medidas en la configuración, los planos se actualizan solos. Proyección de tercer ángulo y acotación según ASME Y14.5.</p>
    <div class="aviso cuidado" style="margin-bottom:16px"><span><strong>Planos de apoyo.</strong> Los planos oficiales para el CNC salen de SolidWorks; aquí no se genera código G. Las cotas con rombo <strong>◇</strong> son estimadas hasta que el equipo pase las medidas reales.</span></div>
    <div class="planos">
      <nav class="panel" id="plano-lista" aria-label="Hojas"></nav>
      <div>
        <div class="plano-marco"><div id="plano-hoja"></div></div>
        <div class="plano-acciones"><button type="button" class="boton chico" data-pz="1.4">Acercar</button><button type="button" class="boton chico" data-pz="0.714">Alejar</button><button type="button" class="boton chico" data-pz="0">Ajustar</button><span class="ayuda" style="align-self:center">Arrastra para mover la hoja; pellizca con dos dedos para acercar.</span></div>
        <div class="plano-acciones">
          <button type="button" class="boton primario" id="btn-pdf">PDF de esta hoja</button>
          <button type="button" class="boton" id="btn-pdf-todo">PDF de las 13 hojas</button>
          <button type="button" class="boton" id="btn-svg">SVG</button>
          <button type="button" class="boton" id="btn-dxf">DXF (vistas 1:1)</button>
          <button type="button" class="boton" id="btn-stl">STL de la pieza</button>
        </div>
        <p class="ayuda" id="plano-msj">El DXF contiene las vistas a escala 1:1 en mm para usarlas como base 2D en SolidWorks o AutoCAD. El STL sirve para imprimir la pieza en 3D.</p>
        <div class="chips" style="margin-top:8px">${app.chipNorma('asme-y14-5')}${app.chipNorma('astm-b221-b211')}</div>
      </div>
    </div>`;
  const baja = async (nombre, datos, tipo) => {
    const final = await descargar(nombre, datos, tipo);
    cont.querySelector('#plano-msj').textContent = final ? `Archivo listo: ${final}.` : `No se guardó ${nombre}. Si cancelaste, vuelve a intentarlo; si esta vista no permite descargas, usa la página publicada en GitHub Pages.`;
  };
  cont.querySelector('#btn-pdf').addEventListener('click', () => baja(`plano-${slug(hojas[actual].titulo)}.pdf`, pdfDeHojas([hojas[actual]], HOJA), 'application/pdf'));
  cont.querySelector('#btn-pdf-todo').addEventListener('click', () => baja('planos-rodilla-4-barras.pdf', pdfDeHojas(hojas, HOJA), 'application/pdf'));
  cont.querySelector('#btn-svg').addEventListener('click', () => baja(`plano-${slug(hojas[actual].titulo)}.svg`, svgDeHoja(hojas[actual], { independiente: true }), 'image/svg+xml'));
  cont.querySelector('#btn-dxf').addEventListener('click', () => { const h = hojas[actual]; if (h.pieza) baja(`${slug(h.titulo)}.dxf`, dxfDe(h.vistasDxf), 'application/dxf'); });
  cont.querySelector('#btn-stl').addEventListener('click', () => { const h = hojas[actual]; if (h.pieza) baja(`${slug(h.titulo)}.stl`, stlDe(h.pieza.cuerpos.map(geometriaCuerpo)), 'model/stl'); });
  // Acercar, alejar y pellizcar: cambia el ancho de la hoja dentro de un marco que se desplaza en ambos ejes.
  const hoja = cont.querySelector('#plano-hoja'), marcoEl = cont.querySelector('.plano-marco');
  let zoom = 1;
  const ponZoom = (z) => { zoom = Math.max(1, Math.min(6, z)); hoja.style.setProperty('--zoom', zoom * 100 + '%'); hoja.style.minWidth = zoom > 1 ? 760 * zoom + 'px' : ''; };
  cont.querySelectorAll('[data-pz]').forEach((b) => b.addEventListener('click', () => ponZoom(+b.dataset.pz ? zoom * +b.dataset.pz : 1)));
  const dedos = new Map(); let d0 = 0, z0 = 1;
  marcoEl.addEventListener('pointerdown', (e) => { dedos.set(e.pointerId, [e.clientX, e.clientY]); if (dedos.size === 2) { const [p, q] = [...dedos.values()]; d0 = Math.hypot(p[0] - q[0], p[1] - q[1]); z0 = zoom; } });
  marcoEl.addEventListener('pointermove', (e) => {
    const prev = dedos.get(e.pointerId); if (!prev) return;
    if (dedos.size === 1 && e.pointerType === 'mouse') { marcoEl.scrollLeft -= e.clientX - prev[0]; marcoEl.scrollTop -= e.clientY - prev[1]; }
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if (dedos.size === 2 && d0) { const [p, q] = [...dedos.values()]; ponZoom(z0 * Math.hypot(p[0] - q[0], p[1] - q[1]) / d0); }
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) marcoEl.addEventListener(ev, (e) => { dedos.delete(e.pointerId); d0 = 0; });
  pintar();
}
export function alMostrar() { pintar(); }
export function alCambiarModelo() { pintar(); }
export { HOJA };
