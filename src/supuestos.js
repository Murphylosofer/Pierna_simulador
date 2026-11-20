// Pestaña "Validación y supuestos": comprobaciones pedidas antes de entregar y lista de todo lo estimado.
import { CONFIG, G } from './config.js';
import { fmt } from './mat.js';
import { revisarInterferencias } from './interferencias.js';
import { verificarSTL } from './ensamble.js';
import { cruz, res, norma } from './mat.js';

let raiz, app_;
const ok = (b) => `<span style="color:var(--${b ? 'ok' : 'mal'});font-weight:600">${b ? '✓ coincide' : '✗ no coincide'}</span>`;
const cerca = (a, b) => Math.abs(a - b) <= Math.max(0.5, Math.abs(b) * 0.01);

function casoDePie(M) {
  const seg = M.seg, d = CONFIG.geometria.ejes.diametro, ens = M.ens, a = CONFIG.geometria.afs1, t = CONFIG.geometria.eslabones.espesor;
  const inst = M.instante('bipedestacion', 0), c = inst.cargas, sol = inst.sol;
  const W = M.usuario.pesoKg * G, R = 0.5 * W, Wd = CONFIG.distal.masaDistalKg * G;
  const xcop = M.ctx.e + (0.45 - 0.25) * seg.pie; // la pierna está vertical: x del centro de presión respecto al centro de referencia
  const Mk = (R * xcop) / 1000;
  const I = sol.cir, { A, C, D, u2 } = sol;
  // 1) Pierna (adaptador inferior + pilón + pie): tres incógnitas, la fuerza en D (2) y la del par trasero F2.
  const E = [0, R - Wd], ME = R * xcop;
  const F2 = (cruz(D, E) - ME) / cruz(res(D, C), u2);
  const fD = [F2 * u2[0] - E[0], F2 * u2[1] - E[1]];
  // 2) Eslabón diagonal: momentos respecto a A ⇒ fuerza del tope.
  const P = c.topeS, n = c.topeN;
  const Fs = cruz(res(D, A), fD) / cruz(res(P, A), n);
  const FA = norma([fD[0] - Fs * n[0], fD[1] - Fs * n[1]]);
  const Mp = (FA / 2) * (t / 2 + a.pared / 2), sp = (32 * Mp) / (Math.PI * d ** 3);
  const brazo = Math.abs(cruz(res(P, A), n));
  return `<ol class="vl-pasos">
    <li>Peso: W = m·g = ${fmt(M.usuario.pesoKg, 0)} × 9.81 = <b>${fmt(W, 1)} N</b>. De pie, cada pierna carga la mitad: R = <b>${fmt(R, 1)} N</b>. Modelo: ${fmt(inst.reaccionN, 1)} N ${ok(cerca(R, inst.reaccionN))}</li>
    <li>Torque respecto al centro de referencia: la línea de carga sube a ${fmt(xcop, 1)} mm por delante ⇒ M = ${fmt(R, 1)} × ${fmt(xcop / 1000, 4)} = <b>${fmt(Mk, 2)} N·m</b> de extensión. Modelo: ${fmt(inst.torqueNm, 2)} N·m ${ok(Math.abs(Mk - inst.torqueNm) < 0.6)} (el modelo resta el peso de la parte distal).</li>
    <li>CIR a 0°: (${fmt(I[0], 1)}, ${fmt(I[1], 1)}) mm, alto y ${fmt(xcop - I[0], 0)} mm detrás de la línea de carga ⇒ <b>estable</b>: el peso empuja la rodilla hacia la extensión, contra el tope escondido.</li>
    <li>Pierna (ΣF = 0, ΣM = 0, incógnitas: fuerza en D y par trasero): F<sub>trasero</sub> = (D × E − M) / ((D − C) × u₂) = <b>${fmt(F2, 1)} N</b>; fuerza en D = <b>${fmt(norma(fD), 1)} N</b>. Modelo: ${fmt(c.F2, 1)} y ${fmt(c.FD, 1)} N ${ok(Math.abs(F2 - c.F2) < 2 && Math.abs(norma(fD) - c.FD) < 2)}</li>
    <li>Eslabón diagonal (momentos respecto a A): la fuerza en D tiene un brazo de ~${fmt(Math.abs(cruz(res(D, A), fD)) / Math.max(norma(fD), 1e-9), 0)} mm y el tope solo ${fmt(brazo, 1)} mm ⇒ F<sub>tope</sub> = <b>${fmt(Fs, 0)} N</b> (${fmt(Fs / R, 1)} veces la carga). Modelo: ${fmt(c.Fs, 0)} N ${ok(cerca(Fs, c.Fs))}</li>
    <li>Eje A (ΣF del eslabón): F<sub>A</sub> = <b>${fmt(FA, 0)} N</b>. Flexión del eje Ø${d}: M = (F/2)·(t/2 + pared/2) = ${fmt(Mp, 0)} N·mm ⇒ σ = 32·M/(π·d³) = <b>${fmt(sp, 0)} MPa</b>. Modelo: ${fmt(c.esfuerzos.pernoA.sigma, 0)} MPa ${ok(Math.abs(sp - c.esfuerzos.pernoA.sigma) < 1)}</li>
    <li>Factor de seguridad del modelo: <b>${c.fs == null ? 'pendiente' : fmt(Math.min(c.fs, 99), 2)}</b> (pieza crítica: ${c.critica || '—'}). ${c.fs != null && c.fs < 1.5 ? '<strong style="color:var(--mal)">El eje A queda corto por la palanca tan pequeña del tope (ver el reporte).</strong>' : ''}</li></ol>`;
}

