#!/bin/bash
# Probar el juego en el Mac: puerto 8000, sin Craco.
# El servidor va en PRIMER PLANO: verás errores aquí (no en segundo plano).

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

# shellcheck source=/dev/null
. "$ROOT/arranque_node.sh"

LOG_DIR="$ROOT/.xamox-logs"
mkdir -p "$LOG_DIR"
ULTIMO="$LOG_DIR/probar-juego-ultimo.log"
{
  echo "========== Xamox jugar (JUGAR_AHORA / PROBAR_JUEGO_MAC) $(date) =========="
  echo "ROOT=$ROOT"
  echo "PATH=$PATH"
  command -v node && node -v
  command -v npm && npm -v
  command -v python3 && python3 --version
  echo "------------------------------------------------------"
} | tee "$ULTIMO"

LAN_IP=$(arranque_ip_lan) || true

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Xamox — JUGAR (Mac)  →  http://127.0.0.1:8000/"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Sin Craco ni puerto 3000. Un solo puerto: 8000."
echo "  Log: .xamox-logs/probar-juego-ultimo.log"
echo ""

pause_exit() {
  echo ""
  echo "❌ $1"
  echo "   Revisa el archivo: $ULTIMO"
  read -r -p "Pulsa ENTER para cerrar..."
  exit 1
}

if ! arranque_asegurar_node_para_npm "$ROOT"; then
  pause_exit "No se pudo preparar Node para npm."
fi

arranque_liberar_puerto 8000

if ! arranque_asegurar_backend_env "$ROOT"; then
  pause_exit "No se pudo crear/usar backend/.env."
fi
arranque_asegurar_mongodb_local "$ROOT"

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Instalando dependencias del frontend (primera vez)…" | tee -a "$ULTIMO"
  (cd "$ROOT/frontend" && npm install --legacy-peer-deps) 2>&1 | tee -a "$ULTIMO" || pause_exit "npm install falló."
  echo ""
fi

if ! arranque_asegurar_lodash_frontend "$ROOT"; then
  pause_exit "lodash / Craco no se pudo reparar."
fi

arranque_quitar_api_url_env_local "$ROOT/frontend/.env.local"

echo "Compilando frontend (puede tardar varios minutos)…" | tee -a "$ULTIMO"
export CI=false
unset REACT_APP_BACKEND_URL
(
  cd "$ROOT/frontend" || exit 1
  unset REACT_APP_BACKEND_URL
  npm run build
) 2>&1 | tee -a "$ULTIMO"
# Con «| tee» el código de salida era el de tee (0) aunque npm fallara — usar PIPESTATUS.
if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  pause_exit "npm run build falló (mira ERROR arriba). Ejecuta en frontend: npm install --legacy-peer-deps"
fi

arranque_sw_bust_build "$ROOT/frontend/build/sw.js"
echo "Build OK (npm terminó bien)." | tee -a "$ULTIMO"

BE_LOG="$LOG_DIR/backend.log"
: > "$BE_LOG"

if ! arranque_backend_pip_install "$ROOT"; then
  pause_exit "pip3 install falló."
fi
{
  echo "=== Preflight Python $(date) ==="
  cd "$ROOT/backend" && python3 -c "import server"
} >>"$BE_LOG" 2>&1 || {
  echo "Fallo import server.py. Log:" | tee -a "$ULTIMO"
  tail -n 40 "$BE_LOG" | tee -a "$ULTIMO"
  pause_exit "El backend Python no arranca (import server)."
}

echo "" | tee -a "$ULTIMO"
echo ">>> Arrancando servidor en ESTA ventana (primer plano)." | tee -a "$ULTIMO"
echo ">>> NO la cierres mientras juegas. Para parar: Ctrl+C" | tee -a "$ULTIMO"
echo "" | tee -a "$ULTIMO"
echo "    Abre en el navegador:  http://127.0.0.1:8000/" | tee -a "$ULTIMO"
echo "    Prueba mínima:         http://127.0.0.1:8000/_xamox_ok.html" | tee -a "$ULTIMO"
if [ -n "$LAN_IP" ]; then
  echo "    Desde el móvil (WiFi): http://${LAN_IP}:8000/" | tee -a "$ULTIMO"
fi
echo "" | tee -a "$ULTIMO"

# En paralelo: cuando el servidor responda, abrir Safari/Chrome
(
  n=0
  while [ "$n" -lt 60 ]; do
    if curl -sf -o /dev/null "http://127.0.0.1:8000/_xamox_ping" 2>/dev/null; then
      /usr/bin/open "http://127.0.0.1:8000/" 2>/dev/null || true
      break
    fi
    sleep 1
    n=$((n + 1))
  done
) &

cd "$ROOT/backend" || pause_exit "No existe backend/"
# Primer plano (sin exec con tubería): ves logs de uvicorn y errores aquí
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 2>&1 | tee -a "$ULTIMO"
