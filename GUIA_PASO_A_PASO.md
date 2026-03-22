# Guía paso a paso – Xamox Flow (para jugar en tu Mac)

Todo en orden. No tienes que cambiar nada en ningún sitio. Solo seguir estos pasos.

---

## ¿Dónde está todo?

- **Carpeta del proyecto:**  
  `Descargas` → carpeta **xamox-flow-source**
- **Backend (servidor):** dentro de esa carpeta, en **backend**
- **Frontend (la app que ves en el navegador):** dentro de esa carpeta, en **frontend**
- **Google (Iniciar con Google):** ya está configurado en el archivo **backend/.env**. No toques ese archivo.

---

## Antes de empezar (solo la primera vez)

### 1. Tener instalado en el Mac

- **Python 3** (para el backend).  
  En Terminal escribe: `python3 --version`  
  Si sale un número (ej. 3.11), está bien. Si no, instala Python desde python.org.
- **Node.js** (para el frontend).  
  En Terminal: `node --version`  
  Si sale un número (ej. v18), está bien. Si no, instala Node desde nodejs.org.
- **MongoDB** (base de datos).  
  El juego la usa para guardar usuarios y partidas.  
  Si no lo tienes: instala MongoDB Community o usa un MongoDB en la nube y pon su URL en **backend/.env** en `MONGO_URL`.  
  Si usas MongoDB en tu Mac en el puerto por defecto, con `MONGO_URL="mongodb://localhost:27017"` (que ya está en tu .env) basta.

### 2. Instalar dependencias del backend (solo la primera vez)

1. Abre **Terminal** (búscala con Spotlight: Cmd+Espacio, escribe "Terminal").
2. Pega exactamente esto y pulsa Enter:

```bash
cd /Users/davidalejandroamundarainmana/Downloads/xamox-flow-source/backend
pip3 install -r requirements.txt
```

3. Espera a que termine (puede tardar un poco). Cuando vuelva a salir el prompt, está listo.

### 3. Dependencias del frontend

No hace falta que hagas nada a mano. El script **JUGAR_AHORA.command** las instala solo la primera vez que lo ejecutas (si no existe la carpeta `frontend/node_modules`).

---

## Cómo jugar (cada vez que quieras jugar)

### Opción A – Con un doble clic (la más fácil)

1. Abre **Finder**.
2. Ve a **Descargas** → carpeta **xamox-flow-source**.
3. Haz **doble clic** en el archivo **JUGAR_AHORA.command**.
4. Si macOS pregunta "¿Abrir?", di **Abrir**.
5. Se abrirá una ventana de **Terminal**. Verás mensajes del backend y del frontend.
6. Cuando aparezca el mensaje **"Compiled successfully"**, el juego está listo.
7. Abre el **navegador** (Chrome, Safari, etc.) y en la barra de direcciones escribe:  
   **http://localhost:3000**  
   y pulsa Enter.
8. Para **parar** el juego: cierra la ventana de la Terminal. Si algo sigue en segundo plano, en otra Terminal escribe: `pkill -f uvicorn` y Enter.

### Opción B – Manual (dos ventanas de Terminal)

**Terminal 1 – Servidor (backend)**

1. Abre **Terminal**.
2. Pega y ejecuta:

```bash
cd /Users/davidalejandroamundarainmana/Downloads/xamox-flow-source/backend
uvicorn server:app --host 127.0.0.1 --port 8000
```

3. Déjala abierta (no la cierres). Debe verse algo como "Uvicorn running on http://127.0.0.1:8000".

**Terminal 2 – La app (frontend)**

1. Abre **otra** ventana de Terminal (Cmd+N en Terminal, o nueva ventana).
2. Pega y ejecuta:

```bash
cd /Users/davidalejandroamundarainmana/Downloads/xamox-flow-source/frontend
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env.local
npm start
```

3. Cuando diga **"Compiled successfully"**, abre el navegador en: **http://localhost:3000**.

---

## Dónde y cómo usar "Iniciar con Google"

1. Con el juego abierto en **http://localhost:3000**, deberías ver la pantalla de **Login** (iniciar sesión).
2. En esa pantalla hay un botón que dice **"Iniciar con Google"** (o "Sign in with Google" si está en inglés).
3. Haz **clic** en ese botón.
4. Te redirigirá a Google para elegir tu cuenta. Elige la cuenta y acepta.
5. Google te devolverá al juego y habrás iniciado sesión. No tienes que poner contraseña de Xamox Flow; todo lo hace Google y el backend.

**Dónde está el botón exactamente:** en la misma pantalla donde pondrías email y contraseña para entrar. Suele estar debajo del formulario de login, como botón aparte (por ejemplo con el logo de Google).

---

## Resumen rápido

| Qué quieres hacer        | Dónde / Cómo |
|--------------------------|--------------|
| Jugar en local           | Doble clic en **xamox-flow-source/JUGAR_AHORA.command** → luego abrir **http://localhost:3000** en el navegador. |
| Iniciar sesión con Google| En la pantalla de login, clic en **"Iniciar con Google"**. |
| Configuración de Google  | Ya está en **backend/.env**. No cambies nada. |
| Parar el juego           | Cerrar la ventana de Terminal que abrió JUGAR_AHORA, o en otra Terminal: `pkill -f uvicorn` |

---

## Si algo falla

- **"Compiled successfully" no sale:** espera 1–2 minutos. La primera vez el frontend tarda más. Si sigue sin salir, en Terminal donde está el frontend pulsa Ctrl+C, y vuelve a ejecutar en esa misma carpeta: `npm start`.
- **No aparece el botón "Iniciar con Google":** el frontend tiene que estar usando el backend. Comprueba que en **frontend/.env.local** hay la línea: `REACT_APP_BACKEND_URL=http://localhost:8000`. El script JUGAR_AHORA.command la crea solo. Si usas la opción manual, el comando con `echo "REACT_APP_BACKEND_URL=..."` crea ese archivo.
- **Error de MongoDB:** si el backend dice que no puede conectar a MongoDB, asegúrate de que MongoDB está instalado y en marcha en tu Mac, o cambia **backend/.env** y pon en `MONGO_URL` la URL de un MongoDB en la nube (eso sí tendrías que cambiarlo tú con la URL que te den).
- **El navegador no carga localhost:3000:** asegúrate de haber esperado hasta ver "Compiled successfully" y de escribir bien: `http://localhost:3000` (con http y sin espacio).

Cuando vuelvas, puedes decir: *"Sigo con Xamox Flow, quiero jugar"* o *"quiero preparar producción / el .aab"* y seguimos desde aquí.
