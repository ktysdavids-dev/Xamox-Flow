#!/bin/bash
# Usado por JUGAR_AHORA.command y JUGAR_MOVIL.command
# Si tu Node del sistema es 22+, descarga Node 20 portable solo dentro de esta carpeta (una vez).

arranque_asegurar_node_para_npm() {
  local ROOT="$1"
  local NODE_V="20.18.1"
  local RUNTIME_DIR="$ROOT/.xamox-tools/node-runtime"
  local MARKER="$RUNTIME_DIR/.version"

  local NEED=0
  local MAJOR=""
  if ! command -v node >/dev/null 2>&1; then
    NEED=1
  else
    MAJOR=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
    if [ -z "$MAJOR" ] || [ "$MAJOR" -ge 22 ] 2>/dev/null; then
      NEED=1
    fi
  fi

  if [ "$NEED" -eq 0 ]; then
    return 0
  fi

  if [ -f "$MARKER" ] && [ "$(cat "$MARKER" 2>/dev/null)" = "$NODE_V" ] && [ -x "$RUNTIME_DIR/bin/node" ]; then
    export PATH="$RUNTIME_DIR/bin:$PATH"
    return 0
  fi

  echo ""
  echo "Preparando Node $NODE_V para el frontend (descarga única ~50 MB, solo en esta carpeta)..."
  mkdir -p "$ROOT/.xamox-tools"

  local ARCH PKG URL TGZ
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    PKG="node-v${NODE_V}-darwin-arm64"
  else
    PKG="node-v${NODE_V}-darwin-x64"
  fi
  URL="https://nodejs.org/dist/v${NODE_V}/${PKG}.tar.gz"
  TGZ="$ROOT/.xamox-tools/${PKG}.tar.gz"

  if ! curl -fL --connect-timeout 30 --retry 2 "$URL" -o "$TGZ"; then
    echo "⚠️  No se pudo descargar Node portable (¿sin internet?)."
    if command -v node >/dev/null 2>&1; then
      echo "   Probando con tu Node actual: $(node -v)"
      return 0
    fi
    echo "❌ No hay Node instalado y no hubo descarga."
    return 1
  fi

  rm -rf "$RUNTIME_DIR"
  mkdir -p "$RUNTIME_DIR"
  if ! tar -xzf "$TGZ" -C "$RUNTIME_DIR" --strip-components 1; then
    echo "❌ Error al descomprimir Node."
    rm -f "$TGZ"
    return 1
  fi
  rm -f "$TGZ"
  echo "$NODE_V" > "$MARKER"
  export PATH="$RUNTIME_DIR/bin:$PATH"
  echo "Listo: $(node -v) (solo para este juego)"
  echo ""
  return 0
}

# Cierra solo quien ESCUCHA en el puerto (macOS a veces lista mal con otros filtros)
arranque_liberar_puerto() {
  local port=$1
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ')
  if [ -z "$pids" ]; then
    pids=$(lsof -ti:"$port" 2>/dev/null | tr '\n' ' ')
  fi
  if [ -n "$pids" ]; then
    echo "Puerto ${port} ocupado — cerrando proceso que lo usa..."
    for pid in $pids; do
      kill -9 "$pid" 2>/dev/null || true
    done
    sleep 2
  fi
}

# Espera a que FastAPI responda (más fiable que solo lsof en macOS)
arranque_esperar_backend_http() {
  local port=${1:-8000}
  local max=${2:-90}
  local base="http://127.0.0.1:${port}"
  local n=0
  echo -n "Esperando backend en ${base}"
  while [ "$n" -lt "$max" ]; do
    if curl -sf -o /dev/null --connect-timeout 2 "${base}/docs" 2>/dev/null; then
      echo " listo."
      return 0
    fi
    if curl -sf -o /dev/null --connect-timeout 2 "${base}/openapi.json" 2>/dev/null; then
      echo " listo."
      return 0
    fi
    echo -n "."
    sleep 1
    n=$((n + 1))
  done
  echo ""
  return 1
}

# Evita que un build anterior tenga REACT_APP_BACKEND_URL con otra IP “quemada” en el JS.
arranque_quitar_api_url_env_local() {
  local f="$1"
  [ -f "$f" ] || return 0
  if grep -q '^REACT_APP_BACKEND_URL=' "$f" 2>/dev/null; then
    echo "→ Limpiando REACT_APP_BACKEND_URL en .env.local (la app en :8000 usa el mismo origen)."
    grep -v '^REACT_APP_BACKEND_URL=' "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
  fi
  if [ ! -s "$f" ]; then
    rm -f "$f"
    echo "→ .env.local vacío — eliminado."
  fi
}

# Cada build móvil: nombres de caché nuevos en build/sw.js (el teléfono deja de servir JS viejo).
arranque_sw_bust_build() {
  local sw="$1"
  [ -f "$sw" ] || return 0
  local id
  id=$(date +%Y%m%d%H%M%S)
  sed -i.bak \
    -e "s/'xamox-static-[^']*'/'xamox-static-${id}'/g" \
    -e "s/'xamox-runtime-[^']*'/'xamox-runtime-${id}'/g" \
    -e "s/'xamox-audio-[^']*'/'xamox-audio-${id}'/g" \
    "$sw" 2>/dev/null || true
  rm -f "${sw}.bak" 2>/dev/null || true
  echo "→ Service worker: cachés rotadas a *-${id} (sin pasos manuales en el móvil)."
}

