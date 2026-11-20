// Arma la rodilla a partir de las piezas reales (cada una en su propio marco de SolidWorks).
// Resuelve dónde queda el adaptador inferior respecto al AFS1 cuando ambos están paralelos (0° de flexión)
// y expresa todo en el marco de rodilla de la simulación: x anterior, y arriba, origen en el centro de referencia.
import { CONFIG } from './config.js';
import { rot, sum, res, esc, norma, cruz, unit, rad, grados } from './mat.js';

// Intersección de dos círculos: puntos a distancia r1 de c1 y r2 de c2.
function circulos(c1, r1, c2, r2) {
  const dv = res(c2, c1), d = norma(dv);
  if (d < 1e-9) return { sol: [], d };
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h2 = r1 * r1 - a * a;
  if (h2 < 0) return { sol: [], d };
  const h = Math.sqrt(h2), u = esc(dv, 1 / d), m = sum(c1, esc(u, a)), n = [-u[1], u[0]];
  return { sol: [sum(m, esc(n, h)), sum(m, esc(n, -h))], d };
}

// Punto más bajo del AFS1 y más alto del adaptador inferior, para elegir la rama "muslo arriba, pierna abajo".
const bajoAFS1 = (a) => a.barrenoTrasero[1] - a.radioOreja;
const altoInferior = (b) => b.barrenoDelantero[1] + b.radioOreja;

/**
 * @param geo  geometría (CONFIG.geometria)
 * @param L    longitudes entre centros { AD, BC } (por omisión las de la configuración: 80 y 80)
 * @param phi  giro del adaptador inferior respecto al AFS1 (rad, + = antihorario). 0 = pilón paralelo al socket.
 */
export function ensamblar(geo = CONFIG.geometria, L = {}, phi = 0) {
  const a = geo.afs1, b = geo.adaptadorInferior;
  const LAD = L.AD ?? geo.eslabones.centros;
  const LBC = L.BC ?? geo.eslabones.centros;
  // Incógnita t: posición del origen del adaptador inferior en el marco del AFS1.
  //   |B − (R·C + t)| = LBC   y   |A − (R·D + t)| = LAD
  const cB = res(a.barrenoTrasero, rot(b.barrenoTrasero, phi));
  const cA = res(a.barrenoDelantero, rot(b.barrenoDelantero, phi));
  const { sol, d } = circulos(cB, LBC, cA, LAD);
  const base = { LAD, LBC, d };
  if (!sol.length) {
    return { ...base, ok: false,
      motivo: `El lazo no cierra: con eslabones de ${LBC} y ${LAD} mm las piezas no se pueden unir a 0°.` };
  }
  const validas = sol.filter((t) => {
    const C = sum(rot(b.barrenoTrasero, phi), t), D = sum(rot(b.barrenoDelantero, phi), t);
    const separados = bajoAFS1(a) - (altoInferior(b) + t[1]) > 2;
    const cruzados = cruz(res(a.barrenoTrasero, C), res(D, C)) * cruz(res(a.barrenoDelantero, C), res(D, C)) < 0;
    return separados && !cruzados;
  });
  if (!validas.length) return { ...base, ok: false, motivo: 'El lazo cierra, pero solo con las piezas encimadas o con los eslabones cruzados.' };
  const t = validas.reduce((p, q) => (q[1] < p[1] ? q : p));

  // Marco de rodilla (sobre el adaptador inferior): x = eje del pilón − desplazamiento, y = origenRodillaY.
  const O = [b.cilindro.centroX - CONFIG.diseno.desplazamientoPosteriorEjeMm, geo.origenRodillaY];
  const dePierna = (p) => res(p, O);
  const deMuslo = (p) => res(res(p, t), O); // solo válido para phi = 0
  const A = deMuslo(a.barrenoDelantero), B = deMuslo(a.barrenoTrasero);
  const C = dePierna(b.barrenoTrasero), D = dePierna(b.barrenoDelantero);
  // Del marco del STL al marco de rodilla (x, y): p_rodilla = p_STL − T_inferior − O.
  const deSTL = (p) => res(res(p, geo.stl.adaptadorInferior), O);
  return {
    ...base, ok: true, t, O, phi, dePierna, deMuslo, deSTL, A, B, C, D,
    ejePilonX: b.cilindro.centroX - O[0],
    ejeSocketX: deMuslo([a.ranura.centroX, 0])[0],
    yArribaAFS1: deMuslo([0, a.yArriba])[1],
    yFondoCilindro: dePierna([0, b.yAbajo - b.cilindro.largo])[1],
    alturaTotal: a.yArriba - t[1] - (b.yAbajo - b.cilindro.largo),
    tope: topeOculto(geo, { A, B, C, D }, deMuslo),
  };
}

// Redondea las esquinas convexas de un polígono (sentido cualquiera) con arcos de radio r.
function redondear(pts, r, n = 6) {
  const out = [];
  const area = pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i + pts.length - 1) % pts.length], p = pts[i], p1 = pts[(i + 1) % pts.length];
    const u0 = unit(res(p0, p)), u1 = unit(res(p1, p));
    const convexa = cruz(res(p, p0), res(p1, p)) * area > 0;
    const ang = Math.acos(Math.max(-1, Math.min(1, u0[0] * u1[0] + u0[1] * u1[1])));
    if (!convexa || r <= 0) { out.push(p); continue; }
    const dist = r / Math.tan(ang / 2), q0 = sum(p, esc(u0, dist)), q1 = sum(p, esc(u1, dist));
    const bis = unit(sum(u0, u1)), c = sum(p, esc(bis, r / Math.sin(ang / 2)));
    const a0 = Math.atan2(q0[1] - c[1], q0[0] - c[0]);
    let a1 = Math.atan2(q1[1] - c[1], q1[0] - c[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= n; k++) { const aa = a0 + (da * k) / n; out.push([c[0] + r * Math.cos(aa), c[1] + r * Math.sin(aa)]); }
  }
  return out;
}

