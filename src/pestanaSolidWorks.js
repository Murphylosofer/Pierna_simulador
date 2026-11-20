// Pestaña "Validación con SolidWorks": resultados reales de los dos estudios del equipo, un selector de carga que
// los escala (el estudio es lineal) y la comparación con el modelo de la página. Se marca qué viene de SolidWorks
// y qué es estimado.
import { CONFIG, G } from './config.js';
import { fmt } from './mat.js';
import { solidworksPara, resolverCargas } from './cargas.js';
import { imagenEstudio } from './recursos.js';

let raiz, app_;
const estado = { modo: 'pie', libre: 1200 };
const SW = '<span class="sw-et sw">SolidWorks</span>';
const EST = '<span class="sw-et est">Estimado</span>';

// Escala de colores tipo SolidWorks (azul → cian → verde → amarillo → rojo), de 0 a la fluencia del 6061-T6.
const PARADAS = [[0, [24, 48, 220]], [0.25, [0, 200, 235]], [0.5, [40, 210, 60]], [0.75, [240, 220, 0]], [1, [225, 30, 20]]];
function colorSW(u) {
  const x = Math.max(0, Math.min(1, u));
  for (let i = 1; i < PARADAS.length; i++) {
    const [a, ca] = PARADAS[i - 1], [b, cb] = PARADAS[i];
    if (x <= b) { const t = (x - a) / (b - a); return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`; }
  }
  return 'rgb(225,30,20)';
}
const degradado = () => `linear-gradient(90deg, ${PARADAS.map(([p]) => `${colorSW(p)} ${p * 100}%`).join(', ')})`;

function cargaActual() {
  const est = CONFIG.solidworks.estudios;
  if (estado.modo === 'pie') return est[0].cargaN;
  if (estado.modo === 'marcha') return est[1].cargaN;
  return estado.libre;
}

// El modelo de la página con la misma carga que SolidWorks: rodilla recta en el tope, fuerza vertical por el
// centro del receptáculo del socket y apoyo en el pilón.
function modeloPara(F) {
  const M = app_.modelo, sol = M.mec.resolver(0), mat = CONFIG.materiales['al-6061-t6'];
  return resolverCargas(sol, [{ p: [M.ens.ejeSocketX, -300], F: [0, F] }], mat);
}

function resultado() {
  const F = cargaActual(), r = solidworksPara(F), Sy = r.Sy, c = modeloPara(F);
  const fsCls = (fs) => (fs < 1 ? 'mal' : fs < CONFIG.diseno.factorSeguridad ? 'aviso' : 'ok');
  const origen = r.exacto ? `${SW} resultado directo del estudio de ${fmt(r.exacto.cargaN, 0)} N` : `${SW} escalado lineal de los dos estudios (σ = ${fmt(r.k, 4)} MPa por N)`;
  const marca = (v, txt, abajo) => `<b class="sw-marca${abajo ? ' abajo' : ''}" style="left:${Math.min(100, (v / Sy) * 100)}%"><i>${txt}</i></b>`;
  const piezas = [
    ['Eslabón diagonal (flexión con el tope)', c.esfuerzos.eslabonDiagDer.sigma],
    ['Eje A Ø5 (flexión)', c.esfuerzos.pernoA.sigma],
    ['Eje D Ø5 (flexión)', c.esfuerzos.pernoD.sigma],
    ['AFS1 (apoyo del tope / placa)', c.esfuerzos.afs1.sigma],
    ['Adaptador inferior (base)', c.esfuerzos.adaptadorInferior.sigma],
    ['Eslabón trasero', c.esfuerzos.eslabonTrasDer.sigma],
  ];
  return `
    <div class="sw-cifras">
      <div><span class="sw-k">Carga</span><strong class="num">${fmt(F, 0)} N</strong><span class="ayuda">≈ ${fmt(F / G, 0)} kg sobre la rodilla</span></div>
      <div><span class="sw-k">Von Mises máximo ${SW}</span><strong class="num" style="color:${colorSW(r.sigma / Sy)}">${fmt(r.sigma, 1)} MPa</strong><span class="ayuda">pico en la arista eslabón diagonal–AFS1</span></div>
      <div><span class="sw-k">Factor de seguridad ${SW}</span><strong class="num" style="color:var(--${fsCls(r.fs)})">${fmt(r.fs, 2)}</strong><span class="ayuda">275 MPa / σ máx</span></div>
      <div><span class="sw-k">Lejos del pico ${EST}</span><strong class="num">≈ ${fmt(r.entorno, 0)} MPa</strong><span class="ayuda">FS ≈ ${fmt(Math.min(r.fsEntorno, 99), 1)} · leído de la escala de colores</span></div>
      <div><span class="sw-k">Desplazamiento máx. ${SW}</span><strong class="num">${fmt(r.despl, 3)} mm</strong><span class="ayuda">frente del AFS1</span></div>
      <div><span class="sw-k">Deformación unitaria máx. ${SW}</span><strong class="num">${fmt(r.deform * 1000, 2)} ‰</strong><span class="ayuda">${r.deform.toExponential(2)}</span></div>
    </div>
    <p class="ayuda">${origen}.</p>
    <div class="sw-escala" role="img" aria-label="Escala de von Mises de 0 a 275 MPa con el pico de ${fmt(r.sigma, 0)} MPa">
      <div class="sw-barra" style="background:${degradado()}">${marca(r.sigma, `pico ${fmt(r.sigma, 0)}`)}${marca(r.entorno, `entorno ≈ ${fmt(r.entorno, 0)}`, true)}</div>
      <div class="sw-ejes"><span>0</span><span>69</span><span>138</span><span>206</span><span>275 MPa (fluencia)</span></div>
    </div>
    <details class="sw-modelo" open><summary>Modelo de la página con la misma carga ${EST}</summary>
      <p class="ayuda">Estática plana con el tope escondido: la rodilla apoya en el taco del AFS1, así que el eslabón diagonal se flexiona y el eje A carga ${fmt(c.FA, 0)} N (${fmt(c.FA / F, 1)} veces la carga) porque el tope está a solo ${fmt(app_.modelo.ens.tope.sRes, 1)} mm del eje. Material 6061-T6, ejes incluidos, como en SolidWorks.</p>
      <div class="sw-piezas">${piezas.map(([n, s]) => `<div class="sw-pz"><span>${n}</span><i style="background:${colorSW(s / Sy)};width:${Math.max(2, Math.min(100, (s / Sy) * 100))}%"></i><strong class="num">${fmt(s, 0)} MPa · FS ${fmt(Math.min(Sy / s, 99), 2)}</strong></div>`).join('')}</div>
    </details>`;
}

function capturas() {
  return CONFIG.solidworks.estudios.map((e) => `
    <section class="panel sw-estudio"><h3>${e.nombre}: ${fmt(e.cargaN, 0)} N (≈ ${e.masaKg} kg) ${SW}</h3>
      <div class="sw-galeria">${[['tensiones', `Von Mises · máx. ${fmt(e.vonMisesMaxMPa, 1)} MPa`], ['desplazamientos', `Desplazamientos · máx. ${fmt(e.desplMaxMm, 4)} mm`], ['deformaciones', `Deformación unitaria · máx. ${e.deformMax.toExponential(3)}`]]
        .map(([k, t]) => `<figure><a href="${imagenEstudio(e.capturas[k])}" target="_blank" rel="noopener"><img src="${imagenEstudio(e.capturas[k])}" alt="Captura de SolidWorks, ${t}, ${fmt(e.cargaN, 0)} N" loading="lazy" width="1526" height="844"></a><figcaption>${t}</figcaption></figure>`).join('')}</div>
    </section>`).join('');
}

function pintarResultado() { const r = raiz?.querySelector('#sw-res'); if (r) r.innerHTML = resultado(); }

function pintar() {
  if (!raiz) return;
  const sw = CONFIG.solidworks, p = sw.propiedades, m = sw.malla, [e1, e2] = sw.estudios;
  raiz.querySelector('#sw').innerHTML = `
    <div class="aviso cuidado"><span><strong>Los dos estudios suponen la rodilla recta y bloqueada (fase de apoyo).</strong> No dicen nada de la rodilla doblada. Los resultados marcados ${SW} son del reporte del equipo; lo marcado ${EST} lo calcula o lee esta página.</span></div>
    <section class="panel sw-panel"><h3>Elige la carga</h3>
      <div class="sw-botones" role="group" aria-label="Carga a revisar">
        <button type="button" data-modo="pie" aria-pressed="${estado.modo === 'pie'}">De pie · ${fmt(e1.cargaN, 0)} N</button>
        <button type="button" data-modo="marcha" aria-pressed="${estado.modo === 'marcha'}">Pico de marcha · ${fmt(e2.cargaN, 0)} N</button>
        <button type="button" data-modo="libre" aria-pressed="${estado.modo === 'libre'}">Valor libre</button>
      </div>
      <label class="sw-libre" ${estado.modo === 'libre' ? '' : 'hidden'}><span>Carga libre: <strong class="num" id="sw-libre-v">${fmt(estado.libre, 0)} N</strong></span>
        <input type="range" id="sw-libre" min="0" max="3000" step="10" value="${estado.libre}" aria-label="Carga libre en newtons"></label>
      <div id="sw-res"></div>
    </section>
    <section class="panel sw-panel"><h3>¿Por qué el pico de ${fmt(e2.vonMisesMaxMPa, 1)} MPa no es el esfuerzo real?</h3>
      <ol class="vl-pasos">
        <li>El máximo aparece en <strong>un solo punto</strong>: la arista donde el eslabón diagonal toca al AFS1 (el mismo nodo en los dos estudios). Alrededor, la captura está casi toda azul: unos ${fmt(sw.entornoMPa.marcha, 0)} MPa o menos con 2,200 N.</li>
        <li>SolidWorks pegó todas las piezas entre sí (contacto <em>"unión rígida"</em>). En la orilla de una zona pegada la pieza pasa de "soldada" a "libre" de golpe, y el programa calcula ahí un esfuerzo que sube cada vez que la malla se hace más fina. Eso se llama <strong>singularidad</strong>: es un efecto del modelo, no de la pieza.</li>
        <li>En la rodilla real el eslabón gira en su eje y no está pegado al AFS1, así que esa orilla no existe tal cual. Con el tope escondido sí hay un apoyo ahí, pero repartido en ${fmt(app_.modelo.ens.tope.largoApoyo, 1)} mm y con aristas redondeadas.</li>
        <li><strong>Ojo:</strong> que el pico sea una singularidad no quiere decir que la zona esté descansada. El modelo de la página, con la rodilla apoyada en el tope, da unos ${fmt(modeloPara(e2.cargaN).esfuerzos.eslabonDiagDer.sigma, 0)} MPa de flexión en el eslabón diagonal con 2,200 N, y el eje A queda muy cargado. Ver el reporte.</li>
      </ol>
    </section>
    <section class="panel sw-panel"><h3>Cómo se hizo el estudio ${SW}</h3>
      <div class="tabla-desliza"><table><tbody>
        <tr><th>Programa</th><td>${sw.programa} · ${sw.tipo}</td></tr>
        <tr><th>Material</th><td>${sw.material} en todos los cuerpos, ejes incluidos: fluencia ${p.fluenciaMPa} MPa, tracción ${p.traccionMPa} MPa, E = ${p.moduloGPa} GPa, ν = ${p.poisson}, ρ = ${p.densidadKgM3} kg/m³</td></tr>
        <tr><th>Sujeción</th><td>${sw.sujecion}</td></tr>
        <tr><th>Carga</th><td>${sw.carga}</td></tr>
        <tr><th>Contacto</th><td>${sw.contacto}</td></tr>
        <tr><th>Rodilla</th><td>${sw.rodilla}</td></tr>
        <tr><th>Malla</th><td>${m.tipo}; elementos de ${m.elemento} mm, ${fmt(m.nodos, 0)} nodos, ${fmt(m.elementos, 0)} elementos, ${m.calidad}; cociente de aspecto máx. ${m.aspectoMax}</td></tr>
      </tbody></table></div>
      <div class="tabla-desliza"><table><thead><tr><th>Estudio</th><th class="n">Carga</th><th class="n">Reacción</th><th class="n">Von Mises máx.</th><th class="n">FS</th><th class="n">Desplazamiento máx.</th><th class="n">Deformación máx.</th></tr></thead><tbody>
        ${sw.estudios.map((e) => `<tr><td>${e.nombre}</td><td class="n">${fmt(e.cargaN, 0)} N</td><td class="n">${fmt(e.reaccionN, 2)} N</td><td class="n">${fmt(e.vonMisesMaxMPa, 1)} MPa</td><td class="n">${fmt(e.fs, 2)}</td><td class="n">${fmt(e.desplMaxMm, 4)} mm</td><td class="n">${e.deformMax.toExponential(3)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="ayuda">Masa del ensamble según el reporte: ${fmt(CONFIG.diseno.pesoRodillaG, 0)} g. El 7075-T6 de la página no tiene estudio de SolidWorks: sus valores son de tablas (estimados).</p>
    </section>
    ${capturas()}`;
  raiz.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { estado.modo = b.dataset.modo; pintar(); }));
  const rg = raiz.querySelector('#sw-libre');
  rg?.addEventListener('input', () => { estado.libre = +rg.value; raiz.querySelector('#sw-libre-v').textContent = `${fmt(estado.libre, 0)} N`; pintarResultado(); });
  pintarResultado();
}

export function montar(cont, app) {
  raiz = cont; app_ = app;
  cont.innerHTML = `
    <style>
      .sw-et{display:inline-block;font-size:.72rem;font-weight:600;padding:1px 6px;border-radius:999px;vertical-align:middle;letter-spacing:.02em}
      .sw-et.sw{background:var(--ok-suave);color:var(--ok);border:1px solid var(--ok)}.sw-et.est{background:var(--aviso-suave);color:var(--aviso);border:1px solid var(--aviso)}
      .sw-panel{padding:16px;display:grid;gap:12px;margin-top:16px}.sw-panel h3,.sw-estudio h3{font-size:1.15rem}
      .sw-botones{display:flex;flex-wrap:wrap;gap:8px}.sw-botones button{min-height:44px;padding:8px 14px;border-radius:var(--radio);border:1px solid var(--linea);background:var(--superficie);color:var(--tinta);font:inherit;cursor:pointer}
      .sw-botones button[aria-pressed="true"]{background:var(--guinda);color:#fff;border-color:var(--guinda)}
      .sw-libre{display:grid;gap:6px}.sw-libre input{width:100%}
      .sw-cifras{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.sw-cifras>div{background:var(--hundido);border-radius:var(--radio);padding:10px;display:grid;gap:2px;min-width:0}
      .sw-cifras strong{font-size:1.45rem}.sw-k{font-size:.85rem;color:var(--tenue)}
      .sw-escala{margin:22px 0 26px}.sw-barra{position:relative;height:16px;border-radius:8px}
      .sw-marca{position:absolute;top:-6px;width:2px;height:28px;background:var(--tinta);transform:translateX(-1px)}
      .sw-marca i{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-style:normal;font-size:.78rem;white-space:nowrap;font-weight:600}
      .sw-marca.abajo i{bottom:auto;top:100%}
      .sw-ejes{display:flex;justify-content:space-between;font-size:.78rem;color:var(--tenue);margin-top:4px}
      .sw-modelo summary{cursor:pointer;font-weight:600;min-height:32px}
      .sw-piezas{display:grid;gap:6px;margin-top:8px}.sw-pz{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:10px;align-items:center;font-size:.9rem}
      .sw-pz i{display:block;height:10px;border-radius:5px}
      .sw-estudio{padding:16px;margin-top:16px;display:grid;gap:10px}
      .sw-galeria{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.sw-galeria figure{margin:0;display:grid;gap:4px}
      .sw-galeria img{width:100%;height:auto;border-radius:var(--radio);border:1px solid var(--linea);background:#e6e6e6}.sw-galeria figcaption{font-size:.85rem;color:var(--tenue)}
      @media(max-width:900px){.sw-cifras,.sw-galeria{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.sw-pz{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.sw-pz strong{grid-column:1/-1}}
      @media(max-width:560px){.sw-cifras,.sw-galeria{grid-template-columns:minmax(0,1fr)}}
    </style>
    <h2 class="seccion-titulo">Validación con SolidWorks</h2>
    <p class="seccion-intro">Resultados de los estudios estáticos que hizo el equipo en SolidWorks Simulation, con la geometría de los mismos STL que se ven en la simulación.</p>
    <div id="sw"></div>`;
  pintar();
}
export function alMostrar() { pintar(); }
export function alCambiarModelo() { pintar(); }
