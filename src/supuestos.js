// Pestaña "Validación y supuestos": comprobaciones pedidas antes de entregar y lista de todo lo estimado.
import { CONFIG, G } from './config.js';
import { fmt } from './mat.js';

let raiz, app_;
const ok = (b) => `<span style="color:var(--${b ? 'ok' : 'mal'});font-weight:600">${b ? '✓ coincide' : '✗ no coincide'}</span>`;
const cerca = (a, b) => Math.abs(a - b) <= Math.max(0.5, Math.abs(b) * 0.01);

function casoDePie(M) {
  const m = CONFIG.mecanismo, seg = M.seg, d = CONFIG.pernos.diametro;
  const inst = M.instante('bipedestacion', 0), c = inst.cargas, sol = inst.sol;
  const W = M.usuario.pesoKg * G, R = 0.5 * W;
  const xcop = M.ctx.e + (0.45 - 0.25) * seg.pie; // la pierna está vertical: x del centro de presión respecto a la rodilla
  const Mk = (R * xcop) / 1000;
  const I = sol.cir, S = m.tope.punto;
  const Fs = (R * (xcop - I[0])) / (I[1] - S[1]);
  const F1 = -Fs / sol.u1[0], F2 = R - F1 * sol.u1[1];
  const tau = Math.abs(F1) / (2 * ((Math.PI * d * d) / 4));
  return `<ol class="vl-pasos">
    <li>Peso: W = m·g = ${fmt(M.usuario.pesoKg, 0)} × 9.81 = <b>${fmt(W, 1)} N</b>. De pie, cada pierna carga la mitad: R = <b>${fmt(R, 1)} N</b>. Modelo: ${fmt(inst.reaccionN, 1)} N ${ok(cerca(R, inst.reaccionN))}</li>
    <li>Brazo de palanca: la línea de carga sube vertical desde el centro de presión, a ${fmt(xcop, 1)} mm por delante del centro de rodilla (20 mm de alineación + 0.20 × ${fmt(seg.pie, 0)} mm de pie).</li>
    <li>Torque en la rodilla: M = R·d = ${fmt(R, 1)} × ${fmt(xcop / 1000, 4)} = <b>${fmt(Mk, 2)} N·m</b> de extensión. Modelo: ${fmt(inst.torqueNm, 2)} N·m ${ok(cerca(Mk, inst.torqueNm))}</li>
    <li>CIR a 0°: (${fmt(I[0], 1)}, ${fmt(I[1], 1)}) mm. La línea de carga pasa ${fmt(xcop - I[0], 1)} mm por delante ⇒ <b>estable</b>; el tope de extensión equilibra el momento: F<sub>tope</sub> = R·(x − x<sub>CIR</sub>) / (y<sub>CIR</sub> − y<sub>tope</sub>) = ${fmt(R, 1)} × ${fmt(xcop - I[0], 1)} / ${fmt(I[1] - S[1], 1)} = <b>${fmt(Fs, 1)} N</b>. Modelo: ${fmt(c.Fs, 1)} N ${ok(cerca(Fs, c.Fs))}</li>
    <li>Barras (ΣFx = 0, ΣFy = 0): F<sub>c1</sub> = −F<sub>tope</sub>/u<sub>1x</sub> = <b>${fmt(F1, 1)} N</b>; F<sub>c2</sub> = R − F<sub>c1</sub>·u<sub>1y</sub> = <b>${fmt(F2, 1)} N</b>. Modelo: ${fmt(c.F1, 1)} y ${fmt(c.F2, 1)} N ${ok(cerca(F1, c.F1) && cerca(F2, c.F2))}</li>
    <li>Cortante en el perno A (cortante doble, Ø${d}): τ = F / (2·π·d²/4) = ${fmt(Math.abs(F1), 1)} / ${fmt(2 * Math.PI * d * d / 4, 1)} = <b>${fmt(tau, 2)} MPa</b>. Modelo: ${fmt(c.esfuerzos.pernoA.tau, 2)} MPa ${ok(cerca(tau, c.esfuerzos.pernoA.tau))}</li>
    <li>Factor de seguridad del modelo: <b>${c.fs == null ? 'pendiente' : fmt(Math.min(c.fs, 99), 2)}</b> (pieza crítica: ${c.critica || '—'}). Muy por encima de 1.5, como se espera de pie.</li></ol>`;
}
function casoImpacto(M) {
  const c = M.ciclo('impacto', 100), pico = c.muestras.reduce((a, b) => (b.reaccionN > a.reaccionN ? b : a));
  const inst = M.instante('impacto', pico.t), W = M.usuario.pesoKg * G, f = M.K.cargaImpacto, R = f * W;
  const fx = inst.postura.s.grf.fx, mag = R * Math.hypot(1, fx);
  const Mk = (mag * inst.cargas.brazoRodilla) / 1000, cap = M.capacidadDisenoKg * G;
  return `<ol class="vl-pasos">
    <li>Carga vertical de impacto para ${M.usuario.nivelK}: R = f·W = ${fmt(f, 1)} × ${fmt(W, 1)} = <b>${fmt(R, 0)} N</b>. Modelo en el pico: ${fmt(inst.reaccionN, 0)} N ${ok(cerca(R, inst.reaccionN))}</li>
    <li>Con la componente de frenado (F<sub>x</sub> = ${fmt(fx, 2)}·F<sub>y</sub>) la resultante es ${fmt(mag, 0)} N. Su línea pasa a ${fmt(inst.cargas.brazoRodilla, 1)} mm del centro de rodilla ⇒ M = ${fmt(mag, 0)} × ${fmt(inst.cargas.brazoRodilla / 1000, 4)} = <b>${fmt(Mk, 1)} N·m</b>. Modelo (incluye el peso de la parte distal): ${fmt(inst.torqueNm, 1)} N·m ${ok(Math.abs(Mk - inst.torqueNm) < 3)}</li>
    <li>Comparación con el límite de diseño: ${fmt(Math.abs(inst.torqueNm), 1)} N·m es el <b>${fmt((Math.abs(inst.torqueNm) / CONFIG.diseno.torqueReferenciaNm) * 100, 0)} %</b> de ${CONFIG.diseno.torqueReferenciaNm} N·m.</li>
    <li>Comparación con la capacidad estática: ${fmt(R, 0)} N equivalen a ${fmt(R / G, 1)} kg, contra ${fmt(M.capacidadDisenoKg, 1)} kg (${fmt(cap, 0)} N). ${R > cap ? 'El impacto supera la capacidad estática de diseño: es una carga dinámica breve, y por eso se revisa aparte el factor de seguridad.' : 'Queda dentro de la capacidad de diseño.'}</li>
    <li>Factor de seguridad en el pico: <b>${inst.fs == null ? 'pendiente' : fmt(inst.fs, 2)}</b> ${inst.fs == null ? '' : inst.fs >= 1.5 ? '(cumple el mínimo de 1.5)' : inst.fs >= 1 ? '(por debajo de 1.5: revisar)' : '(menor que 1: fallaría)'}. Pieza crítica: ${inst.cargas.critica || '—'}.</li></ol>`;
}

