# Crear el .aab para Google Play

Pasos directos para generar el archivo **.aab** (Android App Bundle) y subirlo a Google Play. Sin fase de pruebas intermedias.

---

## Requisito previo

La app tiene que estar **publicada en una URL** (tu dominio de producción). El .aab para Android es un “envoltorio” (TWA) que abre esa URL en la app. Sin URL en vivo, no se puede generar el .aab.

Si aún no está publicada:
1. Descomprime **XamoxFlow-build.zip** (el build que generaste).
2. Sube todo su contenido a tu hosting (Netlify, Vercel, tu servidor, etc.) en la raíz de tu dominio.
3. Comprueba que la app abre bien en `https://tu-dominio.com`.

---

## Generar el .aab con PWABuilder

1. Entra en **https://www.pwabuilder.com**
2. En **“Enter your PWA URL”** escribe la URL de tu app, por ejemplo:  
   `https://tu-dominio.com`  
   (sustituye por la URL real donde esté publicada).
3. Pulsa **Start** y espera a que analice la PWA.
4. Clic en **“Package for stores”** → **“Android”**.
5. Rellena:
   - **Package ID:** `com.ktysdavids.xamoxflow`
   - **App name:** `Xamox Flow`
   - **App version:** `1.0.0`
   - **Version code:** `1`
   - **Host:** tu dominio (ej. `tu-dominio.com`)
   - **Start URL:** `/`
   - **Theme color / Background / Splash:** `#07151B`
   - **Icon:** sube `icon-512.png` (está dentro de la carpeta del build en `icon-512.png` o en `frontend/public/icon-512.png` del proyecto).
   - **Signing key:** **“Create new”**  
     Guarda el archivo **.keystore** y la contraseña en un lugar seguro; los necesitarás para futuras actualizaciones.
   - **Key alias:** `xamoxflow`
   - **Key password:** la que elijas (y guardes).
6. Genera el paquete y **descarga el .aab**.

Ese .aab es el que subes en Google Play Console (Paso 8 de la guía completa).

---

## Siguiente paso

Abre **GOOGLE_PLAY_GUIDE.md** y sigue desde el **Paso 3** (crear la ficha en Google Play Console) hasta el **Paso 8** (subir el .aab y publicar).
