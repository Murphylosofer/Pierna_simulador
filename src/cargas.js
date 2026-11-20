// Cargas y esfuerzos por estática plana (vigas y pernos). NO es un análisis por elementos finitos.
// Todo se calcula en el marco de la pierna (adaptador inferior), en N y mm, con la geometría real de SolidWorks.
import { CONFIG, G } from './config.js';
import { cruz, res, sum, esc, norma, unit, punto, aMundo, dirMundo } from './mat.js';
import { ensambleActual } from './ensamble.js';

const det3 = (m) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
function resolver3(M, b) {
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return null;
  return [0, 1, 2].map((k) => det3(M.map((f, i) => f.map((v, j) => (j === k ? b[i] : v)))) / D);
}

/**
 * Estática plana de la rodilla real (Ensamblaje1). Marco de la pierna (adaptador inferior), N y mm.
 * Convención: F1·u1 + F2·u2 = E con u = dirección del eslabón de la pierna hacia el muslo; F > 0 = compresión.
 * El par 1 es el diagonal (A–D, por dentro) y el 2 el trasero (B–C, por fuera).
 * Con la rodilla en extensión, el canto de los eslabones diagonales apoya en el tope escondido del AFS1.
 * Entonces el par diagonal deja de trabajar solo a dos fuerzas: carga en D, en A y en el tope (y se flexiona).
 * Incógnitas en ese caso: fuerza en D (2 componentes), F2 y la fuerza del tope Fs ≥ 0.
 * @param sol       solución del mecanismo (cinematica.resolver)
 * @param externas  fuerzas externas sobre la pierna [{p:[x,y], F:[fx,fy]}] (reacción del suelo, peso distal…)
 * @param mat       material de las piezas (en el ensamble de SolidWorks también los ejes son del mismo aluminio)
 */
