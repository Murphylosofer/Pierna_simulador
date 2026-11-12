import './estilos.css';
import { CONFIG, G } from './config.js';
import { NORMAS, ESTADOS, norma, etiquetaNorma } from './normas.js';
import { crearModelo } from './modelo.js';
import { ESCENARIOS, escenario } from './escenarios.js';
import { CLAVES_SEGMENTO } from './antropometria.js';
import { NORMATIVA } from './datosMarcha.js';
import { crearEscena } from './escena3d.js';
import { grafica } from './graficas.js';
import { fmt } from './mat.js';
import { COLOR_MATERIAL, hex } from './colores.js';
import * as pMecanismo from './figuraIso.js';
import * as pDiagramas from './diagramas.js';
import * as pPlanos from './planos.js';
import * as pNormas from './pestanaNormas.js';
import * as pSupuestos from './supuestos.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------------- estado ----------------
const app = {
  estado: {
    usuario: structuredClone(CONFIG.usuario),
    materialId: CONFIG.materialActivo,
    escId: 'marcha', t: 0, reproduciendo: true, velocidad: 1,
    modo: 'presentacion', pestana: 'simulacion',
    ver: { cir: true, lineas: true, carga: true, fuerzas: false, color: 'aluminio', transparente: false, despiece: 0 },
  },
  modelo: null, inst: null, escena: null,
  chipNorma, fmt,
};
window.__app = app; // para las revisiones automáticas
window.__iso = (p) => pMecanismo.__pose(p);
window.__isoCiclos = () => pMecanismo.__ciclos();

const PESTANAS = [
  { id: 'simulacion', nombre: 'Simulación' },
  { id: 'mecanismo', nombre: 'Mecanismo', mod: pMecanismo },
  { id: 'diagramas', nombre: 'Diagramas', mod: pDiagramas },
  { id: 'planos', nombre: 'Planos', mod: pPlanos },
  { id: 'normas', nombre: 'Normas', mod: pNormas },
  { id: 'supuestos', nombre: 'Validación y supuestos', mod: pSupuestos },
];

export function chipNorma(id, extra = '') {
  const n = norma(id);
  if (!n) return '';
  return `<button type="button" class="norma-chip" data-norma="${id}" data-estado="${n.estado}">${etiquetaNorma(n)}${extra ? ' · ' + extra : ''}</button>`;
}

const ICONO = {
  play: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3l10 6-10 6z" fill="currentColor"/></svg>',
  pausa: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 3h4v12H4zM10 3h4v12h-4z" fill="currentColor"/></svg>',
  atras: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M13 3L5 9l8 6zM3 3h2v12H3z" fill="currentColor"/></svg>',
  adelante: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 3l8 6-8 6zM13 3h2v12h-2z" fill="currentColor"/></svg>',
  rodilla: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3l3 8M17 3l-2 9M10 11l-3 9M15 12l1 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="7" cy="3" r="1.6" fill="currentColor"/><circle cx="17" cy="3" r="1.6" fill="currentColor"/><circle cx="7" cy="20" r="1.6" fill="currentColor"/><circle cx="16" cy="20" r="1.6" fill="currentColor"/></svg>',
};

// ---------------- armazón ----------------
function armazon() {
  const p = CONFIG.proyecto;
  $('#app').innerHTML = `
  <div class="envoltura">
    <header class="cabecera">
      <div class="marca">
        <div class="marca-sello">${ICONO.rodilla}</div>
        <div><h1>${p.titulo}</h1><p>${p.escuela} · Grupo ${p.grupo} · ${p.evento}</p></div>
      </div>
      <div class="modo" role="group" aria-label="Modo de la página">
        <button type="button" data-modo="presentacion">Presentación</button>
        <button type="button" data-modo="tecnico">Técnico</button>
      </div>
    </header>
    <nav class="pestanas" role="tablist" aria-label="Secciones">
      ${PESTANAS.map((t) => `<button type="button" role="tab" id="tab-${t.id}" data-pestana="${t.id}" aria-controls="sec-${t.id}">${t.nombre}</button>`).join('')}
    </nav>
    <main>
      ${PESTANAS.map((t) => `<section id="sec-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}" hidden></section>`).join('')}
    </main>
  </div>
  <dialog id="dlg-norma"><div class="dlg"></div></dialog>`;

  $$('.modo button').forEach((b) => b.addEventListener('click', () => ponerModo(b.dataset.modo)));
  $$('.pestanas button').forEach((b) => b.addEventListener('click', () => ponerPestana(b.dataset.pestana)));
  document.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-norma]');
    if (c) abrirNorma(c.dataset.norma);
  });
  const dlg = $('#dlg-norma');
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
}

