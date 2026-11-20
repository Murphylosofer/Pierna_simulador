# Entrega y traspaso

Estado del simulador al 20 de noviembre de 2026, para continuar haciendo solo ajustes.
El reporte de la última actualización (STL y estudios de SolidWorks) está en `REPORTE.md`.
Lee antes `CLAUDE.md` (reglas del repositorio) y `PROMPT.md` (especificación original).

## Cómo trabajar

```bash
npm install
npm run dev                    # desarrollo
npm run build                  # genera dist/index.html (un solo archivo)
npm run revisar                # capturas en PC 1440x900 y teléfono 390x844; falla si hay errores o desborde
node scripts/interferencias.mjs  # lista choques entre 0° y 135°; falla solo si choca el tope escondido
node scripts/artefacto.cjs     # versión para publicar como artifact de Claude
```

Antes de cada commit: `npm run build`, `npm run revisar` y `node scripts/interferencias.mjs`.

**Página web:** GitHub Pages sirve `index.html` de la raíz, que es la página compilada (la fuente es
`app.html`). `npm run build` lo regenera; hay que incluirlo en el commit para que la web se actualice.
Dirección: https://murphylosofer.github.io/Pierna_simulador/

## Dónde vive cada cosa

| Archivo | Qué contiene |
|---|---|
| `src/config.js` | **Única fuente** de medidas, materiales, usuario y pistón. `geometria` = piezas de los STL y el tope escondido; `solidworks` = estudios reales |
| `src/ensamble.js` | Arma la rodilla desde las piezas reales, construye el tope escondido y verifica contra los STL |
| `src/recursos.js` | Incrusta los STL y las capturas de `ESTUDIOS y STL/` en la página |
| `src/pestanaSolidWorks.js` | Pestaña "Validación con SolidWorks": selector de carga, resultados y capturas |
| `src/normas.js` | Normas y referencias, con estado y si la edición está verificada |
| `src/piezas.js` | Las 5 piezas distintas (10 cuerpos): STL para la vista 3D y prismas con las mismas medidas para planos y choques |
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

- **Geometría de los STL de SolidWorks** (`ESTUDIOS y STL/STL Rodilla`, Ensamblaje1): la vista 3D dibuja los STL tal cual.
  Centros de los ejes del mecanismo contra los STL: diferencia máxima 0.006 mm. Cuatro eslabones iguales de 80 mm:
  par diagonal A–D por dentro (ejes de 55), par trasero B–C por fuera (ejes de 70).
- **Única modificación:** tope de extensión escondido bajo la placa del AFS1 (`config.js → geometria.topeOculto`).
  Se quitaron el tornillo M8 y el chaflán de la versión anterior.
- **Estudios de SolidWorks** en `config.js → solidworks` y en la pestaña SolidWorks (selector 736 N / 2,200 N / libre).
- Choques de los STL detectados y **no corregidos**: eslabón diagonal × eje de 70 en B desde 53.3°, × placa del AFS1 desde 90.1°.
- Masas del reporte de SolidWorks: 386 g (+15 g del tope escondido).
- Caso a mano de pie (con el tope escondido) coincide con el modelo en reacción, torque, fuerzas, tope y eje A.

## Pendientes, en orden de importancia

Ver `REPORTE.md → Dudas`. En corto: el choque a 53°, la carga del eje A con el tope escondido, dibujar el tope en
SolidWorks, la retención axial de los ejes y la ubicación del pistón.

## Decisiones ya tomadas por el usuario

- El grupo es **5IV11**.
- El torque de 274.2 N·m se presenta como **límite de diseño** del equipo (65 kg × 9.81 × 0.43 m).
- La entrega es un solo `index.html` que sirve en GitHub Pages y como artifact.
- La rodilla debe ser idéntica a los STL del equipo; la única modificación permitida es el tope de extensión escondido.
- Si algo no encaja, se avisa (no se corrige por cuenta propia).
- Los colores son guinda del IPN sobre fondo neutro; no cambiar a tema oscuro con verde.
- No se genera código G.
