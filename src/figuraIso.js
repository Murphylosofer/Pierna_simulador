// Figura isométrica explicativa (skill "anatomy"): la rodilla montada en un banco de pruebas.
// Todo lo que se mueve y todo número mostrado sale del mismo mecanismo resuelto (cinematica.js),
// y las piezas se dibujan desde la misma geometría de piezas.js que usan la vista 3D y los planos.
// Orden de dibujo: cada par de sólidos se ordena con un plano separador exacto (no por centroide),
// así ninguna pieza parece atravesar a otra.
import * as k from './iso/iso-kit.js';
import * as G from './iso/lathe.js';
import { CONFIG, G as GRAV } from './config.js';
import { resolverCargas } from './cargas.js';
import { rgbEsfuerzo, COLOR_MATERIAL, hex, mezclar } from './colores.js';
import { rot, sum, res, esc, rad, fmt, aMundo } from './mat.js';

const ANCHO = 660, ALTO = 560;
const ZK = 150; // altura del centro de rodilla sobre el banco
const BASE = { x: -100, y: -66, w: 215, d: 132, r: 8 };
const BASE_H = 10, PIE_H = 5;
const Y_ESCALA = -52; // la placa del transportador queda detrás del mecanismo
const R_ESCALA = 128;

const estado = { theta: 0, azimut: 45, elev: 28, zoom: 1, px: 0, py: 0, resaltada: null, color: 'normal', tocado: false };
let raiz, app_;

const FY = () => G.frameOf([0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]); // prismas a lo largo de y; polígono en (z, x)
const pz = ([x, yv]) => [ZK + yv, x]; // punto sagital (x, altura) → coordenadas (z, x) del marco FY

// ---------- orden de pintor por planos separadores ----------
const proy = (pts, n) => { let a = Infinity, b = -Infinity; for (const p of pts) { const d = p[0] * n[0] + p[1] * n[1]; if (d < a) a = d; if (d > b) b = d; } return [a, b]; };
// Devuelve >0 si `b` va delante de `a`, <0 si detrás, 0 si no se puede decidir. V = dirección hacia el observador (x, y, z).
function delante(a, b, V) {
  if (a.y1 <= b.y0 + 0.02) return 1; // b está más cerca en y (el observador mira desde +y)
  if (b.y1 <= a.y0 + 0.02) return -1;
  let mejor = 0, hueco = -0.02; // 0.02 mm de tolerancia: piezas en contacto cuentan como separadas
  for (const P of [a.poli, b.poli]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length];
    let n = [q[1] - p[1], p[0] - q[0]];
    const L = Math.hypot(n[0], n[1]);
    if (L < 1e-9) continue;
    n = [n[0] / L, n[1] / L];
    const [a0, a1] = proy(a.poli, n), [b0, b1] = proy(b.poli, n);
    const vn = V[0] * n[0] + V[2] * n[1]; // n vive en el plano sagital (x, altura)
    if (Math.abs(vn) < 0.002) continue;
    if (b0 - a1 > hueco) { hueco = b0 - a1; mejor = vn > 0 ? 1 : -1; } // b del lado +n
    if (a0 - b1 > hueco) { hueco = a0 - b1; mejor = vn > 0 ? -1 : 1; }
  }
  return mejor;
}
let ciclos = 0; // veces que el orden no pudo resolverse solo con planos separadores
export const __ciclos = () => { const c = ciclos; ciclos = 0; return c; };
// Envolvente convexa en pantalla (cadena monótona) y prueba de solape entre dos envolventes.
function envolvente(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const h = [];
  for (const q of p) { while (h.length >= 2 && giro(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); }
  const t = h.length + 1;
  for (let i = p.length - 2; i >= 0; i--) { const q = p[i]; while (h.length >= t && giro(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); }
  h.pop();
  return h;
}
function solapan(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], n = [q[1] - p[1], p[0] - q[0]];
    const [a0, a1] = proy(A, n), [b0, b1] = proy(B, n);
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}
function ordenar(items, V) {
  const n = items.length, sale = items.map(() => []), entra = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = items[i], b = items[j];
    if (a.caja[2] < b.caja[0] || b.caja[2] < a.caja[0] || a.caja[3] < b.caja[1] || b.caja[3] < a.caja[1]) continue; // no se tocan en pantalla
    if (!solapan(a.silueta, b.silueta)) continue; // sus siluetas no se enciman: no hace falta ordenarlas
    let d = a.capa !== b.capa ? Math.sign(b.capa - a.capa) : delante(a, b, V);
    if (!d) { d = Math.sign(b.z - a.z); if (window.__isoDudas) window.__isoDudas.push((a.n || '?') + ' ~ ' + (b.n || '?')); }
    if (d > 0) { sale[i].push(j); entra[j]++; } else if (d < 0) { sale[j].push(i); entra[i]++; }
    if (window.__isoAristas) window.__isoAristas.push(d > 0 ? [i + ':' + a.n, j + ':' + b.n] : [j + ':' + b.n, i + ':' + a.n]);
  }
  const out = [], hecho = new Array(n).fill(false);
  for (let paso = 0; paso < n; paso++) {
    let e = -1;
    for (let i = 0; i < n; i++) if (!hecho[i] && entra[i] <= 0 && (e < 0 || items[i].z < items[e].z)) e = i;
    if (e < 0) { ciclos++; for (let i = 0; i < n; i++) if (!hecho[i] && (e < 0 || items[i].z < items[e].z)) e = i; } // ciclo: rompe por profundidad
    hecho[e] = true; out.push(items[e]);
    for (const j of sale[e]) entra[j]--;
  }
  return out;
}

