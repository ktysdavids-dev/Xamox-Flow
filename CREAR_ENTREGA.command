#!/bin/bash
# Crea en el Escritorio un ZIP con la entrega previa al .aab (build + guías).

cd "$(dirname "$0")"
OUTPUT="$HOME/Desktop/Entrega_XamoxFlow_PreAAB.zip"
TEMP="$HOME/Desktop/entrega_temp_$$"
mkdir -p "$TEMP"

echo "Preparando entrega..."

# Copiar build
if [ -d "frontend/build" ]; then
  cp -R frontend/build "$TEMP/build"
else
  echo "No hay carpeta frontend/build. Ejecuta antes CREAR_BUILD_Y_ZIP.command"
  read -p "Press Enter to close."
  rm -rf "$TEMP"
  exit 1
fi

# Copiar guías
[ -f "CREAR_AAB.md" ] && cp CREAR_AAB.md "$TEMP/"
[ -f "GOOGLE_PLAY_BUILD.md" ] && cp GOOGLE_PLAY_BUILD.md "$TEMP/"
[ -f "README_ENTREGA.txt" ] && cp README_ENTREGA.txt "$TEMP/"

# Crear ZIP
rm -f "$OUTPUT"
cd "$TEMP" && zip -r "$OUTPUT" . && cd "$(dirname "$0")" >/dev/null
rm -rf "$TEMP"

echo ""
echo "Listo. Entregable en el Escritorio:"
echo "  Entrega_XamoxFlow_PreAAB.zip"
echo ""
open "$HOME/Desktop"
read -p "Press Enter to close."
