// Utilidades de vectores 2D, interpolación y formato.
export const rad = (g) => (g * Math.PI) / 180;
export const grados = (r) => (r * 180) / Math.PI;
export const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
export const sum = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const res = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const esc = (a, k) => [a[0] * k, a[1] * k];
export const norma = (a) => Math.hypot(a[0], a[1]);
export const unit = (a) => { const n = norma(a) || 1; return [a[0] / n, a[1] / n]; };
export const cruz = (a, b) => a[0] * b[1] - a[1] * b[0];
export const punto = (a, b) => a[0] * b[0] + a[1] * b[1];
export const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
export const mezcla = (a, b, t) => a + (b - a) * t;

// Marco 2D: p_mundo = rot(p_local, ang) + t
export const marco = (ang, t) => ({ ang, t });
export const aMundo = (m, p) => sum(rot(p, m.ang), m.t);
export const aLocal = (m, p) => rot(res(p, m.t), -m.ang);
export const dirMundo = (m, v) => rot(v, m.ang);
export const dirLocal = (m, v) => rot(v, -m.ang);

// Interpolación cúbica monótona (PCHIP) sobre una tabla [[t, v], ...].
export function curva(tabla) {
  const n = tabla.length;
  const xs = tabla.map((p) => p[0]);
  const ys = tabla.map((p) => p[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (t) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const s = (t - xs[i]) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}

export const fmt = (v, dec = 1) =>
  Number.isFinite(v) ? v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—';
