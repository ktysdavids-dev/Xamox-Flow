# GUIA COMPLETA - PUBLICAR XAMOX FLOW EN GOOGLE PLAY STORE

---

## PASO 1: CREAR CUENTA DE DESARROLLADOR DE GOOGLE PLAY

1. Ve a: **https://play.google.com/console/signup**
2. Inicia sesion con la cuenta de Google de la empresa
3. Acepta los terminos del acuerdo de distribucion
4. Paga la tarifa unica de **$25 USD**
5. Completa la verificacion de identidad:
   - **Tipo de cuenta:** Organizacion
   - **Nombre de la organizacion:** Ktys & Davids Productions SL
   - **Sitio web:** https://www.ktysdavids.com
   - **Email de contacto:** info@ktysdavids.com
   - **Telefono:** +34 673 038 773
   - **Direccion:** Tu direccion fiscal en Espana
6. La verificacion puede tardar **24-48 horas**

---

## PASO 2: GENERAR EL ARCHIVO AAB (Android App Bundle)

### Opcion A: PWABuilder (RECOMENDADO - mas facil)

1. Ve a: **https://www.pwabuilder.com**
2. Introduce la URL de tu app en producción (ej. `https://tudominio.com`). La app debe estar ya publicada en esa URL.
3. PWABuilder analizara tu PWA automaticamente
4. Haz clic en **"Package for stores"** → **"Android"**
5. Configura los siguientes campos:
   - **Package ID:** `com.ktysdavids.xamoxflow`
   - **App name:** `Xamox Flow`
   - **App version:** `1.0.0`
   - **Version code:** `1`
   - **Host:** tu dominio (ej. `tudominio.com`)
   - **Start URL:** `/`
   - **Theme color:** `#07151B`
   - **Background color:** `#07151B`
   - **Splash screen color:** `#07151B`
   - **Icon:** Sube el archivo `/public/icon-512.png`
   - **Signing key:** Selecciona **"Create new"** (GUARDA ESTE ARCHIVO .keystore - LO NECESITARAS PARA FUTURAS ACTUALIZACIONES)
   - **Key alias:** `xamoxflow`
   - **Key password:** (elige una contrasena segura y GUARDALA)
6. Descarga el archivo **.aab** generado

### Opcion B: Bubblewrap CLI (para desarrolladores avanzados)

```bash
npm install -g @nicolo-ribaudo/bubblewrap
bubblewrap init --manifest https://TU-DOMINIO.com/manifest.json
bubblewrap build
```
(Reemplaza TU-DOMINIO.com por la URL donde tengas publicada la app.)

---

## PASO 3: CREAR LA FICHA DE LA APP EN GOOGLE PLAY CONSOLE

### 3.1 Ir a Google Play Console
1. Ve a: **https://play.google.com/console**
2. Clic en **"Crear app"**
3. Rellena:
   - **Nombre de la app:** `Xamox Flow - Juego Financiero`
   - **Idioma predeterminado:** Espanol
   - **App o juego:** Juego
   - **Gratuita o de pago:** (tu decides - recomiendo Gratuita para empezar)
   - **Declaraciones:** Acepta todas

### 3.2 Ficha de Play Store (Store Listing)

---

#### TITULO (30 caracteres max)
```
Xamox Flow - Juego Financiero
```

#### DESCRIPCION BREVE (80 caracteres max)
**Espanol:**
```
Aprende finanzas, trading y crypto jugando. Multijugador hasta 6 jugadores.
```

**English:**
```
Learn finance, trading & crypto by playing. Multiplayer up to 6 players.
```

#### DESCRIPCION COMPLETA (4000 caracteres max)

**Espanol:**
```
🎲 XAMOX FLOW - Tu camino hacia la libertad financiera

¿Quieres aprender sobre finanzas personales, inversiones, trading y criptomonedas de forma divertida? Xamox Flow es el juego de mesa digital que te ensena a construir riqueza y escapar de la "rueda de la rata".

💰 JUEGA Y APRENDE
Elige entre 8 profesiones unicas (Maestro, Ingeniero, Doctor, Enfermera, Abogado, Emprendedor, Piloto y mas) cada una con diferente salario, gastos y capital inicial. Toma decisiones financieras inteligentes para generar ingresos pasivos y alcanzar la libertad financiera.

🧠 30 PREGUNTAS EDUCATIVAS
Pon a prueba tus conocimientos con preguntas sobre:
- Finanzas personales (flujo de caja, activos, pasivos, ROI)
- Trading basico (stop-loss, spread, apalancamiento, ETFs)
- Criptomonedas (Bitcoin, wallets, exchanges, halving, staking)
- Blockchain y DeFi (contratos inteligentes, NFTs, mineria)
Las preguntas no se repiten hasta completar todas. ¡Aprende algo nuevo en cada partida!

👥 MULTIJUGADOR ONLINE (hasta 6 jugadores)
Juega con amigos de cualquier parte del mundo en tiempo real. Crea salas privadas, invita amigos y compite para ver quien alcanza la libertad financiera primero.

🎵 MUSICA ORIGINAL POR DJ ALKA
Disfruta de una banda sonora exclusiva con 6 generos musicales: Electronica, Pop, Rock, Latina, Hip Hop y Chill/Lofi. Toda la musica fue producida exclusivamente para Xamox Flow por DJ Alka.

🌍 7 IDIOMAS
Disponible en: Espanol, Ingles, Portugues, Frances, Aleman, Italiano y Chino.

⚡ CARACTERISTICAS PREMIUM
- Tablero 3D interactivo con 24 casillas
- Dados 3D animados
- 3 niveles de dificultad (Facil, Moderado, Dificil)
- Sistema de logros y clasificaciones
- Guarda y continua tus partidas
- Animacion de victoria epica cuando escapas de la rueda de la rata
- Sistema de amigos
- Configuracion de audio y preferencias
- Perfil personalizable con foto

Desarrollado con pasion por Ktys & Davids Productions SL.
Musica original: DJ Alka (productor musical registrado).

¡Descarga ahora y comienza tu camino hacia la libertad financiera!
```

