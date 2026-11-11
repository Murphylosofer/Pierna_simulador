// Curvas normativas de una rodilla sana en % del ciclo de marcha (cadencia natural).
// Aproximadas a partir de las gráficas de Winter (2009) y Perry y Burnfield (2010);
// sirven de comparación visual, no como datos clínicos.
import { curva } from './mat.js';

export const NORMATIVA = {
  fuente: 'Winter (2009), Biomechanics and Motor Control of Human Movement, 4.ª ed.; Perry y Burnfield (2010), Gait Analysis, 2.ª ed.',
  // Flexión de rodilla (°)
  angulo: curva([[0, 5], [5, 12], [10, 18], [15, 20], [20, 17], [25, 13], [30, 9], [35, 6], [40, 5], [45, 8], [50, 15], [55, 28], [60, 42], [65, 56], [70, 63], [75, 62], [80, 52], [85, 36], [90, 18], [95, 5], [100, 5]]),
  // Momento interno de rodilla (N·m/kg, + = extensor)
  momento: curva([[0, -0.2], [5, 0.1], [10, 0.45], [15, 0.55], [20, 0.35], [25, 0.1], [30, -0.1], [35, -0.2], [40, -0.25], [45, -0.2], [50, -0.05], [55, 0.1], [60, 0.15], [65, 0.1], [70, 0.03], [75, -0.02], [80, -0.07], [85, -0.15], [90, -0.25], [95, -0.2], [100, -0.2]]),
  // Reacción vertical del suelo (múltiplos del peso corporal)
  reaccion: curva([[0, 0], [2, 0.25], [5, 0.65], [10, 1.02], [14, 1.12], [20, 1.0], [30, 0.78], [40, 0.92], [47, 1.1], [52, 0.9], [57, 0.4], [61, 0.03], [62, 0], [100, 0]]),
  // Flexión de cadera (°) del muslo respecto a la vertical
  cadera: curva([[0, 30], [10, 24], [30, 5], [50, -10], [57, -6], [65, 8], [75, 24], [85, 31], [100, 30]]),
  fases: [
    { nombre: 'Contacto de talón', desde: 0, hasta: 0.1 },
    { nombre: 'Apoyo medio', desde: 0.1, hasta: 0.3 },
    { nombre: 'Apoyo final', desde: 0.3, hasta: 0.5 },
    { nombre: 'Despegue', desde: 0.5, hasta: 0.6 },
    { nombre: 'Balanceo', desde: 0.6, hasta: 1 },
  ],
};
