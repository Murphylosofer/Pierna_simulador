# Entrega y traspaso

Estado del simulador al 12 de noviembre de 2026, para continuar haciendo solo ajustes.
Lee antes `CLAUDE.md` (reglas del repositorio) y `PROMPT.md` (especificación original).

## Cómo trabajar

```bash
npm install
npm run dev                    # desarrollo
npm run build                  # genera dist/index.html (un solo archivo)
npm run revisar                # capturas en PC 1440x900 y teléfono 390x844; falla si hay errores o desborde
node scripts/interferencias.mjs  # falla si alguna pieza choca con otra entre 0° y 135°
node scripts/artefacto.cjs     # versión para publicar como artifact de Claude
```

Antes de cada commit: `npm run build`, `npm run revisar` y `node scripts/interferencias.mjs`.

## Dónde vive cada cosa

| Archivo | Qué contiene |
|---|---|
| `src/config.js` | **Única fuente** de medidas, materiales, usuario, pistón y medidas reales |
| `src/normas.js` | Normas y referencias, con estado y si la edición está verificada |
| `src/piezas.js` | Geometría de las 12 piezas (prismas) a partir de `config.js` |
| `src/cinematica.js` | Cierre de lazo del mecanismo y centro instantáneo de rotación |
| `src/cargas.js` | Estática, esfuerzos, factor de seguridad y prueba ISO 10328 simulada |
| `src/escenarios.js` | Los siete escenarios de movimiento |
| `src/modelo.js` | Une usuario, postura, mecanismo y cargas |
| `src/piston.js` | Estudio cinemático del pistón neumático |
| `src/interferencias.js` | Revisión de choques entre piezas |
| `src/escena3d.js` | Vista 3D (Three.js) |
| `src/figuraIso.js` | Figura isométrica (kit de la skill "anatomy" en `src/iso/`) |
| `src/diagramas.js`, `src/graficas.js` | Diagramas y gráficas |
| `src/planos.js`, `src/exportar.js` | Planos paramétricos y exportación a PDF, SVG, DXF y STL |
| `src/pestanaNormas.js`, `src/supuestos.js` | Pestañas de normas y de validación, supuestos y fórmulas |
| `src/main.js`, `src/estilos.css` | Armazón de la página, controles y estilos |

## Lo que está hecho y verificado

- Mecanismo resuelto de 0° a 135° sin trabarse y sin interferencias entre piezas.
- Siete escenarios con cargas, torque, esfuerzos y factor de seguridad.
- Materiales: 6061-T6, 7075-T6 y PLA impreso (supuesto), con comparación y equivalencias.
- Figura isométrica con orden de dibujo por planos separadores; auditoría de líneas de la skill en 0.
- Planos de las 12 piezas y del ensamble, con las cuatro exportaciones probadas.
- Fórmulas con su fuente en la pestaña "Validación y supuestos".

## Pendientes, en orden de importancia

### 1. Reconstruir la geometría con las medidas reales (el más importante)

Los planos de SolidWorks están en Drive, carpeta `Claude/Rodilla medidas`. Sus cotas ya están en
`config.js → medidasReales`, pero **no se aplicaron**: de los PDF solo se pudo extraer el texto de las
cotas, no ver el dibujo, así que no se sabe a qué forma corresponde cada una.

Lo que sí se sabe:

- El diseño real usa dos **horquillas en U** (AFS1 arriba y "adaptador femoral inferior" abajo) de 55 mm de
  ancho exterior, paredes de 4 mm y claro interior de 47 mm, con orejas de radio 10 y barrenos de Ø5.
- El adaptador inferior tiene un cilindro macizo de Ø40 × 40 mm y una base de 75 × 75 mm.
- Los ejes son de **Ø5 mm**: superior de 55 mm de largo e inferior de 70 mm.
- Los eslabones van **dentro** del claro de 47 mm.

La geometría actual es otra: placas con bloques porta-eje macizos al centro y pernos de Ø10. Para
aplicar lo real hace falta ver los cuatro PDF como imagen (pídele al usuario capturas o que los adjunte
al chat) y además los planos de los eslabones, que no están en la carpeta. Con eso:

1. Sustituir en `piezas.js` el adaptador, las barras superiores e inferiores y la base por las dos horquillas.
2. Poner `mecanismo.A/B/C/D` con las posiciones reales de los barrenos.
3. Cambiar `pernos.diametro` a 5 y quitar `estimado: true` de lo confirmado.
4. Correr `node scripts/interferencias.mjs` y `npm run revisar`.

**Aviso:** con el perno de Ø5 sobre la geometría estimada el factor de seguridad cae por debajo de 1
(0.49 al caminar, 0.23 al bajar un escalón, con 65 kg y 6061-T6), porque la flexión del perno crece con
1/d³. No es un resultado válido hasta tener los claros reales, pero conviene revisarlo con el equipo.

### 2. Pistón neumático en 3D

`src/piston.js` ya calcula la longitud entre ojillos de 0° a 135° y la compara con el documento del
equipo (minicilindro Ø16, ojillos de Ø5, retraído 85–95 mm, carrera 25–30 mm). Con los anclajes
propuestos en `config.js → piston` usa 25.9 mm de carrera: alcanza el CDJ2B 16×30, no el 16×25.

No se dibuja en la vista 3D ni en la figura isométrica porque en la geometría estimada cruzaría la base
y la barra superior trasera. Cuando las horquillas reales estén modeladas (pendiente 1), mover los
anclajes a los ejes reales, añadirlo como pieza comercial a la lista de materiales y dibujarlo.

### 3. Confirmar el plástico del prototipo

`config.js → materiales['prototipo-3d']` supone PLA con 20 % de relleno a escala 1:1. Cambiar tipo,
`rellenoPct`, `escala` y propiedades cuando el equipo lo confirme, y quitar `estimado: true`.

### 4. Verificaciones que quedaron abiertas

- Fuerzas y desplazamientos de ISO 10328 transcritos de literatura secundaria: cotejar con la norma.
- Años de las normas con `verificada: false` en `normas.js`.
- Citas de libros de texto de las fórmulas: son a la obra, no a la página.
- El borrador ISO/DIS 10328:2025 no se pudo confirmar.

### 5. Ajustes menores

- La figura isométrica resuelve el orden por profundidad en 4 de 420 poses (a 135° con vista muy lateral).
- El gesto de dos dedos se probó en emulación, no en un teléfono real.
- El peso calculado (515 g con 6061) supera los 420 g del equipo; se corrige con las medidas reales.
- Publicar en GitHub Pages: activar Settings → Pages → Source: GitHub Actions y llevar la rama a `main`.

## Decisiones ya tomadas por el usuario

- El grupo es **5IV11**.
- El torque de 274.2 N·m se presenta como **límite de diseño** del equipo (65 kg × 9.81 × 0.43 m).
- La entrega es un solo `index.html` que sirve en GitHub Pages y como artifact.
- Los colores son guinda del IPN sobre fondo neutro; no cambiar a tema oscuro con verde.
- No se genera código G.
