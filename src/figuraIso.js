// Figura isométrica explicativa (skill "anatomy"): la rodilla montada en un banco de pruebas.
// Todo lo que se mueve y todo número mostrado sale del mismo mecanismo resuelto (cinematica.js).
import * as k from './iso/iso-kit.js';
import * as G from './iso/lathe.js';
import { CONFIG } from './config.js';
import { rot, sum, res, esc, unit, rad, fmt, aMundo } from './mat.js';

const ANCHO = 660, ALTO = 600;
const ZK = 150; // altura del centro de rodilla sobre el banco
const BASE = { x: -100, y: -66, w: 215, d: 132, r: 8 };
const BASE_H = 10, PIE_H = 5;
const Y_ESCALA = -52; // la placa del transportador queda detrás del mecanismo
const R_ESCALA = 128;

let estado = { theta: 0, azimut: 45, resaltada: null, tocado: false, visible: false };
let raiz, app_;

const FY = (y) => G.frameOf([0, y, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]); // prismas a lo largo de y; polígono en (z, x)
const pz = ([x, yv]) => [ZK + yv, x]; // punto del plano sagital (x, altura) → coordenadas (z, x) del marco FY

function construir(theta, azimut, resaltada) {
  const M = app_.modelo, mec = M.mec, sol = mec.resolver(theta);
  const cfg = CONFIG.piezas, m = CONFIG.mecanismo, d = CONFIG.pernos.diametro;
  const P = k.fitProjection(
    [...k.boxCorners(BASE, -BASE_H - PIE_H, 0), [-R_ESCALA - 6, Y_ESCALA, ZK + 40], [20, Y_ESCALA, ZK + 40 + R_ESCALA + 8], [-30, 40, ZK + 132], [120, 0, ZK]],
    ANCHO, ALTO, { pad: 34, azimuth: azimut, elevation: 28 });
  const at = (p) => k.iso(p, P);
  const items = [];
  const S = (paths, st) => k.solidSvg(paths, st);
  const L = (dd, st) => k.lineSvg(dd, st);
  const pon = (ref, svg, pieza, sesgo = 0) => items.push({ z: k.depthOf(ref, P) + sesgo, svg: pieza ? `<g data-pieza="${pieza}">${svg}</g>` : svg });
  const tono = (id, base = 'mid') => (resaltada && resaltada === id ? { tone: 'hi', lit: true } : { tone: base });
  const W3 = ([x, yv], y) => [x, y, ZK + yv]; // sagital → mundo
  const muslo = (p) => aMundo(sol.muslo, p);

  // ---------- banco ----------
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
  items.push({ z: -1e6, svg: banco });

  // ---------- columna: mordaza, pilón y tubo receptor ----------
  const ba = cfg.base, tb = cfg.tuboReceptor;
  const zTubo0 = ZK + ba.yTope - ba.espesorPlaca - tb.largo, zTubo1 = ZK + ba.yTope - ba.espesorPlaca;
  const mord = { x: -26, y: -26, w: 52, d: 52, r: 5 };
  let col = S(k.slabOf(mord, 0, 22, P, 6, 0.9), { tone: 'mid' });
  col += L(k.planOutline(k.insetPlan(mord, 4), 22, P), { tone: 'faint' }) + L(k.sideSeam(mord, 11, P, 6), { tone: 'faint' });
  col += k.dotsSvg(k.corners(mord, 6).map(([x, y]) => at([x, y, 22])), { size: 0.5 });
  col += S(k.cylinder(0, 0, 19, 22, 5, P, 40, 0.6), { tone: 'mid' });
  col += S(k.cylinder(0, 0, 15, 27, zTubo0 - 27, P, 40), { tone: 'mid', crease: 'none' });
  col += L([50, 72].map((z) => k.sideArc(0, 0, 15, z, P, 24)).join(''), { tone: 'faint' });
  pon([0, 0, 40], col, null, -40);
  // perilla de la mordaza (moleteada)
  const per = [mord.x + mord.w + 7, 0];
  pon([per[0], per[1], 11], S(k.slabOf({ x: mord.x + mord.w, y: -2, w: 4, d: 4, r: 1 }, 9, 4, P, 2), { tone: 'mid', crease: 'none' }) + S(k.cylinder(per[0], per[1], 6, 5, 12, P, 28), { tone: 'mid' }) + L(k.knurl(per[0], per[1], 6, 5, 17, 30, P), { tone: 'lo' }), null, -20);
  pon([0, 0, (zTubo0 + zTubo1) / 2], S(k.cylinder(0, 0, tb.dext / 2, zTubo0, tb.largo, P, 44, 0.7), tono('tubo')) + L(k.sideArc(0, 0, tb.dext / 2, zTubo0 + 8, P, 24), { tone: 'faint' }), 'tubo', -30);

  // ---------- parte fija de la rodilla ----------
  pon([0, 0, ZK + ba.yTope - 4], S(k.slabOf({ x: ba.xMin, y: -ba.anchoZ / 2, w: ba.xMax - ba.xMin, d: ba.anchoZ, r: 3 }, ZK + ba.yTope - ba.espesorPlaca, ba.espesorPlaca, P, 4, 0.7), tono('base')), 'base', -25);
  const bloqueFijo = (id, c, mw, ySup, sep) => {
    const plan = { x: c[0] - mw, y: -sep, w: 2 * mw, d: 2 * sep, r: 1.5 };
    const z0 = ZK + ba.yTope, h = ySup - ba.yTope;
    pon([c[0], 0, z0 + h / 2], S(k.slabOf(plan, z0, h, P, 3, 0.5), tono(id)) + k.dotsSvg([[c[0], -sep + 5], [c[0], sep - 5]].map(([x, y]) => at([x, y, z0 + h])), { size: 0.45 }), id);
  };
  bloqueFijo('infDelantera', m.D, cfg.barraInfDelantera.medioAnchoX, cfg.barraInfDelantera.ySuperior, cfg.separacionC1);
  bloqueFijo('infTrasera', m.C, cfg.barraInfTrasera.medioAnchoX, cfg.barraInfTrasera.ySuperior, cfg.separacionC2);

  // ---------- barras laterales (prismas a lo largo de y, reconstruidos en cada ángulo) ----------
  const bl = cfg.barraLateral;
  const estadio = (a, b, w, n = 12) => {
    const u = unit(res(b, a)), nrm = [-u[1], u[0]], r = w / 2, pts = [];
    const a0 = Math.atan2(nrm[1], nrm[0]);
    for (let i = 0; i <= n; i++) { const an = a0 - Math.PI + (i / n) * Math.PI; pts.push([b[0] + r * Math.cos(an), b[1] + r * Math.sin(an)]); }
    for (let i = 0; i <= n; i++) { const an = a0 + (i / n) * Math.PI; pts.push([a[0] + r * Math.cos(an), a[1] + r * Math.sin(an)]); }
    return pts.map(pz);
  };
  const barra = (id, a, b, y0, y1) => {
    const medio = esc(sum(a, b), 0.5), F = FY(0);
    const cara = y1 > 0 ? y1 : y0; // cara exterior
    let svg = S(G.prismOf(F, estadio(a, b, bl.ancho), y0, y1, P), tono(id, 'hi'));
    pon(W3(medio, (y0 + y1) / 2), svg, id);
  };
  const s1 = cfg.separacionC1, s2 = cfg.separacionC2, e = bl.espesor;
  barra('c1Izq', sol.D, sol.A, -s1 - e, -s1);
  barra('c1Der', sol.D, sol.A, s1, s1 + e);
  barra('c2Izq', sol.C, sol.B, -s2 - e, -s2);
  barra('c2Der', sol.C, sol.B, s2, s2 + e);
  // barra trasera (travesaño entre las c2)
  {
    const u = sol.u2, nrm = [-u[1], u[0]], c = esc(sum(sol.C, sol.B), 0.5), bt = cfg.barraTrasera;
    const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => pz(sum(c, sum(esc(u, (i * bt.largo) / 2), esc(nrm, (j * bt.alto) / 2)))));
    pon(W3(c, 0), S(G.prismOf(FY(0), q, -s2, s2, P), tono('barraTrasera')), 'barraTrasera');
  }
  // pernos (discos a lo largo de y) con su cabeza
  const perno = (c, sep, id) => {
    const L_ = sep + e + 2;
    for (const sg of [-1, 1]) {
      const F = G.frameOf([c[0], 0, ZK + c[1]], [0, sg, 0], [0, 0, 1], [sg, 0, 0]);
      pon([c[0], sg * (L_ + 1), ZK + c[1]], S(G.disc(sep + e, L_, d / 2 + 1.2, F, P), { tone: 'mid' }) + k.dotsSvg([at([c[0], sg * L_, ZK + c[1]])], { size: 0.6, tone: 'hi' }), null, sg * 0.5);
    }
  };
  perno(sol.A, s1); perno(sol.D, s1); perno(sol.B, s2); perno(sol.C, s2);

  // ---------- cuerpo superior (gira con θ) ----------
  const ad = cfg.adaptador;
  const rectGirado = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((p) => pz(muslo(p)));
  const bloqueMovil = (id, c0, mw, yInf, sep) => {
    const centro = muslo([c0[0], (yInf + ad.yBase) / 2]);
    pon(W3(centro, 0), S(G.prismOf(FY(0), rectGirado(c0[0] - mw, yInf, c0[0] + mw, ad.yBase), -sep, sep, P), tono(id)), id);
  };
  bloqueMovil('supDelantera', m.A, cfg.barraSupDelantera.medioAnchoX, cfg.barraSupDelantera.yInferior, s1);
  bloqueMovil('supTrasera', m.B, cfg.barraSupTrasera.medioAnchoX, cfg.barraSupTrasera.yInferior, s2);
  const yPl = ad.yBase + ad.espesorPlaca;
  const arriba = rot([0, 1], sol.muslo.ang), ejeM = [arriba[0], 0, arriba[1]];
  {
    const c = muslo([(ad.xMin + ad.xMax) / 2, ad.yBase + ad.espesorPlaca / 2]);
    pon(W3(c, 0), S(G.prismOf(FY(0), rectGirado(ad.xMin, ad.yBase, ad.xMax, yPl), -ad.anchoZ / 2, ad.anchoZ / 2, P), tono('adaptador')), 'adaptador', 2);
    const o = W3(muslo([m.ejePilonX, yPl]), 0), F = G.frameAlong(o, ejeM);
    let anillo = S(G.ringBand(0, ad.anilloAlto, ad.anilloDint / 2, ad.anilloDext / 2, F, P), tono('adaptador'));
    pon(W3(muslo([m.ejePilonX, yPl + ad.anilloAlto / 2]), 0), anillo, 'adaptador', 4);
    // muñón de prueba (socket) dentro del receptáculo, con manija moleteada
    const s0 = 3, s1_ = 46;
    let soc = S(G.disc(s0, s1_, ad.anilloDint / 2 - 1.5, F, P), { tone: 'lo' });
    soc += L(G.arcOf(F, 26, ad.anilloDint / 2 - 1.5, P), { tone: 'faint' });
    soc += S(G.disc(s1_, s1_ + 5, ad.anilloDint / 2 + 2, F, P), { tone: 'mid' });
    soc += L(G.ribsOf(F, s1_, s1_ + 5, ad.anilloDint / 2 + 2, 40, P), { tone: 'lo' });
    pon(W3(muslo([m.ejePilonX, yPl + 30]), 0), soc, null, 6);
  }

  // ---------- transportador de 0° a 135° (placa fija detrás) ----------
  {
    const c = [0, 40]; // centro de la escala en el plano sagital
    const sector = [c];
    for (let g = -4; g <= 139; g += 3) sector.push(sum(c, rot([0, R_ESCALA], rad(g))));
    const F = FY(0);
    let esc_ = S(G.prismOf(F, sector.map(pz), Y_ESCALA - 2, Y_ESCALA, P), { tone: 'lo' });
    const cara = Y_ESCALA + 0.05;
    let menores = '', mayores = '', arco = '';
    for (let g = 0; g <= 135; g += 5) {
      const mayor = g % 45 === 0, medio = g % 15 === 0;
      const r0 = R_ESCALA - (mayor ? 16 : medio ? 11 : 6);
      const a = W3(sum(c, rot([0, r0], rad(g))), cara), b = W3(sum(c, rot([0, R_ESCALA - 1.5], rad(g))), cara);
      (mayor ? (mayores += k.segment(a, b, P)) : (menores += k.segment(a, b, P)));
    }
    const ptsArco = [];
    for (let g = 0; g <= 135; g += 3) ptsArco.push(at(W3(sum(c, rot([0, R_ESCALA - 20], rad(g))), cara)));
    arco = 'M' + ptsArco.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L');
    esc_ += L(arco, { tone: 'faint' }) + L(menores, { tone: 'lo' }) + L(mayores, { tone: 'hi' });
    esc_ += k.dotsSvg([at(W3(c, cara))], { size: 0.9, tone: 'mid' });
    // aguja: marca el ángulo de flexión sobre la escala
    const punta = W3(sum(c, rot([0, R_ESCALA - 22], rad(theta))), cara + 0.3), pie = W3(sum(c, rot([0, 14], rad(theta))), cara + 0.3);
    esc_ += L(k.segment(W3(c, cara + 0.3), punta, P), { tone: 'lit' }) + k.dotsSvg([at(punta)], { size: 1.3, tone: 'hi' });
    pon([-40, Y_ESCALA - 1, ZK + 60], esc_, null, -1e4);
    // postes de la placa
    for (const x of [-R_ESCALA + 26, 8]) pon([x, Y_ESCALA - 1, 30], S(k.cylinder(x, Y_ESCALA - 1, 2.6, 0, ZK - 20 + (x > 0 ? 60 : 68), P, 16), { tone: 'mid', crease: 'none' }) + S(k.cylinder(x, Y_ESCALA - 1, 5, 0, 3, P, 20), { tone: 'mid' }), null, -1e4 + 1);
  }

  // ---------- línea de carga (varilla de plomada) y CIR ----------
  const yF = s1 + e + 9; // plano frontal, por delante de las barras
  const xCarga = CONFIG.diseno.desplazamientoPosteriorEjeMm;
  pon([xCarga, yF, 100], S(k.cylinder(xCarga, yF, 4.2, 0, 3, P, 20), { tone: 'mid' }) + S(k.cylinder(xCarga, yF, 1.3, 3, ZK + 150, P, 12), { tone: 'mid', crease: 'none' }) + k.dotsSvg([at([xCarga, yF, ZK + 153])], { size: 1, tone: 'hi' }), null, 30);
  const cir = sol.cir, estable = cir[0] <= xCarga;
  const col_ = estable ? 'green' : 'red';
  const pc = W3(cir, yF), pA = W3(sol.A, yF), pB = W3(sol.B, yF), pD = W3(sol.D, yF), pC = W3(sol.C, yF);
  let marc = L(k.segment(pD, pc, P), { tone: col_, dashed: true }) + L(k.segment(pC, pc, P), { tone: col_, dashed: true });
  marc += k.dotsSvg([pA, pB, pC, pD].map(at), { size: 1.1, tone: 'hi' });
  marc += `<path class="iso-halo" d="${G.sphereOf(pc, 6.5, P).fill}" style="filter:blur(3px)"/>` + S(G.sphereOf(pc, 5, P), { tone: 'hi', lit: true });
  marc += L(G.circleOf(G.frameOf(pc, [0, 1, 0], [0, 0, 1], [1, 0, 0]), 0, 8.5, P), { tone: col_ });
  items.push({ z: 1e6, svg: `<g data-pieza="cir">${marc}</g>` });

  items.sort((a, b) => a.z - b.z);
  return { svg: items.map((i) => i.svg).join(''), sol, estable };
}