# IP en LAN (WiFi / Ethernet); prueba varias interfaces.
arranque_ip_lan() {
  local iface x
  for iface in en0 en1 en2; do
    x=$(ipconfig getifaddr "$iface" 2>/dev/null) || true
    if [ -n "$x" ]; then
      echo "$x"
      return 0
    fi
  done
  return 1
}

# Crea backend/.env mínimo si no existe (evita KeyError / crash al importar server).
arranque_asegurar_backend_env() {
  local ROOT="$1"
  local ENV="$ROOT/backend/.env"
  local TPL="$ROOT/backend/autocreado.env.template"
  if [ -f "$ENV" ]; then
    return 0
  fi
  if [ ! -f "$TPL" ]; then
    echo "❌ Falta $TPL — no puedo crear backend/.env."
    return 1
  fi
  echo "→ No había backend/.env — creando uno con Mongo local (127.0.0.1:27017)."
  cp "$TPL" "$ENV" || return 1
  return 0
}

# Si .env usa Mongo local y el puerto 27017 está cerrado, intentar Docker.
arranque_asegurar_mongodb_local() {
  local ROOT="$1"
  local ENV="$ROOT/backend/.env"
  if [ ! -f "$ENV" ]; then
    return 0
  fi
  local ml
  ml=$(grep -E '^[[:space:]]*MONGO_URL=' "$ENV" 2>/dev/null | head -1 || true)
  if [ -z "$ml" ]; then
    return 0
  fi
  if echo "$ml" | grep -q 'mongodb+srv'; then
    echo "→ MONGO_URL usa mongodb+srv (p. ej. Atlas) — no inicio Mongo en Docker."
    return 0
  fi
  if ! echo "$ml" | grep -qE '127\.0\.0\.1|localhost'; then
    return 0
  fi
  if nc -z 127.0.0.1 27017 2>/dev/null; then
    echo "→ MongoDB ya escucha en 127.0.0.1:27017."
    return 0
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "⚠️  Mongo no responde en :27017 y no hay comando «docker»."
    echo "    Instala MongoDB, Docker Desktop, o pon MONGO_URL (Atlas) en backend/.env"
    return 0
  fi
  echo "→ Iniciando MongoDB en Docker (imagen mongo:7, puerto 27017)…"
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx 'xamox-mongo'; then
    docker start xamox-mongo >/dev/null 2>&1 || true
  else
    echo "   (La primera vez puede tardar varios minutos: descarga de la imagen.)"
    docker run -d --name xamox-mongo -p 27017:27017 mongo:7 >/dev/null 2>&1 || {
      echo "❌ No pude ejecutar «docker run» (¿Docker Desktop arrancado?)."
      return 0
    }
  fi
  local n=0
  while [ "$n" -lt 90 ]; do
    if nc -z 127.0.0.1 27017 2>/dev/null; then
      echo "→ Mongo en Docker listo."
      return 0
    fi
    sleep 1
    n=$((n + 1))
  done
  echo "⚠️  Mongo en Docker no abrió el puerto 27017 a tiempo."
  return 0
}

# Falla si server.py no importa (dependencias, sintaxis, etc.).
arranque_backend_preflight_import() {
  local ROOT="$1"
  local LOG="$2"
  echo "=== Preflight Python $(date) ===" >>"$LOG"
  if (cd "$ROOT/backend" && python3 -c "import server" >>"$LOG" 2>&1); then
    echo "→ Backend (Python) OK."
    return 0
  fi
  echo ""
  echo "❌ No se pudo importar backend/server.py. Revisa dependencias:"
  echo "   cd backend && pip3 install -r requirements.txt"
  echo ""
  echo "Últimas líneas del log:"
  tail -n 60 "$LOG" 2>/dev/null || true
  return 1
}

# Instala dependencias del backend (idempotente).
arranque_backend_pip_install() {
  local ROOT="$1"
  if [ ! -f "$ROOT/backend/requirements.txt" ]; then
    return 1
  fi
  echo "→ pip3 install -r backend/requirements.txt …"
  pip3 install -q -r "$ROOT/backend/requirements.txt" || {
    echo "❌ pip3 falló. Prueba: pip3 install -r backend/requirements.txt"
    return 1
  }
  return 0
}

# Craco falla con "mergeWith undefined" si lodash en node_modules está vacío o roto.
arranque_asegurar_lodash_frontend() {
  local ROOT="$1"
  local FE="$ROOT/frontend"
  [ -d "$FE/node_modules" ] || return 0
  if (cd "$FE" && node -e "process.exit(typeof require('lodash').mergeWith==='function'?0:1)" 2>/dev/null); then
    return 0
  fi
  echo "→ Reparando lodash (necesario para Craco / npm start)…"
  (cd "$FE" && node scripts/ensure-lodash.js) || {
    echo "❌ No se pudo reparar lodash. En Terminal ejecuta:"
    echo "   cd \"$FE\" && rm -rf node_modules && npm install --legacy-peer-deps"
    return 1
  }
  return 0
}