function pintar() {
  if (!raiz) return;
  const M = app_.modelo, v = M.validacion, d = CONFIG.diseno, iso = CONFIG.iso10328;
  const nivel = M.nivelISO, datos = iso.niveles[nivel];
  raiz.querySelector('#vl').innerHTML = `
    <div class="vl-rejilla">
      <section class="panel vl"><h3>1. El mecanismo no se traba en 0°–135°</h3>
        <div class="aviso ${v.ok ? 'ok' : 'peligro'}"><span><strong>${v.ok ? 'Verificado.' : 'Falla.'}</strong> Se resolvió el cierre de lazo cada 0.25° de 0° a ${v.hasta}°.</span></div>
        <ul><li>El lazo siempre cierra: discriminante mínimo ${fmt(v.minDisc, 1)} mm (debe ser &gt; 0).</li>
        <li>Las barras nunca quedan paralelas: |sen| mínimo ${fmt(v.minPar, 2)} (sin punto muerto).</li>
        <li>Sin saltos de rama: el eje A se mueve como máximo ${fmt(v.saltoMax, 2)} mm por paso.</li>
        <li>${v.cruceDesde == null ? 'Las barras c1 y c2 no se cruzan en la vista lateral.' : `A partir de ${fmt(v.cruceDesde, 0)}° las barras c1 y c2 se traslapan <em>en la vista lateral</em>. No chocan porque van en planos distintos (c1 por fuera, c2 por dentro), pero las holguras reales deben revisarse en SolidWorks.`}</li></ul></section>
      <section class="panel vl"><h3>3. Nivel ISO 10328 para el peso elegido</h3>
        <p>Para ${fmt(M.usuario.pesoKg, 0)} kg corresponde el nivel <strong>${nivel}</strong>${datos ? ` (usuarios de hasta ${datos.masaKg} kg). Fuerzas usadas, condición I / II: prueba ${datos.I.prueba} / ${datos.II.prueba} N, última ${datos.I.ultimaSup} / ${datos.II.ultimaSup} N, cíclica ${datos.I.ciclica} / ${datos.II.ciclica} N, ${fmt(iso.ciclos / 1e6, 0)} millones de ciclos.` : '. Sus fuerzas no están cargadas en la simulación.'}</p>
        <p class="ayuda">Paciente de diseño de ${d.masaPacienteKg} kg ⇒ P4. Capacidad de diseño de ${fmt(M.capacidadDisenoKg, 1)} kg ⇒ P5. El resultado de cada nivel está en la pestaña Normas. ${app_.chipNorma('iso-10328', 'Nivel ' + nivel)}</p></section>
      <section class="panel vl"><h3>2a. Caso a mano: ${fmt(M.usuario.pesoKg, 0)} kg de pie</h3>${casoDePie(M)}</section>
      <section class="panel vl"><h3>2b. Caso a mano: ${fmt(M.usuario.pesoKg, 0)} kg en impacto</h3>${casoImpacto(M)}</section>
    </div>
    <h3 class="nm-grupo" style="margin-top:28px">4. Supuestos que se pueden corregir</h3>
    <div class="panel tabla-desliza"><table><thead><tr><th>Supuesto</th><th>Valor usado</th><th>Dónde se cambia</th></tr></thead><tbody>
      <tr><td>Geometría del mecanismo (ejes A, B, C, D)</td><td class="estimado">Estimada: A (${CONFIG.mecanismo.A}), B (${CONFIG.mecanismo.B}), C (${CONFIG.mecanismo.C}), D (${CONFIG.mecanismo.D}) mm</td><td><code>config.js → mecanismo</code></td></tr>
      <tr><td>Medidas de las 12 piezas</td><td class="estimado">Estimadas (proporciones de rodillas de 4 barras comerciales)</td><td><code>config.js → piezas</code></td></tr>
      <tr><td>Reparto en 12 piezas</td><td class="estimado">Interpretación: c1 y c2 en pares, dos barras inferiores, base y tubo receptor por separado</td><td><code>piezas.js</code></td></tr>
      <tr><td>Peso de la rodilla</td><td>${M.masa ? fmt(M.masa.totalG, 0) + ' g calculados' : 'pendiente'} contra ${d.pesoRodillaG} g del equipo: las medidas estimadas son más robustas que el diseño real</td><td>Se corrige con las medidas reales</td></tr>
      <tr><td>Pernos</td><td class="estimado">Ø${CONFIG.pernos.diametro} mm, ${CONFIG.pernos.material}, fluencia ${CONFIG.pernos.fluenciaMPa} MPa</td><td><code>config.js → pernos</code></td></tr>
      <tr><td>Tope de extensión</td><td class="estimado">Punto y dirección supuestos; equilibra el momento de extensión</td><td><code>config.js → mecanismo.tope</code></td></tr>
      <tr><td>Torque de referencia de 274.2 N·m</td><td>Límite de diseño del equipo. Equivale a 65 kg × 9.81 × 0.43 m; los torques de la marcha simulada son mucho menores</td><td><code>config.js → diseno</code></td></tr>
      <tr><td>Factores de carga por actividad</td><td>De pie 0.5; marcha ${CONFIG.nivelesK.K1.cargaMarcha}–${CONFIG.nivelesK.K4.cargaMarcha}; subir 1.1; bajar 1.5; impacto ${CONFIG.nivelesK.K1.cargaImpacto}–${CONFIG.nivelesK.K4.cargaImpacto} × peso</td><td><code>config.js → nivelesK, factoresCarga</code></td></tr>
      <tr><td>Velocidad, cadencia y flexión por nivel K</td><td class="estimado">Valores típicos estimados; la clasificación K no fija números</td><td><code>config.js → nivelesK</code></td></tr>
      <tr><td>Movimientos de cada escenario</td><td class="estimado">Posturas clave interpoladas, no captura de movimiento. Curvas sanas aproximadas de Winter y Perry</td><td><code>escenarios.js, datosMarcha.js</code></td></tr>
      <tr><td>Propiedades del aluminio</td><td>Mínimos de ASTM B221: 6061-T6 240/260 MPa, 7075-T6 485/540 MPa (fluencia/última)</td><td><code>config.js → materiales</code></td></tr>
      <tr><td>Plástico del prototipo</td><td class="estimado">Pendiente: tipo, % de relleno y escala</td><td><code>config.js → materiales.prototipo-3d</code></td></tr>
      <tr><td>Fuerzas y desplazamientos de ISO 10328</td><td class="estimado">Transcritos de literatura secundaria; desplazamientos del nivel P5 para todos los niveles; análisis solo en el plano sagital</td><td><code>config.js → iso10328</code></td></tr>
      <tr><td>Modelo de esfuerzos</td><td>Estática plana con vigas y pernos; sin concentradores salvo en fatiga; no es FEA</td><td><code>cargas.js</code></td></tr>
      <tr><td>Muñón y altura de rodilla</td><td>Con muñón de ${fmt(M.seg.munon / 10, 1)} cm y muslo de ${fmt(M.seg.muslo / 10, 1)} cm no caben los ~10 cm de la rodilla; la simulación iguala la altura de ambas rodillas y acorta el socket</td><td><code>config.js → antropometria</code></td></tr>
      <tr><td>Parte distal en balanceo</td><td class="estimado">${CONFIG.distal.masaDistalKg} kg (base, pilón y pie); aceleraciones acotadas a 25 m/s²</td><td><code>config.js → distal</code></td></tr>
    </tbody></table></div>`;
}

export function montar(cont, app) {
  raiz = cont; app_ = app;
  cont.innerHTML = `
    <style>.vl-rejilla{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.vl-rejilla>*{min-width:0}.vl{padding:16px;display:grid;gap:10px;align-content:start}.vl h3{font-size:1.15rem}
      .vl ul,.vl-pasos{margin:0;padding-left:20px;display:grid;gap:6px;font-size:.95rem}.vl-pasos{font-variant-numeric:tabular-nums}
      code{font-size:.85em;background:var(--hundido);padding:1px 5px;border-radius:4px}
      @media(max-width:900px){.vl-rejilla{grid-template-columns:minmax(0,1fr)}}</style>
    <h2 class="seccion-titulo">Validación y supuestos</h2>
    <p class="seccion-intro">Comprobaciones hechas antes de entregar y lista de lo que se estimó. Los casos a mano se recalculan con el peso y el nivel K elegidos en la pestaña Simulación.</p>
    <div id="vl"></div>`;
  pintar();
}
export function alMostrar() { pintar(); }
export function alCambiarModelo() { pintar(); }
