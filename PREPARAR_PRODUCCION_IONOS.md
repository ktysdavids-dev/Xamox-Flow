# Preparar Xamox Flow para producción (IONOS + Google Play)

Tienes dominio y servidor en IONOS. Esta guía te deja todo listo para lanzar de forma profesional.

---

## 1. Estructura recomendada con tu dominio

Sustituye **tudominio.com** por tu dominio real.

| Uso | URL ejemplo | Dónde va |
|-----|-------------|----------|
| **Landing** (ya lo tienes) | `https://tudominio.com` | Tu página de presentación del juego |
| **Juego (app)** | `https://app.tudominio.com` o `https://juego.tudominio.com` | El build del frontend (React) |
| **API + auth** | `https://api.tudominio.com` | El backend (FastAPI) |

Si prefieres todo en el mismo dominio:
- Juego: `https://tudominio.com/juego` o `https://tudominio.com/app`
- API: `https://tudominio.com/api`

Lo importante: que la **app** y la **API** tengan URLs fijas y con **HTTPS**.

---

## 2. En IONOS: qué necesitas

- **SSL (HTTPS):** En el panel de IONOS activa SSL para tu dominio (certificado gratuito suele estar incluido).
- **Subdominios (si usas app / api):** Crea `app.tudominio.com` y `api.tudominio.com` apuntando a tu servidor (o al mismo si es un VPS).
- **Tipo de hosting:**
  - **VPS / servidor propio:** Puedes instalar Node/Python y servir el frontend (build) y el backend (FastAPI) tú mismo.
  - **Hosting compartido:** Suele servir solo HTML/PHP. Ahí puedes subir el **build** del juego como sitio estático; el **backend** tendría que estar en otro servicio (ej. otro VPS, Railway, Render) o ver si IONOS ofrece algo para APIs.

Si me dices si en IONOS tienes “solo web” o “VPS/servidor”, te puedo bajar a pasos concretos (por ejemplo: “subir carpeta build aquí” y “poner backend en esta URL”).

---

## 3. Variables de entorno en producción

### Backend (en el servidor donde corre la API)

En el `.env` del backend en producción:

```env
# Ya los tendrás (MongoDB, etc.)
MONGO_URL=...
JWT_SECRET=...

# Google (con el cliente que creaste)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-secreto

# URL pública del backend (HTTPS, sin barra final)
BACKEND_PUBLIC_URL=https://api.tudominio.com

# Origen del frontend (para CORS)
# Si tu frontend está en https://app.tudominio.com:
CORS_ORIGINS=https://app.tudominio.com,https://tudominio.com
```

### Frontend (build para producción)

Al generar el build, el frontend debe conocer la API. Crea en la carpeta **frontend** un archivo **`.env.production`** (o configúralo en tu sistema de despliegue):

```env
REACT_APP_BACKEND_URL=https://api.tudominio.com
REACT_APP_PUBLIC_URL=https://app.tudominio.com
```

Luego genera el build:

```bash
cd frontend
npm run build
```

Subes el contenido de la carpeta **build** a la raíz del sitio donde esté la app (ej. `app.tudominio.com` o `tudominio.com/juego`).

---

## 4. Google Cloud (OAuth) para producción

En **Credenciales** → tu cliente OAuth “Xamox Flow” (Aplicación web):

1. **Orígenes autorizados de JavaScript:** añade:
   - `https://app.tudominio.com` (o la URL exacta donde esté el juego)
   - `https://tudominio.com` (si la landing también abre el juego o enlaces de login)

2. **URIs de redirección autorizados:** añade:
   - `https://api.tudominio.com/api/auth/google/callback`  
   (misma URL que `BACKEND_PUBLIC_URL` + `/api/auth/google/callback`).

Guarda los cambios. Los cambios en OAuth pueden tardar unos minutos en aplicarse.

---

## 5. Checklist profesional antes de Google Play

### Landing (tudominio.com)

- [ ] Botón claro “Jugar” / “Descargar” que lleve a la app o a la Play Store.
- [ ] Enlaces a **Política de privacidad** y **Términos** (URLs que luego pondrás en la ficha de Play).
- [ ] Si tienes redes sociales, enlaces a ellas.

### App (donde corre el juego)

- [ ] Funciona **solo con HTTPS** (no abrir en producción con `http://`).
- [ ] Login con email y con Google probado en la URL real.
- [ ] Multijugador y partida guardada probados con la API en producción.
- [ ] En **Ajustes** o **Perfil**, enlace a privacidad y términos (mismas URLs que la landing).

### Backend (API)

- [ ] `.env` con `BACKEND_PUBLIC_URL` y `GOOGLE_CLIENT_*` correctos.
- [ ] CORS con los orígenes exactos de tu dominio (sin `*` en producción si es posible).
- [ ] MongoDB accesible desde el servidor (si está en otro sitio, IP/whitelist correctos).

### Google Play (cuando subas el .aab)

- [ ] En la ficha de la app: **URL de privacidad** = `https://tudominio.com/privacidad` (o la ruta que uses).
- [ ] **Sitio web** = `https://tudominio.com`.
- [ ] El .aab lo generas con **PWABuilder** usando la URL **pública** del juego (ej. `https://app.tudominio.com`), como en **CREAR_AAB.md**.

### Opcional “pro”

- [ ] **Favicon** y **iconos** de la PWA/Play coherentes con la landing.
- [ ] **Screenshots** del juego para la Play Store (mismo estilo que la landing).
- [ ] **Una sola fuente de verdad** para legal: mismo texto de privacidad y términos en landing y en la app (rutas como `/privacy` y `/terms` que apunten a tu dominio).

---

## 6. Orden recomendado

1. **Definir URLs** (app y API) con tu dominio en IONOS y tener HTTPS.
2. **Desplegar el backend** con el `.env` de producción y probar `https://api.tudominio.com/...`.
3. **Añadir en Google Cloud** las URIs de producción (orígenes + redirect).
4. **Generar el build** del frontend con `.env.production` y subirlo a la URL de la app.
5. **Probar** login (email y Google), partida y multijugador en esas URLs.
6. **Completar** landing, privacidad y términos.
7. **Crear el .aab** con PWABuilder (URL del juego = la de producción) y subir a Google Play.

Si me dices tu dominio exacto y si en IONOS es hosting web o VPS, te puedo escribir los pasos literalmente con esas URLs (por ejemplo: “pon esto en CORS”, “esta es la URI de redirección”, “sube la carpeta build a esta ruta”).