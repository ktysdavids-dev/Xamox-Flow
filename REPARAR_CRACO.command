#!/bin/bash
# Arregla el error: "Class extends value undefined" en ajv (Craco / webpack / workbox).
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/frontend" || exit 1

echo ""
echo "Reinstalando dependencias del frontend con versiones fijas de ajv…"
echo "(puede tardar varios minutos)"
echo ""

npm install --legacy-peer-deps || {
  echo "❌ npm install falló."
  read -r -p "Pulsa ENTER..."
  exit 1
}

node scripts/patch-ajv-keywords.js 2>/dev/null || true

echo ""
echo "Listo. Vuelve a abrir JUGAR_AHORA.command"
echo ""
read -r -p "Pulsa ENTER para cerrar..."
