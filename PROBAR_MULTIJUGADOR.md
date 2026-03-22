# Probar Xamox Flow con tu pareja (misma red WiFi)

Sigue estos pasos para jugar los dos en la misma casa usando el mismo WiFi. **No se cambia ningún diseño**, solo cómo levantar el juego para que otro dispositivo pueda conectarse.

---

## 1. En el ordenador que va a “hacer de servidor”

### 1.1 Obtener tu IP local

- **Mac:** Abre Terminal y escribe: `ipconfig getifaddr en0` (o `en1` si no hay en0). Verás algo como `192.168.1.100`.
- **Windows:** En CMD: `ipconfig` y busca “Dirección IPv4” de tu WiFi.

Anota esa IP (ejemplo: `192.168.1.100`). La llamaremos **TU_IP**.

### 1.2 Backend (API + WebSocket)

```bash
cd xamox-flow-source/backend
# Crea/activa tu entorno virtual si lo usas, luego:
pip install -r requirements.txt
```

Copia tu `.env` si ya lo tienes. Luego arranca el servidor escuchando en toda la red:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

Déjalo abierto. El backend estará en `http://TU_IP:8000`.

### 1.3 Frontend (la web del juego)

Abre **otra** terminal:

```bash
cd xamox-flow-source/frontend
npm install
```

Crea un archivo `.env.local` en la carpeta `frontend` con **una sola línea** (sustituye TU_IP por tu IP real):

```env
REACT_APP_BACKEND_URL=http://TU_IP:8000
```

Ejemplo si tu IP es 192.168.1.100:

```env
REACT_APP_BACKEND_URL=http://192.168.1.100:8000
```

Luego arranca el frontend para que acepte conexiones desde otros dispositivos en la red:

**Mac/Linux:**

```bash
HOST=0.0.0.0 npm start
```

**Windows (CMD):**

```cmd
set HOST=0.0.0.0 && npm start
```

Cuando abra el navegador, la URL será algo como `http://localhost:3000`. La misma app también se puede abrir desde otro dispositivo con:

`http://TU_IP:3000`

(por ejemplo `http://192.168.1.100:3000`).

---

## 2. En el dispositivo de tu pareja (móvil u otro PC)

1. Conectado a **la misma WiFi** que el servidor.
2. Abrir el navegador e ir a: **`http://TU_IP:3000`**  
   (sustituir TU_IP por la IP que anotaste, ej. `http://192.168.1.100:3000`).

Eso es todo. No hace falta instalar nada más: la página ya usará el backend que está en tu ordenador porque `REACT_APP_BACKEND_URL` apunta a TU_IP.

---

## 3. Cómo jugar

1. **Los dos:** Iniciar sesión (o registrarse) en la app.
2. **Uno (anfitrión):** Ir a **Multijugador** → **Crear sala** → Elegir profesión → **Listo**.
3. **El otro:** Ir a **Multijugador** → Poner el **código** de la sala que ve el anfitrión → Unirse → Elegir profesión → **Listo**.
4. Cuando todos estén listos, la partida empieza sola (o el host puede iniciarla si hay botón). ¡A jugar!

---

## Resumen rápido

| Dónde              | Qué hacer |
|--------------------|-----------|
| Servidor (tu PC)   | `uvicorn server:app --host 0.0.0.0 --port 8000` en `backend` |
| Servidor (tu PC)   | `.env.local` en `frontend` con `REACT_APP_BACKEND_URL=http://TU_IP:8000` |
| Servidor (tu PC)   | `HOST=0.0.0.0 npm start` en `frontend` |
| Pareja (móvil/PC)  | Abrir en el navegador `http://TU_IP:3000` |

Si algo no carga, revisa que el firewall del PC no bloquee los puertos 3000 y 8000.
