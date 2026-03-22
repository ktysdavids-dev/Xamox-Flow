# Xamox Flow – Resumen para retomar (hasta 7 marzo 2026)

**Proyecto:** Juego de mesa financiero Xamox Flow (React + FastAPI). Para publicar en Google Play (TWA) y tener landing + dominio en IONOS.

---

## Estado actual

- **Sin Emergent:** Login con Google usa solo la API de Google (OAuth en el backend). Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_PUBLIC_URL` en backend `.env`.
- **Cliente OAuth creado:** En Google Cloud, cliente tipo "Aplicación web" llamado "Xamox Flow" con `http://localhost:3000` y `http://localhost:8000/api/auth/google/callback` (local). Falta añadir **URIs de producción** cuando tengas dominio.
- **Build:** Script `CREAR_BUILD_Y_ZIP.command` genera el build (con parches ajv/ESLint). Salida: `XamoxFlow-build.zip` en Escritorio.
- **Jugar en local:** `JUGAR_AHORA.command` (backend + frontend). Backend sin `emergentintegrations` en requirements.
- **.aab para Play:** Guía en `CREAR_AAB.md` (PWABuilder con la URL pública del juego).

---

## Pendiente para hacer “mañana” / antes del 7 marzo 2026

1. **Producción IONOS (dominio + servidor):**
   - Definir URLs: landing (`tudominio.com`), app (`app.tudominio.com` o similar), API (`api.tudominio.com`).
   - Desplegar backend con `.env` de producción (incl. `BACKEND_PUBLIC_URL`, `GOOGLE_CLIENT_*`, `CORS_ORIGINS`).
   - Build del frontend con `.env.production` (`REACT_APP_BACKEND_URL`, `REACT_APP_PUBLIC_URL`) y subir a la URL de la app.
   - En Google Cloud: añadir orígenes y URI de redirección de **producción** al cliente OAuth.

2. **Dejar todo listo para Google Play:**
   - Seguir `PREPARAR_PRODUCCION_IONOS.md` (checklist landing, app, backend, OAuth, .aab).
   - Cuando la app esté en HTTPS en producción, generar el .aab con PWABuilder y subir a Play Console.

---

## Archivos útiles en el proyecto

| Archivo | Para qué |
|--------|----------|
| `PREPARAR_PRODUCCION_IONOS.md` | Pasos producción IONOS + checklist profesional |
| `GOOGLE_AUTH_SETUP.md` | Cómo obtener y configurar Google OAuth (sin Emergent) |
| `CREAR_AAB.md` | Cómo generar el .aab para Google Play |
| `GOOGLE_PLAY_BUILD.md` | Variables para build “limpio” para Play |
| `JUGAR_EL_JUEGO.md` | Cómo jugar en local |
| `CREAR_BUILD_Y_ZIP.command` | Generar build y ZIP en Escritorio |

---

Cuando vuelvas, abre este proyecto y di algo como: *“Sigo con Xamox Flow, tengo dominio en IONOS y quiero preparar producción / el .aab”* y usamos este resumen para continuar.
