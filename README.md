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

Cuando el equipo tenga las medidas reales de SolidWorks o los datos del plástico del prototipo,
solo se edita `src/config.js` (`mecanismo`, `piezas`, `pernos`, `materiales`) y se quita `estimado: true`.
La vista 3D, los cálculos, la figura isométrica y los planos se regeneran solos.

`dist/index.html` es un único archivo autocontenido. La simulación no es una certificación:
la prótesis necesita pruebas físicas bajo ISO 10328 y registro sanitario ante COFEPRIS.

## Página web (GitHub Pages)

La página publicada es `index.html` en la raíz: es el resultado ya compilado, no se edita a mano.
`npm run build` lo regenera a partir de `app.html` y `src/`, así que **después de cada cambio hay que
compilar y subir también `index.html`**. Dirección: https://murphylosofer.github.io/Pierna_simulador/
