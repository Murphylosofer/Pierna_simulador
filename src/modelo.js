// Modelo completo: usuario → segmentos → postura → mecanismo → cargas. Sin dependencias del DOM.
import { CONFIG, G } from './config.js';
import { segmentos } from './antropometria.js';
import { construirPiezas, masaRodilla } from './piezas.js';
import { resolverCargas, pruebaISO, nivelParaMasa } from './cargas.js';
import { escenario, faseEn } from './escenarios.js';
import { rad, rot, sum, res, esc, aMundo, aLocal, dirLocal, norma } from './mat.js';

export function crearModelo(usuario, materialId) {
  const seg = segmentos(usuario);
  const { piezas, ejes, mec } = construirPiezas();
  const mat = CONFIG.materiales[materialId];
  const K = CONFIG.nivelesK[usuario.nivelK];
  const e = CONFIG.diseno.desplazamientoPosteriorEjeMm;
  const peso = usuario.pesoKg * G;
  const hTp = CONFIG.distal.pieAlturaTobillo;
  // Longitud rodilla → unión con el pie, para que ambas rodillas queden a la misma altura.
  const Lps = seg.pierna + seg.alturaTobillo - hTp;
  const ctx = { seg, K, Lm: seg.muslo, Lp: seg.pierna, hT: seg.alturaTobillo, Lf: seg.pie, Lps, e };
  const cache = new Map();

  function posturaBase(escn, t) {
    const s = escn.estado(t, ctx);
    const sol = mec.resolver(s.kP);
    // --- prótesis ---
    const angM = rad(s.thP);
    const H0 = [s.px, 0];
    const mMuslo = { ang: angM, t: res(H0, rot([e, seg.muslo], angM)) }; // la cadera está en (e, Lm) del marco del muslo
    const th = rad(sol.theta);
    const mPierna = { ang: angM - th, t: aMundo(mMuslo, rot(esc(sol.muslo.t, -1), -th)) };
    const tobP = aMundo(mPierna, [e, -Lps]);
    const pitchP = mPierna.ang * (1 - s.planoP);
    const pieP = [[-0.25 * seg.pie, -hTp], [0.75 * seg.pie, -hTp]].map((p) => sum(tobP, rot(p, pitchP)));
    // --- pierna sana ---
    const aS = rad(s.thS), aSp = rad(s.thS - s.kS);
    const rodS = sum(H0, [seg.muslo * Math.sin(aS), -seg.muslo * Math.cos(aS)]);
    const tobS = sum(rodS, [seg.pierna * Math.sin(aSp), -seg.pierna * Math.cos(aSp)]);
    const pitchS = rad(s.pieS);
    const pieS = [[-0.25 * seg.pie, -seg.alturaTobillo], [0.75 * seg.pie, -seg.alturaTobillo]].map((p) => sum(tobS, rot(p, pitchS)));
    // --- apoyo: la pelvis sube lo necesario para que ningún pie atraviese el piso ---
    const piso = escn.piso || (() => 0);
    const py = Math.max(...[...pieP, ...pieS].map((p) => piso(p[0]) - p[1]));
    const sube = (p) => [p[0], p[1] + py];
    mMuslo.t = sube(mMuslo.t); mPierna.t = sube(mPierna.t);
    return {
      s, sol, mMuslo, mPierna, cadera: [s.px, py], tobP: sube(tobP), pitchP, pieP: pieP.map(sube),
      rodS: sube(rodS), tobS: sube(tobS), pitchS, pieS: pieS.map(sube),
      apoyoP: pieP.some((p) => Math.abs(piso(p[0]) - (p[1] + py)) < 4),
    };
  }

  function instante(escId, t) {
    const escn = escenario(escId);
    const P = posturaBase(escn, t);
    const { s, sol, mPierna } = P;
    const externas = [];
    // Reacción del suelo en el centro de presión de la prótesis.
    const cop = sum(P.pieP[0], esc(res(P.pieP[1], P.pieP[0]), s.grf.cop));
    const Fy = Math.max(0, s.grf.f) * peso;
    const grf = { p: cop, F: [s.grf.fx * Fy, Fy] };
    if (Fy > 0.5) externas.push({ p: aLocal(mPierna, cop), F: dirLocal(mPierna, grf.F) });
    // Peso e inercia de la parte distal (base + pilón + pie), por D'Alembert.
    const md = CONFIG.distal.masaDistalKg;
    const comLocal = [0, -0.55 * Lps];
    const T = escn.duracion(ctx), dt = 0.01;
    const com = (tt) => { const Q = posturaBase(escn, escn.ciclico ? (tt + 1) % 1 : Math.min(1, Math.max(0, tt))); const c = aMundo(Q.mPierna, comLocal); return [c[0] - (escn.cinta ? Q.s.px : 0), c[1]]; };
    const c0 = com(t - dt), c1 = com(t), c2 = com(t + dt);
    const h = dt * T * 1000; // mm·s → usar mm/s²; fuerza en N = kg·(mm/s²)/1000
    const acel = [(c2[0] - 2 * c1[0] + c0[0]) / (h * h) * 1e3, (c2[1] - 2 * c1[1] + c0[1]) / (h * h) * 1e3]; // m/s²
    const lim = (v) => Math.max(-25, Math.min(25, v)); // acota picos numéricos en los cambios de fase
    const Fin = [-md * lim(acel[0]), -md * (G + lim(acel[1]))];
    externas.push({ p: comLocal, F: dirLocal(mPierna, Fin) });

    const cargas = resolverCargas(sol, externas, mat);
    const cargado = Fy > 0.03 * peso;
    return {
      t, escenario: escn, fase: faseEn(escn, t), postura: P, sol, cargas, grf, cargado,
      theta: sol.theta, torqueNm: cargas.ME / 1000, torqueCirNm: cargas.MCir / 1000,
      reaccionN: Fy, reaccionPC: Math.max(0, s.grf.f), fs: cargas.fs == null ? null : Math.min(cargas.fs, 99), estable: cargas.estable,
      cirMundo: sol.cir ? aMundo(mPierna, sol.cir) : null,
    };
  }

  function ciclo(escId, N = 100) {
    const k = `${escId}|${N}`;
    if (cache.has(k)) return cache.get(k);
    const m = [];
    for (let i = 0; i <= N; i++) {
      const r = instante(escId, i / N);
      m.push({ t: i / N, theta: r.theta, torque: r.torqueNm, reaccionPC: r.reaccionPC, reaccionN: r.reaccionN, fs: r.fs, estable: r.estable, cargado: r.cargado, F1: r.cargas.F1, F2: r.cargas.F2 });
    }
    const res_ = { muestras: m, torqueMax: Math.max(...m.map((x) => Math.abs(x.torque))), fsMin: Math.min(...m.map((x) => x.fs ?? Infinity)), reaccionMax: Math.max(...m.map((x) => x.reaccionN)) };
    cache.set(k, res_);
    return res_;
  }

  return {
    usuario, seg, piezas, ejes, mec, mat, materialId, K, ctx, peso, Lps,
    instante, ciclo, escenario,
    validacion: mec.validar(),
    centroda: mec.centroda(),
    masa: masaRodilla(materialId),
    iso: () => pruebaISO(mec, mat),
    nivelISO: nivelParaMasa(usuario.pesoKg),
    capacidadDisenoKg: CONFIG.diseno.masaPacienteKg * CONFIG.diseno.factorSeguridad,
  };
}
