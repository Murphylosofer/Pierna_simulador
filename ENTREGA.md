# Entrega y traspaso

Estado del simulador al 14 de noviembre de 2026, para continuar haciendo solo ajustes.
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

**Página web:** GitHub Pages sirve `index.html` de la raíz, que es la página compilada (la fuente es
`app.html`). `npm run build` lo regenera; hay que incluirlo en el commit para que la web se actualice.
Dirección: https://murphylosofer.github.io/Pierna_simulador/

## Dónde vive cada cosa

| Archivo | Qué contiene |
|---|---|
| `src/config.js` | **Única fuente** de medidas, materiales, usuario y pistón. `geometria` = piezas reales de SolidWorks y correcciones |
| `src/ensamble.js` | Arma la rodilla desde las piezas reales: resuelve el lazo a 0°, diagnostica el diseño original |
| `src/normas.js` | Normas y referencias, con estado y si la edición está verificada |
| `src/piezas.js` | Las 7 piezas distintas (10 cuerpos + tope) como prismas, en el marco de rodilla |
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

- **Geometría real de SolidWorks** (`Ensamblaje2 (1).STEP` + DXF, 14-nov-2026): AFS1, adaptador femoral inferior,
  eslabones (exterior 100 y interior), Eje superior Ø5 × 55 y Eje inferior Ø5 × 70. Volúmenes dentro del 3 % del STEP.
- **Diagnóstico del ensamble original**: con el eslabón interior de 65 mm el lazo no cierra a 0°; la flexión mínima
  posible es 47.3° (la pose guardada en SolidWorks está en ese punto muerto). Se calcula en vivo en `ensamble.js`.
- **Correcciones aplicadas** (en `config.js → geometria`):
  1. Eslabón interior 65 → 100 mm (cuatro barras iguales).
  2. Chaflán 5 × 45° en la arista trasera inferior de la placa del AFS1 (sin él choca a 129.6°; con él, libre hasta 139°).
  3. Tope de extensión añadido: tornillo M8 que baja de la placa del AFS1 y apoya en la ceja del adaptador inferior.
- Mecanismo sin trabarse ni interferencias de 0° a 135°; CIR a 0° alto (≈184 mm) y 96 mm detrás de la línea de carga.
- Con 6061-T6 y 65 kg: FS mínimo 2.16 (bajar escalón, flexión del eje B de Ø5); pasa P3, P4 y P5 de ISO 10328.
  Masa 463 g (420 g sin el tornillo de tope, igual a la referencia del equipo).
- Planos de las 7 piezas distintas y del ensamble con lista de materiales; cada pieza corregida lleva su nota.
- Caso a mano de pie: coincide con el modelo en reacción, torque, fuerza del tope, eslabones y cortante.

## Pendientes, en orden de importancia

1. **Que el equipo confirme las correcciones** o proponga otras: el eslabón interior de 100 mm, el chaflán del AFS1
   y el tornillo de tope. Si cambian, basta con editar `config.js → geometria` (por ejemplo, poner `centros: 65`
   muestra en la app que la rodilla no se puede armar).
2. **Retención axial de los ejes** (anillos E o prisioneros): no está en SolidWorks.
3. **Material de los ejes**: se supuso acero 8.8; con Ø5 en aluminio no aguantan.
4. **Pistón**: entre B y D necesita 34.7 mm de carrera (72–107 mm entre ojillos) y su longitud no cambia en un solo
   sentido. No cabe en el CDJ2B 16×25/30 del documento; falta decidir otra ubicación. Aún no se dibuja en 3D.
5. **Plástico del prototipo**: sigue el supuesto de PLA al 20 % y escala 1:1.
6. **Verificaciones abiertas**: fuerzas de ISO 10328 de literatura secundaria, años de normas con `verificada: false`,
   citas de libros a la obra y no a la página.
7. El AFS1 reconstruido es 1.9 % más ligero que el STEP y el adaptador inferior 3.2 % (detalles menores no modelados).

## Decisiones ya tomadas por el usuario

- El grupo es **5IV11**.
- El torque de 274.2 N·m se presenta como **límite de diseño** del equipo (65 kg × 9.81 × 0.43 m).
- La entrega es un solo `index.html` que sirve en GitHub Pages y como artifact.
- La rodilla debe ser la del ensamble de SolidWorks del equipo, con los cambios mínimos para que funcione.
- Los colores son guinda del IPN sobre fondo neutro; no cambiar a tema oscuro con verde.
- No se genera código G.