function abrirNorma(id) {
  const n = norma(id);
  if (!n) return;
  const dlg = $('#dlg-norma');
  $('.dlg', dlg).innerHTML = `
    <div class="chips"><span class="norma-chip" data-estado="${n.estado}">${ESTADOS[n.estado].nombre}</span></div>
    <h3>${etiquetaNorma(n)}</h3>
    <p class="ayuda">${n.titulo}</p>
    <dl>
      <dt>Qué regula</dt><dd>${n.regula}</dd>
      <dt>Cómo se aplica en esta simulación</dt><dd>${n.aplicacion}</dd>
      ${n.nota ? `<dt>Vigencia</dt><dd>${n.nota}</dd>` : ''}
      <dt>Verificación de la edición</dt><dd>${n.verificada ? 'Edición vigente confirmada en noviembre de 2026.' : 'Año tomado de memoria; falta confirmarlo en el catálogo del organismo.'}</dd>
    </dl>
    <form method="dialog"><button class="boton primario">Cerrar</button></form>`;
  dlg.showModal();
}

function ponerModo(m) {
  app.estado.modo = m;
  document.body.dataset.modo = m;
  $$('.modo button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === m));
}

const montadas = new Set();
function ponerPestana(id) {
  app.estado.pestana = id;
  for (const t of PESTANAS) {
    $(`#sec-${t.id}`).hidden = t.id !== id;
    $(`#tab-${t.id}`).setAttribute('aria-selected', t.id === id);
  }
  const t = PESTANAS.find((x) => x.id === id);
  if (t.mod && !montadas.has(id)) { t.mod.montar($(`#sec-${id}`), app); montadas.add(id); }
  else if (t.mod?.alMostrar) t.mod.alMostrar(app);
  app.escena?.setActivo(id === 'simulacion');
  if (id === 'simulacion') app.escena?.redimensionar();
  try { history.replaceState(null, '', '#' + id); } catch {}
  refrescar();
}

// ---------------- pestaña Simulación ----------------
let graficas = [];
const refs = {};

function montarSimulacion() {
  const sec = $('#sec-simulacion');
  sec.innerHTML = `
  <div class="sim">
    <aside class="panel controles" aria-label="Controles">
      <details open><summary>Escenario</summary><div class="cuerpo">
        <div class="lista-esc">${ESCENARIOS.map((e) => `<button type="button" data-esc="${e.id}">${e.nombre}</button>`).join('')}</div>
        <p class="ayuda" id="esc-desc"></p><div class="chips" id="esc-normas"></div>
      </div></details>
      <details><summary>Medidas del usuario</summary><div class="cuerpo">
        <div class="campo"><label for="in-peso">Peso <output id="out-peso"></output></label><input id="in-peso" type="range" min="40" max="125" step="1"></div>
        <div class="campo"><label for="in-estatura">Estatura <output id="out-estatura"></output></label><input id="in-estatura" type="range" min="1.40" max="2.00" step="0.01"></div>
        <div class="campo"><span class="rotulo">Lado amputado</span><div class="segmentado" id="seg-lado"><button type="button" data-v="izquierdo">Izquierdo</button><button type="button" data-v="derecho">Derecho</button></div></div>
        <div class="campo"><span class="rotulo">Nivel funcional ${chipNorma('niveles-k')}</span><div class="segmentado" id="seg-k">${Object.keys(CONFIG.nivelesK).map((k) => `<button type="button" data-v="${k}">${k}</button>`).join('')}</div><p class="ayuda" id="k-desc"></p></div>
        <div class="campo"><span class="rotulo">Segmentos ${chipNorma('winter')}</span>
          <div class="seg-grid" id="seg-grid"></div>
          <button type="button" class="boton chico" id="btn-personalizar"></button>
          <p class="ayuda">En automático son el promedio para la estatura elegida (Winter y Dempster).</p></div>
      </div></details>
      <details><summary>Material</summary><div class="cuerpo" id="lista-material"></div></details>
      <details><summary>Qué mostrar</summary><div class="cuerpo">
        ${[['cir', 'Centro instantáneo de rotación (CIR)'], ['lineas', 'Líneas de las barras extendidas'], ['carga', 'Línea de carga (reacción del suelo)'], ['fuerzas', 'Vectores de fuerza en las barras'], ['transparente', 'Cuerpo transparente']]
          .map(([k, n]) => `<label class="casilla"><input type="checkbox" id="ver-${k}" data-ver="${k}">${n}</label>`).join('')}
        <div class="campo"><span class="rotulo">Color de las piezas</span><div class="segmentado" id="seg-color"><button type="button" data-v="aluminio">Normal</button><button type="button" data-v="esfuerzo">Esfuerzo</button><button type="button" data-v="material">Material</button></div></div>
        <div class="campo"><label for="in-despiece">Despiece <output id="out-despiece"></output></label><input id="in-despiece" type="range" min="0" max="1" step="0.01" value="0"></div>
        <p class="ayuda">El mapa de esfuerzos es un cálculo aproximado con vigas y pernos, no un análisis por elementos finitos (FEA).</p>
      </div></details>
    </aside>

    <div class="centro">
      <div class="visor" id="visor">
        <div class="vistas" role="group" aria-label="Vistas rápidas">
          ${[['isometrica', 'Isométrica'], ['frontal', 'Frontal'], ['lateral', 'Lateral'], ['posterior', 'Posterior'], ['superior', 'Superior'], ['rodilla', 'Centrar en rodilla']].map(([v, n]) => `<button type="button" data-vista="${v}">${n}</button>`).join('')}
        </div>
        <div class="escala-esf" id="escala-esf" hidden>Esfuerzo / fluencia<i></i><div><span>0 %</span><span>50 %</span><span>100 %</span></div></div>
        <div class="escala-esf" id="escala-mat" hidden></div>
        <div class="insignia" id="insignia">—</div>
      </div>
      <div class="panel transporte">
        <div class="fila">
          <button type="button" class="boton" id="btn-atras" aria-label="Cuadro anterior">${ICONO.atras}</button>
          <button type="button" class="boton primario" id="btn-play" aria-label="Reproducir o pausar"></button>
          <button type="button" class="boton" id="btn-adelante" aria-label="Cuadro siguiente">${ICONO.adelante}</button>
          <label class="ayuda" for="sel-vel">Velocidad</label>
          <select id="sel-vel"><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>
          <div class="fase-actual"><span id="fase-nombre"></span><small id="fase-tiempo" class="num"></small></div>
        </div>
        <div class="linea-tiempo">
          <input type="range" id="in-tiempo" min="0" max="1000" step="1" value="0" aria-label="Línea de tiempo del movimiento">
          <div class="fases" id="fases"></div>
        </div>
      </div>
    </div>

    <aside class="panel lecturas" aria-label="Valores actuales" id="lecturas"></aside>
    <div class="graficas" id="graficas"></div>
  </div>`;

  // --- lecturas ---
  const d = CONFIG.diseno;
  const dato = (id, rotulo, unidad, presentacion, tecnico, extra = '', chips = '') => `
    <div class="dato"><div class="rotulo"><span>${rotulo}</span>${chips}</div>
      <div class="valor num" id="v-${id}">—<small>${unidad}</small></div>${extra}
      <p class="explica solo-presentacion"><strong>¿Qué significa?</strong> ${presentacion}</p>
      <p class="formula solo-tecnico" id="f-${id}">${tecnico}</p></div>`;
  $('#lecturas').innerHTML = `
    <h2>Valores en este instante</h2>
    <div id="alerta"></div>
    ${dato('theta', 'Flexión de la rodilla', '°', 'Cuánto está doblada la rodilla. En 0° la pierna está recta; llegar a 135° permite sentarse y agacharse.', 'θ: giro del adaptador respecto a la base. Entrada de la ecuación de cierre de lazo.')}
    ${dato('grf', 'Reacción del suelo', 'N', 'La fuerza con la que el piso empuja a la prótesis. De pie es la mitad del peso; en un tropiezo puede triplicarlo.', '', '<div class="medidor"><i id="m-cap"></i></div><p class="ayuda num" id="t-cap"></p>', chipNorma('iso-10328', ''))}
    ${dato('torque', 'Torque en la rodilla', 'N·m', `El giro que la carga intenta darle a la rodilla. El diseño del equipo se calculó con un límite de ${fmt(d.torqueReferenciaNm, 1)} N·m.`, '', '<div class="medidor"><i id="m-torque"></i></div><p class="ayuda num" id="t-torque"></p>')}
    ${dato('barras', 'Fuerza en las barras c1 / c2', 'N', 'Lo que carga cada par de barras laterales. Si es negativa, la barra trabaja a tracción.', '')}
    ${dato('cortante', 'Cortante en los pernos', 'MPa', 'Los pernos trabajan como una tijera: es el esfuerzo que intenta cortarlos.', '')}
    ${dato('sigma', 'Esfuerzo máximo', 'MPa', 'El esfuerzo en la pieza más exigida y qué tan cerca está de deformarse de forma permanente.', '', '<p class="ayuda" id="t-critica"></p>', chipNorma('astm-b221-b211'))}
    ${dato('fs', 'Factor de seguridad', '', `Cuántas veces más carga aguantaría antes de deformarse. El mínimo del diseño es ${fmt(d.factorSeguridad, 1)}.`, 'FS = esfuerzo de fluencia / esfuerzo máximo')}
    ${dato('cir', 'Centro instantáneo de rotación', 'mm', 'El punto sobre el que gira la rodilla en este instante. Si queda detrás de la línea de carga, el peso mismo mantiene la rodilla extendida.', '', '', chipNorma('radcliffe'))}
    ${dato('masa', 'Peso de la rodilla', 'g', `Suma de las 12 piezas con el material elegido más los pernos. El prototipo del equipo pesa cerca de ${d.pesoRodillaG} g.`, 'm = Σ volumen × densidad (medidas estimadas)')}
  `;
  for (const k of ['theta', 'grf', 'torque', 'barras', 'cortante', 'sigma', 'fs', 'cir', 'masa']) { refs[k] = $(`#v-${k}`); refs['f' + k] = $(`#f-${k}`); }

  // --- eventos ---
  $$('[data-esc]').forEach((b) => b.addEventListener('click', () => { app.estado.escId = b.dataset.esc; app.estado.t = 0; app.estado.reproduciendo = true; alCambiarEscenario(); }));
  const u = app.estado.usuario;
  $('#in-peso').addEventListener('input', (e) => { u.pesoKg = +e.target.value; alCambiarModelo(); });
  $('#in-estatura').addEventListener('input', (e) => { u.estaturaM = +e.target.value; alCambiarModelo(); });
  $$('#seg-lado button').forEach((b) => b.addEventListener('click', () => { u.ladoAmputado = b.dataset.v; alCambiarModelo(); }));
  $$('#seg-k button').forEach((b) => b.addEventListener('click', () => { u.nivelK = b.dataset.v; alCambiarModelo(); }));
  $('#btn-personalizar').addEventListener('click', () => {
    if (u.segmentos.modo === 'automatico') {
      u.segmentos.modo = 'personalizado';
      for (const { id } of CLAVES_SEGMENTO) u.segmentos.personalizados[id] = Math.round(app.modelo.seg[id]);
    } else { u.segmentos.modo = 'automatico'; u.segmentos.personalizados = {}; }
    alCambiarModelo();
  });
  $$('#seg-color button').forEach((b) => b.addEventListener('click', () => { app.estado.ver.color = b.dataset.v; pintarControles(); refrescar(); }));
  $$('[data-ver]').forEach((c) => c.addEventListener('change', () => { app.estado.ver[c.dataset.ver] = c.checked; refrescar(); }));
  $('#in-despiece').addEventListener('input', (e) => { app.estado.ver.despiece = +e.target.value; refrescar(); });
  $$('[data-vista]').forEach((b) => b.addEventListener('click', () => app.escena.setVista(b.dataset.vista)));
  $('#btn-play').addEventListener('click', () => { app.estado.reproduciendo = !app.estado.reproduciendo; pintarPlay(); });
  const paso = (s) => { app.estado.reproduciendo = false; app.estado.t = (app.estado.t + s + 1) % 1; pintarPlay(); refrescar(); };
  $('#btn-atras').addEventListener('click', () => paso(-0.01));
  $('#btn-adelante').addEventListener('click', () => paso(0.01));
  $('#sel-vel').addEventListener('change', (e) => { app.estado.velocidad = +e.target.value; });
  $('#in-tiempo').addEventListener('input', (e) => { app.estado.reproduciendo = false; app.estado.t = Math.min(0.9999, e.target.value / 1000); pintarPlay(); refrescar(); });

  app.escena = crearEscena($('#visor'));
  app.escena.setTema();
  new MutationObserver(() => app.escena.setTema()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => app.escena.setTema());
}

function pintarPlay() {
  $('#btn-play').innerHTML = (app.estado.reproduciendo ? ICONO.pausa : ICONO.play) + (app.estado.reproduciendo ? 'Pausar' : 'Reproducir');
}

function pintarControles() {
  const { usuario: u, materialId, ver } = app.estado, M = app.modelo;
  $('#in-peso').value = u.pesoKg; $('#out-peso').textContent = `${u.pesoKg} kg`;
  $('#in-estatura').value = u.estaturaM; $('#out-estatura').textContent = `${fmt(u.estaturaM, 2)} m`;
  $$('#seg-lado button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === u.ladoAmputado));
  $$('#seg-k button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === u.nivelK));
  const K = M.K;
  $('#k-desc').innerHTML = `<strong>${u.nivelK} · ${K.nombre}.</strong> Marcha a ${fmt(K.velocidadMs, 1)} m/s, carga al caminar ${fmt(K.cargaMarcha, 2)}× el peso, impacto ${fmt(K.cargaImpacto, 1)}×.`;
  const pers = u.segmentos.modo === 'personalizado';
  $('#btn-personalizar').textContent = pers ? 'Volver a automático' : 'Personalizar';
  $('#seg-grid').innerHTML = CLAVES_SEGMENTO.map(({ id, nombre }) => `<label for="seg-${id}">${nombre} (cm)</label><input type="number" id="seg-${id}" data-seg="${id}" step="0.5" min="5" max="80" value="${(M.seg[id] / 10).toFixed(1)}" ${pers ? '' : 'disabled'}>`).join('');
  $$('[data-seg]').forEach((i) => i.addEventListener('change', () => { u.segmentos.personalizados[i.dataset.seg] = +i.value * 10; alCambiarModelo(); }));
  $('#lista-material').innerHTML = Object.entries(CONFIG.materiales).map(([id, m]) => `
    <button type="button" class="material" data-mat="${id}" aria-pressed="${id === materialId}">
      <strong>${m.nombre}${id === 'al-6061-t6' ? ' · recomendado' : ''}</strong>
      <span>${m.pendiente ? 'Pendiente de datos del equipo' : `${m.estimado ? 'Supuesto · ' : ''}Fluencia ${m.fluenciaMPa} MPa · ${m.densidadKgM3} kg/m³ · costo relativo ${fmt(m.costoRelativo, 1)}×`}</span>
      <span>${m.nota}</span>
    </button>`).join('') + `<div class="chips">${chipNorma('astm-b221-b211')}</div>`;
  $$('[data-mat]').forEach((b) => b.addEventListener('click', () => { app.estado.materialId = b.dataset.mat; alCambiarModelo(); }));
  for (const k of Object.keys(ver)) { const c = $(`#ver-${k}`); if (c) c.checked = ver[k]; }
  $$('#seg-color button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === ver.color));
  $('#escala-mat').innerHTML = [materialId, 'acero'].map((id) => `<span style="display:flex;align-items:center;gap:6px"><i style="display:inline-block;width:12px;height:12px;border-radius:3px;margin:0;background:${hex(COLOR_MATERIAL[id].rgb)}"></i>${COLOR_MATERIAL[id].nombre}</span>`).join('');
  $('#out-despiece').textContent = `${Math.round(ver.despiece * 100)} %`;
}

function alCambiarModelo() {
  app.modelo = crearModelo(app.estado.usuario, app.estado.materialId);
  app.escena.setModelo(app.modelo);
  pintarControles();
  alCambiarEscenario();
  for (const t of PESTANAS) if (t.mod?.alCambiarModelo && montadas.has(t.id)) t.mod.alCambiarModelo(app);
}

function alCambiarEscenario() {
  const escn = escenario(app.estado.escId), M = app.modelo;
  $$('[data-esc]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.esc === escn.id));
  $('#esc-desc').textContent = escn.descripcion;
  $('#esc-normas').innerHTML = escn.normas.map((n) => chipNorma(n, n === 'iso-10328' ? `Nivel ${M.nivelISO}` : n === 'niveles-k' ? app.estado.usuario.nivelK : '')).join('');
  $('#fases').innerHTML = escn.fases.map((f) => `<span style="flex:${f.hasta - f.desde}" title="${f.nombre}">${f.nombre}</span>`).join('');
  pintarPlay();
  pintarGraficas();
  for (const t of PESTANAS) if (t.mod?.alCambiarEscenario && montadas.has(t.id)) t.mod.alCambiarEscenario(app);
  refrescar();
}

function pintarGraficas() {
  graficas.forEach((g) => g.destruir());
  graficas = [];
  const M = app.modelo, escn = escenario(app.estado.escId), c = M.ciclo(escn.id), d = CONFIG.diseno;
  const esMarcha = escn.id === 'marcha';
  const pct = c.muestras.map((m) => m.t * 100);
  const serie = (f) => c.muestras.map((m, i) => [pct[i], f(m)]);
  const sana = (f) => Array.from({ length: 101 }, (_, i) => [i, f(i)]);
  const P = 'var(--serie-protesis)', S = 'var(--serie-sana)';
  const ejeX = esMarcha ? '% del ciclo de marcha' : '% del movimiento';
  const cont = $('#graficas');
  cont.innerHTML = '<div></div><div></div><div></div><div></div><div></div><div class="panel grafica" id="comparacion"></div>';
  const [a, b, cc, e, u] = cont.children;
  graficas.push(grafica(a, { titulo: 'Ángulo de la rodilla', unidad: '°', ejeX, xMin: 0, xMax: 100, yMin: 0,
    series: [{ nombre: 'Prótesis', color: P, puntos: serie((m) => m.theta) }, ...(esMarcha ? [{ nombre: 'Rodilla sana (Winter)', color: S, guion: true, puntos: sana(NORMATIVA.angulo) }] : [])],
    nota: esMarcha ? 'La rodilla pasiva se mantiene extendida durante el apoyo; la sana flexiona unos 20° para amortiguar.' : '' }));
  const torqueMax = c.torqueMax;
  graficas.push(grafica(b, { titulo: 'Torque en la rodilla', unidad: 'N·m', ejeX, xMin: 0, xMax: 100,
    series: [{ nombre: 'Prótesis (carga externa)', color: P, puntos: serie((m) => m.torque) }, ...(esMarcha ? [{ nombre: 'Rodilla sana (Winter)', color: S, guion: true, puntos: sana((x) => NORMATIVA.momento(x) * M.usuario.pesoKg) }] : [])],
    refs: [{ y: d.torqueReferenciaNm, texto: `Límite de diseño ${fmt(d.torqueReferenciaNm, 1)} N·m`, incluir: torqueMax > d.torqueReferenciaNm * 0.5 }],
    nota: `Pico de ${fmt(torqueMax, 1)} N·m = ${fmt((torqueMax / d.torqueReferenciaNm) * 100, 0)} % del límite de diseño de ${fmt(d.torqueReferenciaNm, 1)} N·m. Positivo = tiende a extender.` }));
  graficas.push(grafica(cc, { titulo: 'Reacción del suelo', unidad: '× peso corporal', ejeX, xMin: 0, xMax: 100, yMin: 0, decimales: 2,
    series: [{ nombre: 'Prótesis', color: P, puntos: serie((m) => m.reaccionPC) }, ...(esMarcha ? [{ nombre: 'Marcha normal (Winter)', color: S, guion: true, puntos: sana(NORMATIVA.reaccion) }] : [])],
    refs: [{ y: d.factorSeguridad, texto: `Capacidad de diseño ${fmt(M.capacidadDisenoKg, 1)} kg`, incluir: false }] }));
  const tope = 8;
  graficas.push(grafica(e, { titulo: 'Factor de seguridad', unidad: '', ejeX, xMin: 0, xMax: 100, yMin: 0, yMax: tope, decimales: 2,
    series: [{ nombre: 'Factor de seguridad', color: P, puntos: serie((m) => (m.fs == null ? NaN : Math.min(m.fs, tope))) }],
    refs: [{ y: 1.5, texto: 'Mínimo de diseño 1.5', color: 'var(--aviso)' }, { y: 1, texto: 'Fluencia 1.0', color: 'var(--mal)' }],
    nota: M.mat.pendiente ? 'Sin datos del plástico del prototipo no se puede calcular.' : `Mínimo en este escenario: ${fmt(c.fsMin, 2)}. La escala se corta en ${tope}.` }));

  // Uso del material elegido: esfuerzo de sus piezas como porcentaje de su fluencia.
  graficas.push(grafica(u, { titulo: `Uso del material: ${M.mat.corto}`, unidad: '% de la fluencia', ejeX, xMin: 0, xMax: 100, yMin: 0, decimales: 0,
    series: [{ nombre: `Piezas de ${M.mat.corto}`, color: P, puntos: serie((m) => (m.fsPiezas ? Math.min(160, 100 / m.fsPiezas) : 0)) }],
    refs: [{ y: 100, texto: `Fluencia ${M.mat.fluenciaMPa} MPa`, color: 'var(--mal)', incluir: true }, { y: 100 / d.factorSeguridad, texto: 'Límite con factor 1.5', color: 'var(--aviso)', incluir: true }],
    nota: `Cambia con el material: la misma carga ocupa más porcentaje de la fluencia en un material más débil. Pico: ${fmt(100 / c.fsPiezasMin, 0)} %.` }));
  pintarComparacion();
}

// Comparación de los tres materiales en el escenario actual, con equivalencias respecto al elegido.
function pintarComparacion() {
  const e = app.estado, escn = escenario(e.escId), d = CONFIG.diseno, sel = e.materialId;
  const filas = Object.keys(CONFIG.materiales).map((id) => {
    const Mi = id === sel ? app.modelo : crearModelo(e.usuario, id), ci = Mi.ciclo(escn.id), mat = Mi.mat;
    const fs = Math.min(ci.fsPiezasMin, 99);
    return { id, mat, fs, fsTotal: ci.fsMin, masa: Mi.masa.totalG, usuarioMax: (e.usuario.pesoKg * Math.min(ci.fsMin, 99)) / d.factorSeguridad, pico: ci.reaccionMax, iso: Mi.iso().filter((f) => f.pasa).map((f) => f.nivel) };
  });
  const S = filas.find((f) => f.id === sel);
  const barras = (titulo, clave, unidad, dec, ref) => {
    const orden = [...filas].sort((p, q) => q[clave] - p[clave]), max = Math.max(...orden.map((f) => f[clave]), ref?.v || 0);
    return `<div class="cmp-bloque"><h4>${titulo}</h4>${orden.map((f) => `<div class="cmp-fila${f.id === sel ? ' elegido' : ''}"><span>${f.mat.corto}${f.id === sel ? ' · elegido' : ''}</span><div class="cmp-barra"><i style="width:${Math.max(1.5, (f[clave] / max) * 100)}%;background:${hex(COLOR_MATERIAL[f.id].rgb)}"></i>${ref ? `<b style="left:${(ref.v / max) * 100}%" title="${ref.t}"></b>` : ''}</div><strong class="num">${fmt(f[clave], dec)} ${unidad}</strong></div>`).join('')}${ref ? `<p class="ayuda">La línea vertical marca ${ref.t}.</p>` : ''}</div>`;
  };
  const eq = filas.filter((f) => f.id !== sel).map((f) => {
    const k = f.mat.fluenciaMPa / S.mat.fluenciaMPa, esc2 = ((f.mat.escala || 1) / (S.mat.escala || 1)) ** 2, carga = S.pico * k * esc2;
    return `<tr><td><strong>${f.mat.corto}</strong></td><td class="n">${fmt(k * 100, 0)} %</td><td class="n">${fmt(f.masa / S.masa, 2)}×</td><td class="n">${fmt(carga, 0)} N (${fmt(carga / G, 1)} kg)</td><td>${f.iso.length ? f.iso.join(', ') : 'ninguno'}</td></tr>`;
  }).join('');
  $('#comparacion').innerHTML = `<header><h3>Comparación de materiales · ${escn.nombre}</h3></header>
    ${barras('Factor de seguridad mínimo de las piezas', 'fs', '', 2, { v: d.factorSeguridad, t: 'el mínimo de diseño de 1.5' })}
    ${barras('Peso de la rodilla', 'masa', 'g', 0, { v: d.pesoRodillaG, t: `los ${d.pesoRodillaG} g de referencia del equipo` })}
    ${barras('Peso máximo de usuario con factor 1.5', 'usuarioMax', 'kg', 0, { v: app.modelo.capacidadDisenoKg, t: `la capacidad de diseño de ${fmt(app.modelo.capacidadDisenoKg, 1)} kg` })}
    <div class="cmp-bloque"><h4>Equivalencias respecto a ${S.mat.corto}</h4>
    <div class="tabla-desliza"><table><thead><tr><th>Material</th><th class="n">Resistencia</th><th class="n">Peso</th><th class="n">Carga de ensayo equivalente</th><th>Niveles ISO 10328</th></tr></thead><tbody>${eq}</tbody></table></div>
    <p class="ayuda"><strong>Carga de ensayo equivalente:</strong> la fuerza que produce en ese material el mismo porcentaje de su fluencia que el pico de este escenario (${fmt(S.pico, 0)} N) produce en ${S.mat.corto}. Se calcula con F × (fluencia del otro / fluencia del elegido) × escala². Sirve para probar el prototipo sin romperlo. ${CONFIG.materiales['prototipo-3d'].estimado ? 'El PLA es un supuesto (20 % de relleno, escala 1:1) hasta que el equipo confirme el plástico.' : ''} Con pernos de acero en los tres casos; si el perno es la pieza crítica, el peso máximo de usuario coincide entre aluminios.</p></div>`;
}

function pintarLecturas(inst) {
  const M = app.modelo, c = inst.cargas, d = CONFIG.diseno, mat = M.mat;
  const pon = (k, v, u) => { refs[k].firstChild.nodeValue = v; refs[k].lastChild.textContent = u; };
  pon('theta', fmt(inst.theta, 1), '°');
  pon('grf', fmt(inst.reaccionN, 0), `N · ${fmt(inst.reaccionPC, 2)}× peso`);
  const kgEq = inst.reaccionN / G, cap = M.capacidadDisenoKg;
  const mc = $('#m-cap'); mc.style.width = Math.min(100, (kgEq / cap) * 100) + '%'; mc.className = kgEq > cap ? 'peligro' : '';
  $('#t-cap').textContent = `Equivale a ${fmt(kgEq, 1)} kg · capacidad de diseño ${fmt(cap, 1)} kg`;
  refs.fgrf.textContent = `R = f·m·g = ${fmt(inst.reaccionPC, 2)} × ${fmt(M.usuario.pesoKg, 0)} × 9.81`;
  pon('torque', fmt(inst.torqueNm, 1), 'N·m');
  const pt = Math.abs(inst.torqueNm) / d.torqueReferenciaNm;
  const mt = $('#m-torque'); mt.style.width = Math.min(100, pt * 100) + '%'; mt.className = pt > 1 ? 'peligro' : '';
  $('#t-torque').textContent = `${fmt(pt * 100, 0)} % del límite de diseño de ${fmt(d.torqueReferenciaNm, 1)} N·m`;
  refs.ftorque.textContent = `M = R·d ; d = ${fmt(c.brazoRodilla, 1)} mm de la línea de carga al centro de rodilla. Respecto al CIR: ${fmt(inst.torqueCirNm, 1)} N·m.`;
  pon('barras', `${fmt(c.F1, 0)} / ${fmt(c.F2, 0)}`, 'N');
  refs.fbarras.textContent = `F1·u1 + F2·u2 + Fs·n = R ; ΣM = 0. ${c.enTope ? `Tope de extensión: ${fmt(c.Fs, 0)} N.` : `Par de control necesario: ${fmt(c.Mc / 1000, 1)} N·m.`}`;
  pon('cortante', fmt(c.cortantePernoMax, 1), 'MPa');
  refs.fcortante.textContent = `τ = F / (2·π·d²/4), perno de ${CONFIG.pernos.diametro} mm en cortante doble.`;
  const pend = !mat.fluenciaMPa;
  pon('sigma', pend ? '—' : fmt(c.sigmaMax, 1), 'MPa');
  const critica = c.critica && ([...M.piezas, ...M.ejes].find((p) => p.id === c.critica));
  $('#t-critica').textContent = pend ? 'Faltan las propiedades del plástico del prototipo.' : critica ? `Pieza crítica: ${critica.nombre} (${c.esfuerzos[c.critica].tipo}).` : '';
  refs.fsigma.textContent = pend ? '' : `σ máx / fluencia = ${fmt(c.sigmaMax, 1)} / ${c.esfuerzos[c.critica]?.fluencia} MPa. Sección neta, aplastamiento, flexión de perno y de placa.`;
  const fs = inst.fs;
  refs.fs.firstChild.nodeValue = pend ? '—' : fs >= 99 ? '> 99' : fmt(fs, 2);
  refs.fs.className = 'valor num ' + (pend ? '' : fs < 1 ? 'peligro' : fs < d.factorSeguridad ? 'cuidado' : 'ok');
  const cir = inst.sol.cir;
  pon('cir', cir ? `${fmt(cir[0], 0)}, ${fmt(cir[1], 0)}` : '—', 'mm (x, y)');
  refs.fcir.textContent = `Intersección de las rectas D–A y C–B. Línea de carga a ${fmt(c.brazoCir, 0)} mm ${c.brazoCir >= 0 ? 'por delante' : 'por detrás'} del CIR.`;
  pon('masa', M.masa ? fmt(M.masa.totalG, 0) : '—', 'g');

  // alertas
  const ins = $('#insignia');
  ins.className = 'insignia ' + (inst.cargado ? (inst.estable ? 'estable' : 'inestable') : '');
  ins.textContent = !inst.cargado ? 'Sin carga (balanceo)' : inst.estable ? 'Estable: CIR detrás de la línea de carga' : inst.theta > 3 ? 'Flexión con carga: la controla el usuario' : 'Inestable: la rodilla tiende a doblarse';
  const visor = $('#visor'), al = $('#alerta');
  visor.classList.remove('alerta-cuidado', 'alerta-peligro');
  if (pend) al.innerHTML = '<div class="aviso neutro">Material pendiente: el equipo aún no indica el plástico del prototipo, así que no hay esfuerzos ni factor de seguridad.</div>';
  else if (fs < 1) { al.innerHTML = `<div class="aviso peligro"><strong>Factor de seguridad ${fmt(fs, 2)}: menor que 1.0.</strong> La pieza crítica superaría la fluencia.</div>`; visor.classList.add('alerta-peligro'); }
  else if (fs < d.factorSeguridad) { al.innerHTML = `<div class="aviso cuidado"><strong>Factor de seguridad ${fmt(fs, 2)}: menor que ${fmt(d.factorSeguridad, 1)}.</strong> Por debajo del mínimo de diseño.</div>`; visor.classList.add('alerta-cuidado'); }
  else al.innerHTML = '';
  $('#escala-esf').hidden = app.estado.ver.color !== 'esfuerzo';
  $('#escala-mat').hidden = app.estado.ver.color !== 'material';
}

// ---------------- ciclo principal ----------------
function refrescar() {
  if (!app.modelo) return;
  const e = app.estado, escn = escenario(e.escId);
  app.inst = app.modelo.instante(e.escId, e.t);
  if (e.pestana === 'simulacion') {
    app.escena.actualizar(app.inst, e.ver);
    pintarLecturas(app.inst);
    graficas.forEach((g) => g.cursor(e.t * 100));
    $('#in-tiempo').value = Math.round(e.t * 1000);
    const fase = app.inst.fase;
    $('#fase-nombre').textContent = fase.nombre;
    $('#fase-tiempo').textContent = `${fmt(e.t * 100, 0)} % · ${fmt(e.t * escn.duracion(app.modelo.ctx), 2)} s de ${fmt(escn.duracion(app.modelo.ctx), 2)} s`;
    $$('#fases span').forEach((s, i) => s.classList.toggle('activa', escn.fases[i] === fase));
  } else {
    const t = PESTANAS.find((x) => x.id === e.pestana);
    if (t.mod?.actualizar && montadas.has(t.id)) t.mod.actualizar(app);
  }
}

let previo = performance.now();
function tic(ahora) {
  requestAnimationFrame(tic);
  const dt = Math.min(0.1, (ahora - previo) / 1000);
  previo = ahora;
  const e = app.estado;
  const animada = e.pestana === 'simulacion' || e.pestana === 'diagramas';
  if (!e.reproduciendo || !animada || document.hidden) return;
  const T = escenario(e.escId).duracion(app.modelo.ctx);
  e.t = (e.t + (dt * e.velocidad) / T) % 1;
  refrescar();
}

// ---------------- arranque ----------------
armazon();
ponerModo('presentacion');
montarSimulacion();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) app.estado.reproduciendo = false;
app.modelo = crearModelo(app.estado.usuario, app.estado.materialId);
app.escena.setModelo(app.modelo);
pintarControles();
const inicial = (location.hash || '').slice(1);
ponerPestana(PESTANAS.some((t) => t.id === inicial) ? inicial : 'simulacion');
alCambiarEscenario();
app.escena.setVista('isometrica');
app.escena.alejar(3100);
requestAnimationFrame(tic);
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (PESTANAS.some((t) => t.id === h) && h !== app.estado.pestana) ponerPestana(h); });
