#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# shellcheck source=/dev/null
. "$ROOT/arranque_node.sh"

LAN_IP=$(arranque_ip_lan) || true
if [ -z "$LAN_IP" ]; then
  echo "No pude detectar tu IP (WiFi/Ethernet)."
  read -r _
  exit 1
fi

echo ""
echo "══════════════════════════════════════════"
echo "  Xamox Flow — móvil (automático, :8000)"
echo "══════════════════════════════════════════"
echo ""

if ! arranque_asegurar_node_para_npm "$ROOT"; then
  read -r -p "Pulsa ENTER..."
  exit 1
fi

arranque_liberar_puerto 8000

if ! arranque_asegurar_backend_env "$ROOT"; then
  read -r -p "Pulsa ENTER..."
  exit 1
fi
arranque_asegurar_mongodb_local "$ROOT"

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  (cd "$ROOT/frontend" && npm install --legacy-peer-deps) || exit 1
  echo ""
fi

if ! arranque_asegurar_lodash_frontend "$ROOT"; then
  read -r -p "Pulsa ENTER..."
  exit 1
fi

# Sin URL fija en el bundle: config.js usa mismo origen en puerto 8000.
arranque_quitar_api_url_env_local "$ROOT/frontend/.env.local"

echo "Compilando frontend (npm run build)…"
export CI=false
unset REACT_APP_BACKEND_URL
(
  cd "$ROOT/frontend" || exit 1
  unset REACT_APP_BACKEND_URL
  npm run build
) || {
  echo "❌ Falló el build del frontend."
  read -r -p "Pulsa ENTER..."
  exit 1
}

arranque_sw_bust_build "$ROOT/frontend/build/sw.js"
echo ""

LOG_DIR="$ROOT/.xamox-logs"
mkdir -p "$LOG_DIR"
BE_LOG="$LOG_DIR/backend.log"
: > "$BE_LOG"

if ! arranque_backend_pip_install "$ROOT"; then
  read -r -p "Pulsa ENTER..."
  exit 1
fi
if ! arranque_backend_preflight_import "$ROOT" "$BE_LOG"; then
  read -r -p "Pulsa ENTER..."
  exit 1
fi

echo "Arrancando backend (sirve API + la app en :8000)…"
(
  cd "$ROOT/backend" || exit 1
  exec python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
) >>"$BE_LOG" 2>&1 &
BACKEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup INT EXIT

if ! arranque_esperar_backend_http 8000 90; then
  echo "❌ Backend no respondió."
  tail -n 50 "$BE_LOG" 2>/dev/null || true
  cleanup
  trap - INT EXIT
  read -r -p "Pulsa ENTER..."
  exit 1
fi

MOBILE_URL="http://${LAN_IP}:8000"
printf '%s' "$MOBILE_URL" | pbcopy 2>/dev/null && echo "→ URL copiada al portapapeles del Mac (en el móvil: pégala en Safari o Chrome)."

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MÓVIL — haz SOLO esto (no uses :3000 en el teléfono)       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  1) El móvil debe estar en la MISMA WiFi que este Mac."
echo "  2) En el móvil abre el navegador (Safari o Chrome, no mini-app)."
echo "  3) Escribe o pega EXACTAMENTE:"
echo ""
echo "     ${MOBILE_URL}"
echo ""
echo "  PRUEBA ANTES (sin React):"
echo "     ${MOBILE_URL}/_xamox_ok.html"
echo "     → Si NO ves «Servidor Xamox OK», el móvil no llega al Mac (WiFi o firewall)."
echo ""
echo "  Si iOS pregunta por «red local» / Local Network → Aceptar / Permitir."
echo ""
echo "  Cierra JUGAR_AHORA en otra ventana si lo tenías abierto (usa el puerto 8000)."
echo ""

echo "→ Abriendo el mismo juego en el Mac para comprobar que el servidor responde…"
open "${MOBILE_URL}" 2>/dev/null || open "http://127.0.0.1:8000" 2>/dev/null || true

echo ""
echo "  Si NO carga ni en el Mac con esa URL, el fallo es del servidor (revisa .xamox-logs/backend.log)."
echo "  Si carga en el Mac pero NO en el móvil → WiFi distinta o firewall del Mac bloqueando conexiones."
echo ""
echo "  Para parar el servidor: cierra esta ventana o Ctrl+C."
echo ""

wait "$BACKEND_PID"
