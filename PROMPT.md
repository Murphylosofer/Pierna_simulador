# Prompt para Fable — Simulación de prótesis transfemoral con rodilla policéntrica de 4 barras

## Skills a usar
- **anatomy** → figura isométrica explicativa del mecanismo de 4 barras (piezas, ejes, centro instantáneo de rotación).
- **frontend-design** y **ui-ux-pro-max** → interfaz, controles, diseño responsivo (PC primero, usable en teléfono).
- **dataviz** → gráficas de ángulo, torque, fuerza y factor de seguridad.

Entrega todo como **un solo artifact HTML** (página web compartible por link), con Three.js para la vista 3D.

---

## Contexto del proyecto
Somos el grupo 4IV11 del CECyT No. 3 "Estanislao Ramírez Ruiz" (IPN), especialidad Manufactura Asistida por Computadora. Proyecto: **"Diseño de una prótesis de pierna ligera, resistente, con rodilla de aluminio mediante el uso de IA para mejorar la movilidad del usuario"**. Objetivo: una prótesis **de bajo costo**, fabricable en talleres escolares con CNC, para personas con **amputación transfemoral** en México.

Datos de nuestro diseño (úsalos como base y como valores de referencia):
- Rodilla **policéntrica de 4 barras** (no bisagra simple), con **centro instantáneo de rotación (CIR) variable**. El eje coincide con el eje anatómico, unos **2 cm posterior** a la línea media.
- Partes: soporte/adaptador superior (con receptáculo circular para el socket), barra superior delantera, barra superior trasera, barras laterales "c1" y "c2", barra trasera, barras inferiores, base inferior con tubo para el pilón. Total **12 piezas maquinadas**, **peso ≈ 420 g**.
- Rango de flexión: **0° a 135°** (permite sentarse y agacharse).
- Paciente de diseño: **65 kg**, factor de seguridad **1.5×** → capacidad de diseño **97.5 kg** (soporta hasta ~98 kg estático).
- Torque de flexión máximo calculado: **274.2 N·m** en fase de balanceo.
- Longitud del muñón típica: **35–40 cm** para una estatura de **1.65 m**.
- Tolerancias de maquinado ±0.2 mm, acabado Ra < 3.2 µm.
- Clasificación funcional de usuarios: **K1** doméstico, **K2** comunitario básico, **K3** comunitario activo, **K4** alto rendimiento.
- Prototipo previo impreso en 3D a escala para validar ensambles y rango de movimiento.
- Componentes distales: **pie SACH** + **pilón de aluminio**.

**Medidas de las piezas:** por ahora **estímalas** a partir de la descripción (proporciones típicas de rodillas de 4 barras comerciales para un adulto de 1.65 m). Márcalas claramente como "estimadas" y deja todas las dimensiones en **un solo objeto de configuración** al inicio del código, para que después yo te pase las medidas reales de SolidWorks y solo se reemplacen.

---

## Qué debe hacer la simulación

### 1. Escena 3D
- **Maniquí completo** sencillo (sin rasgos faciales), con **una pierna sana** y **la prótesis completa**: socket, rodilla de 4 barras, pilón y pie SACH. La cámara se centra en la rodilla.
- La rodilla debe verse con detalle: barras, pernos/ejes, adaptador superior y base inferior, con aspecto de aluminio maquinado.
- **Cámara libre en todo el espacio 3D** (girar, acercar, desplazar) con mouse **y con gestos táctiles** en teléfono (arrastrar, pellizcar, dos dedos para mover).
- Botones de vistas rápidas: **Isométrica**, Frontal, Lateral, Posterior, Superior, y "Centrar en rodilla".
- Opción de mostrar el **CIR** (punto que se mueve), las **líneas de las barras extendidas** que lo definen, la **línea de carga** (fuerza de reacción del suelo) y vectores de fuerza.
- Opción de vista "transparente / despiece" para ver las piezas por separado.

### 2. Figura isométrica explicativa (skill anatomy)
En una pestaña o sección aparte: figura isométrica interactiva del mecanismo de 4 barras que explique **cómo funciona**: un control deslizante de 0° a 135° que mueve el mecanismo, con el CIR marcado y etiquetas de cada pieza. Lectura en vivo del ángulo y la posición del CIR. Debe poder girarse entre ángulos de vista (no solo isométrico fijo).

### 3. Movimiento (cinemática)
- Resuelve el mecanismo de 4 barras **de verdad** (ecuación de cierre de lazo), no una animación falsa: dado el ángulo de flexión, calcula la posición de cada barra y del CIR.
- Explica la **estabilidad**: cuando el CIR queda detrás de la línea de carga, la rodilla es estable en apoyo; muéstralo con color (verde estable / rojo inestable).
- **Escenarios** seleccionables, todos con la pierna completa en uso real:
  1. Bipedestación (de pie quieto).
  2. **Ciclo de marcha** completo: contacto de talón, apoyo medio, despegue, balanceo. Velocidad según nivel K.
  3. Sentarse y levantarse (hasta 135°).
  4. Agacharse.
  5. Subir escalón (paso a paso, como lo haría una rodilla pasiva).
  6. Bajar escalón / rampa.
  7. **Tropiezo o impacto** (carga dinámica alta).
