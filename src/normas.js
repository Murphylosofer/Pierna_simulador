// Normas y referencias citadas (ver CLAUDE.md).
// estado: 'aplicada' (los cálculos la usan) | 'referencia' (guió el diseño) | 'requerida' (paso futuro para uso real)
// verificada: true = edición vigente confirmada en una búsqueda web (noviembre de 2026);
//             false = año tomado de memoria, falta confirmarlo en el catálogo del organismo.

export const ESTADOS = {
  aplicada: { nombre: 'Aplicada en la simulación', descripcion: 'Los cálculos la usan.' },
  referencia: { nombre: 'Referencia de diseño', descripcion: 'Guió el diseño; no se calcula.' },
  requerida: { nombre: 'Requerida para fabricación o uso real', descripcion: 'No se cumple con una simulación; es un paso futuro.' },
};

export const GRUPOS = [
  { id: 'protesis', nombre: 'Prótesis y pruebas mecánicas' },
  { id: 'salud', nombre: 'Salud y dispositivos médicos' },
  { id: 'diseno', nombre: 'Diseño, dibujo y materiales' },
  { id: 'biomecanica', nombre: 'Referencias biomecánicas' },
];

export const NORMAS = [
  {
    id: 'iso-10328', grupo: 'protesis', nombre: 'ISO 10328', anio: 2016, estado: 'aplicada', verificada: true,
    titulo: 'Prótesis — Ensayos estructurales de prótesis de miembro inferior — Requisitos y métodos de ensayo',
    regula: 'Define cómo se prueba la resistencia de una prótesis de pierna (incluidas las transfemorales): cargas estáticas y de fatiga según la masa del usuario, aplicadas como en el contacto de talón (condición I) y en el despegue con el antepié (condición II).',
    aplicacion: 'La simulación aplica las fuerzas de prueba, última y cíclica de los niveles P3 (60 kg), P4 (80 kg) y P5 (100 kg) sobre la rodilla extendida y dice qué nivel pasaría con cada material. Las fuerzas se transcribieron de literatura secundaria y deben cotejarse con una copia de la norma.',
    nota: 'La edición 2016 sigue vigente. El equipo reporta una revisión en borrador (ISO/DIS 10328:2025); no se pudo confirmar su estado en esta revisión.',
  },
  {
    id: 'iso-22675', grupo: 'protesis', nombre: 'ISO 22675', anio: 2024, estado: 'referencia', verificada: true,
    titulo: 'Prótesis — Ensayo de dispositivos tobillo-pie y unidades de pie — Requisitos y métodos de ensayo',
    regula: 'Establece las pruebas cíclicas y estáticas de los pies protésicos, simulando el apoyo completo del talón a la punta.',
    aplicacion: 'Aplica al pie SACH que usamos como componente distal. El pie se compra ya fabricado; la simulación no lo ensaya.',
    nota: 'La edición 2024 (diciembre de 2024) sustituyó a la de 2016 y añadió una prueba estática de torsión.',
  },
  {
    id: 'iso-22523', grupo: 'protesis', nombre: 'ISO 22523', anio: 2006, estado: 'referencia', verificada: true,
    titulo: 'Prótesis de miembros externos y órtesis externas — Requisitos y métodos de ensayo',
    regula: 'Reúne los requisitos generales de prótesis y órtesis: resistencia, materiales, restricciones de uso, riesgos e información que debe darse al usuario.',
    aplicacion: 'Guía los requisitos generales del diseño (resistencia, materiales, información para el usuario). No se calcula en la simulación.',
    nota: 'Edición 2006, revisada y confirmada por ISO en 2024; hay una revisión en desarrollo.',
  },
  {
    id: 'iso-13405', grupo: 'protesis', nombre: 'ISO 13405 (partes 1 a 3)', anio: 2015, estado: 'referencia', verificada: false,
    titulo: 'Prótesis y órtesis — Clasificación y descripción de los componentes protésicos',
    regula: 'Da los nombres y la forma correcta de describir los componentes de una prótesis.',
    aplicacion: 'Se usó para nombrar las piezas: unidad de rodilla policéntrica, adaptador proximal, pilón, pie SACH.',
  },
  {
    id: 'iso-8549', grupo: 'protesis', nombre: 'ISO 8549 (partes 1 y 3)', anio: 2020, estado: 'referencia', verificada: false,
    titulo: 'Prótesis y órtesis — Vocabulario',
    regula: 'Define los términos generales de prótesis y órtesis (parte 1) y los de las órtesis externas (parte 3).',
    aplicacion: 'Vocabulario de la página: amputación transfemoral, muñón, socket (encaje), alineación de banco.',
  },
  {
    id: 'niveles-k', grupo: 'protesis', nombre: 'Niveles funcionales K0–K4', anio: null, estado: 'aplicada', verificada: false,
    titulo: 'Medicare Functional Classification Levels (CMS, Estados Unidos)',
    regula: 'Clasifica a los usuarios de prótesis por su capacidad de marcha: K1 doméstico, K2 comunitario básico, K3 comunitario activo y K4 alto rendimiento. K0 corresponde a quien no puede deambular.',
    aplicacion: 'El nivel K elegido cambia la velocidad y cadencia de marcha, la flexión en balanceo y los factores de carga e impacto. Los valores numéricos por nivel son estimaciones nuestras, no parte de la clasificación.',
  },
  {
    id: 'lgs', grupo: 'salud', nombre: 'Ley General de Salud', anio: null, estado: 'requerida', verificada: false,
    titulo: 'Ley General de Salud (México), artículos 194 Bis y 262',
    regula: 'Considera a las prótesis como dispositivos médicos, es decir, insumos para la salud sujetos a control sanitario.',
    aplicacion: 'Para entregarse a un paciente, la prótesis debe tratarse como dispositivo médico y cumplir el control sanitario de COFEPRIS.',
  },
  {
    id: 'nom-241', grupo: 'salud', nombre: 'NOM-241-SSA1-2025', anio: 2025, estado: 'requerida', verificada: true,
    titulo: 'Buenas prácticas de fabricación de dispositivos médicos',
    regula: 'Fija los requisitos mínimos para fabricar, acondicionar, almacenar y distribuir dispositivos médicos en México. La vigila COFEPRIS.',
    aplicacion: 'Un taller que fabrique la prótesis para pacientes tendría que cumplirla: control de materiales, registros de maquinado, inspección y trazabilidad.',
    nota: 'Publicada en el DOF el 4 de abril de 2025; vigente desde el 30 de noviembre de 2025. Sustituyó a la NOM-241-SSA1-2021.',
  },
  {
    id: 'nom-137', grupo: 'salud', nombre: 'NOM-137-SSA1-2008', anio: 2008, estado: 'requerida', verificada: true,
    titulo: 'Etiquetado de dispositivos médicos',
    regula: 'Indica la información que debe llevar la etiqueta de un dispositivo médico: fabricante, lote, instrucciones y advertencias.',
    aplicacion: 'La prótesis terminada necesitaría etiqueta con peso máximo del usuario, nivel de actividad, lote y fabricante.',
    nota: 'Cambio en curso: la NOM-137-SSA1-2025 se publicó en el DOF el 19 de mayo de 2026 y la sustituirá; su cumplimiento será obligatorio a partir del 14 de mayo de 2027.',
  },
  {
    id: 'iso-13485', grupo: 'salud', nombre: 'ISO 13485', anio: 2016, estado: 'requerida', verificada: false,
    titulo: 'Productos sanitarios — Sistemas de gestión de la calidad — Requisitos para fines reglamentarios',
    regula: 'Describe el sistema de calidad que debe tener quien diseña y fabrica dispositivos médicos.',
    aplicacion: 'Paso futuro para una fabricación formal. La simulación y los planos serían parte del expediente de diseño.',
  },
  {
    id: 'iso-14971', grupo: 'salud', nombre: 'ISO 14971', anio: 2019, estado: 'aplicada', verificada: false,
    titulo: 'Productos sanitarios — Aplicación de la gestión de riesgos a los productos sanitarios',
    regula: 'Establece cómo identificar los peligros de un dispositivo médico, estimar sus riesgos y controlarlos.',
    aplicacion: 'Se aplica en la tabla de riesgos de la rodilla (más abajo): cada riesgo con su causa, su efecto y la mitigación del diseño.',
  },
  {
    id: 'iso-10993-1', grupo: 'salud', nombre: 'ISO 10993-1', anio: 2025, estado: 'requerida', verificada: true,
    titulo: 'Evaluación biológica de productos sanitarios — Parte 1: Requisitos y principios generales',
    regula: 'Indica cómo evaluar que los materiales en contacto con el cuerpo no causen irritación ni toxicidad.',
    aplicacion: 'Aplica al socket y al liner, que tocan la piel del muñón. La rodilla de aluminio no está en contacto con la piel.',
    nota: 'La edición 2025 (noviembre de 2025) sustituyó a la de 2018.',
  },
  {
    id: 'asme-y14-5', grupo: 'diseno', nombre: 'ASME Y14.5', anio: 2018, estado: 'aplicada', verificada: false,
    titulo: 'Dimensioning and Tolerancing',
    regula: 'Es la norma de acotación y tolerancias geométricas de los planos mecánicos.',
    aplicacion: 'Los planos de la pestaña "Planos" siguen sus reglas: proyección de tercer ángulo, cotas, diámetros, tolerancia general ±0.2 mm y acabado Ra 3.2 µm. Es la misma que usamos en SolidWorks.',
  },
  {
    id: 'astm-b221-b211', grupo: 'diseno', nombre: 'ASTM B221 / B211', anio: null, estado: 'aplicada', verificada: false,
    titulo: 'Especificaciones de barras, perfiles extruidos (B221) y barras laminadas o estiradas (B211) de aleaciones de aluminio',
    regula: 'Fijan la composición y las propiedades mecánicas mínimas del aluminio en barra y perfil.',
    aplicacion: 'De aquí salen la fluencia y la resistencia última mínimas del 6061-T6 y del 7075-T6 que usa el cálculo del factor de seguridad.',
  },
  {
    id: 'winter', grupo: 'biomecanica', nombre: 'Winter (2009)', anio: 2009, estado: 'aplicada', verificada: false,
    titulo: 'D. A. Winter, Biomechanics and Motor Control of Human Movement, 4.ª ed., Wiley',
    regula: 'Libro de referencia de biomecánica: proporciones de los segmentos del cuerpo y curvas de ángulo, momento y fuerza durante la marcha.',
    aplicacion: 'Longitudes de muslo, pierna y pie a partir de la estatura, y curvas de la rodilla sana con las que se compara la prótesis.',
  },
  {
    id: 'perry', grupo: 'biomecanica', nombre: 'Perry y Burnfield (2010)', anio: 2010, estado: 'aplicada', verificada: false,
    titulo: 'J. Perry y J. M. Burnfield, Gait Analysis: Normal and Pathological Function, 2.ª ed., SLACK',
    regula: 'Describe las fases de la marcha humana y su función.',
    aplicacion: 'Fases del ciclo de marcha en la línea de tiempo: contacto de talón, apoyo medio, apoyo final, despegue y balanceo.',
  },
  {
    id: 'dempster', grupo: 'biomecanica', nombre: 'Tablas de Dempster (1955)', anio: 1955, estado: 'aplicada', verificada: false,
    titulo: 'W. T. Dempster, Space Requirements of the Seated Operator, WADC-TR-55-159',
    regula: 'Tablas clásicas de masa y longitud de cada segmento del cuerpo como fracción del total.',
    aplicacion: 'Masa del muslo, la pierna y el pie como fracción del peso corporal.',
  },
  {
    id: 'radcliffe', grupo: 'biomecanica', nombre: 'Radcliffe (1994)', anio: 1994, estado: 'aplicada', verificada: false,
    titulo: 'C. W. Radcliffe, Four-bar linkage prosthetic knee mechanisms: kinematics, alignment and prescription criteria, Prosthetics and Orthotics International 18',
    regula: 'Artículo de referencia sobre rodillas protésicas de 4 barras: centro instantáneo de rotación, estabilidad y alineación.',
    aplicacion: 'Criterio de estabilidad de la simulación: la rodilla es estable en apoyo cuando la línea de carga pasa por delante del CIR.',
  },
];