// Geometría tomada de los STL de SolidWorks y lo que se encontró al moverla.
function diagnostico(M) {
  const g = CONFIG.geometria, ens = M.ens, el = g.eslabones, v = verificarSTL(), ch = M.choques, tp = ens.tope, to = g.topeOculto;
  return `<section class="panel vl ancho"><h3>0. Geometría de los STL de SolidWorks (Ensamblaje1)</h3>
    <p>La vista 3D dibuja los STL del equipo tal cual: sin escalar, sin simplificar y sin mover medidas. Cada pieza se mueve con su cuerpo del mecanismo. Los centros de los cuatro ejes medidos en los STL coinciden con el mecanismo resuelto a ${fmt(v.max, 3)} mm o menos. Los cuatro eslabones son la misma pieza de ${el.centros} mm entre centros: el par <strong>diagonal</strong> (A–D) va por dentro de las paredes con ejes de ${g.ejes.corto.largo} mm, y el par <strong>trasero</strong> (B–C) por fuera con ejes de ${g.ejes.largo.largo} mm.</p>
    ${ch.lista.length ? `<div class="aviso peligro"><span><strong>Con los STL tal cual, la rodilla solo se dobla ${fmt(ch.flexionLibre, 1)}° antes de chocar.</strong> ${ch.lista.map((x) => `${x.par}: desde ${fmt(x.desde, 1)}°`).join('; ')}. No se corrigió (regla del equipo: avisar, no modificar). La simulación sigue el movimiento completo y pinta en rojo las piezas que chocan.</span></div>` : '<div class="aviso ok"><span>Sin choques de 0° a 140°.</span></div>'}
    <p style="margin-top:10px"><strong>Única modificación: tope de extensión escondido.</strong> Taco de ${to.fondo} mm maquinado bajo la placa del AFS1, entre las dos paredes, delante del eje A. A ${to.anguloGrados}° el canto delantero de los eslabones diagonales apoya en él a lo largo de ${fmt(tp.largoApoyo, 1)} mm, con aristas redondeadas R${to.radio}. Queda ${fmt(tp.margenOculto, 2)} mm por encima del borde inferior de las paredes, así que por fuera no se ve. Se quitó el tornillo M8 que hacía de tope en la versión anterior, y también el chaflán que se había agregado a la placa.</p>
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
      <section class="panel vl"><h3>1. Cinemática y choques en 0°–135°</h3>
        <div class="aviso ${v.ok ? 'ok' : 'peligro'}"><span><strong>${v.ok ? 'El lazo no se traba.' : 'Falla.'}</strong> Se resolvió el cierre de lazo cada 0.25° de 0° a ${v.hasta}°. Los choques entre piezas se revisan aparte (abajo).</span></div>
        <ul><li>El lazo siempre cierra: discriminante mínimo ${fmt(v.minDisc, 1)} mm (debe ser &gt; 0).</li>
        <li>Las barras nunca quedan paralelas: |sen| mínimo ${fmt(v.minPar, 2)} (sin punto muerto).</li>
        <li>Sin saltos de rama: el eje A se mueve como máximo ${fmt(v.saltoMax, 2)} mm por paso.</li>
        <li>${(() => { const r = Object.entries(revisarInterferencias(135, 0.05)); return r.length ? `<strong style="color:var(--mal)">Choques de los STL (no corregidos):</strong> ${r.map(([k, x]) => `${k} (${x.desde}°–${x.hasta}°, hasta ${fmt(x.max, 1)} mm de encimado)`).join('; ')}. Revisado también con las mallas STL completas: primer contacto a 53.3° y a 90.1°.` : 'Sin interferencias: ningún par de piezas se encima en todo el rango.'; })()}</li>
        <li>${v.cruceDesde == null ? 'Los pares diagonal y trasero no se cruzan en la vista lateral.' : `A partir de ${fmt(v.cruceDesde, 0)}° los pares diagonal y trasero se cruzan <em>solo en la vista lateral</em>: van en planos distintos (diagonal por dentro, trasero por fuera), así que entre ellos no se tocan.`}</li></ul></section>
      <section class="panel vl"><h3>3. Nivel ISO 10328 para el peso elegido</h3>
        <p>Para ${fmt(M.usuario.pesoKg, 0)} kg corresponde el nivel <strong>${nivel}</strong>${datos ? ` (usuarios de hasta ${datos.masaKg} kg). Fuerzas usadas, condición I / II: prueba ${datos.I.prueba} / ${datos.II.prueba} N, última ${datos.I.ultimaSup} / ${datos.II.ultimaSup} N, cíclica ${datos.I.ciclica} / ${datos.II.ciclica} N, ${fmt(iso.ciclos / 1e6, 0)} millones de ciclos.` : '. Sus fuerzas no están cargadas en la simulación.'}</p>
        <p class="ayuda">Paciente de diseño de ${d.masaPacienteKg} kg ⇒ P4. Capacidad de diseño de ${fmt(M.capacidadDisenoKg, 1)} kg ⇒ P5. El resultado de cada nivel está en la pestaña Normas. ${app_.chipNorma('iso-10328', 'Nivel ' + nivel)}</p></section>
      <section class="panel vl"><h3>2a. Caso a mano: ${fmt(M.usuario.pesoKg, 0)} kg de pie</h3>${casoDePie(M)}</section>
      <section class="panel vl"><h3>2b. Caso a mano: ${fmt(M.usuario.pesoKg, 0)} kg en impacto</h3>${casoImpacto(M)}</section>
    </div>
    <h3 class="nm-grupo" style="margin-top:28px">4. Supuestos que se pueden corregir</h3>
    <div class="panel tabla-desliza"><table><thead><tr><th>Supuesto</th><th>Valor usado</th><th>Dónde se cambia</th></tr></thead><tbody>
      <tr><td>Geometría de las piezas</td><td>Real: STL de SolidWorks (Ensamblaje1) sin modificar; centros de ejes dentro de 0.01 mm</td><td><code>config.js → geometria</code></td></tr>
      <tr><td>Tope de extensión escondido</td><td class="estimado">Taco de ${CONFIG.geometria.topeOculto.fondo} mm bajo la placa del AFS1, R${CONFIG.geometria.topeOculto.radio}, apoyo a ${CONFIG.geometria.topeOculto.anguloGrados}°. Propuesto por la simulación: falta dibujarlo en SolidWorks</td><td><code>config.js → geometria.topeOculto</code></td></tr>
      <tr><td>Material de los ejes</td><td>6061-T6, igual que el reporte de SolidWorks (antes se suponía acero)</td><td><code>config.js → geometria.ejes</code></td></tr>
      <tr><td>Retención de los ejes</td><td class="estimado">No está en SolidWorks: hacen falta anillos o prisioneros</td><td>—</td></tr>
      <tr><td>Peso de la rodilla</td><td>${M.masa ? fmt(M.masa.totalG, 0) + ' g' : 'pendiente'}: masas del reporte de SolidWorks (${CONFIG.diseno.pesoRodillaG} g) + ${M.masa ? fmt(M.masa.topeG, 0) : '—'} g del tope escondido${M.masa && !M.masa.deSolidWorks ? ', escalado por densidad al material elegido' : ''}</td><td><code>config.js → solidworks.masasKg</code></td></tr>
      <tr><td>Pistón neumático</td><td class="estimado">Minicilindro Ø16 entre el eje B (AFS1) y el eje D (adaptador inferior); falta confirmar con los nombres nuevos de los ejes; presión supuesta de 6 bar</td><td><code>config.js → piston</code></td></tr>
      <tr><td>Centro de referencia de la rodilla</td><td class="estimado">20 mm detrás del eje del pilón y 55 mm sobre el adaptador inferior; los torques se miden respecto a ese punto</td><td><code>config.js → geometria.origenRodillaY</code></td></tr>
      <tr><td>Torque de referencia de 274.2 N·m</td><td>Límite de diseño del equipo. Equivale a 65 kg × 9.81 × 0.43 m; los torques de la marcha simulada son mucho menores</td><td><code>config.js → diseno</code></td></tr>
      <tr><td>Factores de carga por actividad</td><td>De pie 0.5; marcha ${CONFIG.nivelesK.K1.cargaMarcha}–${CONFIG.nivelesK.K4.cargaMarcha}; subir 1.1; bajar 1.5; impacto ${CONFIG.nivelesK.K1.cargaImpacto}–${CONFIG.nivelesK.K4.cargaImpacto} × peso</td><td><code>config.js → nivelesK, factoresCarga</code></td></tr>
      <tr><td>Velocidad, cadencia y flexión por nivel K</td><td class="estimado">Valores típicos estimados; la clasificación K no fija números</td><td><code>config.js → nivelesK</code></td></tr>
      <tr><td>Movimientos de cada escenario</td><td class="estimado">Posturas clave interpoladas, no captura de movimiento. Curvas sanas aproximadas de Winter y Perry</td><td><code>escenarios.js, datosMarcha.js</code></td></tr>
      <tr><td>Propiedades del aluminio</td><td>6061-T6: las del reporte de SolidWorks (275/310 MPa, E = 69 GPa). <span class="estimado">7075-T6: tablas (485/540 MPa), sin estudio de SolidWorks</span></td><td><code>config.js → materiales</code></td></tr>
      <tr><td>Plástico del prototipo</td><td class="estimado">Supuesto: PLA, 20 % de relleno, escala 1:1, fluencia efectiva 22 MPa. Falta que el equipo lo confirme</td><td><code>config.js → materiales.prototipo-3d</code></td></tr>
      <tr><td>Fuerzas y desplazamientos de ISO 10328</td><td class="estimado">Transcritos de literatura secundaria; desplazamientos del nivel P5 para todos los niveles; análisis solo en el plano sagital</td><td><code>config.js → iso10328</code></td></tr>
      <tr><td>Modelo de esfuerzos</td><td>Estática plana con vigas y pernos, con el tope escondido; no es FEA. Los resultados FEA reales son los de SolidWorks (pestaña SolidWorks)</td><td><code>cargas.js</code></td></tr>
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
      <tr><td>Fuerzas en las barras y el tope</td><td>Sin tope: F₁·u₁ + F₂·u₂ = R (barras de dos fuerzas). Con tope: pierna (fuerza en D y F₂) y luego ΣM<sub>A</sub> = 0 en el eslabón diagonal para F<sub>tope</sub></td><td>${app_.chipNorma('beer')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Peso e inercia en balanceo</td><td>F = −m·(g + a), principio de D'Alembert</td><td>${app_.chipNorma('winter')}</td><td><code>modelo.js</code></td></tr>
      <tr><td>Cortante en pernos</td><td>τ = F / (2 · π·d²/4), cortante doble</td><td>${app_.chipNorma('shigley')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Flexión del perno</td><td>M = (F/2)·(t/2 + pared/2); σ = 32·M / (π·d³)</td><td>${app_.chipNorma('shigley')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Barras laterales</td><td>Sección neta σ = N / ((w − d)·t); aplastamiento σ = N / (d·t); con tope, flexión σ = 6·M / (t·w²)</td><td>${app_.chipNorma('shigley')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Placa del AFS1</td><td>σ = M·c / I con M = F·L/4 (claro entre paredes) y la sección real con la ranura</td><td>${app_.chipNorma('beer')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Base del adaptador inferior</td><td>σ = 6·M / (b·t²), voladizo de la pared al cilindro</td><td>${app_.chipNorma('beer')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Contacto en el tope escondido</td><td>Presión triangular sobre los dos cantos: σ<sub>pico</sub> = 2·F / (2·t·L<sub>apoyo</sub>)</td><td><strong>Criterio propio</strong></td><td><code>cargas.js</code></td></tr>
      <tr><td>Escalado de SolidWorks</td><td>Estudio lineal ⇒ σ = k·F con k = 87.81/736 = 262.5/2200 = 0.1193 MPa/N</td><td>Reporte de SolidWorks</td><td><code>cargas.js → solidworksPara</code></td></tr>
      <tr><td>Factor de seguridad</td><td>FS = fluencia / esfuerzo máximo; cortante equivalente √3·τ (von Mises)</td><td>${app_.chipNorma('shigley')}${app_.chipNorma('astm-b221-b211')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Fatiga</td><td>1/n = σ<sub>a</sub>/S<sub>e</sub> + σ<sub>m</sub>/S<sub>ut</sub> (Goodman), con K<sub>t</sub> = ${CONFIG.iso10328.concentracionEsfuerzo} en el barreno</td><td>${app_.chipNorma('shigley')}${app_.chipNorma('iso-10328')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Prueba ISO simulada</td><td>Fuerzas de prueba, última y cíclica sobre la línea de carga de talón y de antepié</td><td>${app_.chipNorma('iso-10328')}</td><td><code>cargas.js</code></td></tr>
      <tr><td>Peso de la rodilla</td><td>Masas del reporte de SolidWorks; para otro material m = (m<sub>SW</sub>/ρ<sub>6061</sub>) × ρ</td><td>Reporte de SolidWorks</td><td><code>piezas.js</code></td></tr>
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
