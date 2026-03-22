import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const CONTENT = {
  title: { es: 'Politica de Privacidad', en: 'Privacy Policy' },
  last_updated: { es: 'Ultima actualizacion', en: 'Last updated' },
  sections: [
    {
      title: { es: '1. Informacion que Recopilamos', en: '1. Information We Collect' },
      content: {
        es: 'Xamox Flow, desarrollado por Ktys & Davids Productions SL, recopila la siguiente informacion:\n\n- **Datos de cuenta:** Nombre de usuario, direccion de correo electronico y contrasena cifrada al registrarte.\n- **Datos de perfil:** Foto de perfil (opcional) y preferencias de juego (idioma, genero musical, dificultad).\n- **Datos de juego:** Progreso de partidas guardadas, puntuaciones, logros y estadisticas de juego.\n- **Datos de uso:** Interacciones basicas con la aplicacion para mejorar la experiencia del usuario.\n- **Google Sign-In:** Si usas Google para iniciar sesion, recibimos tu nombre, email y foto de perfil de Google. No accedemos a ningun otro dato de tu cuenta de Google.',
        en: 'Xamox Flow, developed by Ktys & Davids Productions SL, collects the following information:\n\n- **Account data:** Username, email address, and encrypted password upon registration.\n- **Profile data:** Profile photo (optional) and game preferences (language, music genre, difficulty).\n- **Game data:** Saved game progress, scores, achievements, and gameplay statistics.\n- **Usage data:** Basic app interactions to improve user experience.\n- **Google Sign-In:** If you use Google to sign in, we receive your name, email, and Google profile photo. We do not access any other data from your Google account.'
      }
    },
    {
      title: { es: '2. Como Usamos la Informacion', en: '2. How We Use Information' },
      content: {
        es: 'Utilizamos tu informacion exclusivamente para:\n\n- Crear y gestionar tu cuenta de usuario.\n- Guardar y sincronizar tu progreso de juego.\n- Habilitar el modo multijugador y las funciones sociales (amigos, clasificaciones).\n- Personalizar tu experiencia (idioma, musica, preferencias).\n- Mejorar y optimizar el rendimiento de la aplicacion.\n\n**No vendemos ni compartimos tus datos personales con terceros para fines publicitarios.**',
        en: 'We use your information exclusively to:\n\n- Create and manage your user account.\n- Save and sync your game progress.\n- Enable multiplayer mode and social features (friends, leaderboards).\n- Personalize your experience (language, music, preferences).\n- Improve and optimize app performance.\n\n**We do not sell or share your personal data with third parties for advertising purposes.**'
      }
    },
    {
      title: { es: '3. Almacenamiento y Seguridad', en: '3. Storage and Security' },
      content: {
        es: 'Tus datos se almacenan en servidores seguros. Las contrasenas se cifran mediante algoritmos hash de nivel industrial (bcrypt). Implementamos medidas de seguridad tecnicas y organizativas apropiadas para proteger tus datos contra acceso no autorizado, alteracion, divulgacion o destruccion.\n\nLos tokens de autenticacion (JWT) tienen una duracion limitada y se renuevan automaticamente.',
        en: 'Your data is stored on secure servers. Passwords are encrypted using industry-grade hashing algorithms (bcrypt). We implement appropriate technical and organizational security measures to protect your data against unauthorized access, alteration, disclosure, or destruction.\n\nAuthentication tokens (JWT) have a limited duration and are automatically renewed.'
      }
    },
    {
      title: { es: '4. Musica y Contenido', en: '4. Music and Content' },
      content: {
        es: 'Toda la musica incluida en Xamox Flow es produccion musical original y propia de DJ Alka (David A. Amundarain), fundador de Ktys & Davids Productions SL y productor musical profesional registrado. Los temas musicales han sido creados exclusivamente para este juego con asistencia de inteligencia artificial.\n\nNingun contenido del juego utiliza material con derechos de autor de terceros.',
        en: 'All music included in Xamox Flow is original music production by DJ Alka (David A. Amundarain), founder of Ktys & Davids Productions SL and registered professional music producer. The musical tracks have been created exclusively for this game with AI assistance.\n\nNo game content uses third-party copyrighted material.'
      }
    },
    {
      title: { es: '5. Tus Derechos (RGPD)', en: '5. Your Rights (GDPR)' },
      content: {
        es: 'De acuerdo con el Reglamento General de Proteccion de Datos (RGPD) de la Union Europea, tienes derecho a:\n\n- **Acceso:** Solicitar una copia de tus datos personales.\n- **Rectificacion:** Corregir datos inexactos o incompletos.\n- **Supresion:** Solicitar la eliminacion de tus datos ("derecho al olvido").\n- **Portabilidad:** Recibir tus datos en un formato estructurado y de uso comun.\n- **Oposicion:** Oponerte al tratamiento de tus datos en determinadas circunstancias.\n\nPara ejercer cualquiera de estos derechos, contacta con nosotros en: **info@ktysdavids.com**',
        en: 'In accordance with the EU General Data Protection Regulation (GDPR), you have the right to:\n\n- **Access:** Request a copy of your personal data.\n- **Rectification:** Correct inaccurate or incomplete data.\n- **Erasure:** Request deletion of your data ("right to be forgotten").\n- **Portability:** Receive your data in a structured, commonly used format.\n- **Objection:** Object to the processing of your data in certain circumstances.\n\nTo exercise any of these rights, contact us at: **info@ktysdavids.com**'
      }
    },
    {
      title: { es: '6. Menores de Edad', en: '6. Minors' },
      content: {
        es: 'Xamox Flow es un juego educativo sobre finanzas personales. Los menores de 16 anos deben contar con el consentimiento de sus padres o tutores legales para crear una cuenta. No recopilamos intencionadamente datos de menores de 13 anos.',
        en: 'Xamox Flow is an educational game about personal finance. Minors under 16 must have parental or legal guardian consent to create an account. We do not knowingly collect data from children under 13.'
      }
    },
    {
      title: { es: '7. Cookies y Almacenamiento Local', en: '7. Cookies and Local Storage' },
      content: {
        es: 'Xamox Flow utiliza almacenamiento local del navegador (localStorage) para guardar tus preferencias (idioma, volumen de musica, genero musical seleccionado). No utilizamos cookies de seguimiento ni de publicidad de terceros.',
        en: 'Xamox Flow uses browser local storage (localStorage) to save your preferences (language, music volume, selected music genre). We do not use tracking cookies or third-party advertising cookies.'
      }
    },
    {
      title: { es: '8. Contacto', en: '8. Contact' },
      content: {
        es: '**Responsable del tratamiento:**\nKtys & Davids Productions SL\nEspana\n\n**Email:** info@ktysdavids.com\n**Telefono:** +34 673 038 773\n**Web:** www.ktysdavids.com',
        en: '**Data Controller:**\nKtys & Davids Productions SL\nSpain\n\n**Email:** info@ktysdavids.com\n**Phone:** +34 673 038 773\n**Web:** www.ktysdavids.com'
      }
    }
  ]
};

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const l = (obj) => obj?.[lang] || obj?.es || obj?.en || '';

  return (
    <div className="min-h-screen page-bg" data-testid="privacy-page">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full glass hover:bg-[var(--surface-2)]" data-testid="privacy-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl font-bold">{l(CONTENT.title)}</h1>
        </div>

        <div className="card p-4 mb-4" style={{background: 'rgba(247,215,122,0.04)', borderColor: 'rgba(247,215,122,0.1)'}}>
          <p style={{fontSize: '12px', color: 'var(--text-subtle)'}}>
            {l(CONTENT.last_updated)}: 11 Febrero 2026
          </p>
        </div>

        <div className="space-y-4">
          {CONTENT.sections.map((section, i) => (
            <div key={i} className="card p-5">
              <h2 style={{fontSize: '15px', fontWeight: '700', color: 'var(--gold)', marginBottom: '12px'}}>
                {l(section.title)}
              </h2>
              <div style={{fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7', whiteSpace: 'pre-line'}}>
                {l(section.content).split('**').map((part, j) => (
                  j % 2 === 1 ? <strong key={j} style={{color: 'var(--text-primary)', fontWeight: '600'}}>{part}</strong> : <span key={j}>{part}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 mb-4">
          <p style={{fontSize: '11px', color: 'var(--text-subtle)'}}>
            &copy; {new Date().getFullYear()} Ktys & Davids Productions SL
          </p>
        </div>
      </div>
    </div>
  );
}
