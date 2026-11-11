// Cinemática real del mecanismo de 4 barras: ecuación de cierre de lazo.
// Marco de la pierna (base) fijo; el cuerpo superior (muslo) gira +θ (antihorario, x anterior).
//   D + L1·u(φ1) = A        A + R(θ)·(B0 − A0) = B        |B − C| = L2
// Dado θ, A queda en la intersección de dos círculos: centro D radio L1, y centro (C − w) radio L2,
// con w = R(θ)(B0 − A0). Se elige la rama continua desde θ = 0.
import { rad, rot, sum, res, norma, cruz, unit } from './mat.js';

export function crearMecanismo(m) {
  const { A: A0, B: B0, C, D } = m;
  const L1 = norma(res(A0, D));
  const L2 = norma(res(B0, C));
  const acoplador = res(B0, A0);

  function ramas(theta) {
    const w = rot(acoplador, theta);
    const c2 = res(C, w);
    const dv = res(c2, D);
    const d = norma(dv);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h2 = L1 * L1 - a * a;
    if (h2 < 0 || d < 1e-9) return null;
    const h = Math.sqrt(h2);
    const mx = D[0] + (a * dv[0]) / d, my = D[1] + (a * dv[1]) / d;
    return { w, h, s1: [mx - (h * dv[1]) / d, my + (h * dv[0]) / d], s2: [mx + (h * dv[1]) / d, my - (h * dv[0]) / d] };
  }

  // Tabla por continuación cada 0.5° para fijar la rama.
  const PASO = 0.5, MAX = 140;
  const tabla = [];
  let previo = A0;
  for (let g = 0; g <= MAX + 1e-9; g += PASO) {
    const r = ramas(rad(g));
    if (!r) { tabla.push(null); continue; }
    previo = norma(res(r.s1, previo)) < norma(res(r.s2, previo)) ? r.s1 : r.s2;
    tabla.push(previo);
  }

  function resolver(thetaGrados) {
    const g = Math.min(MAX, Math.max(0, thetaGrados));
    const theta = rad(g);
    const r = ramas(theta);
    const cerca = tabla[Math.round(g / PASO)] || A0;
    if (!r) return { valido: false, theta: g, A: cerca, B: sum(cerca, rot(acoplador, theta)), C, D, cir: null };
    const A = norma(res(r.s1, cerca)) < norma(res(r.s2, cerca)) ? r.s1 : r.s2;
    const B = sum(A, r.w);
    const u1 = unit(res(A, D)), u2 = unit(res(B, C));
    const den = cruz(u1, u2);
    let cir = null;
    if (Math.abs(den) > 1e-9) {
      const t = cruz(res(C, D), u2) / den;
      cir = [D[0] + t * u1[0], D[1] + t * u1[1]];
    }
    return {
      valido: true, theta: g, A, B, C, D, cir, u1, u2,
      phi1: Math.atan2(u1[1], u1[0]), phi2: Math.atan2(u2[1], u2[0]),
      discriminante: r.h, paralelismo: den,
      // marco del muslo respecto a la pierna: p_pierna = R(θ)(p_muslo0 − A0) + A
      muslo: { ang: theta, t: res(A, rot(A0, theta)) },
    };
  }

  // ¿Se cruzan los segmentos de las barras en la proyección lateral?
  const cruzan = (s) => {
    const o = (p, q, r) => Math.sign(cruz(res(q, p), res(r, p)));
    return o(s.D, s.A, s.C) !== o(s.D, s.A, s.B) && o(s.C, s.B, s.D) !== o(s.C, s.B, s.A);
  };

  function validar(hasta = 135, paso = 0.25) {
    let minDisc = Infinity, minPar = Infinity, cruceDesde = null, saltoMax = 0, ok = true;
    let prev = null;
    for (let g = 0; g <= hasta + 1e-9; g += paso) {
      const s = resolver(g);
      if (!s.valido || !s.cir) { ok = false; break; }
      minDisc = Math.min(minDisc, s.discriminante);
      minPar = Math.min(minPar, Math.abs(s.paralelismo));
      if (prev) saltoMax = Math.max(saltoMax, norma(res(s.A, prev)));
      prev = s.A;
      if (cruceDesde === null && cruzan(s)) cruceDesde = g;
    }
    // Sin trabarse: el lazo cierra en todo el rango (disc > 0), las barras nunca quedan paralelas
    // (|sen| > 0.15 ⇒ no hay punto muerto) y la rama es continua (sin saltos).
    return { ok: ok && minDisc > 1 && minPar > 0.15 && saltoMax < 2, minDisc, minPar, saltoMax, cruceDesde, hasta };
  }

  const centroda = (hasta = 135, paso = 1) => {
    const pts = [];
    for (let g = 0; g <= hasta + 1e-9; g += paso) pts.push({ theta: g, cir: resolver(g).cir });
    return pts;
  };

  return { L1, L2, L3: norma(acoplador), L0: norma(res(C, D)), resolver, validar, centroda, cruzan, A0, B0, C, D };
}
