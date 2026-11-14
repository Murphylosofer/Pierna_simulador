// Pestaña "Validación y supuestos": comprobaciones pedidas antes de entregar y lista de todo lo estimado.
import { CONFIG, G } from './config.js';
import { fmt } from './mat.js';
import { revisarInterferencias } from './interferencias.js';
import { diagnosticoOriginal } from './ensamble.js';

let raiz, app_;
const ok = (b) => `<span style="color:var(--${b ? 'ok' : 'mal'});font-weight:600">${b ? '✓ coincide' : '✗ no coincide'}</span>`;
const cerca = (a, b) => Math.abs(a - b) <= Math.max(0.5, Math.abs(b) * 0.01);

function casoDePie(M) {
  const seg = M.seg, d = CONFIG.geometria.ejes.diametro, ens = M.ens;
  const inst = M.instante('bipedestacion', 0), c = inst.cargas, sol = inst.sol;
  const W = M.usuario.pesoKg * G, R = 0.5 * W, Wd = CONFIG.distal.masaDistalKg * G;
  const xcop = M.ctx.e + (0.45 - 0.25) * seg.pie; // la pierna está vertical: x del centro de presión respecto al centro de referencia
  const Mk = (R * xcop) / 1000;
  const I = sol.cir, xt = ens.topeContacto[0];
  // Momentos respecto al CIR: los dos eslabones pasan por él, solo quedan R, el peso distal (en x = 0) y el tope.
  const Fs = (R * (xcop - I[0]) + Wd * I[0]) / (xt - I[0]);
  // Fuerzas en eslabones: F1·u1 + F2·u2 = (0, R − Wd − Fs)
  const u1 = sol.u1, u2 = sol.u2, Ey = R - Wd - Fs, den = u1[0] * u2[1] - u1[1] * u2[0];
  const F1 = (0 * u2[1] - Ey * u2[0]) / den, F2 = (u1[0] * Ey - u1[1] * 0) / den;
  const tau = Math.abs(F2) / (2 * ((Math.PI * d * d) / 4));
  return `<ol class="vl-pasos">
    <li>Peso: W = m·g = ${fmt(M.usuario.pesoKg, 0)} × 9.81 = <b>${fmt(W, 1)} N</b>. De pie, cada pierna carga la mitad: R = <b>${fmt(R, 1)} N</b>. Modelo: ${fmt(inst.reaccionN, 1)} N ${ok(cerca(R, inst.reaccionN))}</li>
    <li>Brazo de palanca: la línea de carga sube vertical desde el centro de presión, a ${fmt(xcop, 1)} mm por delante del centro de referencia (20 mm de alineación + 0.20 × ${fmt(seg.pie, 0)} mm de pie).</li>
    <li>Torque respecto al centro de referencia: M = R·d = ${fmt(R, 1)} × ${fmt(xcop / 1000, 4)} = <b>${fmt(Mk, 2)} N·m</b> de extensión. Modelo: ${fmt(inst.torqueNm, 2)} N·m ${ok(Math.abs(Mk - inst.torqueNm) < 0.6)} (el modelo resta el peso de la parte distal).</li>
    <li>CIR a 0°: (${fmt(I[0], 1)}, ${fmt(I[1], 1)}) mm, muy alto y ${fmt(xcop - I[0], 0)} mm detrás de la línea de carga ⇒ <b>estable</b>: el peso empuja la rodilla contra su tope.</li>
    <li>Fuerza del tope (momentos respecto al CIR, por donde pasan los dos eslabones): F<sub>tope</sub> = [R·(x<sub>cp</sub> − x<sub>CIR</sub>) + W<sub>distal</sub>·x<sub>CIR</sub>] / (x<sub>tope</sub> − x<sub>CIR</sub>) = [${fmt(R, 1)} × ${fmt(xcop - I[0], 1)} + ${fmt(Wd, 1)} × ${fmt(I[0], 1)}] / ${fmt(xt - I[0], 1)} = <b>${fmt(Fs, 1)} N</b>. Modelo: ${fmt(c.Fs, 1)} N ${ok(cerca(Fs, c.Fs))}</li>
    <li>Eslabones (ΣFx = 0, ΣFy = 0 con lo que queda): F<sub>exterior</sub> = <b>${fmt(F1, 1)} N</b>, F<sub>interior</sub> = <b>${fmt(F2, 1)} N</b>. Modelo: ${fmt(c.F1, 1)} y ${fmt(c.F2, 1)} N ${ok(Math.abs(F1 - c.F1) < 2 && Math.abs(F2 - c.F2) < 2)}</li>
    <li>Cortante en el eje B (cortante doble, Ø${d}): τ = F / (2·π·d²/4) = ${fmt(Math.abs(F2), 1)} / ${fmt((2 * Math.PI * d * d) / 4, 1)} = <b>${fmt(tau, 2)} MPa</b>. Modelo: ${fmt(c.esfuerzos.pernoB.tau, 2)} MPa ${ok(Math.abs(tau - c.esfuerzos.pernoB.tau) < 0.1)}</li>
    <li>Factor de seguridad del modelo: <b>${c.fs == null ? 'pendiente' : fmt(Math.min(c.fs, 99), 2)}</b> (pieza crítica: ${c.critica || '—'}). Muy por encima de 1.5, como se espera de pie.</li></ol>`;
}

