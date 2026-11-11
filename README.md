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
```

Al hacer push a `main`, `.github/workflows/pages.yml` publica `dist/` en GitHub Pages
(en el repositorio: Settings → Pages → Source: GitHub Actions).
