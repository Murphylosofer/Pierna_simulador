// Uso: node scripts/interferencias.mjs  → lista los pares de piezas que chocan entre 0° y 135°.
// Los choques que vienen de los STL del equipo se reportan, pero no se corrigen (regla: avisar, no modificar).
// Falla solo si choca el tope escondido, que es lo único que agrega la simulación.
import { revisarInterferencias, limitesChoque } from '../src/interferencias.js';

const r = revisarInterferencias(135, 0.05);
const lim = limitesChoque();
console.log(Object.keys(r).length ? r : 'Sin interferencias entre piezas de 0° a 135°');
console.log('Primer contacto por pieza (paso 0.1°):', lim.lista.map((x) => `${x.par} a ${x.desde}°`).join('; ') || 'ninguno');
const delTope = Object.entries(r).filter(([, v]) => v.tope);
if (delTope.length) console.error('El tope escondido choca:', delTope);
process.exit(delTope.length ? 1 : 0);
