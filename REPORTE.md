# Reporte de la rodilla (20-nov-2026)

## Versión ajustada para la presentación (la que está publicada)

Pedido del equipo: que la rodilla llegue a 135° y que no aparezcan alertas, cambiando lo menos posible.
Todo se controla en `src/config.js`:

| Ajuste | Dónde | Para volver a la versión fiel |
|---|---|---|
| Dos ranuras traseras en la placa del AFS1 | `geometria.recortes` | `recortes.activos: false` |
| Eje de 70 mm de B partido en dos ejes cortos | `geometria.recortes.ejeB` | `recortes.activos: false` |
| Ejes de acero 8.8 (misma forma) | `geometria.ejes.acero` | `acero: false` |
| Sin recuadros rojos de alerta en la simulación | `src/main.js → pintarLecturas` | volver al commit `a93e866` |

La versión fiel completa (STL tal cual, con avisos) es el commit `a93e866` (etiqueta local `v-fiel-stl`):
`git checkout a93e866`.

Con los ajustes la rodilla se dobla **libre de 0° a 135°**: revisado con las mallas STL ajustadas cada 2.5°
(`scripts/recortes_stl.py`) y con los prismas cada 0.1° (primer contacto a 138.7°). El tope escondido sigue
deteniendo la rodilla a 0°.

### Qué hacer en SolidWorks (para el estudio de movimiento)

Los STL ya recortados están en `ESTUDIOS y STL/STL Rodilla ajustada/` para usarlos como referencia
(el AFS1 ajustado ya incluye el tope escondido). Coordenadas en el marco propio del AFS1 (x hacia adelante,
y hacia arriba; el eje B está en x = −55.182, y = 3.357 y el eje A en x = −28.056, y = 8.357).

1. **AFS1 · dos ranuras traseras** (corte extruido, una por lado):
   - Croquis en la vista lateral: una recta que va de la **cara superior en x = −47.0** (8.2 mm delante del eje B)
     al **fondo de la placa en x = −27.5** (0.56 mm delante del eje A). Queda a 25.1° de la horizontal.
     Se quita todo lo que está **detrás y abajo** de esa recta, incluido el labio trasero de la placa.
   - Profundidad: **5.5 mm**, desde la cara interior de cada pared hacia el centro (de z = ±23.5 a z = ±18.0).
     Las paredes no se tocan, así que de lado no se ve; desde arriba se ven dos muescas atrás, junto a las paredes.
   - Quita ≈ 2.0 cm³ (≈ 5.4 g de 6061).
2. **Eje B:** en lugar del eje Ø5 × 70 ("Eslabon2") van **dos ejes Ø5 × 11.5**, uno por lado. Cada uno atraviesa
   el eslabón trasero (5 mm) y la pared (4 mm) y sobresale 2.5 mm por fuera, como antes; termina al ras de la cara
   interior de la pared. El eje C se queda de 70 mm.
3. **Tope escondido:** taco entre las paredes, bajo la placa, delante del eje A. Su cara de apoyo es el canto delantero
   del eslabón diagonal a 0°, desde la placa hasta 9.5 mm abajo del eje A; 6 mm de fondo; aristas R1.5.
   Lo más fácil es tomarlo del STL ajustado del AFS1.
4. Material de los 4 ejes: acero (8.8 o similar). Los ejes cortos de B necesitan retención (anillo o prisionero).

### Dudas que siguen abiertas (no se ven en la página)

- **Eje A:** con el tope junto al eje A, en acero el factor de seguridad queda en ≈1.66 de pie (65 kg) y en
  ≈0.68 en el pico de la marcha y ≈0.36 en un tropiezo (simulación de la página, estática plana). Las piezas de
  aluminio quedan con FS ≥ 2 en marcha. Los valores siguen en la pestaña Técnico, en Validación y en Diagramas.
- **Ejes cortos de B:** quedan en voladizo dentro de la pared de 4 mm; conviene revisarlos en el estudio.
- Repetir los estudios de SolidWorks con las ranuras, el tope y los ejes de acero.

---

## Versión fiel a los STL (commit `a93e866`)

Fuente: carpeta `ESTUDIOS y STL/` (STL de cada pieza de *Ensamblaje1*, reportes PDF de 736 N y 2,200 N y capturas).
Página: https://murphylosofer.github.io/Pierna_simulador/

## Qué se hizo

1. **La rodilla 3D ahora son los STL tal cual.** Los 10 archivos se incrustan en la página y Three.js los lee sin
   escalar, simplificar ni mover vértices. Cada pieza solo se coloca (traslación y giro rígidos) en su cuerpo del
   mecanismo y se mueve por separado en la animación.
   Los centros de los 4 ejes medidos en los STL coinciden con el mecanismo resuelto a 0.006 mm o menos.
2. **Cinemática con la topología real:** cuatro eslabones iguales de 80 mm. Par **diagonal** A–D por dentro de las
   paredes con ejes Ø5 × 55 ("Eje Superior"); par **trasero** B–C por fuera con ejes Ø5 × 70 ("Eslabon2").
   El CIR a 0° queda en (−15, 137) mm, detrás de la línea de carga: la rodilla es estable de pie.
3. **Datos reales de SolidWorks** en `src/config.js → solidworks`: 6061-T6 del reporte (fluencia 275 MPa, tracción
   310 MPa, E = 69 GPa, ν = 0.33, ρ = 2,700 kg/m³), sujeción, carga, contacto "bonded", malla (262,209 elementos)
   y resultados de los dos estudios:

   | Estudio | Carga | Von Mises máx. | FS | Desplazamiento máx. | Deformación máx. |
   |---|---|---|---|---|---|
   | De pie | 736 N | 87.81 MPa | 3.13 | 0.1041 mm | 7.006e-4 |
   | Pico de marcha | 2,200 N | 262.5 MPa | 1.05 | 0.3112 mm | 2.094e-3 |

