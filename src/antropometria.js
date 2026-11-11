// Segmentos corporales promedio a partir de estatura y peso (Winter 2009; Dempster 1955).
import { CONFIG } from './config.js';

export const CLAVES_SEGMENTO = [
  { id: 'muslo', nombre: 'Muslo (cadera → rodilla)' },
  { id: 'pierna', nombre: 'Pierna (rodilla → tobillo)' },
  { id: 'pie', nombre: 'Longitud del pie' },
  { id: 'alturaRodilla', nombre: 'Altura de la rodilla' },
  { id: 'munon', nombre: 'Longitud del muñón' },
];

export function segmentosAutomaticos(estaturaM, pesoKg) {
  const H = estaturaM * 1000;
  const { longitud: L, masa: M, munonFraccionMuslo } = CONFIG.antropometria;
  const s = {};
  for (const k of Object.keys(L)) s[k] = L[k] * H;
  s.munon = munonFraccionMuslo * s.muslo;
  s.estatura = H;
  s.masas = { muslo: M.muslo * pesoKg, pierna: M.pierna * pesoKg, pie: M.pie * pesoKg };
  // Grosor del maniquí: escala con la raíz del IMC respecto a 22.
  s.corpulencia = Math.sqrt(pesoKg / (estaturaM * estaturaM) / 22);
  return s;
}

export function segmentos(usuario) {
  const auto = segmentosAutomaticos(usuario.estaturaM, usuario.pesoKg);
  if (usuario.segmentos.modo !== 'personalizado') return { ...auto, modo: 'automatico', auto };
  const p = usuario.segmentos.personalizados;
  const s = { ...auto, modo: 'personalizado', auto };
  for (const { id } of CLAVES_SEGMENTO) if (Number.isFinite(p[id])) s[id] = p[id];
  // La altura de rodilla manda sobre la suma pierna + tobillo.
  if (Number.isFinite(p.alturaRodilla)) s.pierna = Math.max(150, s.alturaRodilla - s.alturaTobillo);
  else s.alturaRodilla = s.pierna + s.alturaTobillo;
  s.alturaCadera = s.alturaRodilla + s.muslo;
  s.munon = Math.min(s.munon, s.muslo - 20);
  return s;
}
