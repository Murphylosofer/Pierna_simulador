// Diagramas de movimiento sincronizados con la simulación: cinemático + centroda, cuerpo libre,
// torque–ángulo, fuerza–tiempo y zona de estabilidad con la línea TKA.
import { CONFIG } from './config.js';
import { escenario } from './escenarios.js';
import { grafica } from './graficas.js';
import { aMundo, rot, sum, res, esc, unit, norma, fmt } from './mat.js';

let raiz, app_, gTorque, gFuerza;
const pt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const DEF = `<defs><marker id="pf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
  <pattern id="tierra" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--tenue)" stroke-width="1"/></pattern></defs>`;
const flecha = (a, b, color, texto, lado = 1) => {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}" stroke-width="2" marker-end="url(#pf)"/>` + (texto ? `<text x="${(b[0] + 6 * lado).toFixed(1)}" y="${(b[1] + 4).toFixed(1)}" text-anchor="${lado > 0 ? 'start' : 'end'}" class="dg-v">${texto}</text>` : '');
};

function cinematico(inst) {
  const M = app_.modelo, sol = inst.sol, s = 2.3, W = 420, H = 470;
  const X = (p) => [W / 2 + 20 + p[0] * s, 330 - p[1] * s];
  const cen = M.centroda.map((c) => X(c.cir));
  const col = inst.cargado ? (inst.estable ? 'var(--ok)' : 'var(--mal)') : 'var(--guinda)';
  const perno = (p, n, dx, dy) => { const q = X(p); return `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="5" fill="var(--superficie)" stroke="var(--tinta)" stroke-width="2"/><text x="${(q[0] + dx).toFixed(1)}" y="${(q[1] + dy).toFixed(1)}" class="dg-e">${n}</text>`; };
  const tierra = (p) => { const q = X(p); return `<path d="M${q[0] - 14} ${q[1] + 16}h28" stroke="var(--tinta)" stroke-width="2"/><rect x="${q[0] - 14}" y="${q[1] + 16}" width="28" height="8" fill="url(#tierra)"/><path d="M${pt(q)}l-9 16h18z" fill="var(--hundido)" stroke="var(--tinta)" stroke-width="1.5"/>`; };
  const A = X(sol.A), B = X(sol.B), C = X(sol.C), D = X(sol.D), I = sol.cir ? X(sol.cir) : null;
  const top = X(aMundo(sol.muslo, [0, 105]));
  let g = DEF + tierra(sol.C) + tierra(sol.D);
  g += `<path d="M${cen.map(pt).join('L')}" fill="none" stroke="var(--guinda)" stroke-width="1.5" stroke-dasharray="1 4" stroke-linecap="round"/>`;
  for (const k of [0, 30, 60, 90, 135]) { const c = cen[k]; g += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="2.2" fill="var(--guinda)"/><text x="${(c[0] + 6).toFixed(1)}" y="${(c[1] - 5).toFixed(1)}" class="dg-m">${k}°</text>`; }
  if (I) g += `<path d="M${pt(D)}L${pt(I)}M${pt(C)}L${pt(I)}" stroke="${col}" stroke-width="1.2" stroke-dasharray="6 4"/>`;
  g += `<path d="M${pt(A)}L${pt(B)}L${pt(top)}z" fill="var(--guinda-suave)" stroke="var(--tinta)" stroke-width="2" stroke-linejoin="round"/>`;
  g += `<path d="M${pt(D)}L${pt(A)}M${pt(C)}L${pt(B)}" stroke="var(--tinta)" stroke-width="5" stroke-linecap="round"/>`;
  g += `<path d="M${pt(C)}L${pt(D)}" stroke="var(--tinta)" stroke-width="2" stroke-dasharray="3 3"/>`;
  g += perno(sol.A, 'A', 9, -6) + perno(sol.B, 'B', -18, -6) + perno(sol.C, 'C', -20, 4) + perno(sol.D, 'D', 10, 4);
  const mc1 = X(esc(sum(sol.A, sol.D), 0.5)), mc2 = X(esc(sum(sol.B, sol.C), 0.5));
  g += `<text x="${mc1[0] + 9}" y="${mc1[1]}" class="dg-e">c1</text><text x="${mc2[0] - 24}" y="${mc2[1]}" class="dg-e">c2</text><text x="${top[0] + 8}" y="${top[1] + 4}" class="dg-m">adaptador (muslo)</text>`;
  if (I) g += `<circle cx="${I[0].toFixed(1)}" cy="${I[1].toFixed(1)}" r="6" fill="${col}" stroke="var(--superficie)" stroke-width="2"/><text x="${(I[0] + 10).toFixed(1)}" y="${(I[1] + 4).toFixed(1)}" class="dg-e">CIR</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama cinemático del mecanismo de cuatro barras con la centroda del centro instantáneo de rotación.">${g}</svg>`;
}

function cuerpoLibre(inst) {
  const sol = inst.sol, c = inst.cargas, W = 200, H = 210, s = 1.25;
  const fmax = Math.max(Math.abs(c.F1), Math.abs(c.F2), c.magE, Math.abs(c.Fs), 1), ks = 46 / fmax;
  const base = (pivotes, extra, titulo, forma) => {
    const cx = pivotes.reduce((a, p) => a + p[0], 0) / pivotes.length, cy = pivotes.reduce((a, p) => a + p[1], 0) / pivotes.length;
    const X = (p) => [W / 2 + (p[0] - cx) * s, H / 2 + 8 - (p[1] - cy) * s];
    let g = DEF + forma(X);
    for (const p of pivotes) { const q = X(p); g += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.5" fill="var(--superficie)" stroke="var(--tinta)" stroke-width="1.5"/>`; }
    for (const [p, F, color, t] of extra) {
      const L = norma(F);
      if (L < 0.5) continue;
      const u = unit(F), q = X(p), fin = [q[0] + u[0] * (14 + L * ks), q[1] - u[1] * (14 + L * ks)];
      g += flecha(q, fin, color, t, fin[0] >= W / 2 ? 1 : -1);
    }
    return `<figure><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagrama de cuerpo libre: ${titulo}">${g}</svg><figcaption>${titulo}</figcaption></figure>`;
  };
  const N = (v) => `${fmt(Math.abs(v), 0)} N`;
  const f1 = esc(sol.u1, c.F1), f2 = esc(sol.u2, c.F2), fs = esc(c.topeN, c.Fs), az = 'var(--serie-sana)', gu = 'var(--guinda)';
  const cargaP = esc(c.E, -1), pCarga = c.magE > 1 ? aMundo(sol.muslo, [0, 80]) : sol.A;
  const linea = (X, a, b) => `<path d="M${pt(X(a))}L${pt(X(b))}" stroke="var(--tinta)" stroke-width="7" stroke-linecap="round" opacity=".28"/>`;
  return [
    base([sol.A, sol.B], [[sol.A, f1, az, N(c.F1)], [sol.B, f2, az, N(c.F2)], [c.topeS, fs, 'var(--aviso)', c.Fs > 1 ? `tope ${N(c.Fs)}` : ''], [pCarga, cargaP, gu, N(c.magE)]], 'Adaptador superior (muslo)', (X) => `<path d="M${pt(X(sol.A))}L${pt(X(sol.B))}L${pt(X(aMundo(sol.muslo, [0, 90])))}z" fill="var(--guinda-suave)" stroke="var(--tinta)" stroke-width="1.5"/>`),
    base([sol.D, sol.A], [[sol.A, esc(f1, -1), az, N(c.F1)], [sol.D, f1, az, c.F1 >= 0 ? 'compresión' : 'tracción']], 'Barras c1 (par)', (X) => linea(X, sol.D, sol.A)),
    base([sol.C, sol.B], [[sol.B, esc(f2, -1), az, N(c.F2)], [sol.C, f2, az, c.F2 >= 0 ? 'compresión' : 'tracción']], 'Barras c2 (par)', (X) => linea(X, sol.C, sol.B)),
    base([sol.C, sol.D], [[sol.D, esc(f1, -1), az, N(c.F1)], [sol.C, esc(f2, -1), az, N(c.F2)], [[0, -30], c.E, gu, `R ${N(c.magE)}`]], 'Base inferior (pierna)', (X) => `<path d="M${pt(X(sol.C))}L${pt(X(sol.D))}L${pt(X([0, -30]))}z" fill="var(--hundido)" stroke="var(--tinta)" stroke-width="1.5"/>`),
  ].join('');
}

function tka(inst) {
  const M = app_.modelo, P = inst.postura, W = 380, H = 470, s = 0.46;
  const k0 = aMundo(P.mPierna, [0, 0]);
  const X = (p) => [W / 2 + (p[0] - k0[0]) * s + 10, H - 24 - p[1] * s];
  const cad = aMundo(P.mMuslo, [M.ctx.e, M.seg.muslo]), tob = P.tobP;
  const col = inst.cargado ? (inst.estable ? 'var(--ok)' : 'var(--mal)') : 'var(--tenue)';
  let g = DEF + `<line x1="10" x2="${W - 10}" y1="${H - 24}" y2="${H - 24}" stroke="var(--tinta)" stroke-width="2"/><rect x="10" y="${H - 24}" width="${W - 20}" height="8" fill="url(#tierra)"/>`;
  if (inst.cargado) {
    const u = unit(inst.grf.F), a = X(sum(inst.grf.p, esc(u, -30))), b = X(sum(inst.grf.p, esc(u, 1000)));
    const lejos = [a[0] - 600, a[1]], lejos2 = [b[0] - 600, b[1]];
    g += `<path d="M${pt(a)}L${pt(b)}L${pt(lejos2)}L${pt(lejos)}z" fill="var(--ok-suave)"/><text x="16" y="24" class="dg-m">zona estable: CIR detrás de la línea de carga</text>`;
    g += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${col}" stroke-width="2"/>`;
  }
  g += `<path d="M${pt(X(cad))}L${pt(X(tob))}" stroke="var(--serie-sana)" stroke-width="1.5" stroke-dasharray="7 4"/>`;
  const cen = M.centroda.map((c) => X(aMundo(P.mPierna, c.cir)));
  g += `<path d="M${cen.map(pt).join('L')}" fill="none" stroke="var(--guinda)" stroke-width="1.5" stroke-dasharray="1 4" stroke-linecap="round"/>`;
  const rodTop = aMundo(P.mMuslo, [0, 100]), rodBot = aMundo(P.mPierna, [0, -60]);
  g += `<path d="M${pt(X(cad))}L${pt(X(rodTop))}" stroke="var(--tinta)" stroke-width="12" stroke-linecap="round" opacity=".25"/>`;
  g += `<path d="M${pt(X(rodBot))}L${pt(X(aMundo(P.mPierna, [0, -M.Lps])))}" stroke="var(--tinta)" stroke-width="5" stroke-linecap="round" opacity=".5"/>`;
  g += `<path d="M${pt(X(P.pieP[0]))}L${pt(X(P.pieP[1]))}L${pt(X(sum(tob, [30, 0])))}L${pt(X(sum(tob, [-30, 0])))}z" fill="var(--hundido)" stroke="var(--tinta)" stroke-width="1.5"/>`;
  const sol = inst.sol, q = (p) => X(aMundo(P.mPierna, p));
  g += `<path d="M${pt(q(sol.D))}L${pt(q(sol.A))}M${pt(q(sol.C))}L${pt(q(sol.B))}" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round"/>`;
  const marca = (p, t, dx = 8) => { const z = X(p); return `<circle cx="${z[0].toFixed(1)}" cy="${z[1].toFixed(1)}" r="4" fill="var(--superficie)" stroke="var(--serie-sana)" stroke-width="2"/><text x="${(z[0] + dx).toFixed(1)}" y="${(z[1] + 4).toFixed(1)}" class="dg-e" text-anchor="${dx < 0 ? 'end' : 'start'}">${t}</text>`; };
  g += marca(cad, 'T · trocánter') + marca(k0, 'K · rodilla', -8) + marca(tob, 'A · tobillo');
  if (inst.cirMundo) { const z = X(inst.cirMundo); g += `<circle cx="${z[0].toFixed(1)}" cy="${z[1].toFixed(1)}" r="6" fill="${inst.cargado ? col : 'var(--guinda)'}" stroke="var(--superficie)" stroke-width="2"/><text x="${(z[0] - 10).toFixed(1)}" y="${(z[1] + 4).toFixed(1)}" text-anchor="end" class="dg-e">CIR</text>`; }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Alineación de banco: línea trocánter, rodilla, tobillo, con la línea de carga y el centro instantáneo de rotación.">${g}</svg>`;
}

function pintarGraficas() {
  const M = app_.modelo, escn = escenario(app_.estado.escId), c = M.ciclo(escn.id), T = escn.duracion(M.ctx);
  gTorque?.destruir(); gFuerza?.destruir();
  gTorque = grafica(raiz.querySelector('#dg-torque'), { titulo: 'Torque contra ángulo de flexión', unidad: 'N·m', ejeX: '° de flexión', xMin: 0, xMax: 135,
    series: [{ nombre: 'Torque externo en la rodilla', color: 'var(--serie-protesis)', puntos: c.muestras.map((m) => [m.theta, m.torque]) }], parametrica: true,
    nota: `Escenario: ${escn.nombre}. La curva recorre el movimiento en orden; el punto marca el instante actual. A 0° se apilan los valores del apoyo.` });
  gFuerza = grafica(raiz.querySelector('#dg-fuerza'), { titulo: 'Fuerza contra tiempo', unidad: 'N', ejeX: 's', xMin: 0, xMax: T, formatoX: (v) => fmt(v, 1), decimales: 0,
    series: [{ nombre: 'Reacción del suelo', color: 'var(--serie-protesis)', puntos: c.muestras.map((m) => [m.t * T, m.reaccionN]) },
      { nombre: 'Barras c1', color: 'var(--serie-sana)', puntos: c.muestras.map((m) => [m.t * T, m.F1]) },
      { nombre: 'Barras c2', color: 'var(--serie-tres)', guion: true, puntos: c.muestras.map((m) => [m.t * T, m.F2]) }],
    refs: [{ y: M.capacidadDisenoKg * 9.81, texto: `Capacidad de diseño ${fmt(M.capacidadDisenoKg, 1)} kg = ${fmt(M.capacidadDisenoKg * 9.81, 0)} N`, incluir: c.reaccionMax > M.capacidadDisenoKg * 9.81 * 0.6 }] });
}

export function actualizar(app) {
  const inst = app.inst;
  if (!inst || !raiz) return;
  raiz.querySelector('#dg-cin').innerHTML = cinematico(inst);
  raiz.querySelector('#dg-dcl').innerHTML = cuerpoLibre(inst);
  raiz.querySelector('#dg-tka').innerHTML = tka(inst);
  const escn = escenario(app.estado.escId), T = escn.duracion(app.modelo.ctx);
  gTorque?.cursor(inst.t * 100); gFuerza?.cursor(inst.t * T);
  raiz.querySelector('#dg-estado').innerHTML = `<strong>${escn.nombre}</strong> · ${inst.fase.nombre} · θ ${fmt(inst.theta, 1)}° · CIR (${inst.sol.cir ? fmt(inst.sol.cir[0], 0) + ', ' + fmt(inst.sol.cir[1], 0) : '—'}) mm · ${inst.cargado ? (inst.estable ? 'estable' : 'requiere control') : 'sin carga'}`;
  raiz.querySelector('#dg-play').textContent = app.estado.reproduciendo ? 'Pausar' : 'Reproducir';
}

export function montar(cont, app) {
  raiz = cont; app_ = app;
  cont.innerHTML = `
    <style>
      .dg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.dg>*{min-width:0}
      .dg .tarjeta{padding:14px}.dg h3{font-size:1.1rem;margin-bottom:4px}
      .dg svg{display:block;width:100%;height:auto;max-height:520px}
      .dg-e{font:600 13px var(--display);fill:var(--tinta)}.dg-m{font:12px var(--texto);fill:var(--tenue)}.dg-v{font:600 12px var(--texto);fill:var(--tinta);font-variant-numeric:tabular-nums}
      .dcl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.dcl figure{margin:0}.dcl figcaption{font-size:.84rem;color:var(--tenue);text-align:center}
      .dg .ancho{grid-column:1/-1}
      .dg-barra{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
      @media(max-width:900px){.dg{grid-template-columns:minmax(0,1fr)}.dcl{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>
    <h2 class="seccion-titulo">Diagramas de movimiento</h2>
    <p class="seccion-intro">Siguen el mismo instante que la simulación. El escenario y el nivel K se eligen en la pestaña Simulación.</p>
    <div class="dg-barra"><button type="button" class="boton primario" id="dg-play"></button><span id="dg-estado" class="num"></span></div>
    <div class="dg">
      <div class="panel tarjeta"><h3>Diagrama cinemático y centroda</h3><p class="ayuda">La línea punteada es la trayectoria del CIR de 0° a 135°.</p><div id="dg-cin"></div><div class="chips">${app.chipNorma('radcliffe')}</div></div>
      <div class="panel tarjeta"><h3>Zona de estabilidad y alineación de banco</h3><p class="ayuda">Línea azul discontinua: trocánter–rodilla–tobillo (TKA). La rodilla queda ${CONFIG.diseno.desplazamientoPosteriorEjeMm} mm detrás de ella.</p><div id="dg-tka"></div><div class="chips">${app.chipNorma('radcliffe')}${app.chipNorma('iso-10328')}</div></div>
      <div class="panel tarjeta ancho"><h3>Diagramas de cuerpo libre</h3><p class="ayuda">Fuerzas sobre cada cuerpo en este instante. Azul: reacciones en los pernos. Guinda: carga externa. Las flechas indican dirección; la magnitud está en el rótulo.</p><div class="dcl" id="dg-dcl"></div></div>
      <div id="dg-torque"></div><div id="dg-fuerza"></div>
    </div>`;
  cont.querySelector('#dg-play').addEventListener('click', () => { app.estado.reproduciendo = !app.estado.reproduciendo; actualizar(app); });
  pintarGraficas();
  actualizar(app);
}
export function alMostrar(app) { pintarGraficas(); actualizar(app); }
export function alCambiarModelo() { pintarGraficas(); }
export function alCambiarEscenario() { pintarGraficas(); }