function pintar() {
  if (!raiz || !app_.modelo) return;
  const { svg, sol, estable } = construir(estado.theta, estado.azimut, estado.resaltada);
  raiz.querySelector('.fig-lienzo').innerHTML = k.figureSvg({ width: ANCHO, height: ALTO, label: `Rodilla policéntrica de cuatro barras en un banco de pruebas, flexionada ${estado.theta.toFixed(0)} grados, con su centro instantáneo de rotación marcado.`, body: svg });
  const cir = sol.cir;
  raiz.querySelector('[data-readout]').textContent = `θ ${fmt(estado.theta, 1)}°  ·  CIR x ${fmt(cir[0], 0)}  y ${fmt(cir[1], 0)} mm`;
  raiz.querySelector('#iso-theta-out').textContent = `${fmt(estado.theta, 0)}°`;
  raiz.querySelector('#iso-az-out').textContent = `${fmt(estado.azimut, 0)}°`;
  const est = raiz.querySelector('#iso-estado');
  est.className = 'aviso ' + (estable ? 'ok' : 'cuidado');
  est.innerHTML = estable
    ? `<span><strong>CIR detrás de la línea de carga.</strong> El peso empuja la rodilla contra su tope: se mantiene extendida sin esfuerzo del usuario.</span>`
    : `<span><strong>CIR delante de la línea de carga.</strong> La rodilla ya puede doblarse con poco esfuerzo: así empieza el balanceo.</span>`;
  raiz.querySelector('#iso-tec').innerHTML = `A (${fmt(sol.A[0], 1)}, ${fmt(sol.A[1], 1)}) · B (${fmt(sol.B[0], 1)}, ${fmt(sol.B[1], 1)}) mm · φ₁ ${fmt((sol.phi1 * 180) / Math.PI, 1)}° · φ₂ ${fmt((sol.phi2 * 180) / Math.PI, 1)}° · discriminante ${fmt(sol.discriminante, 1)} · sen(barras) ${fmt(Math.abs(sol.paralelismo), 2)}`;
}