// ---------- color por pieza ----------
function tinte(rgb, oscuro) {
  const papel = oscuro ? [0.08, 0.08, 0.09] : [1, 1, 1];
  const t = (f) => hex(mezclar(rgb, papel, f));
  const s = oscuro ? [0.62, 0.5, 0.4, 0.3] : [0.2, 0.34, 0.48, 0.6];
  return `--anatomy-paper:${t(0.55)};--anatomy-face:${t(0.55)};--anatomy-shade-0:${t(s[0])};--anatomy-shade-1:${t(s[1])};--anatomy-shade-2:${t(s[2])};--anatomy-shade-3:${t(s[3])};--anatomy-top:${t(oscuro ? 0.22 : 0.7)}`;
}
const esOscuro = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);

function construir() {
  const { theta, azimut, elev, resaltada, color } = estado;
  const M = app_.modelo, mec = M.mec, sol = mec.resolver(theta);
  const m = CONFIG.mecanismo, cfg = CONFIG.piezas, d = CONFIG.pernos.diametro, ex = m.ejePilonX;
  const P = k.fitProjection(
    [...k.boxCorners(BASE, -BASE_H - PIE_H, 0), [-R_ESCALA - 6, Y_ESCALA, ZK + 40], [20, Y_ESCALA, ZK + 40 + R_ESCALA + 8], [-30, 40, ZK + 132], [120, 0, ZK]],
    ANCHO, ALTO, { pad: 30, azimuth: azimut, elevation: elev });
  const cam = k.cameraOf(P), V = [cam.cosA * cam.cosE, cam.sinA * cam.cosE, cam.sinE];
  const at = (p) => k.iso(p, P);
  const S = (paths, st) => k.solidSvg(paths, st);
  const L = (dd, st) => k.lineSvg(dd, st);
  const W3 = ([x, yv], y) => [x, y, ZK + yv];
  const oscuro = esOscuro();
  // Carga de referencia para el mapa de esfuerzos: todo el peso del usuario sobre la línea de carga.
  const xCarga = CONFIG.diseno.desplazamientoPosteriorEjeMm;
  const cargas = resolverCargas(sol, [{ p: [xCarga, -300], F: [0, M.peso] }], M.mat);
  const items = [];
  const caja3 = (poli, y0, y1) => {
    let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
    const pts = [];
    for (const p of poli) for (const y of [y0, y1]) { const s = at([p[0], y, ZK + p[1]]); pts.push(s); a = Math.min(a, s[0]); b = Math.min(b, s[1]); c = Math.max(c, s[0]); e = Math.max(e, s[1]); }
    return { caja: [a - 1, b - 1, c + 1, e + 1], silueta: envolvente(pts) };
  };
  // poli: polígono convexo en el plano sagital (x, altura respecto a la rodilla); y0..y1: extensión lateral.
  const pon = (poli, y0, y1, svg, { pieza = null, capa = 0, material = null } = {}) => {
    const cx = poli.reduce((s, p) => s + p[0], 0) / poli.length, cz = poli.reduce((s, p) => s + p[1], 0) / poli.length;
    let estilo = '';
    if (pieza || material) {
      const idMat = material || M.materialId;
      if (color === 'material') estilo = tinte(COLOR_MATERIAL[idMat].rgb, oscuro);
      else if (color === 'esfuerzo') { const e = cargas.esfuerzos[pieza]; if (e && e.uso != null) estilo = tinte(rgbEsfuerzo(e.uso), oscuro); }
    }
    const fantasma = resaltada && pieza !== resaltada;
    items.push({ n: pieza || 'aux' + items.length, poli, y0, y1, z: k.depthOf([cx, (y0 + y1) / 2, ZK + cz], P), ...caja3(poli, y0, y1), capa: resaltada && pieza === resaltada ? 5 : capa,
      svg: `<g${pieza ? ` data-pieza="${pieza}"` : ''}${estilo ? ` style="${estilo}"` : ''}${fantasma ? ' opacity="0.22"' : ''}>${svg}</g>` });
  };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const tono = (id, base = 'mid') => (resaltada === id ? { tone: 'hi', lit: true } : { tone: base });

  // ---------- banco (fondo) ----------
  let banco = `<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - PIE_H, BASE_H, P)}"/>`;
  const patas = k.corners(BASE, 20).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of patas) banco += S(k.cylinder(x, y, 8, -BASE_H - PIE_H, 1.6, P, 24), { tone: 'lo' }) + S(k.cylinder(x, y, 6, -BASE_H - PIE_H + 1.6, PIE_H - 1.6, P, 24), { tone: 'mid' });
  banco += S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: 'mid' });
  banco += L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: 'lo' });
  const torn = k.corners(BASE, 11);
  banco += L(torn.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(''), { tone: 'lo' }) + k.dotsSvg(torn.map(([x, y]) => at([x, y, 0])), { size: 0.55 });
  const regla = { x: BASE.x + 14, y: BASE.y + BASE.d - 16, w: BASE.w - 28, d: 7, r: 1 };
  banco += S(k.slabOf(regla, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' });
  const tk = k.topTicks(regla.x + 4, regla.x + regla.w - 4, 5, 5, regla.y + 0.8, 0.6, [2, 3.8], P);
  banco += L(tk.minor, { tone: 'lo' }) + L(tk.major, { tone: 'mid' });
  const placa = { x: BASE.x + 14, y: BASE.y + 12, w: 44, d: 20, r: 1.5 };
  banco += S(k.slabOf(placa, 0, 0.8, P, 3), { tone: 'lo', crease: 'none' });
  banco += L([5, 10, 15].map((dy) => k.lineOnTop([placa.x + 5, placa.y + dy], [placa.x + placa.w - 5 - (dy === 15 ? 12 : 0), placa.y + dy], 0.8, P)).join(''), { tone: 'lo', free: true });
  banco += k.dotsSvg([[placa.x + 2.5, placa.y + 2.5], [placa.x + placa.w - 2.5, placa.y + placa.d - 2.5]].map(([x, y]) => at([x, y, 0.8])), { size: 0.4 });
  const fantasmaFondo = resaltada ? ' opacity="0.3"' : '';

  // ---------- columna: mordaza, pilón y perilla ----------
  const ba = cfg.base, tb = cfg.tuboReceptor;
  const yTubo0 = ba.yTope - ba.espesorPlaca - tb.largo; // en coordenadas de rodilla
  const mord = { x: ex - 26, y: -26, w: 52, d: 52, r: 5 };
  let col = S(k.slabOf(mord, 0, 22, P, 6, 0.9), { tone: 'mid' });
  col += L(k.planOutline(k.insetPlan(mord, 4), 22, P), { tone: 'faint' }) + L(k.sideSeam(mord, 11, P, 6), { tone: 'faint' });
  col += k.dotsSvg(k.corners(mord, 6).map(([x, y]) => at([x, y, 22])), { size: 0.5 });
  pon(rect(ex - 26, -ZK, ex + 26, -ZK + 22), -26, 26, col);
  pon(rect(ex - 19, -ZK + 22, ex + 19, -ZK + 27), -19, 19, S(k.cylinder(ex, 0, 19, 22, 5, P, 40, 0.6), { tone: 'mid' }));
  pon(rect(ex - 15, -ZK + 27, ex + 15, yTubo0), -15, 15, S(k.cylinder(ex, 0, 15, 27, ZK + yTubo0 - 27, P, 40), { tone: 'mid', crease: 'none' }) + L([50, 72].map((z) => k.sideArc(ex, 0, 15, z, P, 24)).join(''), { tone: 'faint' }));
  const per = [mord.x + mord.w + 7, 0];
  pon(rect(per[0] - 7, -ZK + 5, per[0] + 6, -ZK + 17), -6, 6, S(k.slabOf({ x: mord.x + mord.w, y: -2, w: 4, d: 4, r: 1 }, 9, 4, P, 2), { tone: 'mid', crease: 'none' }) + S(k.cylinder(per[0], per[1], 6, 5, 12, P, 28), { tone: 'mid' }) + L(k.knurl(per[0], per[1], 6, 5, 17, 30, P), { tone: 'lo' }));

  // ---------- las 12 piezas, desde piezas.js ----------
  const marcos = { muslo: sol.muslo, pierna: { ang: 0, t: [0, 0] }, c1: { ang: sol.phi1, t: sol.D }, c2: { ang: sol.phi2, t: sol.C } };
  for (const pieza of M.piezas) {
    const mar = marcos[pieza.cuerpo], fijo = pieza.cuerpo === 'pierna';
    for (const c of pieza.cuerpos) {
      const us = c.contorno.map((p) => p[0]), vs = c.contorno.map((p) => p[1]);
      const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
      const base = pieza.cuerpo === 'c1' || pieza.cuerpo === 'c2' ? 'hi' : 'mid';
      if (c.eje === 'z') {
        // prisma lateral: el contorno ya está en el plano sagital
        const paso = Math.max(1, Math.floor(c.contorno.length / 24));
        const poli = c.contorno.filter((_, i) => i % paso === 0).map(([u, v]) => aMundo(mar, [u, v]));
        // El travesaño cruza por delante y por detrás de otras piezas: se dibuja en tres tramos para que el orden sea exacto.
        const cortes = pieza.id === 'barraTrasera' ? [c.a0, -cfg.separacionC2, cfg.separacionC2, c.a1] : [c.a0, c.a1];
        for (let i = 0; i < cortes.length - 1; i++) pon(poli, cortes[i], cortes[i + 1], S(G.prismOf(FY(), poli.map(pz), cortes[i], cortes[i + 1], P), tono(pieza.id, base)), { pieza: pieza.id });
      } else if (c.forma.tipo === 'circulo') {
        const cu = (u0 + u1) / 2, r = (u1 - u0) / 2, hueco = c.barrenos[0]?.d / 2 || 0;
        const poli = rect(cu - r, c.a0, cu + r, c.a1).map((p) => aMundo(mar, p));
        let svg;
        if (fijo) svg = S(k.cylinder(cu, 0, r, ZK + c.a0, c.a1 - c.a0, P, 44, 0.7), tono(pieza.id)) + L(k.sideArc(cu, 0, r, ZK + c.a0 + 8, P, 24), { tone: 'faint' });
        else {
          const arriba = rot([0, 1], mar.ang), F = G.frameAlong(W3(aMundo(mar, [cu, c.a0]), 0), [arriba[0], 0, arriba[1]]);
          svg = S(G.ringBand(0, c.a1 - c.a0, hueco, r, F, P), tono(pieza.id));
        }
        pon(poli, -r, r, svg, { pieza: pieza.id });
      } else {
        // placa: caja con espesor a lo largo de la altura local
        const poli = rect(u0, c.a0, u1, c.a1).map((p) => aMundo(mar, p));
        let svg = fijo
          ? S(k.slabOf({ x: u0, y: v0, w: u1 - u0, d: v1 - v0, r: 2 }, ZK + c.a0, c.a1 - c.a0, P, 4, 0.7), tono(pieza.id))
          : S(G.prismOf(FY(), poli.map(pz), v0, v1, P), tono(pieza.id));
        pon(poli, v0, v1, svg, { pieza: pieza.id });
      }
    }
  }
  // pernos: una cabeza a cada lado
  for (const e of M.ejes) {
    const c = aMundo(marcos[e.cuerpo], e.centro), r = d / 2 + 1.4, medio = e.largo / 2;
    for (const sg of [-1, 1]) {
      const F = G.frameOf([c[0], 0, ZK + c[1]], [0, sg, 0], [0, 0, 1], [sg, 0, 0]);
      const svg = S(G.disc(medio - 2, medio, r, F, P), { tone: 'mid' }) + k.dotsSvg([at([c[0], sg * medio, ZK + c[1]])], { size: 0.6, tone: 'hi' });
      pon(rect(c[0] - r, c[1] - r, c[0] + r, c[1] + r), sg > 0 ? medio - 2 : -medio, sg > 0 ? medio : -medio + 2, svg, { pieza: e.id, material: 'acero' });
    }
  }
  // muñón de prueba dentro del receptáculo, con remate moleteado
  {
    const ad = cfg.adaptador, yPl = ad.yBase + ad.espesorPlaca, rr = ad.anilloDint / 2 - 1.5;
    const arriba = rot([0, 1], sol.muslo.ang), F = G.frameAlong(W3(aMundo(sol.muslo, [ex, yPl]), 0), [arriba[0], 0, arriba[1]]);
    const s0 = ad.anilloAlto, s1 = 44;
    let soc = S(G.disc(s0, s1, rr, F, P), { tone: 'lo' }) + L(G.arcOf(F, 30, rr, P), { tone: 'faint' });
    pon(rect(ex - rr, yPl + s0, ex + rr, yPl + s1).map((p) => aMundo(sol.muslo, p)), -rr, rr, soc);
    pon(rect(ex - rr - 3, yPl + s1, ex + rr + 3, yPl + s1 + 5).map((p) => aMundo(sol.muslo, p)), -rr - 3, rr + 3, S(G.disc(s1, s1 + 5, rr + 3, F, P), { tone: 'mid' }) + L(G.ribsOf(F, s1, s1 + 5, rr + 3, 40, P, { seams: true }), { tone: 'lo' }));
  }

  // ---------- transportador de 0° a 135° (placa fija detrás) ----------
  {
    const c = [0, 40], sector = [c];
    for (let g = -4; g <= 139; g += 1) sector.push(sum(c, rot([0, R_ESCALA], rad(g))));
    let e_ = S(G.prismOf(FY(), sector.map(pz), Y_ESCALA - 2, Y_ESCALA, P), { tone: 'lo' });
    const cara = Y_ESCALA + 0.05;
    let menores = '', mayores = '';
    for (let g = 0; g <= 135; g += 5) {
      const mayor = g % 45 === 0, medio = g % 15 === 0, r0 = R_ESCALA - (mayor ? 12 : medio ? 4.4 : 3.2); // las mayores van de arco a arco
      const seg = k.segment(W3(sum(c, rot([0, r0], rad(g))), cara), W3(sum(c, rot([0, R_ESCALA], rad(g))), cara), P);
      if (mayor) mayores += seg; else menores += seg;
    }
    // borde de la escala: las marcas cuelgan de este arco, que va de canto a canto de la placa
    for (const rr of [R_ESCALA, R_ESCALA - 12]) {
      const borde = [];
      for (let g = -4; g <= 139; g += 1) borde.push(at(W3(sum(c, rot([0, rr], rad(g))), cara)));
      e_ += L('M' + borde.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L'), { tone: rr === R_ESCALA ? 'lo' : 'faint' });
    }
    e_ += L(menores, { tone: 'lo' }) + L(mayores, { tone: 'hi' });
    const punta = W3(sum(c, rot([0, R_ESCALA * Math.cos(rad(theta - Math.round(theta)))], rad(theta))), cara);
    e_ += L(k.segment(W3(c, cara + 0.3), punta, P), { tone: 'lit' }) + k.dotsSvg([at(W3(c, cara + 0.3))], { size: 1.1, tone: 'hi' });
    pon(sector, Y_ESCALA - 2, Y_ESCALA, e_);
    for (const x of [-R_ESCALA + 26, 8]) {
      const h = ZK - 20 + (x > 0 ? 60 : 68);
      pon(rect(x - 3, -ZK, x + 3, -ZK + h), Y_ESCALA - 7, Y_ESCALA - 2, S(k.cylinder(x, Y_ESCALA - 4.6, 2.6, 0, h, P, 16), { tone: 'mid', crease: 'none' }) + S(k.cylinder(x, Y_ESCALA - 4.6, 5, 0, 3, P, 20), { tone: 'mid' }));
    }
  }

  // ---------- línea de carga (varilla) ----------
  const yF = cfg.barraInfTrasera.zExterior + 12;
  pon(rect(xCarga - 4.2, -ZK, xCarga + 4.2, 153), yF - 4.2, yF + 4.2, S(k.cylinder(xCarga, yF, 4.2, 0, 3, P, 20), { tone: 'mid' }) + S(k.cylinder(xCarga, yF, 1.3, 3, ZK + 150, P, 12), { tone: 'mid', crease: 'none' }) + k.dotsSvg([at([xCarga, yF, ZK + 153])], { size: 1, tone: 'hi' }));

  // ---------- CIR y barras prolongadas (siempre encima) ----------
  const cir = sol.cir, estable = cir[0] <= xCarga, col_ = estable ? 'green' : 'red';
  const yM = yF - 5, pc = W3(cir, yM), pA = W3(sol.A, yM), pB = W3(sol.B, yM), pD = W3(sol.D, yM), pC = W3(sol.C, yM);
  let marc = L(k.segment(pD, pc, P), { tone: col_, dashed: true }) + L(k.segment(pC, pc, P), { tone: col_, dashed: true });
  marc += k.dotsSvg([pA, pB, pC, pD].map(at), { size: 1.1, tone: 'hi' });
  marc += `<path class="iso-halo" d="${G.sphereOf(pc, 6.5, P).fill}" style="filter:blur(3px)"/>` + S(G.sphereOf(pc, 5, P), { tone: 'hi', lit: true });
  marc += L(G.circleOf(G.frameOf(pc, [0, 1, 0], [0, 0, 1], [1, 0, 0]), 0, 8.5, P), { tone: col_ });

  const cuerpo = `<g${fantasmaFondo}>${banco}</g>` + ordenar(items, V).map((i) => i.svg).join('') + `<g data-pieza="cir">${marc}</g>`;
  return { svg: cuerpo, sol, estable, cargas };
}

function pintar() {
  if (!raiz || !app_.modelo) return;
  const { svg, sol, estable, cargas } = construir();
  const lienzo = raiz.querySelector('.fig-lienzo');
  lienzo.innerHTML = k.figureSvg({ width: ANCHO, height: ALTO, label: `Rodilla policéntrica de cuatro barras en un banco de pruebas, flexionada ${estado.theta.toFixed(0)} grados, con su centro instantáneo de rotación marcado.`, body: svg });
  lienzo.firstElementChild.style.transform = `translate(${estado.px}px, ${estado.py}px) scale(${estado.zoom})`;
  const cir = sol.cir, M = app_.modelo;
  raiz.querySelector('[data-readout]').textContent = `θ ${fmt(estado.theta, 1)}°  ·  CIR x ${fmt(cir[0], 0)}  y ${fmt(cir[1], 0)} mm`;
  raiz.querySelector('#iso-theta-out').textContent = `${fmt(estado.theta, 0)}°`;
  raiz.querySelector('#iso-az-out').textContent = `${fmt(estado.azimut, 0)}°`;
  raiz.querySelector('#iso-el-out').textContent = `${fmt(estado.elev, 0)}°`;
  const est = raiz.querySelector('#iso-estado');
  est.className = 'aviso ' + (estable ? 'ok' : 'cuidado');
  est.innerHTML = estable
    ? '<span><strong>CIR detrás de la línea de carga.</strong> El peso empuja la rodilla contra su tope: se mantiene extendida sin esfuerzo del usuario.</span>'
    : '<span><strong>CIR delante de la línea de carga.</strong> La rodilla ya puede doblarse con poco esfuerzo: así empieza el balanceo.</span>';
  raiz.querySelector('#iso-tec').innerHTML = `A (${fmt(sol.A[0], 1)}, ${fmt(sol.A[1], 1)}) · B (${fmt(sol.B[0], 1)}, ${fmt(sol.B[1], 1)}) mm · φ₁ ${fmt((sol.phi1 * 180) / Math.PI, 1)}° · φ₂ ${fmt((sol.phi2 * 180) / Math.PI, 1)}° · discriminante ${fmt(sol.discriminante, 1)} · sen(barras) ${fmt(Math.abs(sol.paralelismo), 2)}`;
  // leyenda del modo de color
  const ley = raiz.querySelector('#iso-leyenda');
  if (estado.color === 'esfuerzo') {
    const crit = cargas.critica && [...M.piezas, ...M.ejes].find((p) => p.id === cargas.critica);
    ley.innerHTML = `<div class="iso-escala"><i></i><div><span>0 %</span><span>50 %</span><span>100 % de la fluencia</span></div></div>
      <p class="ayuda">Carga de referencia: todo el peso del usuario (${fmt(M.peso, 0)} N) sobre la línea de carga, con ${M.mat.nombre}. Factor de seguridad ${cargas.fs == null ? '—' : fmt(Math.min(cargas.fs, 99), 2)}${crit ? `; pieza más exigida: ${crit.nombre}` : ''}. Cálculo aproximado, no FEA.</p>`;
  } else if (estado.color === 'material') {
    ley.innerHTML = `<div class="iso-mats">${[M.materialId, 'acero'].map((id) => `<span><i style="background:${hex(COLOR_MATERIAL[id].rgb)}"></i>${COLOR_MATERIAL[id].nombre}</span>`).join('')}<span><i style="background:var(--hundido);border:1px solid var(--linea)"></i>Banco de pruebas (no es parte de la rodilla)</span></div>
      <p class="ayuda">Las 12 piezas maquinadas son de ${M.mat.nombre}; los cuatro pernos, de acero. Cambia el material en la pestaña Simulación.</p>`;
  } else ley.innerHTML = '';
}

function tema() { raiz.querySelector('.iso').dataset.theme = esOscuro() ? 'dark' : 'light'; pintar(); }

// Gestos: un dedo o el ratón giran la vista; dos dedos acercan y desplazan; doble toque restablece.
function gestos(zona) {
  const punteros = new Map();
  let previo = null, ultimoToque = 0;
  const media = () => { const p = [...punteros.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) }; };
  zona.addEventListener('pointerdown', (e) => {
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { zona.setPointerCapture(e.pointerId); } catch {}
    if (punteros.size === 2) previo = media();
    const ahora = performance.now();
    if (punteros.size === 1 && ahora - ultimoToque < 320) { Object.assign(estado, { zoom: 1, px: 0, py: 0, azimut: 45, elev: 28 }); sincronizar(); pintar(); }
    ultimoToque = ahora;
  });
  zona.addEventListener('pointermove', (e) => {
    const p = punteros.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (punteros.size === 1) {
      estado.azimut = Math.max(20, Math.min(160, estado.azimut - dx * 0.35));
      if (e.pointerType === 'mouse') estado.elev = Math.max(12, Math.min(55, estado.elev + dy * 0.25));
    } else if (punteros.size === 2 && previo) {
      const m = media();
      estado.zoom = Math.max(0.6, Math.min(4, (estado.zoom * m.d) / (previo.d || 1)));
      estado.px += m.x - previo.x; estado.py += m.y - previo.y;
      previo = m;
    }
    sincronizar(); pintar();
  });
  const fin = (e) => { punteros.delete(e.pointerId); previo = null; };
  zona.addEventListener('pointerup', fin); zona.addEventListener('pointercancel', fin);
  zona.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.shiftKey) return; e.preventDefault(); estado.zoom = Math.max(0.6, Math.min(4, estado.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); pintar(); }, { passive: false });
}
function sincronizar() {
  raiz.querySelector('#iso-az').value = estado.azimut;
  raiz.querySelector('#iso-el').value = estado.elev;
}

