# Configurar inicio de sesión con Google (sin Emergent)

El juego usa **solo la API de Google**. No hay dependencia de Emergent ni de ningún otro servicio externo. Solo necesitas crear unas credenciales en Google Cloud y ponerlas en tu backend.

---

## 1. Dónde conseguir las credenciales (Google Cloud Console)

1. Entra en **Google Cloud Console**:  
   **https://console.cloud.google.com/**

2. Crea un proyecto (o elige uno existente):
   - Arriba, clic en el selector de proyecto → **Nuevo proyecto**.
   - Nombre, por ejemplo: `Xamox Flow`.
   - Crear.

3. Configura la pantalla de consentimiento OAuth (si es la primera vez):
   - Menú **APIs y servicios** → **Pantalla de consentimiento de OAuth**.
   - Tipo de usuario: **Externo** (o Interno si es solo para tu organización).
   - Rellena nombre de la aplicación, correo de asistencia y guarda.

4. Crea las credenciales OAuth:
   - **APIs y servicios** → **Credenciales**.
   - **+ Crear credenciales** → **ID de cliente de OAuth**.
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: por ejemplo `Xamox Flow Web`.
   - **Orígenes de JavaScript autorizados** (añade los que uses):
     - Para local: `http://localhost:3000`
     - Para producción: `https://tu-dominio.com`
   - **URI de redirección autorizados** (aquí va la URL de tu **backend**):
     - Local: `http://localhost:8000/api/auth/google/callback`
     - Producción: `https://api.tu-dominio.com/api/auth/google/callback`  
     (sustituye por la URL real de tu API.)
   - Crear.

5. Copia:
   - **ID de cliente** (Client ID).
   - **Secreto de cliente** (Client Secret).  
   Son los dos valores que usarás en el backend.

---

## 2. Qué tienes que dar / configurar

Solo necesitas **dos valores** de Google y la **URL pública de tu backend**:

| Dato | Dónde sale | Dónde lo pones |
|------|------------|-----------------|
| **Client ID** | Google Cloud → Credenciales → tu cliente OAuth | Backend `.env` como `GOOGLE_CLIENT_ID` |
| **Client Secret** | Mismo sitio | Backend `.env` como `GOOGLE_CLIENT_SECRET` |
| **URL pública del backend** | Tu servidor (ej. `http://localhost:8000` o `https://api.tudominio.com`) | Backend `.env` como `BACKEND_PUBLIC_URL` |

No hace falta poner nada en el frontend para Google (el botón de “Iniciar con Google” usa la URL del backend que ya tienes en `REACT_APP_BACKEND_URL`).

---

## 3. Configuración del backend

En la carpeta **backend**, en el archivo **`.env`**, añade (o edita) estas líneas:

```env
# Credenciales de Google (desde Google Cloud Console)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# URL pública del backend (la que usa Google para redirigir tras el login)
# Local:
BACKEND_PUBLIC_URL=http://localhost:8000
# Producción (ejemplo):
# BACKEND_PUBLIC_URL=https://api.tudominio.com
```

- Sustituye `tu-client-id` y `tu-client-secret` por los valores que copiaste en el paso 1.
- `BACKEND_PUBLIC_URL` debe ser exactamente la URL con la que accedes al backend (sin barra final). En producción debe ser HTTPS si tu app está en HTTPS.

Reinicia el backend después de cambiar el `.env`.

---

## 4. Comprobar que funciona

1. Backend en marcha con el `.env` configurado.
2. Frontend en marcha con `REACT_APP_BACKEND_URL` apuntando a ese backend.
3. En la pantalla de login debe aparecer el botón **“Iniciar con Google”**.
4. Al hacer clic:
   - Te redirige a Google.
   - Tras elegir cuenta, vuelves a tu app ya iniciado sesión.

Si el botón no sale, revisa que `REACT_APP_BACKEND_URL` esté definido en el frontend. Si al hacer clic en “Iniciar con Google” da error, revisa que en Google Cloud tengas bien el **URI de redirección** del backend (`BACKEND_PUBLIC_URL` + `/api/auth/google/callback`) y que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén bien copiados en el `.env`.

---

## Resumen

- **Dónde se obtiene todo:** Google Cloud Console → Proyecto → APIs y servicios → Credenciales → ID de cliente OAuth (tipo “Aplicación web”).
- **Qué te da Google:** Client ID y Client Secret.
- **Qué pones tú:** esos dos en el `.env` del backend + `BACKEND_PUBLIC_URL`.
- Con eso, el juego usa **solo Google** para “Iniciar con Google”, sin Emergent ni otros servicios.