**English:**
```
🎲 XAMOX FLOW - Your path to financial freedom

Want to learn about personal finance, investing, trading, and cryptocurrency in a fun way? Xamox Flow is the digital board game that teaches you to build wealth and escape the "rat race."

💰 PLAY AND LEARN
Choose from 8 unique professions (Teacher, Engineer, Doctor, Nurse, Lawyer, Entrepreneur, Pilot, and more), each with different salary, expenses, and starting capital. Make smart financial decisions to generate passive income and achieve financial freedom.

🧠 30 EDUCATIONAL QUESTIONS
Test your knowledge with questions about:
- Personal finance (cash flow, assets, liabilities, ROI)
- Basic trading (stop-loss, spread, leverage, ETFs)
- Cryptocurrency (Bitcoin, wallets, exchanges, halving, staking)
- Blockchain & DeFi (smart contracts, NFTs, mining)
Questions don't repeat until you've seen them all. Learn something new every game!

👥 ONLINE MULTIPLAYER (up to 6 players)
Play with friends from anywhere in the world in real time. Create private rooms, invite friends, and compete to see who achieves financial freedom first.

🎵 ORIGINAL MUSIC BY DJ ALKA
Enjoy an exclusive soundtrack with 6 music genres: Electronic, Pop, Rock, Latin, Hip Hop, and Chill/Lofi. All music was produced exclusively for Xamox Flow by DJ Alka.

🌍 7 LANGUAGES
Available in: Spanish, English, Portuguese, French, German, Italian, and Chinese.

Download now and start your path to financial freedom!
```

---

### 3.3 Recursos Graficos (OBLIGATORIOS)

#### Icono de la App (512 x 512 px, PNG)
- Ya tienes: `/public/icon-512.png`
- Sube este archivo directamente

