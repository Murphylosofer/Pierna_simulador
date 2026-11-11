// Normas y referencias citadas (ver CLAUDE.md).
// estado: 'aplicada' | 'referencia' | 'requerida'
// `verificada: false` = falta confirmar la versión vigente y redactar regula/aplicacion.

const n = (id, nombre, anio, estado, regula = '', aplicacion = '') =>
  ({ id, nombre, anio, estado, regula, aplicacion, verificada: false });

export const NORMAS = [
  // Prótesis y pruebas mecánicas
  n('iso-10328', 'ISO 10328', 2016, 'aplicada'),
  n('iso-22675', 'ISO 22675', null, 'referencia'),
  n('iso-22523', 'ISO 22523', null, 'referencia'),
  n('iso-13405', 'ISO 13405', null, 'referencia'),
  n('iso-8549', 'ISO 8549 (partes 1 y 3)', null, 'referencia'),
  n('niveles-k', 'Niveles funcionales K0–K4 (Medicare/CMS)', null, 'aplicada'),
  // Salud y dispositivos médicos
  n('lgs', 'Ley General de Salud', null, 'requerida'),
  n('nom-241', 'NOM-241-SSA1-2025', 2025, 'requerida'),
  n('nom-137', 'NOM-137-SSA1-2008', 2008, 'requerida'),
  n('iso-13485', 'ISO 13485', 2016, 'requerida'),
  n('iso-14971', 'ISO 14971', 2019, 'aplicada'),
  n('iso-10993-1', 'ISO 10993-1', null, 'requerida'),
  // Diseño, dibujo y materiales
  n('asme-y14-5', 'ASME Y14.5', null, 'referencia'),
  n('astm-b221-b211', 'ASTM B221 / B211', null, 'aplicada'),
  // Referencias biomecánicas
  n('winter', 'Winter, Biomechanics and Motor Control of Human Movement', null, 'aplicada'),
  n('perry', 'Perry, Gait Analysis', null, 'aplicada'),
  n('dempster', 'Tablas de Dempster', null, 'aplicada'),
];

export const NOTA_NORMAS =
  'Esta simulación se basa en estas normas para el análisis y la explicación, pero no es una certificación. ' +
  'Para usarse en pacientes, la prótesis necesita pruebas físicas bajo ISO 10328 y registro sanitario ante COFEPRIS.';