export function resolverCargas(sol, externas, mat) {
  const g = CONFIG.geometria, el = g.eslabones, ej = g.ejes, a = g.afs1, b = g.adaptadorInferior;
  const ens = ensambleActual(), tp = ens.tope;
  const E = externas.reduce((s, e) => sum(s, e.F), [0, 0]);
  const ME = externas.reduce((s, e) => s + cruz(e.p, e.F), 0); // momento respecto al origen (centro de referencia), + = extensión
  const { u1, u2, A, B, C, D } = sol;
  const w = el.ancho, t = el.espesor, d = ej.diametro, Ap = (Math.PI * d * d) / 4;

  // Tope escondido: punto de apoyo y dirección de la fuerza del taco sobre el eslabón, llevados a la pierna.
  const topeP = aMundo(sol.muslo, tp.puntoApoyo);
  const nL = dirMundo(sol.muslo, tp.normal);
  let F1, F2, Fs = 0, Mc = 0, enTope = false, fD = null, gA = null;
  if (sol.theta < 1.5) {
    // Pierna: fD − F2·u2 + E = 0 y momentos ⇒ F2; eslabón diagonal: momentos respecto a A ⇒ Fs.
    const F2t = (cruz(D, E) - ME) / cruz(res(D, C), u2);
    const fDt = res(esc(u2, F2t), E); // fuerza del eslabón diagonal SOBRE la pierna, en D
    const Fst = cruz(res(D, A), fDt) / cruz(res(topeP, A), nL);
    if (Fst >= 0) { enTope = true; F2 = F2t; fD = fDt; Fs = Fst; gA = res(fD, esc(nL, Fs)); F1 = -punto(fD, u1); }
  }
  if (!enTope) {
    const den = cruz(u1, u2);
    F1 = cruz(E, u2) / den;
    F2 = cruz(u1, E) / den;
    Mc = ME - F1 * cruz(D, u1) - F2 * cruz(C, u2); // par que debe aportar el usuario (cadera)
    fD = esc(u1, -F1); gA = esc(u1, -F1);
  }
  // Fuerzas sobre cada cuerpo (para los diagramas de cuerpo libre).
  const fuerzas = {
    pierna: { D: fD, C: esc(u2, -F2) },
    muslo: { A: esc(gA, -1), B: esc(u2, F2), tope: esc(nL, -Fs) },
    diagonal: { A: gA, D: esc(fD, -1), tope: esc(nL, Fs) },
    trasero: { B: esc(u2, -F2), C: esc(u2, F2) },
  };
  const FA = norma(gA), FD = norma(fD), R = esc(u1, F1), Rt = 0;
  // Flexión del par diagonal en el punto de apoyo del tope: momento de la fuerza en D respecto a ese punto.
  const Mdiag = enTope ? Math.abs(cruz(res(D, topeP), fD)) : 0;

  const magE = norma(E);
  const MCir = sol.cir ? externas.reduce((s, e) => s + cruz(res(e.p, sol.cir), e.F), 0) : 0;
  const brazoRodilla = magE > 1e-6 ? ME / magE : 0;
  const brazoCir = magE > 1e-6 ? MCir / magE : 0;

  // ---------- Esfuerzos aproximados (vigas y pernos) ----------
  // Par de eslabones: N = F/2 por eslabón. Con el tope, también flexión (M/2 por eslabón) y aplastamiento en A.
  const barra = (F, M = 0, Fpin = Math.abs(F)) => {
    const N = Math.abs(F) / 2;
    const neta = N / ((w - d) * t), aplast = Fpin / 2 / (d * t);
    const sb = M ? (6 * (M / 2)) / (t * w * w) + N / (w * t) : 0;
    const sigma = Math.max(neta, aplast, sb);
    return { N, neta, aplast, flexion: sb, sigma, tipo: sigma === sb ? 'flexión por el apoyo en el tope + axial' : neta >= aplast ? 'tracción/compresión en sección neta' : 'aplastamiento en el barreno' };
  };
  // Perno: cada eslabón (5 mm) carga F/2 junto a la pared (4 mm): brazo = t/2 + pared/2.
  const perno = (F) => {
    const M = (Math.abs(F) / 2) * (t / 2 + a.pared / 2);
    const flexion = (32 * M) / (Math.PI * d ** 3), tau = Math.abs(F) / (2 * Ap);
    return { tau, flexion, sigma: Math.max(flexion, Math.sqrt(3) * tau), tipo: flexion >= Math.sqrt(3) * tau ? 'flexión del perno' : 'cortante doble' };
  };
  const aplastPared = (F, dd = d) => Math.abs(F) / 2 / (dd * a.pared);
  // Placa del AFS1: viga entre las dos paredes (claro de 47 mm) con la carga del socket al centro (M = F·L/4).
  const secc = seccionPlacaAFS1();
  const claro = a.ancho - 2 * a.pared, tPlaca = secc.tMin;
  const sPlaca = (((magE * claro) / 4) * secc.c) / secc.I;
  // Contacto eslabón–tope: dos cantos de 5 mm sobre la cara útil, presión triangular (pico = 2 × promedio).
  const sTope = Fs > 0 ? (2 * Fs) / (2 * t * tp.largoApoyo) : 0;
  // Base del adaptador inferior: voladizo de la pared al cilindro.
  const tBase = b.base.yArriba - b.yAbajo, vuelo = a.ancho / 2 - a.pared / 2 - b.cilindro.diametro / 2;
  const sBase = (6 * ((magE / 2) * vuelo)) / (b.cilindro.diametro * tBase * tBase);
  const mayor = (...xs) => xs.reduce((p, q) => (q.sigma > p.sigma ? q : p));

  const diagonal = barra(F1, Mdiag, FA);
  const trasero = barra(F2);
  const esfuerzos = {
    afs1: mayor({ sigma: sPlaca, tipo: 'flexión de la placa entre paredes (sección con ranura)' },
      { sigma: aplastPared(FA), tipo: 'aplastamiento en el barreno A' }, { sigma: aplastPared(F2), tipo: 'aplastamiento en el barreno B' },
      { sigma: sTope, tipo: 'aplastamiento en el tope escondido (pico)' }),
    adaptadorInferior: mayor({ sigma: sBase, tipo: `flexión de la base (${tBase.toFixed(1)} mm) entre pared y cilindro` },
      { sigma: aplastPared(FD), tipo: 'aplastamiento en el barreno D' }, { sigma: aplastPared(F2), tipo: 'aplastamiento en el barreno C' }),
    eslabonDiagDer: diagonal, eslabonDiagIzq: diagonal, eslabonTrasDer: trasero, eslabonTrasIzq: trasero,
    pernoA: perno(FA), pernoD: perno(FD), pernoB: perno(F2), pernoC: perno(F2),
  };

  let fs = Infinity, critica = null;
  for (const [id, e] of Object.entries(esfuerzos)) {
    const Sy = mat?.fluenciaMPa;
    e.fluencia = Sy ?? null;
    e.uso = Sy ? e.sigma / Sy : null; // 1.0 = fluencia
    e.fs = Sy && e.sigma > 1e-9 ? Sy / e.sigma : Infinity;
    if (Sy && e.fs < fs) { fs = e.fs; critica = id; }
  }
  if (!mat?.fluenciaMPa) { fs = null; critica = null; }

  return {
    E, magE, ME, MCir, brazoRodilla, brazoCir, F1, F2, Fs, Mc, enTope, R, Rt, FA, FD, fuerzas, Mdiag,
    estable: MCir >= 0, // la línea de carga pasa por delante del CIR ⇒ momento de extensión
    esfuerzos, fs, critica,
    sigmaMax: critica ? esfuerzos[critica].sigma : null,
    cortantePernoMax: Math.max(esfuerzos.pernoA.tau, esfuerzos.pernoB.tau, esfuerzos.pernoC.tau, esfuerzos.pernoD.tau),
    flexionBarraMax: Math.max(esfuerzos.pernoA.flexion, esfuerzos.pernoB.flexion, esfuerzos.pernoC.flexion, esfuerzos.pernoD.flexion),
    topeS: topeP, topeN: nL, tPlaca, tBase,
  };
}

