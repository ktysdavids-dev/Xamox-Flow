import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const CONTENT = {
  title: { es: 'Terminos de Uso', en: 'Terms of Use' },
  last_updated: { es: 'Ultima actualizacion', en: 'Last updated' },
  sections: [
    {
      title: { es: '1. Aceptacion de los Terminos', en: '1. Acceptance of Terms' },
      content: {
        es: 'Al acceder y utilizar Xamox Flow (en adelante, "el Juego" o "la Aplicacion"), aceptas estos Terminos de Uso en su totalidad. Si no estas de acuerdo con alguna parte de estos terminos, no debes utilizar la aplicacion.\n\nEl Juego es propiedad de **Ktys & Davids Productions SL**, una empresa registrada en Espana.',
        en: 'By accessing and using Xamox Flow (hereinafter, "the Game" or "the Application"), you accept these Terms of Use in their entirety. If you do not agree with any part of these terms, you must not use the application.\n\nThe Game is owned by **Ktys & Davids Productions SL**, a company registered in Spain.'
      }
    },
    {
      title: { es: '2. Descripcion del Servicio', en: '2. Service Description' },
      content: {
        es: 'Xamox Flow es un juego de mesa digital educativo sobre finanzas personales, inversion y libertad financiera. El juego incluye:\n\n- Modo individual (un jugador)\n- Modo multijugador en linea (hasta 6 jugadores)\n- Sistema de amigos y clasificaciones\n- Preguntas educativas sobre finanzas, trading, criptomonedas y blockchain\n- Musica original producida por DJ Alka\n\nEl Juego tiene fines exclusivamente educativos y de entretenimiento. No constituye asesoramiento financiero profesional.',
        en: 'Xamox Flow is an educational digital board game about personal finance, investing, and financial freedom. The game includes:\n\n- Single player mode\n- Online multiplayer mode (up to 6 players)\n- Friends system and leaderboards\n- Educational questions about finance, trading, cryptocurrency, and blockchain\n- Original music produced by DJ Alka\n\nThe Game is for educational and entertainment purposes only. It does not constitute professional financial advice.'
      }
    },
    {
      title: { es: '3. Registro de Cuenta', en: '3. Account Registration' },
      content: {
        es: 'Para acceder a ciertas funciones (guardar progreso, multijugador, amigos), es necesario crear una cuenta. Al registrarte, te comprometes a:\n\n- Proporcionar informacion veraz y actualizada.\n- Mantener la confidencialidad de tus credenciales de acceso.\n- No crear cuentas multiples con fines fraudulentos.\n- Ser mayor de 16 anos o contar con consentimiento parental.',
        en: 'To access certain features (save progress, multiplayer, friends), you must create an account. By registering, you agree to:\n\n- Provide truthful and up-to-date information.\n- Maintain the confidentiality of your access credentials.\n- Not create multiple accounts for fraudulent purposes.\n- Be over 16 years old or have parental consent.'
      }
    },
    {
      title: { es: '4. Propiedad Intelectual', en: '4. Intellectual Property' },
      content: {
        es: 'Todo el contenido de Xamox Flow, incluyendo pero no limitado a:\n\n- Diseno grafico, interfaz de usuario y elementos visuales\n- Logica del juego y mecanicas\n- Musica y efectos de sonido (produccion original de DJ Alka / David A. Amundarain)\n- Textos, traducciones y preguntas educativas\n- Nombre "Xamox Flow" y logotipo\n\n...es propiedad exclusiva de **Ktys & Davids Productions SL** y esta protegido por las leyes de propiedad intelectual espanolas e internacionales.\n\nToda la musica del juego es **produccion musical propia de DJ Alka**, fundador de Ktys & Davids Productions SL y productor musical profesional registrado (titulado por la Universidad de Murcia / ECAP). Los temas han sido creados exclusivamente para Xamox Flow con asistencia de inteligencia artificial.\n\nQueda prohibida la reproduccion, distribucion o uso no autorizado de cualquier contenido del Juego.',
        en: 'All content in Xamox Flow, including but not limited to:\n\n- Graphic design, user interface, and visual elements\n- Game logic and mechanics\n- Music and sound effects (original production by DJ Alka / David A. Amundarain)\n- Texts, translations, and educational questions\n- "Xamox Flow" name and logo\n\n...is the exclusive property of **Ktys & Davids Productions SL** and is protected by Spanish and international intellectual property laws.\n\nAll music in the game is **original music production by DJ Alka**, founder of Ktys & Davids Productions SL and registered professional music producer (certified by the University of Murcia / ECAP). The tracks were created exclusively for Xamox Flow with AI assistance.\n\nUnauthorized reproduction, distribution, or use of any Game content is prohibited.'
      }
    },
    {
      title: { es: '5. Conducta del Usuario', en: '5. User Conduct' },
      content: {
        es: 'Al utilizar Xamox Flow, te comprometes a no:\n\n- Utilizar lenguaje ofensivo, abusivo o discriminatorio en el chat del juego.\n- Intentar hackear, explotar o manipular el juego o sus servidores.\n- Hacer trampa o utilizar software de terceros para obtener ventaja desleal.\n- Suplantar la identidad de otros jugadores.\n- Utilizar el juego para actividades ilegales.\n\nNos reservamos el derecho de suspender o eliminar cuentas que violen estas normas.',
        en: 'By using Xamox Flow, you agree not to:\n\n- Use offensive, abusive, or discriminatory language in the game chat.\n- Attempt to hack, exploit, or manipulate the game or its servers.\n- Cheat or use third-party software to gain unfair advantage.\n- Impersonate other players.\n- Use the game for illegal activities.\n\nWe reserve the right to suspend or delete accounts that violate these rules.'
      }
    },
    {
      title: { es: '6. Descargo de Responsabilidad', en: '6. Disclaimer' },
      content: {
        es: 'Xamox Flow es un juego educativo. La informacion financiera presentada (inversiones, trading, criptomonedas, etc.) tiene fines exclusivamente educativos y de entretenimiento.\n\n**No constituye asesoramiento financiero, de inversion o legal.** Antes de tomar cualquier decision financiera real, consulta con un profesional cualificado.\n\nKtys & Davids Productions SL no se responsabiliza de decisiones financieras basadas en el contenido del juego.',
        en: 'Xamox Flow is an educational game. The financial information presented (investments, trading, cryptocurrencies, etc.) is for educational and entertainment purposes only.\n\n**It does not constitute financial, investment, or legal advice.** Before making any real financial decisions, consult a qualified professional.\n\nKtys & Davids Productions SL is not responsible for financial decisions based on game content.'
      }
    },
    {
      title: { es: '7. Disponibilidad del Servicio', en: '7. Service Availability' },
      content: {
        es: 'Nos esforzamos por mantener Xamox Flow disponible las 24 horas del dia, pero no garantizamos un servicio ininterrumpido. Pueden producirse interrupciones por mantenimiento, actualizaciones o circunstancias fuera de nuestro control.\n\nNos reservamos el derecho de modificar, suspender o descontinuar el Juego o cualquiera de sus funciones en cualquier momento.',
        en: 'We strive to keep Xamox Flow available 24/7, but we do not guarantee uninterrupted service. Interruptions may occur due to maintenance, updates, or circumstances beyond our control.\n\nWe reserve the right to modify, suspend, or discontinue the Game or any of its features at any time.'
      }
    },
    {
      title: { es: '8. Legislacion Aplicable', en: '8. Applicable Law' },
      content: {
        es: 'Estos Terminos de Uso se rigen por la legislacion espanola. Cualquier disputa sera sometida a la jurisdiccion de los tribunales competentes de Espana.',
        en: 'These Terms of Use are governed by Spanish law. Any dispute shall be submitted to the jurisdiction of the competent courts of Spain.'
      }
    },
    {
      title: { es: '9. Contacto', en: '9. Contact' },
      content: {
        es: '**Ktys & Davids Productions SL**\nEspana\n\n**Email:** info@ktysdavids.com\n**Telefono:** +34 673 038 773\n**Web:** www.ktysdavids.com',
        en: '**Ktys & Davids Productions SL**\nSpain\n\n**Email:** info@ktysdavids.com\n**Phone:** +34 673 038 773\n**Web:** www.ktysdavids.com'
      }
    }
  ]
};

export default function TermsPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const l = (obj) => obj?.[lang] || obj?.es || obj?.en || '';

  return (
    <div className="min-h-screen page-bg" data-testid="terms-page">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full glass hover:bg-[var(--surface-2)]" data-testid="terms-back-btn">
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
