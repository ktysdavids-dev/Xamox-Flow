# Xamox Flow - Release Final para Google Play

Esta guia deja una ruta unica para publicar una version final profesional.

## 1) Verificacion tecnica local

1. Frontend:
   - `cd /Users/davidalejandroamundarainmana/Downloads/xamox-flow-source/frontend`
   - `npm run release:check`
   - `npm run build`
2. Backend:
   - `cd /Users/davidalejandroamundarainmana/Downloads/xamox-flow-source/backend`
   - `python3 -m py_compile server.py`

Si alguno falla, no publiques hasta dejarlo en verde.

## 2) Publicar la PWA en dominio productivo

Sube la carpeta `frontend/build` a tu hosting final (con HTTPS).
Ejemplo de URL final:
- `https://xamoxflow.com`

Comprueba en movil:
- abre
- inicia sesion
- entra a partida
- suena musica DJ Alka en menu/juego/victoria
- funciona modo offline basico

## 3) Generar Android App Bundle (.aab)

Usa PWABuilder con la URL final publicada:
- https://www.pwabuilder.com

Valores recomendados:
- Package ID: `com.ktysdavids.xamoxflow`
- App Name: `Xamox Flow`
- Version Name: `1.0.0` (o la actual)
- Version Code: incrementar en cada subida
- Start URL: `/`
- Theme/Background: `#07151B`

Guarda el `.keystore` y contrasenas fuera del proyecto.

## 4) Checklist comercial antes de vender

- Ficha Play Store completa (descripcion, capturas, feature graphic)
- Politica de privacidad publica y funcional
- Terminos de uso visibles en la app
- Correo de soporte activo
- Precio o compras in-app configuradas correctamente
- Pruebas internas cerradas (20 testers minimo recomendado)

## 5) Criterio de salida (Go / No-Go)

Publica solo si:
- `npm run release:check` = OK
- `npm run build` = OK
- Login + Partida + Audio + Multiplayer = OK
- No errores bloqueantes en consola

Con esto tienes una base de release estable para venta en Google Play.