// Resultado de SolidWorks escalado a otra carga. El estudio es lineal (pequeños desplazamientos, material elástico),
// así que el esfuerzo y el desplazamiento son proporcionales a la fuerza: los dos estudios dan la misma constante.
export function solidworksPara(F) {
  const sw = CONFIG.solidworks, [e1, e2] = sw.estudios;
  const k = (e1.vonMisesMaxMPa / e1.cargaN + e2.vonMisesMaxMPa / e2.cargaN) / 2;
  const kd = (e1.desplMaxMm / e1.cargaN + e2.desplMaxMm / e2.cargaN) / 2;
  const ke = (e1.deformMax / e1.cargaN + e2.deformMax / e2.cargaN) / 2;
  const kEnt = (sw.entornoMPa.pie / e1.cargaN + sw.entornoMPa.marcha / e2.cargaN) / 2;
  const sigma = k * F, Sy = sw.propiedades.fluenciaMPa;
  const exacto = sw.estudios.find((e) => Math.abs(e.cargaN - F) < 0.5);
  return { F, sigma, entorno: kEnt * F, fs: sigma > 0 ? Sy / sigma : Infinity, fsEntorno: F > 0 ? Sy / (kEnt * F) : Infinity,
    despl: kd * F, deform: ke * F, k, Sy, exacto, masaKg: F / G };
}

