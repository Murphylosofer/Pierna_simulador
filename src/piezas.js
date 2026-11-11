// Geometría paramétrica de las 12 piezas, generada SOLO a partir de CONFIG.
// La usan la vista 3D, la figura isométrica, los planos, el STL y el cálculo de masa.
// Cada cuerpo es un prisma: contorno 2D extruido a lo largo de un eje ('z' lateral o 'y' vertical).
import { CONFIG } from './config.js';
import { crearMecanismo } from './cinematica.js';

const rect = (x0, y0, x1, y1) => [[x0, y0, 1], [x1, y0, 1], [x1, y1, 1], [x0, y1, 1]];
const circulo = (cx, cy, r, n = 40) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI), 0]);
function estadio(L, w, n = 14) {
  const r = w / 2, pts = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; pts.push([L + r * Math.cos(a), r * Math.sin(a), 0]); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI; pts.push([r * Math.cos(a), r * Math.sin(a), 0]); }
  return pts;
}
const areaPoligono = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

export function construirPiezas() {
  const { mecanismo: m, piezas: P, pernos } = CONFIG;
  const mec = crearMecanismo(m);
  const d = pernos.diametro;
  const E = P.estimado || m.estimado;
  const [ax, ay] = m.A, [bx, by] = m.B, [cx, cy] = m.C, [dx, dy] = m.D;
  const ad = P.adaptador, ba = P.base, tb = P.tuboReceptor, bl = P.barraLateral;
  const yPlacaSup = ad.yBase + ad.espesorPlaca;
  const yBaseInf = ba.yTope - ba.espesorPlaca;
  const tornillo = 6.4; // paso para tornillo M6

  const barra = (L, z0, z1) => ({
    eje: 'z', contorno: estadio(L, bl.ancho), a0: z0, a1: z1, forma: { tipo: 'estadio', L, ancho: bl.ancho },
    barrenos: [{ u: 0, v: 0, d, ajuste: 'H7' }, { u: L, v: 0, d, ajuste: 'H7' }],
  });
  const bloque = (x, y0, y1, mw, zz, eje, py) => ({
    eje: 'z', contorno: rect(x - mw, y0, x + mw, y1), a0: -zz, a1: zz, forma: { tipo: 'rect' },
    barrenos: [{ u: x, v: py, d, ajuste: 'H7' }],
  });

  const piezas = [
    {
      id: 'adaptador', nombre: 'Adaptador superior', descripcion: 'Soporte con receptáculo circular para el socket', cuerpo: 'muslo', despiece: [0, 60, 0],
      cuerpos: [
        { eje: 'y', contorno: rect(ad.xMin, -ad.anchoZ / 2, ad.xMax, ad.anchoZ / 2), a0: ad.yBase, a1: yPlacaSup, forma: { tipo: 'rect' },
          barrenos: [[ax, 12], [ax, -12], [bx, 5], [bx, -5]].map(([u, v]) => ({ u, v, d: tornillo, ajuste: 'pasado M6' })) },
        { eje: 'y', contorno: circulo(m.ejePilonX, 0, ad.anilloDext / 2), a0: yPlacaSup, a1: yPlacaSup + ad.anilloAlto, forma: { tipo: 'circulo', d: ad.anilloDext },
          barrenos: [{ u: m.ejePilonX, v: 0, d: ad.anilloDint, ajuste: 'H8' }] },
      ],
    },
    { id: 'supDelantera', nombre: 'Barra superior delantera', descripcion: 'Porta-eje A, atornillada al adaptador', cuerpo: 'muslo', despiece: [30, 25, 0],
      cuerpos: [bloque(ax, P.barraSupDelantera.yInferior, ad.yBase, P.barraSupDelantera.medioAnchoX, P.separacionC1, 'A', ay)] },
    { id: 'supTrasera', nombre: 'Barra superior trasera', descripcion: 'Porta-eje B, atornillada al adaptador', cuerpo: 'muslo', despiece: [-35, 25, 0],
      cuerpos: [bloque(bx, P.barraSupTrasera.yInferior, ad.yBase, P.barraSupTrasera.medioAnchoX, P.separacionC2, 'B', by)] },
    { id: 'c1Der', nombre: 'Barra lateral c1 derecha', descripcion: 'Eslabón delantero A–D', cuerpo: 'c1', despiece: [0, 0, 45],
      cuerpos: [barra(mec.L1, P.separacionC1, P.separacionC1 + bl.espesor)] },
    { id: 'c1Izq', nombre: 'Barra lateral c1 izquierda', descripcion: 'Eslabón delantero A–D', cuerpo: 'c1', despiece: [0, 0, -45],
      cuerpos: [barra(mec.L1, -P.separacionC1 - bl.espesor, -P.separacionC1)] },
    { id: 'c2Der', nombre: 'Barra lateral c2 derecha', descripcion: 'Eslabón trasero B–C', cuerpo: 'c2', despiece: [0, 0, 28],
      cuerpos: [barra(mec.L2, P.separacionC2, P.separacionC2 + bl.espesor)] },
    { id: 'c2Izq', nombre: 'Barra lateral c2 izquierda', descripcion: 'Eslabón trasero B–C', cuerpo: 'c2', despiece: [0, 0, -28],
      cuerpos: [barra(mec.L2, -P.separacionC2 - bl.espesor, -P.separacionC2)] },
    { id: 'barraTrasera', nombre: 'Barra trasera', descripcion: 'Travesaño que une las dos c2 y hace de tope', cuerpo: 'c2', despiece: [0, 40, 0],
      cuerpos: [{ eje: 'z', contorno: rect(mec.L2 / 2 - P.barraTrasera.largo / 2, -P.barraTrasera.alto / 2, mec.L2 / 2 + P.barraTrasera.largo / 2, P.barraTrasera.alto / 2),
        a0: -P.separacionC2, a1: P.separacionC2, forma: { tipo: 'rect' }, barrenos: [{ u: mec.L2 / 2, v: 0, d: 5, ajuste: 'M5' }] }] },
    { id: 'infDelantera', nombre: 'Barra inferior delantera', descripcion: 'Porta-eje D, atornillada a la base', cuerpo: 'pierna', despiece: [30, -25, 0],
      cuerpos: [bloque(dx, ba.yTope, P.barraInfDelantera.ySuperior, P.barraInfDelantera.medioAnchoX, P.separacionC1, 'D', dy)] },
    { id: 'infTrasera', nombre: 'Barra inferior trasera', descripcion: 'Porta-eje C, atornillada a la base', cuerpo: 'pierna', despiece: [-35, -25, 0],
      cuerpos: [bloque(cx, ba.yTope, P.barraInfTrasera.ySuperior, P.barraInfTrasera.medioAnchoX, P.separacionC2, 'C', cy)] },
    { id: 'base', nombre: 'Base inferior', descripcion: 'Placa que recibe las barras inferiores y el tubo', cuerpo: 'pierna', despiece: [0, -60, 0],
      cuerpos: [{ eje: 'y', contorno: rect(ba.xMin, -ba.anchoZ / 2, ba.xMax, ba.anchoZ / 2), a0: yBaseInf, a1: ba.yTope, forma: { tipo: 'rect' },
        barrenos: [[dx, 12], [dx, -12], [cx, 5], [cx, -5]].map(([u, v]) => ({ u, v, d: tornillo, ajuste: 'pasado M6' })) }] },
    { id: 'tubo', nombre: 'Tubo receptor del pilón', descripcion: 'Aloja y sujeta el pilón de aluminio', cuerpo: 'pierna', despiece: [0, -95, 0],
      cuerpos: [{ eje: 'y', contorno: circulo(m.ejePilonX, 0, tb.dext / 2), a0: yBaseInf - tb.largo, a1: yBaseInf, forma: { tipo: 'circulo', d: tb.dext },
        barrenos: [{ u: m.ejePilonX, v: 0, d: tb.dint, ajuste: 'H8' }] }] },
  ];

  piezas.forEach((p, i) => {
    p.item = i + 1;
    p.estimado = E;
    p.volumenMm3 = p.cuerpos.reduce((s, c) => {
      const largo = c.a1 - c.a0;
      const huecos = c.barrenos.reduce((h, b) => h + (Math.PI * b.d * b.d) / 4, 0);
      return s + (areaPoligono(c.contorno) - huecos) * largo;
    }, 0);
  });

  const largoC1 = 2 * (P.separacionC1 + bl.espesor) + 4, largoC2 = 2 * (P.separacionC2 + bl.espesor) + 4;
  const ejes = [
    { id: 'pernoA', nombre: 'Perno eje A', cuerpo: 'muslo', centro: m.A, largo: largoC1 },
    { id: 'pernoB', nombre: 'Perno eje B', cuerpo: 'muslo', centro: m.B, largo: largoC2 },
    { id: 'pernoC', nombre: 'Perno eje C', cuerpo: 'pierna', centro: m.C, largo: largoC2 },
    { id: 'pernoD', nombre: 'Perno eje D', cuerpo: 'pierna', centro: m.D, largo: largoC1 },
  ].map((e) => ({ ...e, d, volumenMm3: (Math.PI * d * d) / 4 * e.largo }));

  return { piezas, ejes, mec };
}

export function masaRodilla(materialId) {
  const { piezas, ejes } = construirPiezas();
  const mat = CONFIG.materiales[materialId];
  if (!mat || !mat.densidadKgM3) return null;
  const maquinadas = piezas.reduce((s, p) => s + p.volumenMm3, 0) * 1e-9 * mat.densidadKgM3 * 1000;
  const pernos = ejes.reduce((s, e) => s + e.volumenMm3, 0) * 1e-9 * CONFIG.pernos.densidadKgM3 * 1000;
  return { maquinadasG: maquinadas, pernosG: pernos, totalG: maquinadas + pernos,
    porPieza: Object.fromEntries(piezas.map((p) => [p.id, p.volumenMm3 * 1e-9 * mat.densidadKgM3 * 1000])) };
}
