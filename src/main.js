import { CONFIG } from './config.js';
import { NORMAS } from './normas.js';

// Página base del repositorio. La simulación (PROMPT.md) se construye sobre este punto de entrada.
const { proyecto, diseno } = CONFIG;
document.querySelector('#app').innerHTML = `
  <main class="inicio">
    <h1>${proyecto.titulo}</h1>
    <p>${proyecto.escuela} · Grupo ${proyecto.grupo} · ${proyecto.evento}</p>
    <p>Repositorio configurado. La simulación está en construcción.</p>
    <dl>
      <dt>Paciente de diseño</dt><dd>${diseno.masaPacienteKg} kg</dd>
      <dt>Factor de seguridad</dt><dd>${diseno.factorSeguridad}×</dd>
      <dt>Capacidad de diseño</dt><dd>${diseno.masaPacienteKg * diseno.factorSeguridad} kg</dd>
      <dt>Torque de referencia</dt><dd>${diseno.torqueReferenciaNm} N·m</dd>
      <dt>Rango de flexión</dt><dd>${diseno.flexionMinGrados}° a ${diseno.flexionMaxGrados}°</dd>
      <dt>Normas registradas</dt><dd>${NORMAS.length}</dd>
    </dl>
  </main>`;
