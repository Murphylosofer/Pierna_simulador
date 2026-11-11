// ÚNICA fuente de dimensiones de piezas, materiales y medidas del usuario (ver CLAUDE.md).
// Toda medida no confirmada con SolidWorks lleva `estimado: true`.
// Unidades: mm, kg, N, MPa, grados — salvo que el nombre del campo diga otra cosa.

export const CONFIG = {
  proyecto: {
    titulo: 'Prótesis transfemoral con rodilla policéntrica de 4 barras',
    tituloLargo:
      'Diseño de una prótesis de pierna ligera, resistente, con rodilla de aluminio mediante el uso de IA para mejorar la movilidad del usuario',
    escuela: 'CECyT No. 3 "Estanislao Ramírez Ruiz" (IPN)',
    especialidad: 'Manufactura Asistida por Computadora',
    grupo: '5IV11',
    evento: '14° Encuentro de Mejores Proyectos Aula 2026',
  },

  // Datos del diseño dados por el equipo (PROMPT.md). No son estimados: son la referencia.
  diseno: {
    masaPacienteKg: 65,
    factorSeguridad: 1.5,
    torqueReferenciaNm: 274.2, // límite de diseño del equipo = 65 kg × 9.81 × 0.43 m
    flexionMinGrados: 0,
    flexionMaxGrados: 135,
    desplazamientoPosteriorEjeMm: 20, // eje de la rodilla ~2 cm posterior a la línea media (TKA)
    numeroPiezas: 12,
    pesoRodillaG: 420,
    toleranciaGeneralMm: 0.2,
    acabadoRaUm: 3.2,
    estaturaReferenciaM: 1.65,
    munonTipicoCm: [35, 40],
  },

  // Medidas del usuario por defecto; los segmentos se calculan desde estatura y peso.
  usuario: {
    pesoKg: 65,
    estaturaM: 1.65,
    ladoAmputado: 'derecho', // 'izquierdo' | 'derecho'
    nivelK: 'K2',
    segmentos: { modo: 'automatico', personalizados: {} }, // claves: muslo, pierna, pie, alturaRodilla, munon (mm)
  },

  // Proporciones antropométricas (fracción de la estatura H / de la masa M).
  // Fuente: Winter (2009), tabla de Drillis y Contini; masas de Dempster (1955).
  antropometria: {
    longitud: {
      muslo: 0.245, // trocánter mayor → centro de rodilla
      pierna: 0.246, // rodilla → tobillo
      alturaTobillo: 0.039,
      pie: 0.152,
      alturaRodilla: 0.285,
      alturaCadera: 0.53,
      anchoCadera: 0.191,
      alturaHombro: 0.818,
      anchoHombros: 0.259,
      alturaMenton: 0.87,
      brazo: 0.186,
      antebrazo: 0.146,
      mano: 0.108,
    },
    masa: { muslo: 0.1, pierna: 0.0465, pie: 0.0145 },
    munonFraccionMuslo: 0.93, // 0.93 × muslo ≈ 37.6 cm para 1.65 m (rango típico 35–40 cm)
  },

  // Niveles funcionales K (Medicare/CMS). Velocidad y cadencia: valores típicos, estimados.
  nivelesK: {
    K1: { nombre: 'Doméstico', velocidadMs: 0.6, cadenciaPpm: 80, cargaMarcha: 1.0, cargaImpacto: 2.0, flexionBalanceo: 45, estimado: true },
    K2: { nombre: 'Comunitario básico', velocidadMs: 0.9, cadenciaPpm: 95, cargaMarcha: 1.05, cargaImpacto: 2.3, flexionBalanceo: 55, estimado: true },
    K3: { nombre: 'Comunitario activo', velocidadMs: 1.2, cadenciaPpm: 108, cargaMarcha: 1.15, cargaImpacto: 2.7, flexionBalanceo: 60, estimado: true },
    K4: { nombre: 'Alto rendimiento', velocidadMs: 1.5, cadenciaPpm: 118, cargaMarcha: 1.25, cargaImpacto: 3.0, flexionBalanceo: 65, estimado: true },
  },

  // Factores de carga sobre la prótesis, en múltiplos del peso corporal (PC).
  factoresCarga: {
    bipedestacion: { valor: 0.5, fuente: 'Estática: el peso se reparte entre ambos pies.' },
    marcha: { valor: 'según nivel K (1.0–1.25)', fuente: 'Winter (2009); Perry y Burnfield (2010): picos de 1.1–1.2 PC al caminar.' },
    sentarse: { valor: 0.35, fuente: 'Estimado: la pierna sana hace la mayor parte del trabajo con rodilla pasiva.' },
    agacharse: { valor: 0.3, fuente: 'Estimado, igual criterio que al sentarse.' },
    subirEscalon: { valor: 1.1, fuente: 'McFadyen y Winter (1988); Riener et al. (2002): 1.1–1.2 PC.' },
    bajarEscalon: { valor: 1.5, fuente: 'Riener et al. (2002); Stacoff et al. (2005): hasta ~1.5–1.6 PC al bajar.' },
    impacto: { valor: 'según nivel K (2.0–3.0)', fuente: 'Nilsson y Thorstensson (1989): 2–2.9 PC en carrera; se usa como cota de tropiezo.' },
  },

  // Mecanismo de 4 barras en el plano sagital, a 0° de flexión.
  // Ejes: x anterior, y hacia arriba, origen = centro de referencia de la rodilla. mm.
  mecanismo: {
    estimado: true,
    A: [0, 62], // eje superior delantero (adaptador ↔ c1)
    B: [-28, 58], // eje superior trasero (adaptador ↔ c2)
    C: [-28, 8], // eje inferior trasero (base ↔ c2)
    D: [30, 0], // eje inferior delantero (base ↔ c1)
    // Tope de extensión: punto de contacto sobre el cuerpo superior y dirección de la fuerza que recibe.
    tope: { punto: [-40, 45], direccion: [1, 0] },
    ejePilonX: 0, // eje del pilón y del receptáculo del socket; la alineación desplaza cadera y tobillo 20 mm al frente
  },

  pernos: {
    estimado: true,
    diametro: 10,
    ajuste: 'H7/g6',
    material: 'Acero aleado clase 8.8',
    fluenciaMPa: 640,
    ultimaMPa: 800,
    densidadKgM3: 7850,
  },

  // Dimensiones de las 12 piezas maquinadas (mm). z = dirección lateral.
  // El reparto en 12 piezas es una interpretación de la descripción del equipo.
  piezas: {
    estimado: true,
    barraLateral: { ancho: 18, espesor: 6 }, // c1 y c2 (perfil tipo estadio entre ejes)
    separacionC1: 20, // |z| de la cara interior de las barras c1
    separacionC2: 10, // |z| de la cara interior de las barras c2
    adaptador: { xMin: -40, xMax: 26, yBase: 76, espesorPlaca: 8, anchoZ: 44, anilloDext: 48, anilloDint: 38, anilloAlto: 16 },
    barraSupDelantera: { medioAnchoX: 9, yInferior: 51 },
    barraSupTrasera: { medioAnchoX: 9, yInferior: 47 },
    barraTrasera: { largo: 12, alto: 12 }, // travesaño entre las dos c2, a media barra
    barraInfDelantera: { medioAnchoX: 9, ySuperior: 11 },
    barraInfTrasera: { medioAnchoX: 9, ySuperior: 19 },
    base: { xMin: -40, xMax: 42, yTope: -14, espesorPlaca: 8, anchoZ: 44 },
    tuboReceptor: { dext: 38, dint: 30, largo: 35 },
  },

  // Componentes distales y socket (no forman parte de las 12 piezas).
  distal: {
    estimado: true,
    pilonDiametro: 30,
    pieAlturaTobillo: 70, // del piso a la unión pilón–pie SACH
    masaDistalKg: 1.1, // base + pilón + pie, para el torque en balanceo
    socketEspesor: 5,
  },

  // Propiedades mecánicas. Mínimos de ASTM B221 (extrusiones) para diseño; típicos como referencia.
  materiales: {
    'al-6061-t6': {
      nombre: 'Aluminio 6061-T6',
      corto: '6061-T6',
      densidadKgM3: 2700,
      fluenciaMPa: 240,
      ultimaMPa: 260,
      fluenciaTipicaMPa: 276,
      ultimaTipicaMPa: 310,
      fatigaMPa: 96.5, // resistencia a fatiga típica a 5×10⁸ ciclos (R.R. Moore)
      moduloGPa: 68.9,
      costoRelativo: 1,
      maquinabilidad: 'Buena (≈50 % respecto a 2011); viruta manejable, herramientas comunes',
      nota:
        'Recomendado para taller escolar: se consigue en México en barra y placa, cuesta cerca de la mitad que el 7075, se maquina y se anodiza bien y resiste la corrosión. Es el aluminio habitual en componentes protésicos de bajo costo.',
    },
    'al-7075-t6': {
      nombre: 'Aluminio 7075-T6',
      corto: '7075-T6',
      densidadKgM3: 2810,
      fluenciaMPa: 485,
      ultimaMPa: 540,
      fluenciaTipicaMPa: 503,
      ultimaTipicaMPa: 572,
      fatigaMPa: 159,
      moduloGPa: 71.7,
      costoRelativo: 2.2,
      maquinabilidad: 'Buena, pero más duro: mayor desgaste de herramienta',
      nota:
        'Casi el doble de resistencia que el 6061, pero más caro, más difícil de conseguir en medidas pequeñas y más sensible a la corrosión bajo tensión.',
    },
    'prototipo-3d': {
      nombre: 'Plástico del prototipo impreso en 3D',
      corto: 'Prototipo 3D',
      pendiente: true, // el equipo dará tipo de plástico, % de relleno y escala
      tipo: null,
      rellenoPct: null,
      escala: null,
      densidadKgM3: null,
      fluenciaMPa: null,
      ultimaMPa: null,
      fatigaMPa: null,
      nota: 'Pendiente: falta que el equipo indique el tipo de plástico, el porcentaje de relleno y la escala del prototipo.',
    },
  },
  materialActivo: 'al-6061-t6',

  // ISO 10328:2016 — fuerzas de la prueba principal (N). Condición I = carga de talón, II = antepié.
  // Valores transcritos de literatura secundaria; `verificar` hasta cotejarlos con una copia de la norma.
  iso10328: {
    verificar: true,
    ciclos: 3e6,
    distanciaRodillaTobillo: 420,
    // Desplazamientos de la línea de carga en el plano sagital (mm, + anterior) a la altura de rodilla y tobillo.
    // Se usan los del nivel P5 para todos los niveles (los de P3 y P4 son algo menores).
    desplazamientos: { I: { rodilla: 52, tobillo: -32 }, II: { rodilla: 72, tobillo: 129 } },
    niveles: {
      P3: { masaKg: 60, I: { prueba: 1610, ultimaInf: 2415, ultimaSup: 3220, ciclica: 970 }, II: { prueba: 1395, ultimaInf: 2092, ultimaSup: 2790, ciclica: 847 } },
      P4: { masaKg: 80, I: { prueba: 2065, ultimaInf: 3098, ultimaSup: 4130, ciclica: 1230 }, II: { prueba: 1811, ultimaInf: 2717, ultimaSup: 3622, ciclica: 1085 } },
      P5: { masaKg: 100, I: { prueba: 2240, ultimaInf: 3360, ultimaSup: 4480, ciclica: 1330 }, II: { prueba: 2013, ultimaInf: 3019, ultimaSup: 4025, ciclica: 1200 } },
    },
    nivelesSuperiores: 'P6 (125 kg), P7 (150 kg) y P8 (175 kg) existen en la edición 2016; sus fuerzas no se incluyen aquí.',
    concentracionEsfuerzo: 2.5, // Kt en barrenos cargados por perno, para la estimación de fatiga
  },
};

export const G = 9.81;
