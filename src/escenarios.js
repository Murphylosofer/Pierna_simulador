// Escenarios de uso. Cada uno devuelve, para t ∈ [0,1], la postura sagital y la carga sobre la prótesis.
//   thP/thS: ángulo del muslo (° desde la vertical, + = rodilla al frente)   kP/kS: flexión de rodilla (°)
//   planoP: 0..1, cuánto se asienta plano el pie SACH (deformación de talón y quilla)
//   pieS: inclinación del pie sano (°, + = puntas arriba)   grf: f (×peso corporal), cop (0 talón → 1 punta), fx (Fx/Fy)
import { curva, grados, limitar } from './mat.js';
import { NORMATIVA } from './datosMarcha.js';

const suave = (x) => { const s = limitar(x, 0, 1); return s * s * (3 - 2 * s); };
const beta = (ctx, k) => grados(Math.atan2(ctx.Lp * Math.sin((k * Math.PI) / 180), ctx.Lm + ctx.Lp * Math.cos((k * Math.PI) / 180)));
const ALTURA_ESCALON = 170; // mm, huella normal de escalera

const marcha = {
  id: 'marcha', nombre: 'Ciclo de marcha', icono: 'marcha',
  descripcion: 'Contacto de talón, apoyo, despegue y balanceo. La velocidad depende del nivel K.',
  normas: ['niveles-k', 'winter', 'perry'], cinta: true, ciclico: true,
  duracion: (ctx) => 120 / ctx.K.cadenciaPpm,
  fases: NORMATIVA.fases,
  estado(t, ctx) {
    const L = ctx.Lm + ctx.Lp;
    const S = Math.min(ctx.K.velocidadMs * (120 / ctx.K.cadenciaPpm) * 1000, 1.45 * L);
    const pico = ctx.K.flexionBalanceo;
    const fi = (u) => grados(Math.asin(limitar(((0.28 - u) * S) / L, -0.95, 0.95)));
    const pierna = (u) => (u <= 0.6 ? fi(u) : fi(0.6) + (fi(0) - fi(0.6)) * suave((u - 0.6) / 0.4));
    const kP = curva([[0, 0], [0.45, 0], [0.52, 6], [0.6, 0.62 * pico], [0.7, pico], [0.8, 0.7 * pico], [0.9, 0.2 * pico], [0.97, 0], [1, 0]])(t);
    const ts = (t + 0.5) % 1;
    const kS = NORMATIVA.angulo(ts * 100);
    const pieS = curva([[0, 14], [0.08, 0], [0.4, 0], [0.5, -15], [0.6, -38], [0.75, -15], [0.9, 8], [1, 14]])(ts);
    const planoP = curva([[0, 0], [0.1, 1], [0.38, 1], [0.5, 0.35], [0.6, 0], [1, 0]])(t);
    const f = (ctx.K.cargaMarcha / 1.12) * NORMATIVA.reaccion(t * 100);
    return {
      px: S * t, thP: pierna(t) + beta(ctx, kP), kP, planoP, thS: pierna(ts) + beta(ctx, kS), kS, pieS,
      tronco: 3, brazos: pierna(t) * 0.6,
      grf: { f, cop: curva([[0, 0.05], [0.1, 0.3], [0.3, 0.5], [0.5, 0.8], [0.6, 0.95], [1, 0.95]])(t), fx: curva([[0, -0.12], [0.12, -0.15], [0.3, 0], [0.5, 0.15], [0.6, 0.05], [1, 0]])(t) },
    };
  },
};

const bipedestacion = {
  id: 'bipedestacion', nombre: 'Bipedestación', icono: 'pie',
  descripcion: 'De pie, quieto. El peso se reparte entre ambos pies.',
  normas: ['iso-10328'], ciclico: true, duracion: () => 4,
  fases: [{ nombre: 'Apoyo bipodal', desde: 0, hasta: 1 }],
  estado(t) {
    const vaiven = Math.sin(t * 2 * Math.PI);
    return { px: 0, thP: 0, kP: 0, planoP: 1, thS: 0, kS: 0, pieS: 0, tronco: 0, brazos: 0,
      grf: { f: 0.5 + 0.03 * vaiven, cop: 0.45 + 0.05 * vaiven, fx: 0 } };
  },
};

