# Versión para publicar en Google Play (sin Emergent)

Esta es la **lista y checklist** para generar la versión final que publicas en Google Play, **sin que aparezca nada de Emergent** para el usuario.

---

## 1. Variables de entorno del frontend (build para Google Play)

Crea o edita **`frontend/.env.production`** (o `.env` que uses para `npm run build`) y define:

| Variable | Descripción | Ejemplo para Google Play |
|----------|-------------|---------------------------|
| `REACT_APP_BACKEND_URL` | URL de tu API y WebSockets en producción | `https://api.tudominio.com` |
| `REACT_APP_PUBLIC_URL` | URL pública de la app (compartir en redes, multijugador) | `https://tudominio.com` o la URL donde esté desplegada la app |
| `REACT_APP_AUTH_LOGIN_URL` | URL a la que se redirige al pulsar "Iniciar con Google" (tu propio login, no Emergent) | `https://auth.tudominio.com` o la que use tu backend |

- Si **no** pones `REACT_APP_PUBLIC_URL`, en runtime se usará la URL desde la que se abre la app (tu dominio).
- Si **no** pones `REACT_APP_AUTH_LOGIN_URL`, se seguirá usando la URL por defecto (Emergent); para Google Play debes poner **tu** URL de login.

---

## 2. Variables de entorno del backend (producción)

En el servidor donde corra el backend, define:

| Variable | Descripción | Para Google Play |
|----------|-------------|-------------------|
| `OAUTH_SESSION_API_URL` | API que valida el `session_id` de Google y devuelve email, name, picture | URL de **tu** servicio de auth que devuelva ese JSON (no la de Emergent) |

- Si no la defines, el backend seguirá usando la URL por defecto (Emergent).
- Tu servicio debe aceptar `GET` con header `X-Session-ID: <session_id>` y responder JSON con al menos: `email`, `name`, `picture` (opcional).

---

## 3. Checklist antes del build

- [ ] **Frontend:** `REACT_APP_BACKEND_URL` apunta a tu API en producción.
- [ ] **Frontend:** `REACT_APP_PUBLIC_URL` es la URL pública de la app (ej. `https://tudominio.com`).
- [ ] **Frontend:** `REACT_APP_AUTH_LOGIN_URL` es la URL de **tu** pantalla de login con Google (no Emergent).
- [ ] **Backend:** `OAUTH_SESSION_API_URL` apunta a **tu** API de validación de sesión Google (no Emergent).
- [ ] No quede en el código ninguna URL hardcodeada a `emergentagent.com` o `money-game-hub` (ya están sustituidas por variables de entorno).

---

## 4. Generar el build del frontend (versión lista para publicar)

```bash
cd xamox-flow-source/frontend
# Asegúrate de tener .env.production (o el .env que uses) con las variables de arriba
npm run build
```

La carpeta **`build/`** es la que despliegas en tu hosting (o la que usa tu flujo de Google Play / PWA). En esa versión no habrá referencias a Emergent si las variables están bien configuradas.

---

## 5. Comprobar que no aparece Emergent

Después del build:

1. Busca en los archivos de `build/` (o en el bundle):
   - `emergentagent`
   - `money-game-hub`
   - `Emergent`
2. Si usas las variables de entorno indicadas, esas cadenas **no** deberían salir en el JavaScript de producción (las URLs vendrán de las env en tiempo de build).

---

## 6. Resumen: qué cambia entre “probar con Emergent” y “Google Play”

| Uso | Frontend (env) | Backend (env) |
|-----|----------------|---------------|
| **Probar con Emergent (preview)** | No hace falta definir `REACT_APP_PUBLIC_URL` ni `REACT_APP_AUTH_LOGIN_URL`; se usan los valores por defecto (Emergent). | No hace falta definir `OAUTH_SESSION_API_URL`; se usa el backend de Emergent. |
| **Versión para Google Play** | Definir `REACT_APP_PUBLIC_URL`, `REACT_APP_AUTH_LOGIN_URL` y `REACT_APP_BACKEND_URL` con **tus** URLs. | Definir `OAUTH_SESSION_API_URL` con **tu** API de auth. |

Con esto tienes la **versión lista para publicar en Google Play** sin que el usuario vea referencias a Emergent.
