# Xamox Flow - Lanzamiento Google Play desde cero (paso a paso)

Este documento te deja listo para:
- sustituir la version actual subida;
- rehacer la ficha de Play Console "desde cero";
- publicar una nueva build limpia y controlada.

## 0) Estado actual (segun tu captura)

- App: `Xamox Flow` (`com.xamoxflow.app`)
- Produccion: inactiva / borrador
- Prueba interna: activa con version `1`

Conclusion: puedes rehacer todo sin problema y publicar una nueva version sobre la misma app.

---

## 1) Preparar nueva build (AAB)

Importante: en ESTE repo no hay proyecto Android nativo (`android/` ni `build.gradle`).
Por tanto, el `.aab` debes generarlo en el proyecto Android original con el que ya subiste la version 1.

### Requisitos obligatorios del nuevo AAB

- **versionCode**: mayor al actual (si ahora es `1`, usa `2` o `10`)
- **versionName**: por ejemplo `1.0.1`
- **applicationId**: debe mantenerse `com.xamoxflow.app` (si quieres sustituir la app actual)
- firmado con la misma clave de subida (o Play App Signing activo)

### Comandos tipicos (proyecto Android nativo)

```bash
./gradlew clean
./gradlew bundleRelease
```

El archivo final suele quedar en:

`app/build/outputs/bundle/release/app-release.aab`

---

## 2) Rehacer ficha "desde cero" en Play Console

No existe boton literal "reset listing", pero puedes dejarla limpia editando todo:

1. Ve a **Crecimiento > Presencia en Google Play > Ficha de Play Store principal**
2. Reescribe desde cero:
   - Nombre de app
   - Descripcion corta
   - Descripcion completa
   - Categoria
   - Etiquetas
3. Sustituye todos los recursos graficos:
   - Icono
   - Feature graphic
   - Capturas de pantalla (telefono, tablet si aplica)
4. Guarda y revisa vista previa.

Tip: prepara primero un documento maestro con copy final para evitar bloqueos al publicar.

---

## 3) Limpiar canales de prueba previos

Para empezar "limpio":

1. En **Probar y publicar > Prueba interna**
2. Cierra/pausa el lanzamiento antiguo si no lo quieres mantener
3. Crea un lanzamiento nuevo con la nueva AAB

Esto evita confusiones con testers y versiones viejas.

---

## 4) Subir y sustituir la version actual

### Prueba interna (recomendada primero)

1. Crea nuevo lanzamiento en **Prueba interna**
2. Sube el nuevo `.aab`
3. Completa notas de la version (es/en)
4. Publica en prueba interna
5. Verifica instalacion real en 2 dispositivos/cuentas

Checklist minima:
- login email OK
- login Google OK (si aplica en webview/app)
- crear sala multiplayer
- unirse por codigo desde otra red
- jugar 1 partida completa sin crash

### Produccion

1. Ve a **Produccion**
2. Crea nuevo lanzamiento
3. Sube el mismo `.aab` validado
4. Completa "Que hay de nuevo"
5. Revisa advertencias de politica/contenido
6. Enviar a revision y publicar

---

## 5) Google Sign-In (para evitar Error 400 invalid_request)

En Google Cloud (OAuth Client Web) deben existir:

- **Authorized JavaScript origins**
  - `https://play.xamoxflow.com` (o tu dominio final)
  - `http://localhost:8000` (solo pruebas locales)
- **Authorized redirect URIs**
  - `https://play.xamoxflow.com/api/auth/google/callback`
  - `http://localhost:8000/api/auth/google/callback` (solo local)

No usar IP local (`http://10.x.x.x`) para Google OAuth en produccion.

---

## 6) "Empezar de cero" sin cambiar package name

Si quieres conservar reviews/instalaciones futuras bajo la misma app:
- mantén `com.xamoxflow.app`
- reemplaza todo: ficha, recursos, versiones y tracks

Si quieres app totalmente nueva e independiente:
- crea app nueva en Play Console con otro `applicationId`
- pierde continuidad de la actual (es una app distinta).

---

## 7) Plan recomendado para hoy

1. Generar nuevo `.aab` con `versionCode=2`
2. Rehacer ficha principal completa
3. Publicar en prueba interna
4. Test en 2 ordenadores/redes distintas
5. Publicar en produccion

---

## 8) Lo que necesito para automatizarte la siguiente parte

Para prepararte tambien Apple Store despues:

- ruta del proyecto Android nativo (donde sale el `.aab`)
- metodo actual de build (Android Studio, Capacitor, Flutter, etc.)
- acceso al repositorio final de release

Con eso te dejo:
- checklist de release automatizada
- versionado semantico recomendado
- guion de subida Google Play + App Store Connect sin perder tiempo.

