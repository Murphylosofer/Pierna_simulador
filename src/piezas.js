// Geometría de las piezas reales (SolidWorks · Ensamblaje1), expresada en el marco de rodilla a 0° de flexión.
// Todo sale de CONFIG.geometria y de ensamble.js. La vista 3D dibuja los STL originales (campo `stl`);
// los prismas de aquí, con las mismas medidas, sirven para la figura isométrica, los planos y la revisión de choques.
// Las masas son las del reporte de SolidWorks.
// Cada cuerpo es un prisma: contorno 2D extruido a lo largo de 'z' (lateral) o de 'y' (vertical).
//   eje 'z': contorno en (x, y), a0..a1 en z.   eje 'y': contorno en (x, z), a0..a1 en y.
import { CONFIG } from './config.js';
import { crearMecanismo } from './cinematica.js';
import { ensambleActual } from './ensamble.js';
import { res, sum, esc, norma, unit } from './mat.js';

const rect = (x0, y0, x1, y1) => [[x0, y0, 1], [x1, y0, 1], [x1, y1, 1], [x0, y1, 1]];
const circulo = (cx, cy, r, n = 40) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI), 0]);
const arco = (c, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), 0]; });
function estadio(L, w, n = 14) {
  const r = w / 2, pts = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; pts.push([L + r * Math.cos(a), r * Math.sin(a), 0]); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI; pts.push([r * Math.cos(a), r * Math.sin(a), 0]); }
  return pts;
}
const areaPoligono = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
// Punto de tangencia superior desde Q a la circunferencia (c, r), del lado de arriba.
function tangenteArriba(Q, c, r) {
  const d = res(Q, c), L = norma(d), base = Math.atan2(d[1], d[0]), alfa = Math.acos(r / L);
  const cand = [base + alfa, base - alfa].map((a) => [a, c[1] + r * Math.sin(a)]);
  return cand.reduce((p, q) => (q[1] > p[1] ? q : p))[0];
}

export function perfilesReales() {
  const g = CONFIG.geometria, a = g.afs1, b = g.adaptadorInferior, ch = 0; // los STL no tienen chaflán
  // Pared del AFS1 (marco propio): arriba plano, frente casi vertical, abajo inclinado hasta la oreja R10 en B.
  const Bm = a.barrenoTrasero, R = a.radioOreja;
  const paredAFS1 = [[a.xAtras, a.yArriba], [a.xFrenteArriba, a.yArriba], a.frenteAbajo, [Bm[0], Bm[1] - R],
    ...arco(Bm, R, -Math.PI / 2, -Math.PI * 1.5, 18).slice(1, -1).map(([x, y]) => [x, y]), [Bm[0], Bm[1] + R]];
  const xFrente = (y) => a.frenteAbajo[0] + ((y - a.frenteAbajo[1]) * (a.xFrenteArriba - a.frenteAbajo[0])) / (a.yArriba - a.frenteAbajo[1]);
  const yRanura = a.yArriba - a.ranura.profundidad;
  const pend = (a.placa.yFondoFrente - a.placa.yFondoAtras) / (xFrente(a.placa.yFondoFrente) - a.xAtras);
  // Placa entre paredes (parte baja, hasta el fondo de la ranura).
  const placaAFS1 = [[a.xAtras, a.placa.yFondoAtras], [xFrente(a.placa.yFondoFrente), a.placa.yFondoFrente],
    [xFrente(yRanura), yRanura], [a.xAtras, yRanura]];
  // Labio trasero de la placa (convexo aparte para la revisión de choques).
  const puntaAFS1 = [a.placa.punta[0], [a.xAtras, a.placa.yFondoAtras], a.placa.punta[2], a.placa.punta[1]];
  // Pared del adaptador inferior: abajo plano, frente vertical, oreja R10 en D y arriba inclinado tangente a la oreja.
  const Dm = b.barrenoDelantero, Rb = b.radioOreja, Q = [b.xAtras, b.yArribaAtras];
  const aTan = tangenteArriba(Q, Dm, Rb);
  const paredInf = [[b.xAtras, b.yAbajo], [b.xFrente, b.yAbajo], [b.xFrente, Dm[1]], ...arco(Dm, Rb, 0, aTan, 14).slice(1), Q];
  return { paredAFS1, placaAFS1, puntaAFS1, paredInf, xFrente, yRanura };
}