- Controles: reproducir/pausar, velocidad, cuadro por cuadro, y una línea de tiempo con la fase actual del ciclo.

### 4. Cargas, torque y esfuerzos
- Calcula en tiempo real: fuerza de reacción del suelo, **torque en la rodilla**, fuerzas en cada barra, cortante en pernos, esfuerzo de flexión en las barras, y **factor de seguridad** (= esfuerzo de fluencia / esfuerzo máximo).
- Usa factores de carga realistas según la actividad (por ejemplo, ~1.1–1.2× el peso al caminar, más en escaleras y 2–3× en impacto); **verifica estos valores con fuentes de biomecánica** y cítalas.
- **Mapa de esfuerzos** sobre las piezas: color azul → verde → amarillo → rojo según el esfuerzo. Aclara que es un cálculo aproximado (vigas y pernos), no un FEA completo.
- Muestra siempre la comparación con nuestro valor de referencia de **274.2 N·m** y con la capacidad de diseño de **97.5 kg**.
- Alerta visual si el factor de seguridad baja de 1.5 o de 1.0.

### 5. Material (selector)
- **Aluminio 7075-T6**.
- **El aluminio ideal de bajo costo para este tipo de prótesis** (probablemente 6061-T6; confírmalo e indica por qué es la mejor opción costo/maquinabilidad/resistencia para un taller escolar).
- **Plástico del prototipo impreso en 3D**: deja la opción preparada pero vacía. Después te diré qué plástico usamos (tipo, % de relleno, escala) para que calcules las **equivalencias** entre el prototipo y la pieza de aluminio.
- Al cambiar el material, recalcula peso, esfuerzos y factor de seguridad.

### 6. Medidas del usuario (ajustables)
- **Peso** y **estatura**.
- **Lado amputado**: izquierdo o derecho.
- **Nivel K (K1–K4)**: cambia velocidad de marcha, cargas e impactos.
- **Longitud del muñón y de los segmentos** (muslo, pierna, pie, altura de rodilla): se calculan **automáticamente como promedio a partir de estatura y peso** (proporciones antropométricas estándar, p. ej. Winter/Dempster; cítalas), pero el usuario puede **ajustarlas manualmente** con un botón "personalizar" y regresar a "automático".
- Al cambiar cualquier medida, el maniquí, la prótesis y todos los cálculos se actualizan.

### 7. Gráficas y diagramas de movimiento
- Gráficas sincronizadas con la animación: ángulo de rodilla, torque, fuerza de reacción y factor de seguridad a lo largo del ciclo.
- **Comparación contra marcha normal**: superpone las curvas de la prótesis con las curvas normativas de una rodilla sana (datos de Winter y de Perry), en % del ciclo de marcha.
- **Diagrama cinemático** del mecanismo de 4 barras (líneas y pernos, estilo libro de mecanismos) sincronizado con la vista 3D.
- **Centroda**: trayectoria del centro instantáneo de rotación de 0° a 135°.
- **Diagramas de cuerpo libre** de cada barra, con fuerzas y reacciones en los pernos para el instante actual.
- **Torque vs. ángulo** y **fuerza vs. tiempo**.
- **Zona de estabilidad y alineación de banco**: línea de carga de trocánter-rodilla-tobillo (línea TKA), mostrando si el CIR queda en zona estable.
- Panel con los valores actuales.

### 8. Dos modos
- **Modo Presentación** (para el jurado): visual y claro, con explicaciones breves de "¿Qué significa esto en la realidad?" en cada dato, como en nuestras diapositivas.
- **Modo Técnico** (para el equipo): fórmulas, valores intermedios, supuestos y unidades.
- Un botón para cambiar entre ambos.

### 9. Normas y estándares en los que nos basamos (visible para el jurado)
Crea una sección/pestaña **"Normas"** y, además, en cada cálculo o escenario muestra una pequeña etiqueta con la norma en la que se basa (por ejemplo "ISO 10328 · Nivel P4"). Al tocar la etiqueta se abre su explicación.

Para cada norma muestra: **nombre y año**, **qué regula** (1–2 frases sencillas), **cómo se aplica en esta simulación** y un estado:
- 🟢 **Aplicada en la simulación** (los cálculos la usan),
- 🔵 **Referencia de diseño** (guió el diseño, no se calcula),
- 🟠 **Requerida para fabricación/uso real** (no se cumple con una simulación; es un paso futuro).

**Antes de usarlas, verifica la versión vigente de cada una** y corrige el año si cambió.

