// Colores compartidos por la vista 3D y la figura isométrica.
// Mapa de esfuerzos: azul → verde → amarillo → rojo (uso 0 → 1 de la fluencia). Devuelve [r, g, b] en 0..1.
export function rgbEsfuerzo(uso) {
  const u = Math.max(0, Math.min(1, uso || 0));
  const paradas = [[0, [0.16, 0.36, 0.8]], [0.33, [0.12, 0.62, 0.38]], [0.66, [0.93, 0.76, 0.1]], [1, [0.8, 0.13, 0.1]]];
  let i = 0;
  while (i < paradas.length - 2 && u > paradas[i + 1][0]) i++;
  const [u0, c0] = paradas[i], [u1, c1] = paradas[i + 1], k = (u - u0) / (u1 - u0);
  return c0.map((c, j) => c + (c1[j] - c) * k);
}
// Un color por material, para distinguir qué pieza es de qué.
export const COLOR_MATERIAL = {
  'al-6061-t6': { nombre: 'Aluminio 6061-T6', rgb: [0.56, 0.68, 0.8] },
  'al-7075-t6': { nombre: 'Aluminio 7075-T6', rgb: [0.83, 0.71, 0.42] },
  'prototipo-3d': { nombre: 'PLA impreso', rgb: [0.93, 0.5, 0.2] },
  acero: { nombre: 'Acero (pernos)', rgb: [0.33, 0.35, 0.4] },
};
export const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
export const mezclar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