// Diagnóstico del ensamble de SolidWorks tal como llegó, y efecto de cada corrección.
function diagnostico(M) {
  const g = CONFIG.geometria, dx = diagnosticoOriginal(), ens = M.ens, el = g.eslabones;
  return `<section class="panel vl ancho"><h3>0. Diagnóstico del ensamble de SolidWorks (Ensamblaje2)</h3>
    <p>La simulación usa las piezas exactamente como vienen del STEP: AFS1, adaptador femoral inferior, eslabones de ${el.exterior.centros} y ${el.interior.centrosOriginal} mm entre centros y ejes Ø${g.ejes.diametro} de ${g.ejes.superior.largo} y ${g.ejes.inferior.largo} mm. Con eso la rodilla no funciona:</p>
    <div class="aviso peligro"><span><strong>Con el eslabón interior de ${el.interior.centrosOriginal} mm la rodilla no puede enderezarse.</strong> ${dx.aCero.motivo} En SolidWorks el ensamble quedó guardado con el adaptador inferior girado ${fmt(-dx.pose.giro, 1)}° y, desde ahí, el mecanismo solo puede doblarse más: la flexión mínima posible es ${fmt(dx.flexionMinima, 1)}°. La pose guardada está pegada a ese límite (punto muerto).</span></div>
    <p style="margin-top:10px"><strong>Correcciones aplicadas</strong> (todas en <code>config.js → geometria</code>):</p>
    <ol class="vl-pasos">
      <li><strong>Eslabón interior de ${el.interior.centrosOriginal} → ${el.interior.centros} mm</strong> entre centros, igual que el exterior: las cuatro barras quedan como una sola pieza que se fabrica cuatro veces. Así la rodilla cierra a 0° con el pilón paralelo al socket, el CIR queda alto y detrás de la línea de carga, y no hay puntos muertos. Altura total de la rodilla: ${fmt(ens.alturaTotal, 0)} mm.</li>
      <li><strong>Chaflán de ${g.correcciones.chaflanPlacaAFS1} × 45°</strong> en la arista trasera inferior de la placa del AFS1. Sin él, el eslabón interior pega con la placa a 129.6° de flexión; con él la flexión queda libre hasta 139°, que actúa como tope natural de flexión.</li>
      <li><strong>Tope de extensión ${g.correcciones.tope.rosca}</strong> (pieza añadida): el diseño no tenía nada que impidiera la hiperextensión. Un tornillo baja de la placa del AFS1 y apoya con un capuchón de hule en la ceja delantera del adaptador inferior justo a 0°. Al ser un contacto entre los dos cuerpos, lejos del CIR, la fuerza es baja (unos ${fmt(M.instante('bipedestacion', 0).cargas.Fs, 0)} N de pie).</li>
    </ol>
    <p class="ayuda">Se probaron antes otras salidas sin cambiar piezas: montar una horquilla al revés o cruzar los eslabones. Cierran a 0°, pero dejan el CIR bajo (rodilla inestable) o el pilón 35–60 mm fuera del socket. Usar dos eslabones de 65 mm deja la flexión en 115°.</p>
  </section>`;
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
      ${diagnostico(M)}
      <section class="panel vl"><h3>1. El mecanismo no se traba en 0°–135°</h3>
        <div class="aviso ${v.ok ? 'ok' : 'peligro'}"><span><strong>${v.ok ? 'Verificado.' : 'Falla.'}</strong> Se resolvió el cierre de lazo cada 0.25° de 0° a ${v.hasta}°.</span></div>
        <ul><li>El lazo siempre cierra: discriminante mínimo ${fmt(v.minDisc, 1)} mm (debe ser &gt; 0).</li>
        <li>Las barras nunca quedan paralelas: |sen| mínimo ${fmt(v.minPar, 2)} (sin punto muerto).</li>
        <li>Sin saltos de rama: el eje A se mueve como máximo ${fmt(v.saltoMax, 2)} mm por paso.</li>
        <li>${(() => { const r = Object.entries(revisarInterferencias()); return r.length ? `<strong style="color:var(--mal)">Hay interferencias:</strong> ${r.map(([k, x]) => `${k} (${x.desde}°–${x.hasta}°, ${fmt(x.max, 1)} mm)`).join('; ')}.` : 'Sin interferencias: ningún par de piezas se encima en todo el rango (revisión prisma contra prisma cada 1°).'; })()}</li>
        <li>${v.cruceDesde == null ? 'Los eslabones exterior e interior no se cruzan en la vista lateral.' : `A partir de ${fmt(v.cruceDesde, 0)}° los eslabones exterior e interior se cruzan <em>solo en la vista lateral</em>: van en planos distintos (exteriores por fuera de las paredes, interiores por dentro), así que no se tocan. Las holguras reales deben confirmarse en SolidWorks.`}</li></ul></section>
      <section class="panel vl"><h3>3. Nivel ISO 10328 para el peso elegido</h3>
        <p>Para ${fmt(M.usuario.pesoKg, 0)} kg corresponde el nivel <strong>${nivel}</strong>${datos ? ` (usuarios de hasta ${datos.masaKg} kg). Fuerzas usadas, condición I / II: prueba ${datos.I.prueba} / ${datos.II.prueba} N, última ${datos.I.ultimaSup} / ${datos.II.ultimaSup} N, cíclica ${datos.I.ciclica} / ${datos.II.ciclica} N, ${fmt(iso.ciclos / 1e6, 0)} millones de ciclos.` : '. Sus fuerzas no están cargadas en la simulación.'}</p>
        <p class="ayuda">Paciente de diseño de ${d.masaPacienteKg} kg ⇒ P4. Capacidad de diseño de ${fmt(M.capacidadDisenoKg, 1)} kg ⇒ P5. El resultado de cada nivel está en la pestaña Normas. ${app_.chipNorma('iso-10328', 'Nivel ' + nivel)}</p></section>
      <section class="panel vl"><h3>2a. Caso a mano: ${fmt(M.usuario.pesoKg, 0)} kg de pie</h3>${casoDePie(M)}</section>
      <section class="panel vl"><h3>2b. Caso a mano: ${fmt(M.usuario.pesoKg, 0)} kg en impacto</h3>${casoImpacto(M)}</section>
    </div>
    <h3 class="nm-grupo" style="margin-top:28px">4. Supuestos que se pueden corregir</h3>
    <div class="panel tabla-desliza"><table><thead><tr><th>Supuesto</th><th>Valor usado</th><th>Dónde se cambia</th></tr></thead><tbody>
      <tr><td>Geometría de las piezas</td><td>Real: perfiles, barrenos y espesores tomados del STEP de SolidWorks (volúmenes dentro del 3 %)</td><td><code>config.js → geometria</code></td></tr>
      <tr><td>Eslabón interior</td><td class="estimado">Corregido a ${CONFIG.geometria.eslabones.interior.centros} mm (SolidWorks: ${CONFIG.geometria.eslabones.interior.centrosOriginal} mm). Ver el diagnóstico</td><td><code>config.js → geometria.eslabones</code></td></tr>
      <tr><td>Chaflán de la placa del AFS1</td><td class="estimado">${CONFIG.geometria.correcciones.chaflanPlacaAFS1} × 45°, añadido para llegar a 135°</td><td><code>config.js → geometria.correcciones</code></td></tr>
      <tr><td>Tope de extensión</td><td class="estimado">Tornillo ${CONFIG.geometria.correcciones.tope.rosca} añadido, apoyado en la ceja; el diseño original no tenía tope</td><td><code>config.js → geometria.correcciones.tope</code></td></tr>
      <tr><td>Material de los ejes</td><td class="estimado">${CONFIG.geometria.ejes.material} (los planos no lo indican). Con Ø5 en aluminio los ejes no aguantarían</td><td><code>config.js → geometria.ejes</code></td></tr>
      <tr><td>Retención de los ejes</td><td class="estimado">No está en SolidWorks: hacen falta anillos o prisioneros</td><td>—</td></tr>
      <tr><td>Peso de la rodilla</td><td>${M.masa ? fmt(M.masa.totalG, 0) + ' g calculados' : 'pendiente'} (incluye unos ${M.masa ? fmt(M.masa.porPieza.tope, 0) : '—'} g del tornillo de tope) contra ${d.pesoRodillaG} g del equipo</td><td>Sale del STEP</td></tr>
      <tr><td>Pistón neumático</td><td class="estimado">Minicilindro Ø16 entre el Eje superior (B) y el Eje inferior (D), como dice el documento; presión supuesta de 6 bar</td><td><code>config.js → piston</code></td></tr>
      <tr><td>Centro de referencia de la rodilla</td><td class="estimado">20 mm detrás del eje del pilón y 55 mm sobre el adaptador inferior; los torques se miden respecto a ese punto</td><td><code>config.js → geometria.origenRodillaY</code></td></tr>
      <tr><td>Torque de referencia de 274.2 N·m</td><td>Límite de diseño del equipo. Equivale a 65 kg × 9.81 × 0.43 m; los torques de la marcha simulada son mucho menores</td><td><code>config.js → diseno</code></td></tr>
      <tr><td>Factores de carga por actividad</td><td>De pie 0.5; marcha ${CONFIG.nivelesK.K1.cargaMarcha}–${CONFIG.nivelesK.K4.cargaMarcha}; subir 1.1; bajar 1.5; impacto ${CONFIG.nivelesK.K1.cargaImpacto}–${CONFIG.nivelesK.K4.cargaImpacto} × peso</td><td><code>config.js → nivelesK, factoresCarga</code></td></tr>
      <tr><td>Velocidad, cadencia y flexión por nivel K</td><td class="estimado">Valores típicos estimados; la clasificación K no fija números</td><td><code>config.js → nivelesK</code></td></tr>
      <tr><td>Movimientos de cada escenario</td><td class="estimado">Posturas clave interpoladas, no captura de movimiento. Curvas sanas aproximadas de Winter y Perry</td><td><code>escenarios.js, datosMarcha.js</code></td></tr>
      <tr><td>Propiedades del aluminio</td><td>Mínimos de ASTM B221: 6061-T6 240/260 MPa, 7075-T6 485/540 MPa (fluencia/última)</td><td><code>config.js → materiales</code></td></tr>
      <tr><td>Plástico del prototipo</td><td class="estimado">Supuesto: PLA, 20 % de relleno, escala 1:1, fluencia efectiva 22 MPa. Falta que el equipo lo confirme</td><td><code>config.js → materiales.prototipo-3d</code></td></tr>
      <tr><td>Fuerzas y desplazamientos de ISO 10328</td><td class="estimado">Transcritos de literatura secundaria; desplazamientos del nivel P5 para todos los niveles; análisis solo en el plano sagital</td><td><code>config.js → iso10328</code></td></tr>
      <tr><td>Modelo de esfuerzos</td><td>Estática plana con vigas y pernos; sin concentradores salvo en fatiga; no es FEA</td><td><code>cargas.js</code></td></tr>
      <tr><td>Muñón y altura de rodilla</td><td>La rodilla real mide ${fmt(M.ens.alturaTotal / 10, 1)} cm de alto; con muñón de ${fmt(M.seg.munon / 10, 1)} cm y muslo de ${fmt(M.seg.muslo / 10, 1)} cm no cabe completa, así que la simulación iguala la altura de ambas rodillas y acorta el socket</td><td><code>config.js → antropometria</code></td></tr>
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
    <style>.vl-rejilla{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.vl-rejilla>*{min-width:0}.vl.ancho{grid-column:1/-1}.vl{padding:16px;display:grid;gap:10px;align-content:start}.vl h3{font-size:1.15rem}
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
