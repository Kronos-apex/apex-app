#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# APEX · Procesador de fotos de ejercicios
# Toma las fotos que Andrés deja en la carpeta de staging, las normaliza
# (recorte cuadrado centrado + 720x720 + compresión) y las coloca en la
# app con el nombre correcto. Uniforma calidad para las tarjetas Nike +
# lightbox. Requiere ffmpeg.
#
# USO:
#   bash scripts/process-photos.sh                 # usa la carpeta por defecto
#   bash scripts/process-photos.sh /ruta/a/fotos   # usa otra carpeta de entrada
#
# Las fotos de entrada deben llamarse como en FOTOS-EJERCICIOS-LISTA.txt:
#   e1.jpg, e2.jpg, ... (también acepta .jpeg y .png). El nombre se conserva.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$APP_DIR/media/exercises"
IN_DIR="${1:-$APP_DIR/../fotos-nuevas}"   # default: Desktop/apex/fotos-nuevas

SIZE=720          # lado del cuadrado final (px)
QUALITY=3         # mjpeg q:v (2=mejor … 5=más liviano). 3 = buen balance

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "❌ ffmpeg no está instalado o no está en el PATH."; exit 1
fi
if [ ! -d "$IN_DIR" ]; then
  echo "❌ No existe la carpeta de entrada: $IN_DIR"
  echo "   Crea esa carpeta y deja ahí tus fotos (e1.jpg, e2.jpg, ...), o pásame otra ruta."
  exit 1
fi

mkdir -p "$OUT_DIR"
count=0; skipped=0
shopt -s nullglob nocaseglob
for src in "$IN_DIR"/*.jpg "$IN_DIR"/*.jpeg "$IN_DIR"/*.png; do
  base="$(basename "$src")"
  name="${base%.*}"                 # e17  (sin extensión)
  # Validar que el nombre sea eN (evita procesar basura por error)
  if [[ ! "$name" =~ ^e[0-9]+$ ]]; then
    echo "⏭️  $base — nombre no es eN (ej. e17.jpg). Sáltalo o renómbralo."; skipped=$((skipped+1)); continue
  fi
  dst="$OUT_DIR/$name.jpg"
  # Encuadre cuadrado SIN perder la técnica del ejercicio:
  #  - Si la fuente ya es cuadrada → solo escala a 720 (no recorta nada).
  #  - Si NO es cuadrada (vertical/horizontal) → NO se recorta el sujeto. Se hace
  #    "fit" completo de la imagen dentro del cuadro y se rellenan los lados con
  #    una copia desenfocada y oscurecida del propio fondo (sin bordes duros).
  #    Esto conserva extremos críticos (pies en talones, manos/agarre, etc.).
  W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width  -of csv=p=0 "$src")
  H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$src")
  if [ "${W:-0}" = "${H:-0}" ]; then
    ffmpeg -y -loglevel error -i "$src" \
      -vf "scale=${SIZE}:${SIZE}:flags=lanczos" \
      -frames:v 1 -q:v "$QUALITY" "$dst"
  else
    ffmpeg -y -loglevel error -i "$src" -filter_complex \
      "split=2[bg][fg];[bg]scale=${SIZE}:${SIZE}:force_original_aspect_ratio=increase,crop=${SIZE}:${SIZE},gblur=sigma=24,eq=brightness=-0.07:saturation=0.9[bgb];[fg]scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease:flags=lanczos[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2,format=yuv420p" \
      -frames:v 1 -q:v "$QUALITY" "$dst"
  fi
  kb=$(( ($(wc -c < "$dst")) / 1024 ))
  echo "✅ $base → media/exercises/$name.jpg  (${SIZE}x${SIZE}, ${kb} KB)"
  count=$((count+1))
done

echo ""
echo "── Listo: $count procesadas, $skipped saltadas → $OUT_DIR"
echo "   Recuerda correr el audit antes de commitear: python scripts/hooks/pre-commit"