export function montar(cont, app) {
  app_ = app; raiz = cont;
  const M = app.modelo;
  cont.innerHTML = `
    <style>${k.ISO_CSS}
      .fig-rejilla{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,1fr);gap:16px;align-items:start}
      .fig-rejilla>*{min-width:0}
      .iso-figure{margin:0}
      .fig-lienzo{overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none;-webkit-user-select:none}
      .fig-lienzo:active{cursor:grabbing}
      .fig-lienzo svg{display:block;width:100%;height:auto;transform-origin:50% 50%}
      .fig-zoom{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .fig-lado{padding:14px;display:grid;gap:14px}
      .fig-piezas{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;list-style:none;margin:0;padding:0}
      .fig-piezas button{width:100%;text-align:left;border:1px solid var(--linea);background:var(--superficie);border-radius:var(--radio);padding:6px 10px;min-height:44px;font-size:.9rem;display:flex;gap:8px;align-items:center}
      .fig-piezas button b{font-family:var(--display);color:var(--guinda);min-width:1.4em}
      .fig-piezas button[aria-pressed=true]{background:var(--guinda-suave);border-color:var(--guinda)}
      .iso-escala i{display:block;height:10px;border-radius:5px;background:linear-gradient(90deg,#295ccc,#1f9e61,#edc21a,#cc211a)}
      .iso-escala div{display:flex;justify-content:space-between;font-size:.8rem;color:var(--tenue);margin-top:2px}
      .iso-mats{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.9rem}.iso-mats span{display:inline-flex;align-items:center;gap:6px}.iso-mats i{width:14px;height:14px;border-radius:3px;display:inline-block}
      @media(max-width:900px){.fig-rejilla{grid-template-columns:minmax(0,1fr)}}
    </style>
    <h2 class="seccion-titulo">Cómo funciona el mecanismo de 4 barras</h2>
    <p class="seccion-intro">La rodilla está montada en un banco de pruebas. Mueve el control para flexionarla: las dos líneas punteadas prolongan las barras c1 y c2, y donde se cruzan está el centro instantáneo de rotación (CIR), la esfera blanca. La varilla vertical es la línea de carga.</p>
    <div class="fig-rejilla">
      <div>
        <div class="iso">${k.plateHtml({ fig: 'Fig. 1', title: 'Rodilla policéntrica en banco de pruebas', hint: 'Arrastra para girar · dos dedos para acercar', readout: '', keys: [{ mark: 'lit', label: 'CIR' }, { mark: 'dashed', label: 'barras prolongadas' }, { mark: 'raised', label: 'piezas de la rodilla' }, { mark: 'edge', label: 'escala de 0° a 135°' }], caption: 'Verde: el CIR está detrás de la línea de carga (estable). Rojo: está delante.', body: '<div class="fig-lienzo"></div>' })}</div>
        <div class="fig-zoom"><button type="button" class="boton chico" data-zoom="1.25">Acercar</button><button type="button" class="boton chico" data-zoom="0.8">Alejar</button><button type="button" class="boton chico" data-zoom="0">Restablecer vista</button></div>
        <div class="campo" style="margin-top:12px"><label for="iso-theta">Flexión de la rodilla <output id="iso-theta-out"></output></label><input type="range" id="iso-theta" min="0" max="135" step="0.5" value="0"></div>
      </div>
      <div class="panel fig-lado">
        <div class="campo"><span class="rotulo">Color de las piezas</span>
          <div class="segmentado" id="iso-color"><button type="button" data-color="normal">Dibujo</button><button type="button" data-color="esfuerzo">Esfuerzo</button><button type="button" data-color="material">Material</button></div>
          <div id="iso-leyenda" style="display:grid;gap:6px"></div></div>
        <div class="campo"><label for="iso-az">Giro de la vista <output id="iso-az-out"></output></label><input type="range" id="iso-az" min="20" max="160" step="1" value="45"></div>
        <div class="campo"><label for="iso-el">Altura de la vista <output id="iso-el-out"></output></label><input type="range" id="iso-el" min="12" max="55" step="1" value="28">
          <div class="segmentado"><button type="button" data-az="45">Isométrica</button><button type="button" data-az="90">Lateral</button><button type="button" data-az="135">Opuesta</button></div></div>
        <div id="iso-estado" class="aviso ok"></div>
        <p class="formula solo-tecnico num" id="iso-tec"></p>
        <p class="ayuda solo-tecnico">Cierre de lazo: D + L₁·u(φ₁) = A, A + R(θ)(B₀ − A₀) = B, |B − C| = L₂. Longitudes: c1 ${fmt(M.mec.L1, 1)} mm, c2 ${fmt(M.mec.L2, 1)} mm, acoplador ${fmt(M.mec.L3, 1)} mm, base ${fmt(M.mec.L0, 1)} mm (estimadas).</p>
        <div><h3 style="font-size:1.05rem;margin-bottom:8px">Piezas <span class="ayuda">toca una para aislarla; las demás se atenúan</span></h3>
          <ul class="fig-piezas">${M.piezas.map((p) => `<li><button type="button" data-res="${p.id}" aria-pressed="false"><b>${p.item}</b>${p.nombre}</button></li>`).join('')}</ul></div>
        <div class="chips">${app.chipNorma('radcliffe')}${app.chipNorma('iso-13405')}</div>
      </div>
    </div>`;
  const th = cont.querySelector('#iso-theta'), az = cont.querySelector('#iso-az'), el = cont.querySelector('#iso-el');
  th.addEventListener('input', () => { estado.tocado = true; estado.theta = +th.value; pintar(); });
  az.addEventListener('input', () => { estado.azimut = +az.value; pintar(); });
  el.addEventListener('input', () => { estado.elev = +el.value; pintar(); });
  cont.querySelectorAll('[data-az]').forEach((b) => b.addEventListener('click', () => { estado.azimut = +b.dataset.az; sincronizar(); pintar(); }));
  cont.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    const f = +b.dataset.zoom;
    if (!f) Object.assign(estado, { zoom: 1, px: 0, py: 0, azimut: 45, elev: 28 }); else estado.zoom = Math.max(0.6, Math.min(4, estado.zoom * f));
    sincronizar(); pintar();
  }));
  const pintaColor = () => cont.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.color === estado.color));
  cont.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { estado.color = b.dataset.color; pintaColor(); pintar(); }));
  pintaColor();
  cont.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
    estado.resaltada = estado.resaltada === b.dataset.res ? null : b.dataset.res;
    cont.querySelectorAll('[data-res]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.res === estado.resaltada));
    pintar();
  }));
  gestos(cont.querySelector('.fig-lienzo'));
  tema();
  new MutationObserver(tema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', tema);
  // Recorrido en reposo: barre la flexión hasta que alguien toca el control.
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t0 = null;
  (function gira(ahora) {
    requestAnimationFrame(gira);
    if (quieto || estado.tocado || app_.estado.pestana !== 'mecanismo' || document.hidden) { t0 = null; return; }
    if (t0 == null) t0 = ahora;
    const s = ((ahora - t0) / 9000) % 1;
    estado.theta = 135 * (0.5 - 0.5 * Math.cos(s * 2 * Math.PI));
    th.value = estado.theta;
    pintar();
  })(performance.now());
  cont.querySelector('.fig-lienzo').addEventListener('pointerdown', () => { estado.tocado = true; });
  pintar();
}
export function alMostrar() { pintar(); }
export function alCambiarModelo() { pintar(); }
// Para la auditoría de líneas de la skill: fija una pose y devuelve el SVG.
export const __pose = (p) => { Object.assign(estado, p, { tocado: true }); pintar(); };