const sentarse = {
  id: 'sentarse', nombre: 'Sentarse y levantarse', icono: 'silla',
  descripcion: 'Baja hasta la silla, recoge los pies (flexión de 135°) y se levanta.',
  normas: ['niveles-k', 'iso-10328'], silla: true, duracion: (ctx) => 7 / (0.7 + 0.3 * ctx.K.velocidadMs),
  fases: [{ nombre: 'Descenso', desde: 0, hasta: 0.35 }, { nombre: 'Sentado', desde: 0.35, hasta: 0.65 }, { nombre: 'Ascenso', desde: 0.65, hasta: 1 }],
  estado(t, ctx) {
    const th = curva([[0, 0], [0.05, 0], [0.35, 90], [0.65, 90], [0.95, 0], [1, 0]])(t);
    const recoge = curva([[0, 0], [0.38, 0], [0.48, 45], [0.52, 45], [0.62, 0], [1, 0]])(t);
    return {
      px: -ctx.Lm * Math.sin((th * Math.PI) / 180), thP: th, kP: th + recoge, planoP: 1 - (recoge / 45) * 0.8,
      thS: th, kS: th + recoge * 0.5, pieS: -recoge * 0.4,
      tronco: curva([[0, 0], [0.2, 35], [0.35, 5], [0.65, 5], [0.8, 35], [1, 0]])(t), brazos: 0,
      grf: { f: curva([[0, 0.5], [0.05, 0.5], [0.2, 0.35], [0.35, 0.12], [0.65, 0.12], [0.8, 0.35], [0.95, 0.5], [1, 0.5]])(t), cop: 0.45, fx: 0 },
    };
  },
};

const agacharse = {
  id: 'agacharse', nombre: 'Agacharse', icono: 'agachar',
  descripcion: 'Sentadilla profunda: la rodilla llega a su flexión máxima de 135°.',
  normas: ['niveles-k'], duracion: (ctx) => 6 / (0.7 + 0.3 * ctx.K.velocidadMs),
  fases: [{ nombre: 'Descenso', desde: 0, hasta: 0.45 }, { nombre: 'Flexión máxima', desde: 0.45, hasta: 0.55 }, { nombre: 'Ascenso', desde: 0.55, hasta: 1 }],
  estado(t, ctx) {
    const q = curva([[0, 0], [0.45, 1], [0.55, 1], [1, 0]])(t);
    const thS = 105 * q, kS = 130 * q;
    const r = Math.PI / 180;
    return {
      px: -(ctx.Lm * Math.sin(thS * r) + ctx.Lp * Math.sin((thS - kS) * r)), thP: 105 * q, kP: 135 * q, planoP: 1 - 0.6 * q,
      thS, kS, pieS: 0, tronco: 40 * q, brazos: -30 * q,
      grf: { f: 0.5 - 0.2 * q, cop: 0.5 + 0.3 * q, fx: 0 },
    };
  },
};

const subir = {
  id: 'subir', nombre: 'Subir escalón', icono: 'subir',
  descripcion: 'Con rodilla pasiva se sube paso a paso: primero la pierna sana, después la prótesis extendida.',
  normas: ['niveles-k', 'iso-10328'], escalon: { x: 0, h: ALTURA_ESCALON, sube: true },
  duracion: (ctx) => 5 / (0.7 + 0.3 * ctx.K.velocidadMs),
  piso: (x) => (x >= 0 ? ALTURA_ESCALON : 0),
  fases: [{ nombre: 'Apoyo en la prótesis', desde: 0, hasta: 0.3 }, { nombre: 'Elevación con la pierna sana', desde: 0.3, hasta: 0.6 }, { nombre: 'Balanceo de la prótesis', desde: 0.6, hasta: 0.88 }, { nombre: 'Apoyo en el escalón', desde: 0.88, hasta: 1 }],
  estado(t) {
    return {
      px: curva([[0, -240], [0.1, -240], [0.3, -150], [0.6, 60], [0.88, 115], [1, 115]])(t),
      thP: curva([[0, 0], [0.3, 4], [0.48, -12], [0.6, -8], [0.72, 20], [0.88, 2], [1, 0]])(t),
      kP: curva([[0, 0], [0.55, 0], [0.62, 12], [0.72, 32], [0.82, 10], [0.88, 0], [1, 0]])(t),
      planoP: curva([[0, 1], [0.4, 1], [0.5, 0.3], [0.82, 0.3], [0.9, 1], [1, 1]])(t),
      thS: curva([[0, 0], [0.1, 0], [0.2, 62], [0.3, 52], [0.6, 6], [1, 0]])(t),
      kS: curva([[0, 0], [0.1, 0], [0.2, 88], [0.3, 62], [0.6, 6], [1, 0]])(t),
      pieS: curva([[0, 0], [0.1, 0], [0.2, -15], [0.3, 0], [1, 0]])(t),
      tronco: curva([[0, 0], [0.3, 12], [0.6, 6], [1, 0]])(t), brazos: 0,
      grf: { f: curva([[0, 0.5], [0.1, 0.5], [0.2, 1.0], [0.3, 1.1], [0.4, 0.7], [0.5, 0.2], [0.58, 0], [0.85, 0], [0.92, 0.4], [1, 0.5]])(t),
        cop: curva([[0, 0.45], [0.3, 0.5], [0.5, 0.9], [0.6, 0.9], [0.9, 0.45], [1, 0.45]])(t), fx: 0 },
    };
  },
};