4. **Pestaña nueva "SolidWorks"** (Validación con SolidWorks): selector de carga 736 N / 2,200 N / valor libre
   (0–3,000 N), con esfuerzo, FS, desplazamiento y deformación. Los colores van de 0 a 275 MPa y quedan calibrados con
   los dos resultados reales (el estudio es lineal: 87.81/736 = 262.5/2200 = 0.1193 MPa por N). Incluye las 6
   capturas, cómo se hizo el estudio y la explicación de la singularidad para el jurado. Cada dato lleva la
   etiqueta **SolidWorks** o **Estimado**.
5. **Tope de extensión escondido** (la única modificación a los STL): un taco de 6 mm maquinado bajo la placa del AFS1,
   entre las dos paredes, delante del eje A. A 0° el canto de los eslabones diagonales apoya en él a lo largo de
   7.8 mm, con aristas R1.5. Queda 0.75 mm arriba del borde inferior de las paredes: por fuera no se ve.
   Se quitó el tornillo M8 de antes y también el chaflán de 5 mm que se había agregado a la placa.
6. **Materiales:** 6061-T6 con las propiedades del reporte (marcado como dato de SolidWorks). 7075-T6 se conserva, marcado
   como estimado (sin estudio). Los ejes ahora son de 6061-T6, como en el reporte (antes se suponía acero).
7. **Masa:** la del reporte, 386 g, más 15 g del tope escondido.
8. Planos, lista de materiales (5 piezas distintas), diagramas de cuerpo libre, validación, caso a mano y documentación
   actualizados. El caso a mano de pie coincide con el modelo en todos los pasos.
9. Revisado con Playwright en PC (1440 × 900) y teléfono (390 × 844): sin errores ni desbordes.
   `scripts/revisar_stl.py` repite la revisión de choques con las mallas STL completas.

## Lo que no se pudo hacer o se supuso

- **No se corrigieron los choques de los STL** (ver la duda 1). La simulación sigue el movimiento completo hasta 135° y
  pinta en rojo las piezas que se enciman, con un aviso.
- **El tope se puso a 0°**, no con 2–3° de hiperextensión, para que coincida con los estudios de SolidWorks (rodilla
  recta). Se cambia en `config.js → geometria.topeOculto.anguloGrados`.
- Las medidas del tope (6 mm de fondo, 9.5 mm de cara, R1.5) las propuso la simulación: están marcadas como estimadas.
- El esfuerzo "lejos del pico" (≈15 MPa con 736 N y ≈45 MPa con 2,200 N) se leyó a ojo de la escala de colores de las
  capturas: es estimado.
- La figura isométrica y los planos se dibujan con prismas de las mismas medidas que los STL (no con la malla). Se midió
  en el STL un labio de la placa del AFS1 que sobresale 3.1 mm por detrás de las paredes y se agregó a esos prismas.
- El modelo de esfuerzos de la página es estática plana (vigas y pernos), no elementos finitos.

## Dudas a resolver (en orden de importancia)

1. **La rodilla solo se dobla 53° antes de chocar.** Con los STL tal cual, el eslabón diagonal (por dentro de las paredes)
   gira hacia atrás y pega con el **eje de 70 mm del punto B** a 53.3°, y con el **labio trasero de la placa del AFS1** a
   90.1°. El eje de 70 atraviesa todo el ancho, así que cruza el camino del eslabón diagonal.
   En el STEP anterior el par de adentro era el B–C y esto no pasaba. ¿Se intercambiaron los pares al armar
   *Ensamblaje1*, o el eje de B debería ser corto (dos pernos que no crucen por dentro)? Para sentarse se necesitan
   ~90–135°.
2. **El tope donde se pidió carga mucho el eje A.** El tope está a solo 5 mm del eje A, así que para frenar la rodilla
   hace una fuerza de 3.8 veces la carga (2.8 kN con 736 N) y el eje A recibe 2.7 kN. Con Ø5 en 6061-T6 eso da 487 MPa
   de flexión con 736 N (FS 0.56); con 65 kg de pie, FS 0.71. SolidWorks no lo ve porque pegó todas las piezas
   (contacto "bonded") y los ejes no trabajan. Opciones (no aplicadas): eje A de acero o más grueso, o un tope entre
   los dos cuerpos lejos de los ejes, como el tornillo de antes.
3. **El pico de 262.5 MPa es una singularidad, pero la zona sí trabaja.** El valor exacto sale de la orilla del contacto
   pegado y sube si se afina la malla. Aun así, con la rodilla apoyada en el tope, el eslabón diagonal se flexiona:
   el modelo da 216 MPa con 2,200 N (72 MPa con 736 N). Conviene repetir el estudio con contacto "sin penetración" y
   pernos, o con un control de malla, para ver si el valor converge.
4. **Dibujar el tope en SolidWorks** y volver a correr los dos estudios con él.
5. **Pistón:** se sigue estudiando entre B y D. Con los nombres nuevos ("Eje Superior" ahora está en A y D), hay que
   confirmar en qué ejes va.
6. **Retención axial de los ejes** (anillos o prisioneros): no está en los STL.

## Dónde está cada cosa

- Medidas, tope y datos de SolidWorks: `src/config.js` (`geometria`, `geometria.topeOculto`, `solidworks`).
- STL y capturas originales: `ESTUDIOS y STL/` (no se modificaron).
- Pestaña de SolidWorks: `src/pestanaSolidWorks.js`. Tope y verificación contra STL: `src/ensamble.js`.