export function construirPiezas() {
  const g = CONFIG.geometria, a = g.afs1, b = g.adaptadorInferior, el = g.eslabones, ej = g.ejes;
  const ens = ensambleActual();
  if (!ens.ok) throw new Error('La rodilla no se puede ensamblar con la geometría actual: ' + ens.motivo);
  const mec = crearMecanismo(ens);
  const M = ens.deMuslo, P = ens.dePierna;
  const pf = perfilesReales();
  const z1 = a.ancho / 2, z0 = z1 - a.pared; // 27.5 y 23.5: caras de las paredes
  const tE = el.espesor, d = ej.diametro;
  const dz = (pts, f) => pts.map((p) => { const q = f(p); return [q[0], q[1], p[2] ?? 0]; });

  const pared = (perfil, f, barrenos, lado) => ({
    eje: 'z', contorno: dz(perfil, f), a0: lado > 0 ? z0 : -z1, a1: lado > 0 ? z1 : -z0, forma: { tipo: 'perfil' },
    barrenos: barrenos.map(([p, dd, ajuste]) => { const q = f(p); return { u: q[0], v: q[1], d: dd, ajuste }; }),
  });
  const barra = (L, zA, zB) => ({
    eje: 'z', contorno: estadio(L, el.ancho), a0: zA, a1: zB, forma: { tipo: 'estadio', L, ancho: el.ancho },
    barrenos: [{ u: 0, v: 0, d, ajuste: 'H7' }, { u: L, v: 0, d, ajuste: 'H7' }],
  });
  const eje = (c, largo) => ({ eje: 'z', contorno: circulo(c[0], c[1], d / 2, 24), a0: -largo / 2, a1: largo / 2, forma: { tipo: 'circulo', d }, barrenos: [] });

  const tp = ens.tope, sw = CONFIG.solidworks.masasKg;
  const barrenosAFS1 = [[a.barrenoDelantero, a.diametroBarreno, 'H7 · eje A'], [a.barrenoTrasero, a.diametroBarreno, 'H7 · eje B']];
  const xR = a.ranura.centroX, yR = pf.yRanura, xFr = pf.xFrente((yR + a.yArriba) / 2);
  const rc = M([xR, 0]);
  const zi = z0, ze = z1; // caras interior (23.5) y exterior (27.5) de las paredes
  const ES = (n) => `Ensamblaje1 - ${n}-1.STL`;

  const piezas = [
    {
      id: 'afs1', nombre: 'AFS1 · adaptador femoral superior', nombreSW: a.nombreSW, cuerpo: 'muslo', despiece: [0, 55, 0],
      descripcion: 'Horquilla en U invertida con ranura anular para el socket', stl: ES('AFS1'), masaSWKg: sw.afs1,
      correccion: `Única modificación: tope de extensión escondido (taco de ${g.topeOculto.fondo} mm bajo la placa, entre paredes, aristas R${g.topeOculto.radio}).`,
      cuerpos: [
        pared(pf.paredAFS1, M, barrenosAFS1, +1),
        pared(pf.paredAFS1, M, barrenosAFS1, -1),
        { eje: 'z', contorno: dz(pf.placaAFS1, M), a0: -z0, a1: z0, forma: { tipo: 'perfil' }, barrenos: [] },
        { eje: 'z', contorno: dz(pf.puntaAFS1, M), a0: -z0, a1: z0, forma: { tipo: 'perfil' }, barrenos: [], punta: true },
        { eje: 'y', contorno: [[M([a.xAtras, 0])[0], -z0, 1], [M([xFr, 0])[0], -z0, 1], [M([xFr, 0])[0], z0, 1], [M([a.xAtras, 0])[0], z0, 1]],
          a0: M([0, yR])[1], a1: M([0, a.yArriba])[1], forma: { tipo: 'rect' },
          barrenos: [{ u: rc[0], v: 0, d: a.ranura.dExt, ajuste: `ranura Ø${a.ranura.dExt}/Ø${a.ranura.dInt} × ${a.ranura.profundidad}` }] },
        { eje: 'y', contorno: circulo(rc[0], 0, a.ranura.dInt / 2, 48), a0: M([0, yR])[1], a1: M([0, a.yArriba])[1], forma: { tipo: 'circulo', d: a.ranura.dInt }, barrenos: [], isla: true },
        // Tope escondido: el único cuerpo que no está en el STL. La vista 3D lo agrega al STL del AFS1.
        { eje: 'z', contorno: tp.contorno.map(([x, y]) => [x, y, 0]), a0: tp.zA, a1: tp.zB, forma: { tipo: 'perfil' }, barrenos: [], tope: true },
      ],
    },
    {
      id: 'adaptadorInferior', nombre: 'Adaptador femoral inferior', nombreSW: b.nombreSW, cuerpo: 'pierna', despiece: [0, -60, 0],
      descripcion: 'Horquilla en U con ceja frontal y cilindro Ø40 para el pilón', stl: ES('adapatador femoral inferior'), masaSWKg: sw.adaptadorInferior,
      cuerpos: [
        pared(pf.paredInf, P, [[b.barrenoTrasero, b.diametroBarreno, 'H7 · eje C'], [b.barrenoDelantero, b.diametroBarreno, 'H7 · eje D']], +1),
        pared(pf.paredInf, P, [[b.barrenoTrasero, b.diametroBarreno, 'H7 · eje C'], [b.barrenoDelantero, b.diametroBarreno, 'H7 · eje D']], -1),
        { eje: 'y', contorno: [[P([b.xAtras, 0])[0], -z0, 1], [P([b.xFrente - b.ceja.espesor, 0])[0], -z0, 1], [P([b.xFrente - b.ceja.espesor, 0])[0], z0, 1], [P([b.xAtras, 0])[0], z0, 1]],
          a0: P([0, b.yAbajo])[1], a1: P([0, b.base.yArriba])[1], forma: { tipo: 'rect' }, barrenos: [] },
        { eje: 'y', contorno: [[P([b.xFrente - b.ceja.espesor, 0])[0], -z0, 1], [P([b.xFrente, 0])[0], -z0, 1], [P([b.xFrente, 0])[0], z0, 1], [P([b.xFrente - b.ceja.espesor, 0])[0], z0, 1]],
          a0: P([0, b.yAbajo])[1], a1: P([0, b.ceja.yArriba])[1], forma: { tipo: 'rect' }, barrenos: [] },
        { eje: 'y', contorno: circulo(P([b.cilindro.centroX, 0])[0], 0, b.cilindro.diametro / 2, 56), a0: P([0, b.yAbajo - b.cilindro.largo])[1], a1: P([0, b.yAbajo])[1],
          forma: { tipo: 'circulo', d: b.cilindro.diametro }, barrenos: [] },
      ],
    },
    // Par diagonal (A–D), por dentro de las paredes. Es el que toca al AFS1 (y al tope escondido).
    { id: 'eslabonDiagDer', nombre: 'Eslabón diagonal', nombreSW: el.nombreSW, cuerpo: 'c1', despiece: [0, 0, 22], stl: 'Ensamblaje1 - eslabonnnnn-4.STL', masaSWKg: sw.eslabon,
      descripcion: `Barra de ${el.centros} entre centros, ejes A–D, por dentro de las paredes`, cuerpos: [barra(mec.L1, zi - tE, zi)] },
    { id: 'eslabonDiagIzq', igualA: 'eslabonDiagDer', nombre: 'Eslabón diagonal', cuerpo: 'c1', despiece: [0, 0, -22], stl: 'Ensamblaje1 - eslabonnnnn-3.STL', masaSWKg: sw.eslabon, cuerpos: [barra(mec.L1, -zi, -zi + tE)] },
    // Par trasero (B–C), por fuera de las paredes. Misma pieza que el diagonal.
    { id: 'eslabonTrasDer', igualA: 'eslabonDiagDer', nombre: 'Eslabón trasero', cuerpo: 'c2', despiece: [0, 0, 40], stl: 'Ensamblaje1 - eslabonnnnn-2.STL', masaSWKg: sw.eslabon,
      descripcion: `Misma pieza, ejes B–C, por fuera de las paredes`, cuerpos: [barra(mec.L2, ze, ze + tE)] },
    { id: 'eslabonTrasIzq', igualA: 'eslabonDiagDer', nombre: 'Eslabón trasero', cuerpo: 'c2', despiece: [0, 0, -40], stl: 'Ensamblaje1 - eslabonnnnn-1.STL', masaSWKg: sw.eslabon, cuerpos: [barra(mec.L2, -ze - tE, -ze)] },
    { id: 'pernoA', nombre: `Eje Ø${d} × ${ej.corto.largo}`, nombreSW: ej.corto.nombreSW, cuerpo: 'muslo', conecta: ['muslo', 'c1'], despiece: [30, 30, 0], stl: 'Ensamblaje1 - Eje Superior-2.STL', masaSWKg: sw.ejeCorto,
      descripcion: 'Ejes A y D: paredes ↔ eslabones diagonales', cuerpos: [eje(mec.A0, ej.corto.largo)] },
    { id: 'pernoD', igualA: 'pernoA', nombre: `Eje Ø${d} × ${ej.corto.largo}`, cuerpo: 'pierna', conecta: ['pierna', 'c1'], despiece: [30, -30, 0], stl: 'Ensamblaje1 - Eje Superior-1.STL', masaSWKg: sw.ejeCorto, cuerpos: [eje(mec.D, ej.corto.largo)] },
    { id: 'pernoB', nombre: `Eje Ø${d} × ${ej.largo.largo}`, nombreSW: ej.largo.nombreSW, cuerpo: 'muslo', conecta: ['muslo', 'c2'], despiece: [-30, 30, 0], stl: 'Ensamblaje1 - Eslabon2-2.STL', masaSWKg: sw.ejeLargo,
      descripcion: 'Ejes B y C: paredes ↔ eslabones traseros', cuerpos: [eje(mec.B0, ej.largo.largo)] },
    { id: 'pernoC', igualA: 'pernoB', nombre: `Eje Ø${d} × ${ej.largo.largo}`, cuerpo: 'pierna', conecta: ['pierna', 'c2'], despiece: [-30, -30, 0], stl: 'Ensamblaje1 - Eslabon2-1.STL', masaSWKg: sw.ejeLargo, cuerpos: [eje(mec.C, ej.largo.largo)] },
  ];

  // Numeración para planos y lista de materiales: una por pieza distinta.
  let n = 0;
  const num = {};
  for (const p of piezas) if (!p.igualA) num[p.id] = ++n;
  for (const p of piezas) {
    p.item = num[p.igualA || p.id];
    p.cantidad = piezas.filter((q) => (q.igualA || q.id) === (p.igualA || p.id)).length;
    p.estimado = g.estimado;
    const vol = (cs) => cs.reduce((s, c) => {
      const largo = c.a1 - c.a0;
      const huecos = c.barrenos.reduce((h, bb) => h + (Math.PI * bb.d * bb.d) / 4, 0);
      return s + (c.isla ? 0 : areaPoligono(c.contorno) - huecos) * largo;
    }, 0);
    // Volumen real: el de SolidWorks (masa del reporte / densidad del 6061 del reporte) + el tope escondido.
    p.volumenTopeMm3 = vol(p.cuerpos.filter((c) => c.tope));
    p.volumenMm3 = (p.masaSWKg / CONFIG.solidworks.propiedades.densidadKgM3) * 1e9 + p.volumenTopeMm3;
  }
  return { piezas, ejes: [], mec, ens };
}

export function masaRodilla(materialId) {
  const { piezas } = construirPiezas();
  const mat = CONFIG.materiales[materialId];
  if (!mat || !mat.densidadKgM3) return null;
  const k3 = (mat.escala || 1) ** 3;
  const porPieza = Object.fromEntries(piezas.map((p) => [p.id, p.volumenMm3 * 1e-9 * mat.densidadKgM3 * k3 * 1000]));
  const pernosG = piezas.filter((p) => p.id.startsWith('perno')).reduce((s, p) => s + porPieza[p.id], 0);
  const topeG = piezas.reduce((s, p) => s + p.volumenTopeMm3 * 1e-9 * mat.densidadKgM3 * k3 * 1000, 0);
  const totalG = Object.values(porPieza).reduce((s, v) => s + v, 0);
  return { maquinadasG: totalG - pernosG, pernosG, topeG, totalG, porPieza, deSolidWorks: materialId === 'al-6061-t6' };
}
