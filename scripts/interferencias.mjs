// Uso: node scripts/interferencias.mjs  → lista los pares de piezas que chocan entre 0° y 135°.
import { revisarInterferencias } from '../src/interferencias.js';

const r = revisarInterferencias();
console.log(Object.keys(r).length ? r : 'Sin interferencias entre piezas de 0° a 135°');
process.exit(Object.keys(r).length ? 1 : 0);
