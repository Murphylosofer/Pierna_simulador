#!/usr/bin/env bash
# Genera las vistas SVG (para verlas en la pestaña Planos) de los PDF de SolidWorks en "ESTUDIOS y STL/PDF".
# Requiere poppler (pdftocairo). Uso: bash scripts/vistas_pdf.sh
set -euo pipefail
cd "$(dirname "$0")/.."
for f in "ESTUDIOS y STL/PDF/"*.pdf; do
  n="$(basename "$f" .pdf)"
  pdftocairo -svg "$f" "src/planosSW/$n.svg"
done
