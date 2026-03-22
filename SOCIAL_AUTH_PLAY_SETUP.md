# Xamox Flow - Google/Facebook Auth para Google Play

Guia rapida para dejar login social listo en produccion.

## 1) Backend .env

Configura en `backend/.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `BACKEND_PUBLIC_URL` (ej: `https://api.tudominio.com`)

## 2) URLs de callback permitidas

### Google Cloud Console

En tu OAuth Client agrega:

- `https://api.tudominio.com/api/auth/google/callback`
- (local opcional) `http://localhost:8000/api/auth/google/callback`

### Meta for Developers (Facebook)

En Facebook Login configura:

- Valid OAuth Redirect URI:
  - `https://api.tudominio.com/api/auth/facebook/callback`
  - (local opcional) `http://localhost:8000/api/auth/facebook/callback`

Y solicita permiso de email para que llegue `email` en el perfil.

## 3) Frontend

En `frontend/.env.local` define:

- `REACT_APP_BACKEND_URL=https://api.tudominio.com`

## 4) Verificacion

1. `GET /api/auth/providers` debe devolver:
   - `google.enabled = true`
   - `facebook.enabled = true`
2. En login deben aparecer ambos botones activos.
3. Tras login:
   - se crea token
   - se guarda usuario
   - funciona perfil/foto/partidas guardadas/multijugador

## 5) Nota Google Play

Si empaquetas con TWA/PWA, el login social sigue funcionando via web OAuth siempre que:

- dominio y certificados HTTPS correctos
- callbacks apuntan al backend real
- app y backend en la misma version de release