**Normas de prótesis y pruebas mecánicas**
- **ISO 10328:2016**: pruebas estructurales de prótesis de miembro inferior (incluye transfemorales). Usa sus **niveles de carga según la masa del usuario (P3, P4, P5 y superiores)** y sus condiciones de carga (talón y antepié) para decir qué nivel pasaría la rodilla con cada material, con pruebas estáticas y de fatiga simuladas. Hay una revisión en borrador (ISO/DIS 10328:2025); menciónala si aplica.
- **ISO 22675**: pruebas de pie-tobillo, para el pie SACH.
- **ISO 22523**: requisitos generales de prótesis y órtesis externas.
- **ISO 13405**: clasificación y descripción de componentes protésicos (nombres correctos de las piezas).
- **ISO 8549 (partes 1 y 3)**: vocabulario de prótesis y órtesis.
- **Niveles funcionales K0–K4** (clasificación de Medicare/CMS): para elegir el tipo de rodilla según la actividad del usuario.

**Normas de salud y dispositivos médicos (México e internacionales)**
- **Ley General de Salud**: las prótesis se consideran **dispositivos médicos / insumos para la salud**.
- **NOM-241-SSA1-2025**, Buenas prácticas de fabricación de dispositivos médicos (vigente desde el 30 de noviembre de 2025; sustituyó a la NOM-241-SSA1-2021). Regulada por **COFEPRIS**.
- **NOM-137-SSA1-2008**, Etiquetado de dispositivos médicos.
- **ISO 13485:2016**: sistema de gestión de calidad para dispositivos médicos.
- **ISO 14971:2019**: gestión de riesgos. Incluye una **tabla de riesgos** de la rodilla (falla de perno, doblado inesperado, pellizco, fatiga) con la mitigación de nuestro diseño.
- **ISO 10993-1**: biocompatibilidad de las partes en contacto con la piel (socket/liner).

**Normas de diseño, dibujo y materiales**
- **ASME Y14.5 / ISO** para planos y tolerancias (ya los usamos en SolidWorks).
- **ASTM B221 / B211** (barras y perfiles de aluminio) para las propiedades del 6061-T6 y del 7075-T6.

**Referencias biomecánicas**
- Winter, *Biomechanics and Motor Control of Human Movement* (antropometría y datos de marcha).
- Perry, *Gait Analysis* (fases de la marcha).
- Tablas de Dempster (masa y longitud de los segmentos).

Al final de la sección agrega una nota clara: **"Esta simulación se basa en estas normas para el análisis y la explicación, pero no es una certificación. Para usarse en pacientes, la prótesis necesita pruebas físicas bajo ISO 10328 y registro sanitario ante COFEPRIS."**

### 10. Generación de planos (paramétricos)
Agrega una pestaña **"Planos"** que genere los planos de cada pieza **a partir de las mismas dimensiones de la configuración**. Si cambian las medidas del usuario o las reales de SolidWorks, los planos se actualizan solos.
- Un plano por pieza (las 12) y un **plano de ensamble** con **lista de materiales (BOM)** y globos numerados.
- Vistas ortogonales (frontal, superior, lateral) en **proyección de tercer ángulo**, con vista isométrica de referencia y cortes donde haga falta (por ejemplo, en los barrenos de los pernos).
- Acotación bajo **ASME Y14.5**: cotas, diámetros de barrenos, tolerancias (±0.2 mm general, ajustes de pernos indicados) y acabado superficial (Ra 3.2 µm).
- **Cuadro de datos** con escuela, grupo 4IV11, nombre de la pieza, material elegido, escala, unidades (mm), fecha y "Revisó".
- Marca las cotas estimadas con un símbolo distinto hasta que yo te pase las reales.
- **Exportar**: PDF para imprimir, SVG, **DXF** (que abra en SolidWorks/AutoCAD como base 2D) y **STL** de cada pieza para imprimir en 3D.
- Aclara en la página que estos planos son de apoyo y que los planos oficiales para el CNC salen de SolidWorks. **No generes código G.**

---

## Requisitos de diseño
- Todo en **español**.
- Pensado para **PC** (pantalla de proyección), pero **totalmente usable en teléfono**: paneles que se plieguen, botones grandes, controles táctiles, buen rendimiento en celulares de gama media.
- Estilo técnico y limpio, aluminio cepillado para la rodilla, fondo neutro; colores del proyecto: guinda/vino (#6B1E46 aprox.) del IPN como acento.

## Validación
Antes de entregar:
1. Verifica que el mecanismo no se trabe ni se cruce en todo el rango 0°–135°.
2. Comprueba con un caso a mano (65 kg, de pie y en impacto) que los números del cálculo son coherentes y muéstralo en el modo técnico.
3. Comprueba que las cargas de prueba usadas corresponden al nivel ISO 10328 correcto para el peso elegido.
4. Lista al final todos los **supuestos** (medidas estimadas, factores de carga, material) para que podamos corregirlos.

## Datos que te daré después
- Tabla de dimensiones reales de las piezas (planos SolidWorks).
- Tipo de plástico del prototipo impreso, % de relleno y escala.
Cuando te los pase, solo actualiza la configuración y recalcula, sin rehacer la página.