// Tabla de riesgos de la rodilla (ISO 14971). Severidad y probabilidad: estimación cualitativa del equipo.
export const RIESGOS = [
  { riesgo: 'Falla de un perno', causa: 'Cortante o flexión por sobrecarga o fatiga', efecto: 'La rodilla pierde un eje y colapsa', severidad: 'Alta', probabilidad: 'Baja',
    mitigacion: 'Pernos de acero clase 8.8 en cortante doble; factor de seguridad ≥ 1.5 verificado en la simulación; revisión periódica del apriete.' },
  { riesgo: 'Doblado inesperado de la rodilla', causa: 'La línea de carga pasa por detrás del CIR durante el apoyo', efecto: 'Caída del usuario', severidad: 'Alta', probabilidad: 'Media',
    mitigacion: 'Mecanismo policéntrico con CIR elevado y posterior en extensión; eje 2 cm detrás de la línea TKA; tope de extensión.' },
  { riesgo: 'Pellizco de dedos o ropa', causa: 'Espacios entre barras que se cierran al flexionar', efecto: 'Lesión leve o daño a la ropa', severidad: 'Media', probabilidad: 'Media',
    mitigacion: 'Cantos redondeados, holgura lateral entre barras y funda cosmética recomendada.' },
  { riesgo: 'Fatiga del aluminio', causa: 'Millones de ciclos de carga en los barrenos de las barras', efecto: 'Grieta y fractura sin aviso', severidad: 'Alta', probabilidad: 'Baja',
    mitigacion: 'Estimación de fatiga a 3 millones de ciclos (ISO 10328), acabado Ra 3.2 µm en barrenos y prueba física pendiente.' },
  { riesgo: 'Aflojamiento de tornillos', causa: 'Vibración y cargas cíclicas', efecto: 'Juego en la articulación', severidad: 'Media', probabilidad: 'Media',
    mitigacion: 'Fijador de roscas y marcas de testigo; revisión en cada mantenimiento.' },
  { riesgo: 'Corrosión', causa: 'Sudor y humedad sobre aluminio sin protección', efecto: 'Pérdida de resistencia con el tiempo', severidad: 'Media', probabilidad: 'Baja',
    mitigacion: 'Anodizado de las piezas; el 6061-T6 resiste bien la corrosión.' },
];

export const NOTA_NORMAS =
  'Esta simulación se basa en estas normas para el análisis y la explicación, pero no es una certificación. ' +
  'Para usarse en pacientes, la prótesis necesita pruebas físicas bajo ISO 10328 y registro sanitario ante COFEPRIS.';

export const norma = (id) => NORMAS.find((n) => n.id === id);
export const etiquetaNorma = (n) => `${n.nombre}${n.anio && !/\d{4}/.test(n.nombre) ? ':' + n.anio : ''}`;
