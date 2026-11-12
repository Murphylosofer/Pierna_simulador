// Estudio cinemático del pistón neumático propuesto por el equipo (especificaciones_del_pistón.md).
// Calcula la longitud entre ojillos en todo el rango de flexión y la compara con el minicilindro elegido.
// Es un estudio en el plano sagital: todavía no se dibuja en 3D porque la geometría estimada de los
// adaptadores es maciza al centro, mientras que los planos reales (AFS1, adaptador femoral inferior)
// son horquillas en "U" con el canal central libre.
import { CONFIG } from './config.js';
import { aMundo, res, norma, cruz, unit, fmt } from './mat.js';

export function estudioPiston(mec) {
  const p = CONFIG.piston;
  const en = (g) => {
    const s = mec.resolver(g), sup = aMundo(s.muslo, p.anclajeSuperior), inf = p.anclajeInferior, d = res(sup, inf), L = norma(d);
    // Brazo de palanca de la fuerza del pistón respecto al CIR (mm): con él se obtiene el par sobre la rodilla.
    const brazo = s.cir ? Math.abs(cruz(res(s.cir, inf), unit(d))) : 0;
    return { theta: g, sup, inf, L, brazo, sol: s };
  };
  const curva = [];
  for (let g = 0; g <= CONFIG.diseno.flexionMaxGrados; g += 1) curva.push(en(g));
  const Ls = curva.map((c) => c.L), Lmin = Math.min(...Ls), Lmax = Math.max(...Ls), carrera = Lmax - Lmin;
  const area = (Math.PI * p.diametroEmbolo ** 2) / 4; // mm²
  const fuerza = p.presionMPa * area; // N, al extender
  const modelo = p.modelos.find((m) => m.carrera >= carrera) || null;
  return {
    en, curva, Lmin, Lmax, carrera, area, fuerza, modelo,
    cabeRetraido: Lmin >= p.retraidoMin && Lmin <= p.retraidoMax,
    cabeCanal: p.diametroExterior <= CONFIG.medidasReales.canalCentral,
    parMaxNm: Math.max(...curva.map((c) => (fuerza * c.brazo) / 1000)),
  };
}

// Diagrama sagital del mecanismo con el pistón, para el ángulo dado.
export function diagramaPiston(mec, theta) {
  const E = estudioPiston(mec), a = E.en(theta), s = a.sol, W = 380, H = 430, k = 2.1;
  const X = (q) => [W / 2 + 30 + q[0] * k, 250 - q[1] * k];
  const pt = (q) => { const z = X(q); return `${z[0].toFixed(1)} ${z[1].toFixed(1)}`; };
  const u = unit(res(a.sup, a.inf)), cuerpo = CONFIG.piston.retraidoMin - 22; // largo aproximado de la camisa
  const finCamisa = [a.inf[0] + u[0] * cuerpo, a.inf[1] + u[1] * cuerpo];
  const ojo = (q, t, dx) => { const z = X(q); return `<circle cx="${z[0].toFixed(1)}" cy="${z[1].toFixed(1)}" r="5" fill="var(--superficie)" stroke="var(--serie-sana)" stroke-width="2"/><text x="${(z[0] + dx).toFixed(1)}" y="${(z[1] + 4).toFixed(1)}" text-anchor="${dx < 0 ? 'end' : 'start'}" class="dg-m">${t}</text>`; };
  const pct = E.carrera > 0 ? ((a.L - E.Lmin) / E.carrera) * 100 : 0;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mecanismo de cuatro barras con el pistón neumático entre sus dos anclajes.">
    <path d="M${pt(s.D)}L${pt(s.A)}M${pt(s.C)}L${pt(s.B)}" stroke="var(--tinta)" stroke-width="5" stroke-linecap="round" opacity=".45"/>
    <path d="M${pt(s.A)}L${pt(s.B)}L${pt(aMundo(s.muslo, [0, 100]))}z" fill="var(--guinda-suave)" stroke="var(--tinta)" stroke-width="1.5" opacity=".8"/>
    <path d="M${pt(s.C)}L${pt(s.D)}L${pt([14, -55])}z" fill="var(--hundido)" stroke="var(--tinta)" stroke-width="1.5"/>
    <path d="M${pt(a.inf)}L${pt(finCamisa)}" stroke="var(--serie-sana)" stroke-width="${(CONFIG.piston.diametroExterior * k).toFixed(0)}" stroke-linecap="butt" opacity=".35"/>
    <path d="M${pt(a.inf)}L${pt(finCamisa)}" stroke="var(--serie-sana)" stroke-width="2"/>
    <path d="M${pt(finCamisa)}L${pt(a.sup)}" stroke="var(--serie-sana)" stroke-width="${(6 * k).toFixed(0)}" stroke-linecap="round"/>
    ${ojo(a.sup, 'anclaje superior', -10)}${ojo(a.inf, 'anclaje inferior', -10)}
    <text x="14" y="22" class="dg-e">θ ${fmt(theta, 0)}° · ${fmt(a.L, 1)} mm entre ojillos</text>
    <text x="14" y="40" class="dg-m">vástago fuera: ${fmt(a.L - E.Lmin, 1)} mm (${fmt(pct, 0)} % de la carrera usada)</text>
  </svg>`;
}
