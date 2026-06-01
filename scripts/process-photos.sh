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
  # Recorte cuadrado centrado (lado = min(w,h)) → escala a 720 con lanczos → JPEG
  ffmpeg -y -loglevel error -i "$src" \
    -vf "crop='min(iw,ih)':'min(iw,ih)',scale=${SIZE}:${SIZE}:flags=lanczos" \
    -frames:v 1 -q:v "$QUALITY" "$dst"
  kb=$(( ($(wc -c < "$dst")) / 1024 ))
  echo "✅ $base → media/exercises/$name.jpg  (${SIZE}x${SIZE}, ${kb} KB)"
  count=$((count+1))
done

echo ""
echo "── Listo: $count procesadas, $skipped saltadas → $OUT_DIR"
echo "   Recuerda correr el audit antes de commitear: python scripts/hooks/pre-commit"
