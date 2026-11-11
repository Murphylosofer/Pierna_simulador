// Cargas y esfuerzos por estática plana (vigas y pernos). NO es un análisis por elementos finitos.
// Todo se calcula en el marco de la pierna (base), en N y mm.
import { CONFIG } from './config.js';
import { cruz, res, sum, norma, aMundo, dirMundo } from './mat.js';

const det3 = (m) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
function resolver3(M, b) {
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return null;
  return [0, 1, 2].map((k) => det3(M.map((f, i) => f.map((v, j) => (j === k ? b[i] : v)))) / D);
}

/**
 * @param sol       solución del mecanismo (cinematica.resolver)
 * @param externas  fuerzas externas sobre la pierna [{p:[x,y], F:[fx,fy]}] (reacción del suelo, peso distal…)
 * @param mat       material de las piezas maquinadas (o pendiente)
 */
export function resolverCargas(sol, externas, mat) {
  const { mecanismo: m, piezas: P, pernos } = CONFIG;
  const E = externas.reduce((s, e) => sum(s, e.F), [0, 0]);
  const ME = externas.reduce((s, e) => s + cruz(e.p, e.F), 0); // momento respecto al origen (centro de rodilla), + = extensión
  const { u1, u2, C, D } = sol;

  // Equilibrio de la pierna: F1·u1 + F2·u2 + Fs·n = E ; momentos respecto al origen.
  const S = aMundo(sol.muslo, m.tope.punto);
  const n = dirMundo(sol.muslo, m.tope.direccion);
  let F1, F2, Fs = 0, Mc = 0, enTope = false;
  if (sol.theta < 1.5) {
    const r = resolver3([[u1[0], u2[0], n[0]], [u1[1], u2[1], n[1]], [cruz(D, u1), cruz(C, u2), cruz(S, n)]], [E[0], E[1], ME]);
    if (r && r[2] >= 0) { [F1, F2, Fs] = r; enTope = true; }
  }
  if (!enTope) {
    const den = cruz(u1, u2);
    F1 = cruz(E, u2) / den;
    F2 = cruz(u1, E) / den;
    Mc = ME - F1 * cruz(D, u1) - F2 * cruz(C, u2); // par que debe aportar el usuario (cadera) o el freno
  }

  const magE = norma(E);
  const MCir = sol.cir ? externas.reduce((s, e) => s + cruz(res(e.p, sol.cir), e.F), 0) : 0;
  // Distancia de la línea de carga al centro de rodilla y al CIR (mm, + = línea por delante).
  const brazoRodilla = magE > 1e-6 ? ME / magE : 0;
  const brazoCir = magE > 1e-6 ? MCir / magE : 0;

  // ---------- Esfuerzos aproximados ----------
  const d = pernos.diametro, Ap = (Math.PI * d * d) / 4;
  const { ancho: w, espesor: t } = P.barraLateral;
  const barra = (F) => {
    const N = Math.abs(F) / 2; // dos barras por eslabón
    const neta = N / ((w - d) * t), aplast = N / (d * t);
    return { N, neta, aplast, sigma: Math.max(neta, aplast), tipo: neta >= aplast ? 'tracción/compresión en sección neta' : 'aplastamiento en el barreno' };
  };
  const perno = (F, sep) => {
    const L = 2 * sep + t, b = 2 * sep; // claro entre planos medios de las barras y ancho del porta-eje
    const M = Math.abs(F) * (L / 4 - b / 8);
    const flexion = (32 * M) / (Math.PI * d ** 3);
    const tau = Math.abs(F) / (2 * Ap); // cortante doble
    return { tau, flexion, sigma: Math.max(flexion, Math.sqrt(3) * tau), tipo: flexion >= Math.sqrt(3) * tau ? 'flexión del perno' : 'cortante doble' };
  };
  const bloque = (F, sep) => ({ sigma: Math.abs(F) / (d * 2 * sep), tipo: 'aplastamiento en el barreno' });
  const tubular = (dext, dint, centro) => {
    const I = (Math.PI * (dext ** 4 - dint ** 4)) / 64, A = (Math.PI * (dext ** 2 - dint ** 2)) / 4;
    const M = Math.abs(externas.reduce((s, e) => s + cruz(res(e.p, centro), e.F), 0));
    return { M, sigma: (M * dext) / 2 / I + magE / A, tipo: 'flexión + axial' };
  };
  // Placa como viga entre los dos porta-ejes. El tubo o anillo rigidiza la placa en su huella,
  // así que solo trabaja a flexión el tramo libre: factor (1 − dHuella/claro), mínimo 0.25.
  const placa = (cfgP, xa, xb, xCarga, Mtubo, dHuella) => {
    const s = Math.abs(xa - xb), a = Math.abs(xCarga - xb), b = Math.abs(xa - xCarga);
    const dentro = xCarga >= Math.min(xa, xb) && xCarga <= Math.max(xa, xb);
    const libre = Math.max(0.25, 1 - dHuella / s);
    const M = (Math.abs(E[1]) * (dentro ? (a * b) / s : Math.min(a, b)) + (Mtubo * Math.max(a, b)) / s) * libre;
    return { M, sigma: (6 * M) / (cfgP.anchoZ * cfgP.espesorPlaca ** 2), tipo: 'flexión de placa (viga)' };
  };

  const tb = P.tuboReceptor, ad = P.adaptador, ba = P.base;
  const yBaseInf = ba.yTope - ba.espesorPlaca;
  const tubo = tubular(tb.dext, tb.dint, [m.ejePilonX, yBaseInf]);
  const anillo = tubular(ad.anilloDext, ad.anilloDint, aMundo(sol.muslo, [m.ejePilonX, ad.yBase + ad.espesorPlaca]));
  const b1 = barra(F1), b2 = barra(F2);
  const FB = Math.hypot(F2 * u2[0] + Fs * n[0], F2 * u2[1] + Fs * n[1]); // el tope descarga sobre el lado trasero

  const esfuerzos = {
    adaptador: (() => { const p = placa(ad, m.A[0], m.B[0], m.ejePilonX, anillo.M, ad.anilloDext); return p.sigma > anillo.sigma ? p : anillo; })(),
    supDelantera: bloque(F1, P.separacionC1),
    supTrasera: bloque(FB, P.separacionC2),
    c1Der: b1, c1Izq: b1, c2Der: b2, c2Izq: b2,
    barraTrasera: { sigma: Fs / (P.barraTrasera.largo * 2 * P.separacionC2), tipo: 'compresión por el tope' },
    infDelantera: bloque(F1, P.separacionC1),
    infTrasera: bloque(F2, P.separacionC2),
    base: placa(ba, m.D[0], m.C[0], m.ejePilonX, tubo.M, tb.dext),
    tubo,
    pernoA: perno(F1, P.separacionC1), pernoD: perno(F1, P.separacionC1),
    pernoB: perno(FB, P.separacionC2), pernoC: perno(F2, P.separacionC2),
  };

  let fs = Infinity, critica = null;
  for (const [id, e] of Object.entries(esfuerzos)) {
    const esPerno = id.startsWith('perno');
    const Sy = esPerno ? pernos.fluenciaMPa : mat?.fluenciaMPa;
    e.fluencia = Sy ?? null;
    e.uso = Sy ? e.sigma / Sy : null; // 1.0 = fluencia
    e.fs = Sy && e.sigma > 1e-9 ? Sy / e.sigma : Infinity;
    if (Sy && e.fs < fs) { fs = e.fs; critica = id; }
  }
  if (!mat?.fluenciaMPa) { fs = null; critica = null; }

  return {
    E, magE, ME, MCir, brazoRodilla, brazoCir, F1, F2, Fs, Mc, enTope, FB,
    estable: MCir >= 0, // la línea de carga pasa por delante del CIR ⇒ momento de extensión
    esfuerzos, fs, critica,
    sigmaMax: critica ? esfuerzos[critica].sigma : null,
    cortantePernoMax: Math.max(esfuerzos.pernoA.tau, esfuerzos.pernoB.tau, esfuerzos.pernoC.tau, esfuerzos.pernoD.tau),
    flexionBarraMax: Math.max(esfuerzos.base.sigma, esfuerzos.adaptador.sigma, esfuerzos.pernoA.flexion, esfuerzos.pernoB.flexion),
    topeS: S, topeN: n,
  };
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
        const usoUlt = Math.max(...Object.entries(rU.esfuerzos).map(([id, e]) => e.sigma / (id.startsWith('perno') ? CONFIG.pernos.ultimaMPa : mat.ultimaMPa)));
        // Fatiga (Goodman) en las barras laterales con Kt; R ≈ 0 ⇒ σa = σm = Kt·σ/2.
        const sigF = Math.max(rC.esfuerzos.c1Der.neta, rC.esfuerzos.c2Der.neta) * iso.concentracionEsfuerzo;
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
