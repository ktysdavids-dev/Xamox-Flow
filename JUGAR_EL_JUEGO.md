# Jugar Xamox Flow en tu Mac (antes del .aab)

Proyecto en esta carpeta: `xamox-backup-2026-03-19`.

**Para jugar en el Mac:** doble clic en **`JUGAR_AHORA.command`**. Compila el front y abre **http://127.0.0.1:8000/** (un solo puerto, **sin Craco**, sin `:3000`). Es el mismo enfoque que **`PROBAR_JUEGO_MAC.command`** y el mismo tipo de build que **`JUGAR_MOVIL.command`** en el móvil.

Este juego es **web** (React en el navegador), no un proyecto **Expo / React Native**.

---

## Si necesitas hot-reload de desarrollo (Craco en :3000)

Ese modo rompe a menudo por dependencias (webpack / ajv). Solo para quien sepa arreglar `node_modules`. El flujo estable de juego es siempre **puerto 8000** como arriba.

---

## Móvil (misma WiFi que el Mac)

1. **Doble clic** en **`JUGAR_MOVIL.command`**. El script hace solo: libera el puerto 8000, **quita `REACT_APP_BACKEND_URL` de `.env.local`** (para no “quemar” una IP vieja en el build), **compila**, **rota las cachés del service worker** en `build/sw.js` y arranca el backend.
2. En el móvil abre la URL que muestra la Terminal: **`http://192.168.x.x:8000`**.

---

## Opción manual (dos terminales)

**Terminal 1 – Backend**
```bash
cd ruta/a/xamox-backup-2026-03-19/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
```

**Terminal 2 – Frontend**
```bash
cd ruta/a/xamox-backup-2026-03-19/frontend
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env.local
HOST=0.0.0.0 CI=false npm start
```

Abre **http://localhost:3000**.

---

## Requisitos

- **No tienes que instalar Node a mano.** Si tu Mac tiene Node 22 o 24, `JUGAR_AHORA.command` descarga **Node 20 portable** solo dentro de la carpeta `.xamox-tools/` (una vez, con internet).
- **Backend:** si no existe `backend/.env`, el script lo crea desde `backend/autocreado.env.template` (Mongo local). Si tienes **Docker Desktop**, intentará levantar **Mongo 7** en el puerto **27017**. Si usas **Atlas**, pon `mongodb+srv://...` en `MONGO_URL` y no se usará Docker.
- **Python:** los scripts ejecutan `pip3 install -r backend/requirements.txt` antes de arrancar.
- **Puerto 8000:** el script lo libera solo si estaba ocupado.

### Si en el móvil sale “No se pudo conectar con el servidor”

Vuelve a ejecutar **`JUGAR_MOVIL.command`** (ya limpia `.env`, recompila y rota caché PWA). Si sigue igual, revisa **`.xamox-logs/backend.log`** (Mongo / `MONGO_URL`).

### Si `craco start` falla con `mergeWith` / `lodash`

Tu carpeta `frontend/node_modules/lodash` puede estar corrupta. Vuelve a lanzar **`JUGAR_AHORA.command`** (repara lodash solo), o en Terminal:

`cd frontend && rm -rf node_modules && npm install --legacy-peer-deps`

Cuando termines de jugar, sigue con **CREAR_AAB.md** para generar el .aab de Google Play.