// Momento de inercia de la sección de la placa del AFS1 en el plano medio (z = 0): franjas de 0.25 mm en x,
// cada una desde el fondo inclinado hasta la cara superior, menos la profundidad de la ranura donde la corta.
let seccionCache = null;
export function seccionPlacaAFS1() {
  if (seccionCache) return seccionCache;
  const a = CONFIG.geometria.afs1, ch = 0; // los STL no tienen chaflán
  const x1 = a.frenteAbajo[0], pend = (a.placa.yFondoFrente - a.placa.yFondoAtras) / (x1 - a.xAtras);
  const rE = a.ranura.dExt / 2, rI = a.ranura.dInt / 2, dx = 0.25, tiras = [];
  for (let x = a.xAtras + dx / 2; x < x1; x += dx) {
    let y0 = a.placa.yFondoAtras + (x - a.xAtras) * pend;
    if (x < a.xAtras + ch) y0 = Math.max(y0, a.placa.yFondoAtras + ch - (x - a.xAtras)); // chaflán
    const r = Math.abs(x - a.ranura.centroX);
    const y1 = r <= rE && r >= rI ? a.yArriba - a.ranura.profundidad : a.yArriba;
    if (y1 > y0) tiras.push({ y0, y1 });
  }
  const A = tiras.reduce((s, t) => s + (t.y1 - t.y0) * dx, 0);
  const yc = tiras.reduce((s, t) => s + (t.y1 - t.y0) * dx * (t.y0 + t.y1) / 2, 0) / A;
  const I = tiras.reduce((s, t) => s + dx * ((t.y1 - yc) ** 3 - (t.y0 - yc) ** 3) / 3, 0);
  const c = Math.max(a.yArriba - yc, ...tiras.map((t) => yc - t.y0));
  const tMin = Math.min(...tiras.map((t) => t.y1 - t.y0));
  return (seccionCache = { A, yc, I, c, tMin });
}

// Prueba simulada ISO 10328: carga sobre la línea de prueba con la rodilla en extensión.
export function pruebaISO(mec, mat) {
  const iso = CONFIG.iso10328;
  const sol = mec.resolver(0);
  const filas = [];
  for (const [nivel, datos] of Object.entries(iso.niveles)) {
    const fila = { nivel, masaKg: datos.masaKg, condiciones: {} };
    let pasaTodo = true;
    for (const cond of ['I', 'II']) {
      const des = iso.desplazamientos[cond];
      const pT = [des.tobillo, -iso.distanciaRodillaTobillo], pK = [des.rodilla, 0];
      const dir = res(pK, pT), L = norma(dir), u = [dir[0] / L, dir[1] / L];
      const carga = (F) => resolverCargas(sol, [{ p: pT, F: [u[0] * F, u[1] * F] }], mat);
      const f = datos[cond];
      const rP = carga(f.prueba), rU = carga(f.ultimaSup), rC = carga(f.ciclica);
      let res_ = { fuerzas: f };
      if (mat?.fluenciaMPa) {
        // Estática de prueba: ninguna pieza supera la fluencia. Última: ninguna supera la resistencia última.
        const usoUlt = Math.max(...Object.values(rU.esfuerzos).map((e) => e.sigma / mat.ultimaMPa));
        // Fatiga (Goodman) en las barras laterales con Kt; R ≈ 0 ⇒ σa = σm = Kt·σ/2.
        const sigF = Math.max(rC.esfuerzos.eslabonDiagDer.sigma, rC.esfuerzos.eslabonTrasDer.sigma) * iso.concentracionEsfuerzo;
        const sa = sigF / 2, sm = sigF / 2;
        const fsFatiga = 1 / (sa / mat.fatigaMPa + sm / mat.ultimaMPa);
        res_ = { ...res_, fsPrueba: rP.fs, criticaPrueba: rP.critica, fsUltima: 1 / usoUlt, fsFatiga,
          pasaPrueba: rP.fs >= 1, pasaUltima: usoUlt <= 1, pasaFatiga: fsFatiga >= 1 };
        res_.pasa = res_.pasaPrueba && res_.pasaUltima && res_.pasaFatiga;
        pasaTodo = pasaTodo && res_.pasa;
      } else pasaTodo = null;
      fila.condiciones[cond] = res_;
    }
    fila.pasa = pasaTodo;
    filas.push(fila);
  }
  return filas;
}

// Nivel ISO 10328 que corresponde a una masa de usuario (el menor nivel cuya masa la cubre).
export function nivelParaMasa(masaKg) {
  const entradas = Object.entries(CONFIG.iso10328.niveles);
  const hallado = entradas.find(([, d]) => masaKg <= d.masaKg);
  return hallado ? hallado[0] : masaKg <= 125 ? 'P6' : masaKg <= 150 ? 'P7' : 'P8';
}