#### Imagen Destacada (Feature Graphic) (1024 x 500 px)
- **NECESITAS CREARLA** - Recomiendo usar **Canva.com** (gratis):
  1. Crea un diseno de 1024 x 500 px
  2. Fondo oscuro (#07151B)
  3. Logo de Xamox Flow en el centro
  4. Texto: "Aprende Finanzas Jugando" en dorado
  5. Iconos de dados, monedas, graficos

#### Screenshots (minimo 2, recomiendo 5-8)
- Los screenshots ya estan disponibles en tu app en formato movil
- **Tamano requerido:** minimo 320px, maximo 3840px (lado mas corto)
- **Relacion de aspecto:** entre 16:9 y 9:16
- Toma capturas directamente desde tu movil al probar la app

**Screenshots recomendados:**
1. Pantalla principal con logo y botones
2. Seleccion de profesion con dificultades
3. Tablero de juego con dados
4. Pregunta trivia (crypto/trading)
5. Pagina de musica DJ Alka
6. Pantalla de victoria (libertad financiera)
7. Lobby multijugador
8. Clasificaciones/logros

---

## PASO 4: FORMULARIO DE SEGURIDAD DE DATOS (Data Safety)

En Google Play Console → Tu app → **"Seguridad de los datos"**

### Respuestas:

**¿Tu app recopila o comparte datos de usuario?**
→ **Si**

**¿Todos los datos recopilados estan cifrados en transito?**
→ **Si** (usamos HTTPS)

**¿Proporcionas una forma de que los usuarios soliciten la eliminacion de sus datos?**
→ **Si** (email: info@ktysdavids.com)

#### Tipos de datos recopilados:

| Categoria | Tipo | Recopilado | Compartido | Obligatorio | Finalidad |
|-----------|------|------------|------------|-------------|-----------|
| Informacion personal | Nombre | Si | No | Si | Funcionalidad de la app |
| Informacion personal | Email | Si | No | Si | Gestion de cuenta |
| Informacion personal | Foto de perfil | Si | No | No | Funcionalidad de la app |
| Actividad de la app | Interacciones con la app | Si | No | Si | Analisis |
| Actividad de la app | Contenido generado (progreso juego) | Si | No | Si | Funcionalidad de la app |

**¿Los datos se procesan de forma efimera?** → No
**¿Tu app necesita estos datos para funcionar?** → Si (cuenta y progreso de juego)

---

## PASO 5: CLASIFICACION DE CONTENIDO (Content Rating)

En Google Play Console → Tu app → **"Clasificacion de contenido"**

### Cuestionario IARC:

**Categoria:** Juego

**¿Contiene violencia?** → No
**¿Contiene miedo/horror?** → No
**¿Contiene sexualidad?** → No
**¿Contiene lenguaje soez?** → No
**¿Contiene drogas?** → No
**¿Contiene discriminacion?** → No
**¿Contiene juegos de azar simulados?** → No (es un juego de mesa educativo sobre finanzas, no apuestas)
**¿Contiene compras dentro de la app?** → No
**¿Permite interacciones de usuario (chat)?** → Si (chat en multijugador)
**¿Permite compartir ubicacion?** → No
**¿La app comparte datos con terceros?** → No

**Resultado esperado:** PEGI 3 / Everyone (E) / USK 0

---

## PASO 6: POLITICA DE PRIVACIDAD

**URL de tu politica de privacidad:**
```
https://money-game-hub-1.preview.emergentagent.com/privacy
```

Copia esta URL en:
- Google Play Console → Ficha de Play Store → Politica de privacidad
- Google Play Console → Seguridad de los datos → URL de politica de privacidad

---

## PASO 7: PRECIOS Y DISTRIBUCION

### Opciones:

**Opcion 1 - Gratuita (RECOMENDADO para empezar):**
- Sube la app gratuita
- Gana usuarios y reviews
- Luego puedes anadir compras in-app o version premium

**Opcion 2 - De pago:**
- Precio sugerido: **$2.99 - $4.99 USD** (o equivalente EUR)
- Necesitas configurar un perfil de pago en Google Play Console
- Cuenta bancaria (puede ser de cualquier pais compatible con Google Payments)

### Paises de distribucion:
- Selecciona **"Todos los paises"** para maximizar alcance
- O selecciona especificamente los paises donde tienes traducciones: Espana, LATAM, USA, Brasil, Francia, Alemania, Italia, China

---

## PASO 8: SUBIR EL AAB Y PUBLICAR

### 8.1 Testing Interno (RECOMENDADO primero)

1. Google Play Console → **Pruebas** → **Pruebas internas**
2. Clic en **"Crear nueva version"**
3. Sube el archivo **.aab** generado en el Paso 2
4. Anade notas de la version:
```
Xamox Flow v1.0.0 - Version inicial
- Juego de mesa financiero completo
- Modo individual y multijugador (hasta 6 jugadores)
- 8 profesiones, 30 preguntas trivia
- 6 generos musicales originales por DJ Alka
- 7 idiomas disponibles
```
5. Clic en **"Guardar"** y luego **"Revisar version"**
6. Anade testers (tu email y los de tu equipo)
7. Comparte el enlace de prueba con los testers

### 8.2 Prueba Cerrada (Closed Testing)
- Despues de probar internamente, crea una version en **pruebas cerradas**
- Invita a 20+ testers
- Google puede requerir un minimo de 20 testers durante 14 dias antes de permitir produccion

### 8.3 Produccion
1. Cuando estes satisfecho con las pruebas:
2. Google Play Console → **Produccion** → **Crear nueva version**
3. Sube el mismo AAB (o uno actualizado)
4. Envia para **revision** → Google tarda **1-7 dias** en revisar
5. Una vez aprobado, tu app estara disponible en Google Play Store

---

## PASO 9: DESPUES DE PUBLICAR

### Marketing basico:
- Comparte el enlace de Google Play en tus redes sociales
- Pide reviews a tus primeros usuarios
- Crea contenido en TikTok/Instagram mostrando el juego
- Contacta influencers de finanzas personales

### Monitoreo:
- Revisa el **Dashboard de Google Play Console** regularmente
- Responde a los reviews de usuarios
- Monitorea crashes en la seccion **"Calidad"**
- Usa **"Estadisticas"** para ver instalaciones y engagement

---

## CHECKLIST FINAL ANTES DE PUBLICAR

- [ ] Cuenta de desarrollador creada y verificada ($25)
- [ ] Archivo AAB generado desde PWABuilder
- [ ] Ficha de la app completada (titulo, descripciones, screenshots)
- [ ] Icono de app subido (512x512)
- [ ] Imagen destacada creada y subida (1024x500)
- [ ] Minimo 4 screenshots subidos
- [ ] Formulario de seguridad de datos completado
- [ ] Clasificacion de contenido completada
- [ ] URL de politica de privacidad introducida
- [ ] Paises de distribucion seleccionados
- [ ] Precio configurado (gratis o de pago)
- [ ] Version AAB subida en testing interno
- [ ] App probada por equipo de testers
- [ ] Version enviada a produccion para revision

---

## CONTACTO Y SOPORTE

**Empresa:** Ktys & Davids Productions SL
**Email:** info@ktysdavids.com
**Telefono:** +34 673 038 773
**Web:** www.ktysdavids.com
**Musica:** DJ Alka - www.dj-alka.com

---

*Guia creada el 12 de Febrero de 2026 para Xamox Flow v1.0.0*
