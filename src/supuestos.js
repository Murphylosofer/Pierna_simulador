// Pestaña "Validación y supuestos": comprobaciones pedidas antes de entregar y lista de todo lo estimado.
import { CONFIG, G } from './config.js';
import { fmt } from './mat.js';
import { revisarInterferencias } from './interferencias.js';

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
        <li>${(() => { const r = Object.entries(revisarInterferencias()); return r.length ? `<strong style="color:var(--mal)">Hay interferencias:</strong> ${r.map(([k, x]) => `${k} (${x.desde}°–${x.hasta}°, ${fmt(x.max, 1)} mm)`).join('; ')}.` : 'Sin interferencias: ningún par de piezas se encima en todo el rango (revisión prisma contra prisma cada 1°).'; })()}</li>
        <li>${v.cruceDesde == null ? 'Las barras c1 y c2 no se cruzan en la vista lateral.' : `A partir de ${fmt(v.cruceDesde, 0)}° las barras c1 y c2 se cruzan <em>solo en la vista lateral</em>: van en planos distintos (c1 por fuera, c2 por dentro), así que no se tocan. Las holguras reales deben confirmarse en SolidWorks.`}</li></ul></section>
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
      <tr><td>Medidas reales de SolidWorks</td><td>Leídas de 4 planos (AFS1, adaptador femoral inferior, eje superior y eje inferior): ejes de Ø5 × 55 y Ø5 × 70 mm, horquillas de 55 mm de ancho con paredes de 4 mm y claro de 47 mm, cilindro inferior de Ø40 × 40 mm. <strong>Registradas pero aún no aplicadas</strong>: de los PDF solo se pudo leer el texto de las cotas, no el dibujo</td><td><code>config.js → medidasReales</code></td></tr>
      <tr><td>Pistón neumático</td><td class="estimado">Minicilindro Ø16 según el documento del equipo; anclajes propuestos por la simulación; presión supuesta de 6 bar</td><td><code>config.js → piston</code></td></tr>
      <tr><td>Pernos</td><td class="estimado">Ø${CONFIG.pernos.diametro} mm en el cálculo; los planos reales piden Ø${CONFIG.medidasReales.ejeSuperior.diametro} mm. ${CONFIG.pernos.material}, fluencia ${CONFIG.pernos.fluenciaMPa} MPa</td><td><code>config.js → pernos</code></td></tr>
      <tr><td>Tope de extensión</td><td class="estimado">Punto y dirección supuestos; equilibra el momento de extensión</td><td><code>config.js → mecanismo.tope</code></td></tr>
      <tr><td>Torque de referencia de 274.2 N·m</td><td>Límite de diseño del equipo. Equivale a 65 kg × 9.81 × 0.43 m; los torques de la marcha simulada son mucho menores</td><td><code>config.js → diseno</code></td></tr>
      <tr><td>Factores de carga por actividad</td><td>De pie 0.5; marcha ${CONFIG.nivelesK.K1.cargaMarcha}–${CONFIG.nivelesK.K4.cargaMarcha}; subir 1.1; bajar 1.5; impacto ${CONFIG.nivelesK.K1.cargaImpacto}–${CONFIG.nivelesK.K4.cargaImpacto} × peso</td><td><code>config.js → nivelesK, factoresCarga</code></td></tr>
      <tr><td>Velocidad, cadencia y flexión por nivel K</td><td class="estimado">Valores típicos estimados; la clasificación K no fija números</td><td><code>config.js → nivelesK</code></td></tr>
      <tr><td>Movimientos de cada escenario</td><td class="estimado">Posturas clave interpoladas, no captura de movimiento. Curvas sanas aproximadas de Winter y Perry</td><td><code>escenarios.js, datosMarcha.js</code></td></tr>
      <tr><td>Propiedades del aluminio</td><td>Mínimos de ASTM B221: 6061-T6 240/260 MPa, 7075-T6 485/540 MPa (fluencia/última)</td><td><code>config.js → materiales</code></td></tr>
      <tr><td>Plástico del prototipo</td><td class="estimado">Supuesto: PLA, 20 % de relleno, escala 1:1, fluencia efectiva 22 MPa. Falta que el equipo lo confirme</td><td><code>config.js → materiales.prototipo-3d</code></td></tr>
      <tr><td>Fuerzas y desplazamientos de ISO 10328</td><td class="estimado">Transcritos de literatura secundaria; desplazamientos del nivel P5 para todos los niveles; análisis solo en el plano sagital</td><td><code>config.js → iso10328</code></td></tr>
      <tr><td>Modelo de esfuerzos</td><td>Estática plana con vigas y pernos; sin concentradores salvo en fatiga; no es FEA</td><td><code>cargas.js</code></td></tr>
      <tr><td>Muñón y altura de rodilla</td><td>Con muñón de ${fmt(M.seg.munon / 10, 1)} cm y muslo de ${fmt(M.seg.muslo / 10, 1)} cm no caben los ~10 cm de la rodilla; la simulación iguala la altura de ambas rodillas y acorta el socket</td><td><code>config.js → antropometria</code></td></tr>
      <tr><td>Parte distal en balanceo</td><td class="estimado">${CONFIG.distal.masaDistalKg} kg (base, pilón y pie); aceleraciones acotadas a 25 m/s²</td><td><code>config.js → distal</code></td></tr>
    </tbody></table></div>
    <h3 class="nm-grupo" style="margin-top:28px">5. Fórmulas aplicadas y de dónde salen</h3>
    <p class="seccion-intro">Todas son fórmulas de libro de texto. Las citas son a la obra, no a una página: se tomaron de memoria y conviene confirmarlas en la edición que tenga el equipo. Lo marcado como criterio propio no viene de ninguna fuente.</p>
    <div class="panel tabla-desliza"><table><thead><tr><th>Qué se calcula</th><th>Fórmula</th><th>Fuente</th><th>Archivo</th></tr></thead><tbody>
      <tr><td>Posición del mecanismo</td><td>D + L₁·u(φ₁) = A; A + R(θ)(B₀ − A₀) = B; |B − C| = L₂ (intersección de dos círculos)</td><td>${app_.chipNorma('norton')}</td><td><code>cinematica.js</code></td></tr>
      <tr><td>Centro instantáneo de rotación</td><td>Intersección de las rectas D–A y C–B (teorema de Aronhold-Kennedy)</td><td>${app_.chipNorma('norton')}${app_.chipNorma('radcliffe')}</td><td><code>cinematica.js</code></td></tr>
      <tr><td>Estabilidad en apoyo</td><td>Estable si M<sub>CIR</sub> = (p − CIR) × R ≥ 0: la línea de carga pasa por delante del CIR</td><td>${app_.chipNorma('radcliffe')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Segmentos del cuerpo</td><td>Longitud = coeficiente × estatura (muslo 0.245, pierna 0.246, pie 0.152…); masa = fracción × peso</td><td>${app_.chipNorma('winter')}${app_.chipNorma('dempster')}</td><td><code>antropometria.js</code></td></tr>
      <tr><td>Reacción del suelo</td><td>R = f · m · g, con f según la actividad</td><td>${app_.chipNorma('winter')}${app_.chipNorma('perry')} y artículos citados en <code>config.js → factoresCarga</code></td><td><code>escenarios.js</code></td></tr>
      <tr><td>Torque en la rodilla</td><td>M = R · d (fuerza por brazo de palanca)</td><td>${app_.chipNorma('beer')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Fuerzas en las barras y el tope</td><td>F₁·u₁ + F₂·u₂ + F<sub>tope</sub>·n = R y ΣM = 0 (barras de dos fuerzas, sistema 3 × 3)</td><td>${app_.chipNorma('beer')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Peso e inercia en balanceo</td><td>F = −m·(g + a), principio de D'Alembert</td><td>${app_.chipNorma('winter')}</td><td><code>modelo.js</code></td></tr>
      <tr><td>Cortante en pernos</td><td>τ = F / (2 · π·d²/4), cortante doble</td><td>${app_.chipNorma('shigley')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Flexión del perno</td><td>M = F·(L/4 − b/8); σ = 32·M / (π·d³)</td><td>${app_.chipNorma('shigley')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Barras laterales</td><td>Sección neta σ = N / ((w − d)·t); aplastamiento σ = N / (d·t)</td><td>${app_.chipNorma('shigley')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Tubo receptor y anillo</td><td>σ = M·c / I + N / A, con I = π(D⁴ − d⁴)/64</td><td>${app_.chipNorma('beer')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Placas (base y adaptador)</td><td>σ = 6·M / (b·t²), viga entre los dos porta-ejes</td><td>${app_.chipNorma('beer')} · el factor de tramo libre (1 − huella/claro) es <strong>criterio propio</strong></td><td><code>cargas.js</code></td></tr>
      <tr><td>Factor de seguridad</td><td>FS = fluencia / esfuerzo máximo; cortante equivalente √3·τ (von Mises)</td><td>${app_.chipNorma('shigley')}${app_.chipNorma('astm-b221-b211')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Fatiga</td><td>1/n = σ<sub>a</sub>/S<sub>e</sub> + σ<sub>m</sub>/S<sub>ut</sub> (Goodman), con K<sub>t</sub> = ${CONFIG.iso10328.concentracionEsfuerzo} en el barreno</td><td>${app_.chipNorma('shigley')}${app_.chipNorma('iso-10328')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Prueba ISO simulada</td><td>Fuerzas de prueba, última y cíclica sobre la línea de carga de talón y de antepié</td><td>${app_.chipNorma('iso-10328')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Peso de la rodilla</td><td>m = Σ volumen × densidad</td><td>${app_.chipNorma('astm-b221-b211')}</td><td><code>piezas.js</code></td></tr>
      <tr><td>Torque de referencia</td><td>274.2 N·m = 65 kg × 9.81 m/s² × 0.43 m</td><td>Dato del equipo</td><td><code>config.js</code></td></tr>
      <tr><td>Equivalencia con el prototipo</td><td>F<sub>prototipo</sub> = F · (fluencia del plástico / fluencia del aluminio) · escala²</td><td><strong>Criterio propio</strong> por semejanza: mismo porcentaje de la fluencia en ambos</td><td><code>main.js</code></td></tr>
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