function tema() {
  const oscuro = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  raiz.querySelector('.iso').dataset.theme = oscuro ? 'dark' : 'light';
}

export function montar(cont, app) {
  app_ = app; raiz = cont;
  const M = app.modelo;
  cont.innerHTML = `
    <style>${k.ISO_CSS}
      .fig-rejilla{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr);gap:16px;align-items:start}
      .fig-rejilla>*{min-width:0}
      .iso-figure{margin:0}.fig-lienzo svg{display:block;width:100%;height:auto}
      .fig-lado{padding:14px;display:grid;gap:14px}
      .fig-piezas{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;list-style:none;margin:0;padding:0}
      .fig-piezas button{width:100%;text-align:left;border:1px solid var(--linea);background:var(--superficie);border-radius:var(--radio);padding:6px 10px;min-height:44px;font-size:.9rem;display:flex;gap:8px;align-items:center}
      .fig-piezas button b{font-family:var(--display);color:var(--guinda);min-width:1.4em}
      .fig-piezas button[aria-pressed=true]{background:var(--guinda-suave);border-color:var(--guinda)}
      @media(max-width:900px){.fig-rejilla{grid-template-columns:minmax(0,1fr)}}
    </style>
    <h2 class="seccion-titulo">Cómo funciona el mecanismo de 4 barras</h2>
    <p class="seccion-intro">La rodilla está montada en un banco de pruebas. Mueve el control para flexionarla: las dos líneas punteadas prolongan las barras c1 y c2, y donde se cruzan está el centro instantáneo de rotación (CIR), la esfera blanca. La varilla vertical es la línea de carga.</p>
    <div class="fig-rejilla">
      <div class="iso">${k.plateHtml({ fig: 'Fig. 1', title: 'Rodilla policéntrica en banco de pruebas', hint: 'Mueve la flexión y gira la vista', readout: '', keys: [{ mark: 'lit', label: 'CIR' }, { mark: 'dashed', label: 'barras prolongadas' }, { mark: 'raised', label: 'piezas de aluminio' }, { mark: 'edge', label: 'escala de 0° a 135°' }], caption: 'Verde: el CIR está detrás de la línea de carga (estable). Rojo: está delante.', body: '<div class="fig-lienzo"></div>' })}</div>
      <div class="panel fig-lado">
        <div class="campo"><label for="iso-theta">Flexión de la rodilla <output id="iso-theta-out"></output></label><input type="range" id="iso-theta" min="0" max="135" step="0.5" value="0"></div>
        <div class="campo"><label for="iso-az">Ángulo de vista <output id="iso-az-out"></output></label><input type="range" id="iso-az" min="20" max="160" step="1" value="45">
          <div class="segmentado"><button type="button" data-az="45">Isométrica</button><button type="button" data-az="90">Lateral</button><button type="button" data-az="135">Isométrica opuesta</button></div></div>
        <div id="iso-estado" class="aviso ok"></div>
        <p class="formula solo-tecnico num" id="iso-tec"></p>
        <p class="ayuda solo-tecnico">Cierre de lazo: D + L₁·u(φ₁) = A, A + R(θ)(B₀ − A₀) = B, |B − C| = L₂. Longitudes: c1 ${fmt(M.mec.L1, 1)} mm, c2 ${fmt(M.mec.L2, 1)} mm, acoplador ${fmt(M.mec.L3, 1)} mm, base ${fmt(M.mec.L0, 1)} mm (estimadas).</p>
        <div><h3 style="font-size:1.05rem;margin-bottom:8px">Piezas <span class="ayuda">toca una para resaltarla</span></h3>
          <ul class="fig-piezas">${M.piezas.map((p) => `<li><button type="button" data-res="${p.id}" aria-pressed="false"><b>${p.item}</b>${p.nombre}</button></li>`).join('')}</ul></div>
        <div class="chips">${app.chipNorma('radcliffe')}${app.chipNorma('iso-13405')}</div>
      </div>
    </div>`;
  const th = cont.querySelector('#iso-theta'), az = cont.querySelector('#iso-az');
  th.addEventListener('input', () => { estado.tocado = true; estado.theta = +th.value; pintar(); });
  az.addEventListener('input', () => { estado.azimut = +az.value; pintar(); });
  cont.querySelectorAll('[data-az]').forEach((b) => b.addEventListener('click', () => { estado.azimut = +b.dataset.az; az.value = estado.azimut; pintar(); }));
  cont.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
    estado.resaltada = estado.resaltada === b.dataset.res ? null : b.dataset.res;
    cont.querySelectorAll('[data-res]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.res === estado.resaltada));
    pintar();
  }));
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
  pintar();
}
export function alMostrar() { pintar(); }
export function alCambiarModelo() { pintar(); }
