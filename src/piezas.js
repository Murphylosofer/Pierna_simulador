// Geometría de las piezas reales (SolidWorks), expresada en el marco de rodilla a 0° de flexión.
// Todo sale de CONFIG.geometria y de ensamble.js. La usan la vista 3D, la figura isométrica, los planos,
// el STL, la revisión de choques y el cálculo de masa.
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
  const g = CONFIG.geometria, a = g.afs1, b = g.adaptadorInferior, ch = g.correcciones.chaflanPlacaAFS1;
  // Pared del AFS1 (marco propio): arriba plano, frente casi vertical, abajo inclinado hasta la oreja R10 en B.
  const Bm = a.barrenoTrasero, R = a.radioOreja;
  const paredAFS1 = [[a.xAtras, a.yArriba], [a.xFrenteArriba, a.yArriba], a.frenteAbajo, [Bm[0], Bm[1] - R],
    ...arco(Bm, R, -Math.PI / 2, -Math.PI * 1.5, 18).slice(1, -1).map(([x, y]) => [x, y]), [Bm[0], Bm[1] + R]];
  const xFrente = (y) => a.frenteAbajo[0] + ((y - a.frenteAbajo[1]) * (a.xFrenteArriba - a.frenteAbajo[0])) / (a.yArriba - a.frenteAbajo[1]);
  const yRanura = a.yArriba - a.ranura.profundidad;
  const pend = (a.placa.yFondoFrente - a.placa.yFondoAtras) / (xFrente(a.placa.yFondoFrente) - a.xAtras);
  // Placa entre paredes (parte baja, hasta el fondo de la ranura), con el chaflán de la corrección 2.
  const placaAFS1 = [[a.xAtras + ch, a.placa.yFondoAtras + ch * pend], [xFrente(a.placa.yFondoFrente), a.placa.yFondoFrente],
    [xFrente(yRanura), yRanura], [a.xAtras, yRanura], [a.xAtras, a.placa.yFondoAtras + ch]];
  // Pared del adaptador inferior: abajo plano, frente vertical, oreja R10 en D y arriba inclinado tangente a la oreja.
  const Dm = b.barrenoDelantero, Rb = b.radioOreja, Q = [b.xAtras, b.yArribaAtras];
  const aTan = tangenteArriba(Q, Dm, Rb);
  const paredInf = [[b.xAtras, b.yAbajo], [b.xFrente, b.yAbajo], [b.xFrente, Dm[1]], ...arco(Dm, Rb, 0, aTan, 14).slice(1), Q];
  return { paredAFS1, placaAFS1, paredInf, xFrente, yRanura };
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

  const tp = g.correcciones.tope;
  const barrenosAFS1 = [[a.barrenoDelantero, a.diametroBarreno, 'H7 · eje A'], [a.barrenoTrasero, a.diametroBarreno, 'H7 · eje B']];
  const xR = a.ranura.centroX, yR = pf.yRanura, xFr = pf.xFrente((yR + a.yArriba) / 2);
  const cen = (p) => M(p); // atajo para la ranura
  const rc = cen([xR, 0]);

  const piezas = [
    {
      id: 'afs1', nombre: 'AFS1 · adaptador femoral superior', nombreSW: a.nombreSW, cuerpo: 'muslo', despiece: [0, 55, 0],
      descripcion: 'Horquilla en U invertida con ranura anular para el socket',
      correccion: `Chaflán de ${g.correcciones.chaflanPlacaAFS1} × 45° en la arista trasera inferior de la placa y barreno roscado ${tp.rosca} para el tope de extensión.`,
      cuerpos: [
        pared(pf.paredAFS1, M, barrenosAFS1, +1),
        pared(pf.paredAFS1, M, barrenosAFS1, -1),
        { eje: 'z', contorno: dz(pf.placaAFS1, M), a0: -z0, a1: z0, forma: { tipo: 'perfil' }, barrenos: [] },
        { eje: 'y', contorno: [[M([a.xAtras, 0])[0], -z0, 1], [M([xFr, 0])[0], -z0, 1], [M([xFr, 0])[0], z0, 1], [M([a.xAtras, 0])[0], z0, 1]],
          a0: M([0, yR])[1], a1: M([0, a.yArriba])[1], forma: { tipo: 'rect' },
          barrenos: [{ u: rc[0], v: 0, d: a.ranura.dExt, ajuste: `ranura Ø${a.ranura.dExt}/Ø${a.ranura.dInt} × ${a.ranura.profundidad}` },
            { u: ens.topeContacto[0], v: 0, d: tp.dTornillo, ajuste: `${tp.rosca} pasado · tope` }] },
        { eje: 'y', contorno: circulo(rc[0], 0, a.ranura.dInt / 2, 48), a0: M([0, yR])[1], a1: M([0, a.yArriba])[1], forma: { tipo: 'circulo', d: a.ranura.dInt }, barrenos: [], isla: true },
      ],
    },
    {
      id: 'adaptadorInferior', nombre: 'Adaptador femoral inferior', nombreSW: b.nombreSW, cuerpo: 'pierna', despiece: [0, -60, 0],
      descripcion: 'Horquilla en U con ceja frontal y cilindro Ø40 para el pilón',
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
    { id: 'eslabonExtDer', nombre: 'Eslabón exterior', nombreSW: el.exterior.nombreSW, cuerpo: 'c1', despiece: [0, 0, 40], descripcion: `Barra lateral exterior, ${el.exterior.centros} entre centros (ejes A–D)`, cuerpos: [barra(mec.L1, z1, z1 + tE)] },
    { id: 'eslabonExtIzq', igualA: 'eslabonExtDer', nombre: 'Eslabón exterior', cuerpo: 'c1', despiece: [0, 0, -40], cuerpos: [barra(mec.L1, -z1 - tE, -z1)] },
    { id: 'eslabonIntDer', nombre: 'Eslabón interior', nombreSW: el.interior.nombreSW, cuerpo: 'c2', despiece: [0, 0, 22], descripcion: `Barra lateral interior, ${el.interior.centros} entre centros (ejes B–C)`,
      correccion: el.interior.centros !== el.interior.centrosOriginal ? `Distancia entre centros ${el.interior.centros} mm (en SolidWorks: ${el.interior.centrosOriginal} mm). Con ${el.interior.centrosOriginal} la rodilla no puede llegar a 0°.` : null,
      cuerpos: [barra(mec.L2, z0 - tE, z0)] },
    { id: 'eslabonIntIzq', igualA: 'eslabonIntDer', nombre: 'Eslabón interior', cuerpo: 'c2', despiece: [0, 0, -22], cuerpos: [barra(mec.L2, -z0, -z0 + tE)] },
    { id: 'pernoA', nombre: 'Eje inferior Ø5 × 70', nombreSW: ej.inferior.nombreSW, cuerpo: 'muslo', conecta: ['muslo', 'c1'], material: 'acero', despiece: [30, 30, 0],
      descripcion: `Eje A: AFS1 ↔ eslabones exteriores. Chaflán ${ej.inferior.chaflan} × 45°`, cuerpos: [eje(mec.A0, ej.inferior.largo)] },
    { id: 'pernoD', igualA: 'pernoA', nombre: 'Eje inferior Ø5 × 70', cuerpo: 'pierna', conecta: ['pierna', 'c1'], material: 'acero', despiece: [30, -30, 0], cuerpos: [eje(mec.D, ej.inferior.largo)] },
    { id: 'pernoB', nombre: 'Eje superior Ø5 × 55', nombreSW: ej.superior.nombreSW, cuerpo: 'muslo', conecta: ['muslo', 'c2'], material: 'acero', despiece: [-30, 30, 0],
      descripcion: 'Eje B: AFS1 ↔ eslabones interiores', cuerpos: [eje(mec.B0, ej.superior.largo)] },
    { id: 'pernoC', igualA: 'pernoB', nombre: 'Eje superior Ø5 × 55', cuerpo: 'pierna', conecta: ['pierna', 'c2'], material: 'acero', despiece: [-30, -30, 0], cuerpos: [eje(mec.C, ej.superior.largo)] },
    { id: 'tope', nombre: `Tope de extensión ${tp.rosca}`, cuerpo: 'muslo', material: 'acero', despiece: [25, 45, 0], anadido: true,
      descripcion: `Tornillo ${tp.rosca} con capuchón de hule Ø${tp.dHule}; baja de la placa del AFS1 y apoya en la ceja del adaptador inferior`,
      correccion: 'Pieza añadida: el diseño original no tenía tope de extensión. Ajustar con contratuerca para que apoye justo a 0°.',
      cuerpos: [
        { eje: 'y', contorno: circulo(ens.topeContacto[0], 0, tp.dHule / 2, 24), a0: ens.topeContacto[1], a1: ens.topeContacto[1] + tp.altoHule, forma: { tipo: 'circulo', d: tp.dHule }, barrenos: [] },
        { eje: 'y', contorno: circulo(ens.topeContacto[0], 0, tp.dTornillo / 2, 24), a0: ens.topeContacto[1] + tp.altoHule, a1: ens.yArribaAFS1, forma: { tipo: 'circulo', d: tp.dTornillo }, barrenos: [] },
        { eje: 'y', contorno: circulo(ens.topeContacto[0], 0, 6.5, 6).map(([x, z]) => [x, z, 1]), a0: ens.yArribaAFS1, a1: ens.yArribaAFS1 + 5.3, forma: { tipo: 'hex', s: 13 }, barrenos: [] },
      ] },
  ];

  // Numeración para planos y lista de materiales: una por pieza distinta.
  let n = 0;
  const num = {};
  for (const p of piezas) if (!p.igualA) num[p.id] = ++n;
  for (const p of piezas) {
    p.item = num[p.igualA || p.id];
    p.cantidad = piezas.filter((q) => (q.igualA || q.id) === (p.igualA || p.id)).length;
    p.estimado = g.estimado;
    p.volumenMm3 = p.cuerpos.reduce((s, c) => {
      const largo = c.a1 - c.a0;
      const huecos = c.barrenos.reduce((h, bb) => h + (Math.PI * bb.d * bb.d) / 4, 0);
      return s + (areaPoligono(c.contorno) - huecos) * largo;
    }, 0);
  }
  return { piezas, ejes: [], mec, ens };
}

export function masaRodilla(materialId) {
  const { piezas } = construirPiezas();
  const mat = CONFIG.materiales[materialId];
  if (!mat || !mat.densidadKgM3) return null;
  const k3 = (mat.escala || 1) ** 3;
  const dens = (p) => (p.material === 'acero' ? CONFIG.geometria.ejes.densidadKgM3 : mat.densidadKgM3 * k3);
  const porPieza = Object.fromEntries(piezas.map((p) => [p.id, p.volumenMm3 * 1e-9 * dens(p) * 1000]));
  const pernosG = piezas.filter((p) => p.material === 'acero').reduce((s, p) => s + porPieza[p.id], 0);
  const totalG = Object.values(porPieza).reduce((s, v) => s + v, 0);
  return { maquinadasG: totalG - pernosG, pernosG, totalG, porPieza };
}
