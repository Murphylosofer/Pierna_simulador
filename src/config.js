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
    numeroPiezas: 10, // ensamble real (Ensamblaje1): AFS1, adaptador inferior, 4 eslabones y 4 ejes
    pesoRodillaG: 386, // suma de masas del reporte de SolidWorks (6061-T6)
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
  // Fuente: STL de cada pieza del ensamble "Ensamblaje1" (carpeta "ESTUDIOS y STL", 20-nov-2026), en mm y ya en su
  // posición real de ensamble (rodilla recta, 0°). Las piezas son las mismas del STEP anterior; lo que cambió son
  // los eslabones (los cuatro de 80 mm) y qué par va por dentro y cuál por fuera.
  // Cada pieza se describe en SU PROPIO marco: x hacia adelante (anterior), y hacia arriba, z lateral (0 al centro). mm.
  // La vista 3D dibuja los STL tal cual (sin escalar ni mover vértices); estas medidas se usan para la cinemática,
  // las cargas, los planos y la figura, y coinciden con los STL (ver ensamble.js → verificarSTL).
  geometria: {
    fuente: 'SolidWorks · Ensamblaje1 (STL por pieza) + estudios estáticos de 736 N y 2,200 N',
    estimado: false,

    // AFS1 — adaptador femoral superior. Horquilla en "U" invertida: placa arriba y dos paredes laterales.
    afs1: {
      nombreSW: 'AFS1',
      ancho: 55, pared: 4, // claro interior 47
      barrenoTrasero: [-55.182, 3.357], // eje B: Eje Ø5 × 70 ("Eslabon2") y eslabones traseros (por fuera)
      barrenoDelantero: [-28.056, 8.357], // eje A: Eje superior Ø5 × 55 y eslabones diagonales (por dentro)
      diametroBarreno: 5,
      radioOreja: 10, // oreja trasera, concéntrica al eje B
      // Perfil de la pared (vista lateral): arriba plano, abajo inclinado, frente casi vertical.
      xAtras: -55.182, yArriba: 23.357, xFrenteArriba: 19.818,
      frenteAbajo: [20.488, 8.357], // la arista inferior va de aquí a la parte baja de la oreja
      // Placa entre paredes: fondo inclinado y ranura anular arriba para el socket.
      placa: { yFondoAtras: 13.0, yFondoFrente: 16.364, punta: [[-58.28, 12.86], [-56.92, 13.21], [-55.18, 13.36]] }, // punta: labio trasero que sobresale 3.1 mm detrás de las paredes (medido en el STL)
      ranura: { centroX: -17.672, dExt: 44, dInt: 32, profundidad: 5 }, // receptáculo circular del socket
    },

    // Adaptador femoral inferior. Horquilla en "U": base abajo, dos paredes, ceja al frente y cilindro para el pilón.
    adaptadorInferior: {
      nombreSW: 'adapatador femoral inferior',
      ancho: 55, pared: 4,
      barrenoTrasero: [0, 3.355], // eje C: Eje Ø5 × 70 y eslabones traseros
      barrenoDelantero: [46.792, 12.571], // eje D: Eje superior Ø5 × 55 y eslabones diagonales
      diametroBarreno: 5,
      radioOreja: 10, // oreja delantera, concéntrica al eje D
      xAtras: -18.208, xFrente: 56.792, yAbajo: -10.231, yArribaAtras: 9.769, // alturas 20.00 atrás y 22.80 adelante
      base: { yArriba: -7.296 },
      ceja: { espesor: 5, yArriba: 5.613 }, // labio frontal entre paredes
      cilindro: { diametro: 40, largo: 40, centroX: 19.292 }, // macizo; aquí se fija el pilón (soporte fijo en SolidWorks)
    },

    // Los cuatro eslabones son la misma pieza ("eslabonnnnn"): estadio de 10 × 5 con barrenos Ø5 a 80 entre centros.
    eslabones: {
      ancho: 10, espesor: 5, diametroBarreno: 5, centros: 80, nombreSW: 'eslabonnnnn',
      // Par diagonal: une A (AFS1, delantero) con D (adaptador inferior, delantero); va POR DENTRO de las paredes.
      diagonal: { ejes: 'A–D', lado: 'interior', cantidad: 2 },
      // Par trasero: une B (oreja trasera del AFS1) con C (trasero del adaptador inferior); va POR FUERA de las paredes.
      trasero: { ejes: 'B–C', lado: 'exterior', cantidad: 2 },
    },

    // Ejes (pernos) Ø5. En el reporte de SolidWorks son de 6061-T6. AJUSTE de presentación: se toman de acero 8.8
    // (misma forma) porque con el tope junto al eje A el aluminio no alcanza. Con `acero: false` vuelven a 6061-T6.
    ejes: {
      diametro: 5,
      corto: { nombreSW: 'Eje Superior', largo: 55, ejes: 'A y D' }, // atraviesa paredes y eslabones diagonales
      largo: { nombreSW: 'Eslabon2', largo: 70, ejes: 'B y C' }, // atraviesa paredes y eslabones traseros (por fuera)
      ajuste: 'H7/g6',
      acero: true,
      materialAcero: { nombre: 'Acero aleado clase 8.8', corto: 'Acero 8.8', fluenciaMPa: 640, ultimaMPa: 800, densidadKgM3: 7850, estimado: true },
    },

    // AJUSTES para que la rodilla llegue a 135° sin choques (recortes mínimos a los STL; ver REPORTE.md).
    // Con `activos: false` la simulación vuelve a los STL tal cual (versión fiel, con los choques a 53.3° y 90.1°).
    recortes: {
      activos: true,
      estimado: true, // propuestos por la simulación; falta hacerlos en SolidWorks
      // 1. Dos ranuras en la parte trasera de la placa del AFS1, solo donde pasan los eslabones diagonales, pegadas a
      //    cada pared. Se quita lo que queda detrás de la recta que va de `arriba` (cara superior) a `abajo` (fondo
      //    de la placa), en el marco del AFS1. Ancho: de z = ±zDesde a la cara interior de la pared (±23.5).
      ranurasAFS1: { arriba: [-47.0, 23.357], abajo: [-27.5, 14.24], zDesde: 18.0 },
      // 2. El eje de 70 mm del punto B se cambia por dos ejes cortos que no cruzan por dentro (pared + eslabón trasero).
      ejeB: { largo: 11.5, cantidad: 2 },
      // STL ya recortados (generados con scripts/recortes_stl.py a partir de los originales); el AFS1 incluye el tope.
      stl: { afs1: 'STL Rodilla ajustada/Ensamblaje1 - AFS1-1 ajustado.STL', ejeB: ['STL Rodilla ajustada/Eje corto B-1.STL', 'STL Rodilla ajustada/Eje corto B-2.STL'] },
    },

    // Posición de cada STL: traslación (mm) que lleva el marco propio de la pieza al marco del ensamble de SolidWorks.
    // Se usa solo para colocar los STL; los vértices no se tocan.
    stl: {
      carpeta: 'ESTUDIOS y STL/STL Rodilla',
      zCentro: 1255.285, // plano medio del ensamble en el STL
      afs1: [25.5, -23.357], // marco del AFS1 → STL
      adaptadorInferior: [-22.88, -103.07], // marco del adaptador inferior → STL
    },

    // ÚNICA modificación a los STL (punto 4 de las instrucciones): tope de extensión escondido.
    // Un taco maquinado en la cara inferior de la placa del AFS1, entre las dos paredes, justo delante del eje A.
    // Con la rodilla recta, el canto delantero de los eslabones diagonales apoya en él; queda tapado por las paredes,
    // así que por fuera la rodilla se ve igual. Sustituye al tornillo M8 de la versión anterior (eliminado).
    topeOculto: {
      estimado: true, // medida propuesta por la simulación; falta pasarla a SolidWorks
      anguloGrados: 0, // la rodilla se detiene a 0° (rodilla recta, igual que en los estudios de SolidWorks)
      hasta: 9.5, // largo de la cara de apoyo medido sobre el canto del eslabón desde el eje A
      fondo: 6, // espesor del taco hacia adelante
      radio: 1.5, // redondeo de las aristas de la cara de apoyo
      empotre: 1.5, // lo que el contorno entra en la placa (se maquina de una pieza con el AFS1)
    },

    // Marco de referencia de la rodilla para la simulación, definido sobre el adaptador inferior:
    // x = eje del pilón − 20 mm, y = 55 mm sobre el origen del adaptador inferior.
    origenRodillaY: 55,
  },

  // Estudios estáticos de SolidWorks Simulation del equipo (reportes PDF y capturas en "ESTUDIOS y STL").
  // Son resultados reales; la simulación de la página solo los interpola.
  solidworks: {
    programa: 'SOLIDWORKS Simulation (versión educativa)',
    tipo: 'Análisis estático lineal (pequeños desplazamientos, sin fricción)',
    material: '6061-T6 (SS)', // biblioteca de SolidWorks, en TODOS los cuerpos, incluidos los ejes
    propiedades: { fluenciaMPa: 275, traccionMPa: 310, moduloGPa: 69, poisson: 0.33, densidadKgM3: 2700, corteGPa: 26, dilatacion: 2.4e-5 },
    sujecion: 'Geometría fija en la cara inferior del cilindro del adaptador inferior',
    carga: 'Fuerza normal en la cara superior del receptáculo del AFS1 (donde asienta el socket)',
    contacto: 'Unión rígida global ("bonded"): todas las piezas pegadas entre sí',
    rodilla: 'Recta (0°), bloqueada en extensión: fase de apoyo',
    malla: { tipo: 'Sólida, basada en curvatura de combinado', elemento: 1.61363, nodos: 399951, elementos: 262209, calidad: 'Cuadráticos de alto orden', aspectoMax: 8.7333 },
    masasKg: { afs1: 0.112405, adaptadorInferior: 0.214822, eslabon: 0.0113301, ejeCorto: 0.00291579, ejeLargo: 0.00371101 },
    estudios: [
      { id: 'pie', nombre: 'De pie', cargaN: 736, masaKg: 75, reaccionN: 736.008,
        vonMisesMaxMPa: 87.81, vonMisesMinMPa: 0.005689, desplMaxMm: 0.1041, deformMax: 7.006e-4, fs: 3.13,
        capturas: { tensiones: '736N/Ensamblaje1-Análisis estático 6061-Tensiones-Tensiones1.jpg', desplazamientos: '736N/Ensamblaje1-Análisis estático 6061-Desplazamientos-Desplazamientos1.jpg', deformaciones: '736N/Ensamblaje1-Análisis estático 6061-Deformaciones unitarias-Deformaciones unitarias1.jpg' } },
      { id: 'marcha', nombre: 'Pico de marcha', cargaN: 2200, masaKg: 224, reaccionN: 2200.02,
        vonMisesMaxMPa: 262.5, vonMisesMinMPa: 0.01701, desplMaxMm: 0.3112, deformMax: 2.094e-3, fs: 1.05,
        capturas: { tensiones: '2200N/Ensamblaje1-Análisis estático 6061-Tensiones-Tensiones1.jpg', desplazamientos: '2200N/Ensamblaje1-Análisis estático 6061-Desplazamientos-Desplazamientos1.jpg', deformaciones: '2200N/Ensamblaje1-Análisis estático 6061-Deformaciones unitarias-Deformaciones unitarias1.jpg' } },
    ],
    // Dónde está el máximo: en la arista donde el eslabón diagonal toca al AFS1 (nodo 379400 en ambos estudios).
    picoUbicacion: 'Arista de contacto entre el eslabón diagonal y el AFS1',
    // Esfuerzo típico lejos del pico, leído de la escala de colores de las capturas (azul): estimado.
    entornoMPa: { pie: 15, marcha: 45, estimado: true },
  },

  // Pistón neumático propuesto (especificaciones_del_pistón.md). Se sigue estudiando entre B (muslo) y D (pierna).
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
      fuente: 'SolidWorks', // propiedades del reporte de SolidWorks Simulation del equipo
      densidadKgM3: 2700,
      fluenciaMPa: 275, // SolidWorks: límite elástico 2.75e8 N/m²
      ultimaMPa: 310, // SolidWorks: límite de tracción 3.1e8 N/m²
      fluenciaMinimaMPa: 240, // mínimo de ASTM B221 (referencia)
      fatigaMPa: 96.5, // resistencia a fatiga típica a 5×10⁸ ciclos (R.R. Moore) — estimado, no viene de SolidWorks
      moduloGPa: 69, // SolidWorks
      poisson: 0.33,
      costoRelativo: 1,
      maquinabilidad: 'Buena (≈50 % respecto a 2011); viruta manejable, herramientas comunes',
      nota:
        'Recomendado para taller escolar: se consigue en México en barra y placa, cuesta cerca de la mitad que el 7075, se maquina y se anodiza bien y resiste la corrosión. Es el aluminio habitual en componentes protésicos de bajo costo.',
    },
    'al-7075-t6': {
      nombre: 'Aluminio 7075-T6',
      corto: '7075-T6',
      estimado: true, // valores de tablas (ASTM B221); NO hay estudio de SolidWorks con este material
      densidadKgM3: 2810,
      fluenciaMPa: 485,
      ultimaMPa: 540,
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
