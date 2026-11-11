// ÚNICA fuente de dimensiones de piezas, materiales y medidas del usuario (ver CLAUDE.md).
// Toda medida no confirmada con SolidWorks lleva `estimado: true`.

export const CONFIG = {
  proyecto: {
    titulo: 'Prótesis transfemoral con rodilla policéntrica de 4 barras',
    escuela: 'CECyT No. 3 "Estanislao Ramírez Ruiz" (IPN)',
    grupo: '4IV11',
    evento: '14° Encuentro de Mejores Proyectos Aula 2026',
  },

  // Datos del diseño dados por el equipo (PROMPT.md).
  diseno: {
    masaPacienteKg: 65,
    factorSeguridad: 1.5,
    torqueReferenciaNm: 274.2,
    flexionMinGrados: 0,
    flexionMaxGrados: 135,
    desplazamientoPosteriorEjeMm: 20,
    numeroPiezas: 12,
    pesoRodillaG: 420,
    toleranciaGeneralMm: 0.2,
    acabadoRaUm: 3.2,
  },

  // Medidas del usuario por defecto; los segmentos se calculan desde estatura y peso.
  usuario: {
    pesoKg: 65,
    estaturaM: 1.65,
    ladoAmputado: 'derecho', // 'izquierdo' | 'derecho'
    nivelK: 'K2', // 'K1' | 'K2' | 'K3' | 'K4'
    munonCm: { valor: 37.5, estimado: true }, // típico 35–40 cm para 1.65 m
    segmentos: { modo: 'automatico' }, // 'automatico' | 'personalizado'
  },

  // Propiedades por verificar contra ASTM B221 / B211 al implementar los cálculos.
  materiales: {
    'al-6061-t6': { nombre: 'Aluminio 6061-T6', densidadKgM3: null, fluenciaMPa: null, pendiente: true },
    'al-7075-t6': { nombre: 'Aluminio 7075-T6', densidadKgM3: null, fluenciaMPa: null, pendiente: true },
    // El equipo dará tipo de plástico, % de relleno y escala.
    'prototipo-3d': { nombre: 'Plástico del prototipo impreso en 3D', pendiente: true },
  },
  materialActivo: 'al-6061-t6',

  // Dimensiones de las 12 piezas (mm). Se llenan con estimaciones `estimado: true`
  // y después con las reales de SolidWorks.
  piezas: {},
};