const bajar = {
  id: 'bajar', nombre: 'Bajar escalón', icono: 'bajar',
  descripcion: 'Al bajar, la prótesis va primero y recibe el peso extendida; la pierna sana frena el descenso.',
  normas: ['niveles-k', 'iso-10328'], escalon: { x: 0, h: ALTURA_ESCALON, sube: false },
  duracion: (ctx) => 5 / (0.7 + 0.3 * ctx.K.velocidadMs),
  piso: (x) => (x < 0 ? ALTURA_ESCALON : 0),
  fases: [{ nombre: 'Avance de la prótesis', desde: 0, hasta: 0.35 }, { nombre: 'Recepción del peso', desde: 0.35, hasta: 0.5 }, { nombre: 'Descenso de la pierna sana', desde: 0.5, hasta: 0.85 }, { nombre: 'Apoyo bipodal', desde: 0.85, hasta: 1 }],
  estado(t) {
    return {
      px: curva([[0, -210], [0.1, -210], [0.35, -70], [0.5, 60], [0.85, 165], [1, 165]])(t),
      thP: curva([[0, 0], [0.1, 0], [0.22, 20], [0.35, 15], [0.5, 2], [0.7, -6], [0.85, 0], [1, 0]])(t),
      kP: curva([[0, 0], [0.1, 0], [0.2, 14], [0.32, 0], [1, 0]])(t),
      planoP: curva([[0, 1], [0.12, 0.6], [0.33, 0.4], [0.45, 1], [1, 1]])(t),
      thS: curva([[0, 0], [0.1, 0], [0.38, 40], [0.5, 30], [0.65, 38], [0.85, 4], [1, 0]])(t),
      kS: curva([[0, 0], [0.1, 0], [0.38, 76], [0.5, 60], [0.65, 70], [0.85, 6], [1, 0]])(t),
      pieS: curva([[0, 0], [0.2, 0], [0.38, -20], [0.5, -32], [0.7, -15], [0.85, 0], [1, 0]])(t),
      tronco: curva([[0, 0], [0.4, 8], [1, 0]])(t), brazos: 0,
      grf: { f: curva([[0, 0.5], [0.1, 0.5], [0.2, 0.1], [0.33, 0.1], [0.42, 1.5], [0.5, 1.0], [0.75, 0.9], [0.9, 0.55], [1, 0.5]])(t),
        cop: curva([[0, 0.45], [0.33, 0.7], [0.5, 0.5], [1, 0.45]])(t), fx: curva([[0, 0], [0.33, -0.1], [0.5, 0], [1, 0]])(t) },
    };
  },
};

const impacto = {
  id: 'impacto', nombre: 'Tropiezo o impacto', icono: 'impacto',
  descripcion: 'Tras un tropiezo, todo el cuerpo cae sobre la prótesis extendida: la carga dinámica más alta.',
  normas: ['iso-10328', 'niveles-k', 'iso-14971'], duracion: () => 2.2,
  fases: [{ nombre: 'Tropiezo', desde: 0, hasta: 0.28 }, { nombre: 'Impacto', desde: 0.28, hasta: 0.45 }, { nombre: 'Recuperación', desde: 0.45, hasta: 1 }],
  estado(t, ctx) {
    return {
      px: curva([[0, 0], [0.3, 160], [0.5, 260], [1, 330]])(t),
      thP: curva([[0, -10], [0.15, 15], [0.3, 24], [0.5, 10], [0.8, 2], [1, 0]])(t),
      kP: curva([[0, 25], [0.15, 35], [0.27, 5], [0.3, 0], [1, 0]])(t),
      planoP: curva([[0, 0], [0.3, 0], [0.42, 1], [1, 1]])(t),
      thS: curva([[0, 5], [0.3, -20], [0.5, -10], [0.7, 20], [0.85, 5], [1, 0]])(t),
      kS: curva([[0, 10], [0.3, 35], [0.6, 60], [0.8, 15], [1, 0]])(t),
      pieS: curva([[0, 0], [0.3, -30], [0.6, -20], [0.8, 0], [1, 0]])(t),
      tronco: curva([[0, 5], [0.3, 28], [0.5, 18], [1, 0]])(t), brazos: curva([[0, 0], [0.3, 40], [1, 0]])(t),
      grf: { f: curva([[0, 0], [0.28, 0], [0.34, ctx.K.cargaImpacto], [0.42, 1.3], [0.6, 0.9], [0.85, 0.55], [1, 0.5]])(t),
        cop: curva([[0, 0.08], [0.34, 0.1], [0.5, 0.4], [1, 0.45]])(t), fx: curva([[0, -0.25], [0.34, -0.25], [0.5, -0.1], [1, 0]])(t) },
    };
  },
};

export const ESCENARIOS = [bipedestacion, marcha, sentarse, agacharse, subir, bajar, impacto];
export const escenario = (id) => ESCENARIOS.find((e) => e.id === id) || bipedestacion;
export const faseEn = (esc, t) => esc.fases.find((f) => t >= f.desde && t <= f.hasta) || esc.fases[esc.fases.length - 1];
