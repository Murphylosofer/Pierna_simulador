# Simulación de prótesis transfemoral – Rodilla policéntrica de 4 barras

Proyecto del grupo 5IV11, CECyT No. 3 "Estanislao Ramírez Ruiz" (IPN), para el 14° Encuentro de Mejores Proyectos Aula 2026.

- `PROMPT.md`: especificación completa de la simulación.
- `CLAUDE.md`: reglas del repositorio.
- `src/config.js`: única fuente de dimensiones, materiales y medidas del usuario.
- `src/normas.js`: normas y referencias citadas.

## Uso

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera dist/ (lista para GitHub Pages)
npm run revisar  # capturas con Playwright en PC (1440x900) y teléfono (390x844)
node scripts/artefacto.cjs  # versión de dist/index.html lista para publicarse como artifact de Claude
```

Al hacer push a la rama principal, `.github/workflows/pages.yml` compila y publica `dist/` en GitHub Pages
(en el repositorio: Settings → Pages → Source: GitHub Actions).

## Cómo actualizar las medidas

La geometría de la rodilla es la de los STL de SolidWorks del equipo (`ESTUDIOS y STL/STL Rodilla`), que la vista 3D
dibuja tal cual; sus medidas están en `src/config.js → geometria`, con una sola modificación: el tope de extensión
escondido. Los resultados de SolidWorks Simulation están en `src/config.js → solidworks`. Para cambiar una medida o el
plástico del prototipo solo se edita `src/config.js`. Los cálculos, la figura isométrica y los planos se regeneran solos.
Si cambian los STL, hay que reemplazar los archivos en `ESTUDIOS y STL/STL Rodilla` (mismos nombres) y revisar
`config.js` (ver `REPORTE.md`).

`dist/index.html` es un único archivo autocontenido. La simulación no es una certificación:
la prótesis necesita pruebas físicas bajo ISO 10328 y registro sanitario ante COFEPRIS.

## Página web (GitHub Pages)

La página publicada es `index.html` en la raíz: es el resultado ya compilado, no se edita a mano.
`npm run build` lo regenera a partir de `app.html` y `src/`, así que **después de cada cambio hay que
compilar y subir también `index.html`**. Dirección: https://murphylosofer.github.io/Pierna_simulador/
