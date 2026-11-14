// ÚNICA fuente de dimensiones de piezas, materiales y medidas del usuario (ver CLAUDE.md).
// Toda medida no confirmada con SolidWorks lleva `estimado: true`. La geometría de la rodilla ya es la real.
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
    numeroPiezas: 10, // ensamble real: AFS1, adaptador inferior, 4 eslabones y 4 ejes
    pesoRodillaG: 420, // referencia del equipo
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

  // ───────────────────────── GEOMETRÍA REAL (SolidWorks) ─────────────────────────
  // Fuente: ensamble "Ensamblaje2 (1).STEP" y planos DXF del equipo (14-nov-2026).
  // Cada pieza se describe en SU PROPIO marco, igual que en su archivo de SolidWorks:
  //   x hacia adelante (anterior), y hacia arriba, z lateral con 0 en el plano medio. mm.
  // El código arma la rodilla resolviendo el mecanismo (src/ensamble.js); aquí no hay coordenadas inventadas.
  geometria: {
    fuente: 'SolidWorks 2018 · Ensamblaje2 (1).STEP + DXF de cada pieza',
    estimado: false,

    // AFS1 — adaptador femoral superior. Horquilla en "U" invertida: placa arriba y dos paredes laterales.
    afs1: {
      nombreSW: 'AFS1',
      ancho: 55, pared: 4, // claro interior 47
      barrenoTrasero: [-55.182, 3.357], // eje B (lleva el Eje superior y los eslabones interiores)
      barrenoDelantero: [-28.056, 8.357], // eje A (lleva el Eje inferior y los eslabones exteriores)
      diametroBarreno: 5,
      radioOreja: 10, // oreja trasera, concéntrica al eje B
      // Perfil de la pared (vista lateral): arriba plano, abajo inclinado, frente casi vertical.
      xAtras: -55.182, yArriba: 23.357, xFrenteArriba: 19.818,
      frenteAbajo: [20.488, 8.357], // la arista inferior va de aquí a la parte baja de la oreja (75.67 × 15 → 77.14)
      // Placa entre paredes: fondo inclinado y ranura anular arriba para el socket.
      placa: { yFondoAtras: 13.0, yFondoFrente: 16.364 },
      ranura: { centroX: -17.672, dExt: 44, dInt: 32, profundidad: 5 }, // receptáculo circular del socket
    },

    // Adaptador femoral inferior. Horquilla en "U": base abajo, dos paredes, ceja al frente y cilindro para el pilón.
    adaptadorInferior: {
      nombreSW: 'adapatador femoral inferior',
      ancho: 55, pared: 4,
      barrenoTrasero: [0, 3.355], // eje C (Eje superior, eslabones interiores)
      barrenoDelantero: [46.792, 12.571], // eje D (Eje inferior, eslabones exteriores)
      diametroBarreno: 5,
      radioOreja: 10, // oreja delantera, concéntrica al eje D
      xAtras: -18.208, xFrente: 56.792, yAbajo: -10.231, yArribaAtras: 9.769, // alturas 20.00 atrás y 22.80 adelante
      base: { yArriba: -7.296 },
      ceja: { espesor: 5, yArriba: 5.613 }, // labio frontal entre paredes
      cilindro: { diametro: 40, largo: 40, centroX: 19.292 }, // macizo en el STEP; aquí se fija el pilón
    },

    // Barras laterales: estadio de 10 de ancho y 5 de espesor, barrenos Ø5 en los extremos.
    eslabones: {
      ancho: 10, espesor: 5, diametroBarreno: 5,
      exterior: { nombreSW: 'eslabonnnnn', centros: 100, cantidad: 2 }, // por fuera de las paredes, ejes A–D
      // CORRECCIÓN 1: en SolidWorks mide 65 entre centros. Con 65 el mecanismo no puede llegar a 0° (ver ensamble.js).
      interior: { nombreSW: 'eslabon 2', centros: 100, centrosOriginal: 65, cantidad: 2 }, // por dentro, ejes B–C
    },

    // Ejes (pernos) Ø5. El "Eje superior" (55) une los eslabones interiores; el "Eje inferior" (70, archivo "Eslabon2")
    // atraviesa paredes y eslabones exteriores.
    ejes: {
      diametro: 5,
      superior: { nombreSW: 'Eje Superior', largo: 55 },
      inferior: { nombreSW: 'Eslabon2', largo: 70, chaflan: 0.5 },
      // Material supuesto: los planos no lo indican. Con Ø5, el aluminio no aguanta la flexión del perno.
      material: 'Acero aleado clase 8.8', fluenciaMPa: 640, ultimaMPa: 800, densidadKgM3: 7850, ajuste: 'H7/g6',
    },

    // Correcciones aplicadas para que la rodilla funcione (cada una se explica en "Validación y supuestos").
    correcciones: {
      // 2: chaflán a 45° en la arista trasera inferior de la placa del AFS1; sin él el eslabón interior
      //    choca con la placa a 129.6° de flexión. Con 5 mm la flexión libre llega a 139°.
      chaflanPlacaAFS1: 5,
      // 3: tope de extensión añadido (el diseño no tenía): tornillo M8 que baja por el centro de la placa del AFS1
      //    y apoya, con un capuchón de hule, sobre la ceja delantera del adaptador inferior justo a 0°.
      //    Al ser un contacto entre los dos cuerpos lejos del centro de rotación, la fuerza es baja.
      tope: { rosca: 'M8', dTornillo: 8, areaResistente: 36.6, dHule: 10, altoHule: 5, xEnCeja: 55.8 }, // x en el marco del adaptador inferior
    },

    // Pose en la que quedó guardado el ensamble de SolidWorks: el adaptador inferior girado respecto al AFS1.
    // Sirve para el diagnóstico del diseño original (no para la simulación).
    poseSolidWorks: { giro: -47.708, t: [-46.014, -62.848] },

    // Marco de referencia de la rodilla para la simulación, definido sobre el adaptador inferior:
    // x = eje del pilón − 20 mm (el eje de rodilla queda 2 cm detrás de la línea de carga, como pide el equipo),
    // y = 55 mm sobre el origen del adaptador inferior (mitad de la altura del mecanismo).
    origenRodillaY: 55,
  },

  // Pistón neumático propuesto (especificaciones_del_pistón.md). Según el equipo, la horquilla del pistón va en el
  // Eje superior y el otro extremo en el Eje inferior: en la rodilla real eso es la diagonal B (muslo) – D (pierna).
  piston: {
    estimado: true,
    tipo: 'Minicilindro neumático de doble efecto, ISO 6432',
    diametroEmbolo: 16,
    diametroExterior: 19, // camisa de 18 a 20 mm
    roscaVastago: 'M5 × 0.8',
    pasador: 5,
    retraidoMin: 85, retraidoMax: 95, // lo que pedía el documento del equipo
    modelos: [{ nombre: 'CDJ2B 16×25', carrera: 25 }, { nombre: 'CDJ2B 16×30', carrera: 30 }, { nombre: 'CDJ2B 16×40', carrera: 40 }],
    presionMPa: 0.6, // presión típica de taller (6 bar), supuesta
    anclajes: ['B', 'D'], // ejes del mecanismo donde se monta
    canalCentral: 31, // 47 de claro − 2 × (5 de eslabón + 3 de holgura): espacio para la camisa
  },

  // Componentes distales y socket (no son parte de la rodilla).
  distal: {
    estimado: true,
    pilonDiametro: 30,
    pieAlturaTobillo: 70, // del piso a la unión pilón–pie SACH
    masaDistalKg: 1.1, // adaptador inferior + pilón + pie, para el torque en balanceo
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
    // Supuesto hasta que el equipo confirme: PLA, el plástico estándar de prototipos FDM.
    // Propiedades EFECTIVAS de pieza impresa (paredes + relleno), no del filamento macizo.
    'prototipo-3d': {
      nombre: 'PLA impreso en 3D (prototipo)',
      corto: 'PLA impreso',
      estimado: true,
      tipo: 'PLA',
      rellenoPct: 20,
      escala: 1, // 1 = tamaño real; el equipo indicó "a escala" sin dar el factor
      densidadMacizaKgM3: 1240,
      fraccionSolida: 0.45, // paredes de 1.2 mm + 20 % de relleno ≈ 45 % del volumen
      densidadKgM3: 558, // 1240 × 0.45
      fluenciaMPa: 22, // ~50 MPa del PLA macizo × fracción sólida
      ultimaMPa: 26,
      fluenciaTipicaMPa: 50,
      ultimaTipicaMPa: 60,
      fatigaMPa: 6,
      moduloGPa: 1.5,
      costoRelativo: 0.15,
      maquinabilidad: 'No se maquina: se imprime por capas (FDM)',
      nota: 'Sirve para validar ensambles y rango de movimiento, no para cargar peso. Supuesto: PLA con 20 % de relleno a escala 1:1; cámbialo cuando el equipo confirme tipo, relleno y escala.',
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