/**
 * Tope de extensión escondido (única modificación a los STL). Se construye en el marco del AFS1 a partir del
 * mecanismo: la cara de apoyo es el canto delantero del eslabón diagonal cuando la rodilla está en anguloGrados.
 * Devuelve el contorno en el marco de rodilla a 0° (cuerpo muslo) y los datos para la estática.
 */
export function topeOculto(geo, P, deMuslo) {
  const tp = geo.topeOculto, a = geo.afs1, w = geo.eslabones.ancho;
  // Posición del eje D vista desde el muslo cuando la rodilla está en el ángulo del tope (por continuidad desde 0°).
  const th = rad(tp.anguloGrados);
  let Dm = P.D;
  if (Math.abs(th) > 1e-9) {
    // Para un ángulo distinto de 0: resolver el lazo y llevar D al marco del muslo.
    const L1 = norma(res(P.A, P.D)), L2 = norma(res(P.B, P.C)), w0 = res(P.B, P.A);
    const ww = rot(w0, th), c2 = res(P.C, ww), { sol } = circulos(P.D, L1, c2, L2);
    const An = sol.reduce((p, q) => (norma(res(q, P.A)) < norma(res(p, P.A)) ? q : p));
    Dm = sum(rot(res(P.D, An), -th), P.A); // p_muslo = R(−θ)(p − A(θ)) + A0
  }
  const d = unit(res(Dm, P.A));
  let n = [-d[1], d[0]]; if (n[0] < 0) n = esc(n, -1); // normal hacia adelante
  const E = (s) => sum(sum(P.A, esc(n, w / 2)), esc(d, s));
  // Cara inferior de la placa del AFS1 (marco de rodilla) y arista inferior de las paredes.
  const xf = a.frenteAbajo[0];
  const yPlacaL = (x) => a.placa.yFondoAtras + ((x - a.xAtras) * (a.placa.yFondoFrente - a.placa.yFondoAtras)) / (xf - a.xAtras);
  const Rb = [a.barrenoTrasero[0], a.barrenoTrasero[1] - a.radioOreja];
  const yParedL = (x) => Rb[1] + ((x - Rb[0]) * (a.frenteAbajo[1] - Rb[1])) / (xf - Rb[0]);
  const aML = (p) => deMuslo(p), dx = deMuslo([0, 0]); // marco del AFS1 → rodilla (solo traslación a 0°)
  const yPlaca = (x) => aML([x - dx[0], yPlacaL(x - dx[0])])[1];
  const yPared = (x) => aML([x - dx[0], yParedL(x - dx[0])])[1];
  // s0: donde el canto del eslabón (prolongado) llega a la placa.
  let lo = -20, hi = 5;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; const p = E(m); (p[1] - yPlaca(p[0]) > 0 ? (lo = m) : (hi = m)); }
  const s0 = (lo + hi) / 2;
  const alfa = Math.atan2(a.frenteAbajo[1] - Rb[1], xf - Rb[0]);
  const Q1 = E(s0 - tp.empotre), Q2 = E(tp.hasta), Q3 = sum(Q2, [tp.fondo * Math.cos(alfa), tp.fondo * Math.sin(alfa)]);
  const Q4 = [Q3[0], yPlaca(Q3[0]) + tp.empotre];
  const contorno = redondear([Q1, Q2, Q3, Q4], tp.radio);
  // Cara de apoyo útil: del canto recto del eslabón (s = 0) hasta donde empieza el redondeo.
  const sFin = tp.hasta - tp.radio * Math.tan((Math.PI - Math.acos(d[0] * Math.cos(alfa) + d[1] * Math.sin(alfa))) / 2);
  // Con la rodilla apoyando, el eslabón gira alrededor de A contra el taco: presión que crece con s (triangular).
  const sRes = (2 / 3) * sFin;
  return {
    contorno, Q: [Q1, Q2, Q3, Q4], s0, sFin, sRes, d, n, puntoApoyo: E(sRes), normal: esc(n, -1), // fuerza del taco SOBRE el eslabón
    margenOculto: Math.min(Q2[1] - yPared(Q2[0]), Q3[1] - yPared(Q3[0])),
    zA: -(a.ancho / 2 - a.pared), zB: a.ancho / 2 - a.pared, largoApoyo: sFin,
  };
}

// Comprueba que las medidas de config.js coinciden con los STL: posición de los cuatro ejes en el ensamble de SolidWorks.
export function verificarSTL(geo = CONFIG.geometria) {
  const ens = ensambleActual();
  const ejesSTL = { A: [-2.555, -15.0], B: [-29.679, -20.0], C: [-22.877, -99.71], D: [23.915, -90.494] }; // centros medidos en los STL de los ejes
  const dif = Object.fromEntries(Object.entries(ejesSTL).map(([k, p]) => [k, norma(res(ens.deSTL(p), ens[k]))]));
  return { ejesSTL, dif, max: Math.max(...Object.values(dif)) };
}

let cache = null;
export const ensambleActual = () => (cache ||= ensamblar());
