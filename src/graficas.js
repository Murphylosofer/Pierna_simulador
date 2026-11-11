// Gráficas de líneas en SVG: un eje, rejilla tenue, leyenda, cursor sincronizado y globo al pasar el puntero.
import { fmt } from './mat.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}, padre) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (padre) padre.appendChild(e); return e; };

function marcas(min, max, n = 5) {
  const paso0 = (max - min) / n, mag = 10 ** Math.floor(Math.log10(paso0)), r = paso0 / mag;
  const paso = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-6; v += paso) out.push(Math.abs(v) < paso * 1e-6 ? 0 : v);
  return out;
}

/**
 * opc: { titulo, unidad, ejeX, series:[{nombre, color, puntos:[[x,y]], guion}], refs:[{y, texto, color}],
 *        yMin, yMax, decimales, formatoX, nota, alto }
 */
export function grafica(cont, opc) {
  cont.classList.add('grafica', 'panel');
  cont.innerHTML = `<header><h3>${opc.titulo}</h3><div class="leyenda">${
    opc.series.length > 1 ? opc.series.map((s) => `<span><i class="${s.guion ? 'guion' : ''}" style="border-color:${s.color}"></i>${s.nombre}</span>`).join('') : `<span>${opc.unidad}</span>`
  }</div></header><div class="lienzo"></div>${opc.nota ? `<p class="nota">${opc.nota}</p>` : ''}`;
  const lienzo = cont.querySelector('.lienzo');
  const alto = opc.alto || 200, m = { i: 44, d: 14, a: 10, b: 30 };
  const todos = opc.series.flatMap((s) => s.puntos);
  const xs = todos.map((p) => p[0]), ys = todos.map((p) => p[1]).filter(Number.isFinite);
  const x0 = opc.xMin ?? Math.min(...xs), x1 = opc.xMax ?? Math.max(...xs);
  let y0 = opc.yMin ?? Math.min(0, ...ys), y1 = opc.yMax ?? Math.max(...ys, ...(opc.refs || []).filter((r) => r.incluir).map((r) => r.y));
  if (y1 - y0 < 1e-6) y1 = y0 + 1;
  const my = marcas(y0, y1, 4);
  if (opc.yMin == null) y0 = Math.min(y0, my[0]);
  if (opc.yMax == null) y1 = Math.max(y1, my[my.length - 1] + (my[1] - my[0]) * (my[my.length - 1] < y1 ? 1 : 0));
  const dec = opc.decimales ?? 1;
  const fx = opc.formatoX || ((v) => fmt(v, 0));
  let ancho = 0, svg, cursorG, hoverG, globo, sx, sy;

  function dibujar() {
    ancho = Math.max(260, lienzo.clientWidth);
    lienzo.innerHTML = '';
    svg = el('svg', { viewBox: `0 0 ${ancho} ${alto}`, height: alto, role: 'img', 'aria-label': `${opc.titulo}. ${opc.series.map((s) => s.nombre).join(', ')}.` }, lienzo);
    sx = (x) => m.i + ((x - x0) / (x1 - x0)) * (ancho - m.i - m.d);
    sy = (y) => alto - m.b - ((y - y0) / (y1 - y0)) * (alto - m.a - m.b);
    const rej = el('g', { class: 'rejilla' }, svg), eje = el('g', { class: 'eje' }, svg);
    for (const v of marcas(y0, y1, 4)) {
      el('line', { x1: m.i, x2: ancho - m.d, y1: sy(v), y2: sy(v) }, rej);
      el('text', { x: m.i - 6, y: sy(v) + 4, 'text-anchor': 'end' }, eje).textContent = fmt(v, Math.abs(y1 - y0) < 5 ? 1 : 0);
    }
    for (const v of marcas(x0, x1, ancho < 420 ? 4 : 6)) el('text', { x: sx(v), y: alto - m.b + 16, 'text-anchor': 'middle' }, eje).textContent = fx(v);
    el('text', { x: ancho - m.d, y: alto - 2, 'text-anchor': 'end' }, eje).textContent = opc.ejeX;
    if (opc.series.length > 1) el('text', { x: m.i, y: m.a + 2, 'text-anchor': 'start' }, eje).textContent = opc.unidad;
    const gr = el('g', { class: 'ref' }, svg);
    for (const r of opc.refs || []) {
      if (r.y < y0 || r.y > y1) continue;
      el('line', { x1: m.i, x2: ancho - m.d, y1: sy(r.y), y2: sy(r.y), stroke: r.color || 'var(--serie-ref)', 'stroke-width': 1.25, 'stroke-dasharray': '2 4' }, gr);
      el('text', { x: ancho - m.d - 2, y: sy(r.y) - 4, 'text-anchor': 'end' }, gr).textContent = r.texto;
    }
    for (const s of opc.series) {
      let d = '', pluma = false;
      for (const [x, y] of s.puntos) {
        if (!Number.isFinite(y)) { pluma = false; continue; }
        d += `${pluma ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(Math.max(y0, Math.min(y1, y))).toFixed(1)}`;
        pluma = true;
      }
      el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...(s.guion ? { 'stroke-dasharray': '6 4' } : {}) }, svg);
    }
    cursorG = el('g', {}, svg);
    hoverG = el('g', {}, svg);
    globo = document.createElement('div');
    globo.className = 'globo';
    globo.hidden = true;
    lienzo.appendChild(globo);
    if (ultimo != null) cursor(ultimo);
  }

  const valorEn = (s, x) => {
    const p = s.puntos;
    if (!p.length || x < p[0][0] || x > p[p.length - 1][0]) return NaN;
    let i = 0;
    while (i < p.length - 2 && p[i + 1][0] < x) i++;
    const [xa, ya] = p[i], [xb, yb] = p[i + 1];
    return xb === xa ? ya : ya + ((yb - ya) * (x - xa)) / (xb - xa);
  };
  function marcar(g, x, conPuntos) {
    g.innerHTML = '';
    if (x == null || x < x0 || x > x1) return;
    el('line', { x1: sx(x), x2: sx(x), y1: m.a, y2: alto - m.b, stroke: 'var(--tinta)', 'stroke-width': 1, opacity: conPuntos ? 0.55 : 0.3 }, g);
    for (const s of opc.series) {
      const y = valorEn(s, x);
      if (Number.isFinite(y)) el('circle', { cx: sx(x), cy: sy(Math.max(y0, Math.min(y1, y))), r: 4, fill: s.color, stroke: 'var(--superficie)', 'stroke-width': 2 }, g);
    }
  }
  let ultimo = null;
  function cursor(x) { ultimo = x; if (cursorG) marcar(cursorG, x, true); }

  lienzo.addEventListener('pointermove', (ev) => {
    const r = lienzo.getBoundingClientRect();
    const x = x0 + ((ev.clientX - r.left - m.i) / (ancho - m.i - m.d)) * (x1 - x0);
    if (x < x0 || x > x1) { hoverG.innerHTML = ''; globo.hidden = true; return; }
    marcar(hoverG, x, false);
    globo.hidden = false;
    globo.innerHTML = `<b>${fx(x)} ${opc.ejeX}</b><br>` + opc.series.map((s) => { const y = valorEn(s, x); return `<span style="color:${s.color}">●</span> ${s.nombre}: <b>${fmt(y, dec)}</b> ${opc.unidad}`; }).join('<br>');
    const gx = Math.min(ancho - globo.offsetWidth - 4, Math.max(4, ev.clientX - r.left + 12));
    globo.style.left = gx + 'px';
    globo.style.top = '4px';
  });
  lienzo.addEventListener('pointerleave', () => { if (hoverG) hoverG.innerHTML = ''; if (globo) globo.hidden = true; });
  const ro = new ResizeObserver(() => { if (Math.abs(lienzo.clientWidth - ancho) > 2) dibujar(); });
  ro.observe(lienzo);
  dibujar();
  return { cursor, destruir: () => ro.disconnect() };
}
