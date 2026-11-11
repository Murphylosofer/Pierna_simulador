// Pestaña "Normas": en qué nos basamos, con estado, vigencia, tabla de riesgos y prueba ISO 10328 simulada.
import { CONFIG } from './config.js';
import { NORMAS, GRUPOS, ESTADOS, RIESGOS, NOTA_NORMAS, etiquetaNorma } from './normas.js';
import { fmt } from './mat.js';

let raiz, app_;
function tablaISO() {
  const M = app_.modelo, filas = M.iso(), mat = M.mat;
  if (mat.pendiente) return '<div class="aviso neutro">Faltan las propiedades del plástico del prototipo para simular la prueba.</div>';
  const celda = (ok, v) => `<td class="n" style="color:var(--${ok ? 'ok' : 'mal'})">${ok ? 'Pasa' : 'No pasa'} · ${fmt(v, 2)}</td>`;
  const aprobado = filas.filter((f) => f.pasa).map((f) => f.nivel);
  return `<div class="tabla-desliza"><table><thead><tr><th>Nivel</th><th>Masa del usuario</th><th>Condición</th><th class="n">Fuerza de prueba</th><th class="n">Estática (fluencia)</th><th class="n">Fuerza última</th><th class="n">Última (ruptura)</th><th class="n">Fuerza cíclica</th><th class="n">Fatiga 3×10⁶</th></tr></thead><tbody>${
    filas.map((f) => ['I', 'II'].map((c, i) => { const r = f.condiciones[c]; return `<tr>${i === 0 ? `<td rowspan="2"><strong>${f.nivel}</strong>${f.nivel === M.nivelISO ? '<br><span class="ayuda">nivel del usuario</span>' : ''}</td><td rowspan="2">hasta ${f.masaKg} kg</td>` : ''}<td>${c} · ${c === 'I' ? 'talón' : 'antepié'}</td><td class="n">${r.fuerzas.prueba} N</td>${celda(r.pasaPrueba, r.fsPrueba)}<td class="n">${r.fuerzas.ultimaSup} N</td>${celda(r.pasaUltima, r.fsUltima)}<td class="n">${r.fuerzas.ciclica} N</td>${celda(r.pasaFatiga, r.fsFatiga)}</tr>`; }).join('')).join('')
  }</tbody></table></div>
  <p class="ayuda" style="margin-top:8px">Con <strong>${mat.nombre}</strong> la rodilla ${aprobado.length ? `pasaría los niveles ${aprobado.join(', ')}` : 'no pasaría ningún nivel'} en esta estimación. El número es el factor de seguridad de cada verificación (≥ 1 pasa). Para ${fmt(M.usuario.pesoKg, 0)} kg corresponde el nivel <strong>${M.nivelISO}</strong>. Fuerzas transcritas de literatura secundaria: hay que cotejarlas con la norma. ${CONFIG.iso10328.nivelesSuperiores}</p>`;
}
function pintarISO() { if (raiz) raiz.querySelector('#iso-tabla').innerHTML = tablaISO(); }

export function montar(cont, app) {
  raiz = cont; app_ = app;
  const tarjeta = (n) => `<article class="panel nm" id="norma-${n.id}">
      <div class="chips"><span class="norma-chip" data-estado="${n.estado}">${ESTADOS[n.estado].nombre}</span>${n.verificada ? '<span class="norma-chip">Edición confirmada</span>' : '<span class="norma-chip">Año por confirmar</span>'}</div>
      <h4>${etiquetaNorma(n)}</h4><p class="ayuda">${n.titulo}</p>
      <dl><dt>Qué regula</dt><dd>${n.regula}</dd><dt>Cómo se aplica aquí</dt><dd>${n.aplicacion}</dd>${n.nota ? `<dt>Vigencia</dt><dd>${n.nota}</dd>` : ''}</dl></article>`;
  cont.innerHTML = `
    <style>
      .nm-leyenda{display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:20px;font-size:.92rem}
      .nm-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;margin-bottom:28px}
      .nm{padding:14px;display:grid;gap:6px;align-content:start}.nm h4{font-size:1.2rem}.nm dt{font-size:.82rem;color:var(--tenue);margin-top:6px}.nm dd{margin:0;font-size:.94rem}
      .nm-grupo{font-size:1.2rem;margin:0 0 10px}
      .nm-nota{font-size:1.05rem;border-left:4px solid var(--guinda);padding:12px 16px;background:var(--guinda-suave);border-radius:0 var(--radio) var(--radio) 0;max-width:80ch}
    </style>
    <h2 class="seccion-titulo">Normas y estándares en los que nos basamos</h2>
    <p class="seccion-intro">Cada norma indica qué regula, cómo se usa en esta simulación y en qué estado está. Las etiquetas que aparecen junto a los cálculos abren esta misma explicación.</p>
    <div class="nm-leyenda">${Object.entries(ESTADOS).map(([k, e]) => `<span><span class="norma-chip" data-estado="${k}">${e.nombre}</span> ${e.descripcion}</span>`).join('')}</div>
    ${GRUPOS.map((g) => `<h3 class="nm-grupo">${g.nombre}</h3><div class="nm-rejilla">${NORMAS.filter((n) => n.grupo === g.id).map(tarjeta).join('')}</div>`).join('')}
    <h3 class="nm-grupo">Prueba ISO 10328 simulada</h3>
    <p class="seccion-intro">Se aplica cada fuerza de la norma sobre la rodilla extendida, a lo largo de la línea de carga de talón (I) y de antepié (II), y se compara el esfuerzo con la fluencia, la resistencia última y el límite de fatiga del material elegido.</p>
    <div class="panel" style="padding:14px;margin-bottom:28px" id="iso-tabla"></div>
    <h3 class="nm-grupo">Tabla de riesgos de la rodilla (ISO 14971)</h3>
    <div class="panel tabla-desliza" style="margin-bottom:28px"><table><thead><tr><th>Riesgo</th><th>Causa</th><th>Efecto</th><th>Severidad</th><th>Probabilidad</th><th>Mitigación en nuestro diseño</th></tr></thead><tbody>${
      RIESGOS.map((r) => `<tr><td><strong>${r.riesgo}</strong></td><td>${r.causa}</td><td>${r.efecto}</td><td>${r.severidad}</td><td>${r.probabilidad}</td><td>${r.mitigacion}</td></tr>`).join('')}</tbody></table></div>
    <p class="nm-nota"><strong>${NOTA_NORMAS}</strong></p>`;
  pintarISO();
}
export function alMostrar() { pintarISO(); }
export function alCambiarModelo() { pintarISO(); }
