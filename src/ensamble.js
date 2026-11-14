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
 * @param L    longitudes entre centros { exterior, interior } (por omisión las de la configuración)
 * @param phi  giro del adaptador inferior respecto al AFS1 (rad, + = antihorario). 0 = pilón paralelo al socket.
 */
export function ensamblar(geo = CONFIG.geometria, L = {}, phi = 0) {
  const a = geo.afs1, b = geo.adaptadorInferior;
  const Lext = L.exterior ?? geo.eslabones.exterior.centros;
  const Lint = L.interior ?? geo.eslabones.interior.centros;
  // Incógnita t: posición del origen del adaptador inferior en el marco del AFS1.
  //   |B − (R·C + t)| = Lint   y   |A − (R·D + t)| = Lext
  const cB = res(a.barrenoTrasero, rot(b.barrenoTrasero, phi));
  const cA = res(a.barrenoDelantero, rot(b.barrenoDelantero, phi));
  const { sol, d } = circulos(cB, Lint, cA, Lext);
  const base = { Lext, Lint, d, diferencia: Math.abs(Lext - Lint), suma: Lext + Lint };
  if (!sol.length) {
    return { ...base, ok: false,
      motivo: `El lazo no cierra: los dos círculos de posibles posiciones están separados ${d.toFixed(1)} mm, y con eslabones de ${Lint} y ${Lext} mm esa distancia tendría que estar entre ${Math.abs(Lext - Lint)} y ${Lext + Lint} mm.` };
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

  // Tope de extensión (corrección 3): tornillo vertical fijo al AFS1 que apoya sobre la ceja del adaptador inferior.
  const tp = geo.correcciones.tope;
  const topeContacto = dePierna([tp.xEnCeja, b.ceja.yArriba]); // punta del capuchón de hule a 0°
  const topeCentro = topeContacto;
  return {
    ...base, ok: true, t, O, phi, dePierna, deMuslo, A, B, C, D, topeCentro,
    topeContacto, topeXAFS1: tp.xEnCeja + t[0],
    ejePilonX: b.cilindro.centroX - O[0],
    ejeSocketX: deMuslo([a.ranura.centroX, 0])[0],
    yArribaAFS1: deMuslo([0, a.yArriba])[1],
    yFondoCilindro: dePierna([0, b.yAbajo - b.cilindro.largo])[1],
    alturaTotal: a.yArriba - t[1] - (b.yAbajo - b.cilindro.largo),
  };
}

// Recorre el giro relativo con continuidad de rama a partir de una pose (phi0, t0) y devuelve el intervalo alcanzable.
export function rangoAlcanzable(geo, L, phi0, t0, paso = 0.1) {
  const a = geo.afs1, b = geo.adaptadorInferior;
  const lim = [];
  for (const sg of [1, -1]) {
    let prev = t0, k = 0;
    while (k < 3600) {
      const phi = phi0 + sg * rad((k + 1) * paso);
      const { sol } = circulos(res(a.barrenoTrasero, rot(b.barrenoTrasero, phi)), L.interior, res(a.barrenoDelantero, rot(b.barrenoDelantero, phi)), L.exterior);
      if (!sol.length) break;
      const n = norma(res(sol[0], prev)) < norma(res(sol[1], prev)) ? sol[0] : sol[1];
      if (norma(res(n, prev)) > 3) break;
      prev = n; k++;
    }
    lim.push(grados(phi0) + sg * k * paso);
  }
  return { min: Math.min(...lim), max: Math.max(...lim) };
}

// Diagnóstico del ensamble tal como viene de SolidWorks (eslabones interiores de 65 mm).
export function diagnosticoOriginal(geo = CONFIG.geometria) {
  const L = { exterior: geo.eslabones.exterior.centros, interior: geo.eslabones.interior.centrosOriginal };
  const aCero = ensamblar(geo, L, 0);
  const pose = geo.poseSolidWorks;
  const rango = rangoAlcanzable(geo, L, rad(pose.giro), pose.t);
  return { L, aCero, pose, rango, flexionMinima: -rango.max, flexionMaxima: -rango.min };
}

let cache = null;
export const ensambleActual = () => (cache ||= ensamblar());
