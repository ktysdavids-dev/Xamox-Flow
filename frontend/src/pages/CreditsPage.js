import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const CT = {
  title: { es: 'Creditos', en: 'Credits', pt: 'Creditos', fr: 'Credits', de: 'Credits', it: 'Crediti', zh: '制作人员' },
  game_dev: { es: 'Desarrollo del Juego', en: 'Game Development', pt: 'Desenvolvimento do Jogo', fr: 'Developpement du Jeu', de: 'Spielentwicklung', it: 'Sviluppo del Gioco', zh: '游戏开发' },
  music_section: { es: 'Musica Original', en: 'Original Music', pt: 'Musica Original', fr: 'Musique Originale', de: 'Originalmusik', it: 'Musica Originale', zh: '原创音乐' },
  team: { es: 'Equipo', en: 'Team', pt: 'Equipe', fr: 'Equipe', de: 'Team', it: 'Team', zh: '团队' },
  tech: { es: 'Tecnologia', en: 'Technology', pt: 'Tecnologia', fr: 'Technologie', de: 'Technologie', it: 'Tecnologia', zh: '技术' },
  special_thanks: { es: 'Agradecimiento Especial', en: 'Special Thanks', pt: 'Agradecimento Especial', fr: 'Remerciement Special', de: 'Besonderer Dank', it: 'Ringraziamento Speciale', zh: '特别感谢' },
  thanks_text: { es: 'A todos los jugadores que participan en las pruebas y ayudan a mejorar Xamox Flow. Este juego esta hecho con pasion por la educacion financiera.', en: 'To all the players who participate in testing and help improve Xamox Flow. This game is made with a passion for financial education.', pt: 'A todos os jogadores que participam dos testes e ajudam a melhorar o Xamox Flow.', fr: 'A tous les joueurs qui participent aux tests et aident a ameliorer Xamox Flow.', de: 'An alle Spieler die an Tests teilnehmen und helfen Xamox Flow zu verbessern.', it: 'A tutti i giocatori che partecipano ai test e aiutano a migliorare Xamox Flow.', zh: '感谢所有参与测试并帮助改进Xamox Flow的玩家。' },
  all_music_note: { es: 'Toda la musica de Xamox Flow es produccion musical propia y original de DJ Alka (David A. Amundarain), fundador de Ktys & Davids Productions SL y productor musical profesional registrado, titulado por la Universidad de Murcia / ECAP. Los temas han sido creados exclusivamente para este juego con asistencia de IA.', en: 'All music in Xamox Flow is original and proprietary music production by DJ Alka (David A. Amundarain), founder of Ktys & Davids Productions SL and registered professional music producer, certified by the University of Murcia / ECAP. Tracks were created exclusively for this game with AI assistance.', pt: 'Toda a musica do Xamox Flow e producao musical propria e original de DJ Alka.', fr: 'Toute la musique de Xamox Flow est une production musicale originale de DJ Alka.', de: 'Die gesamte Musik in Xamox Flow ist eine eigene und originelle Musikproduktion von DJ Alka.', it: 'Tutta la musica di Xamox Flow e produzione musicale propria e originale di DJ Alka.', zh: 'Xamox Flow中的所有音乐均为DJ Alka的原创音乐制作。' },
};

export default function CreditsPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (key) => CT[key]?.[lang] || CT[key]?.es || CT[key]?.en || key;

  return (
    <div className="min-h-screen page-bg" data-testid="credits-page">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full glass hover:bg-[var(--surface-2)]" data-testid="credits-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl font-bold">{t('title')}</h1>
        </div>

        {/* Game Logo */}
        <div className="text-center mb-6">
          <img src="/logo-xamox.png" alt="Xamox Flow" style={{width: '100px', height: '100px', margin: '0 auto', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(247,215,122,0.3))'}} />
          <h2 style={{fontSize: '24px', fontWeight: '800', color: 'var(--gold)', marginTop: '12px'}}>Xamox Flow</h2>
          <p style={{fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px'}}>v3.0 Premium Edition</p>
        </div>

        {/* Development */}
        <div className="card p-5 mb-4">
          <h3 style={{fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px'}}>
            {t('game_dev')}
          </h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
            <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(247,215,122,0.1)', border: '1px solid rgba(247,215,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0}}>🏢</div>
            <div>
              <div style={{fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)'}}>Ktys & Davids Productions SL</div>
              <div style={{fontSize: '12px', color: 'var(--text-subtle)'}}>Espana</div>
              <a href="https://www.ktysdavids.com" target="_blank" rel="noopener noreferrer" style={{fontSize: '11px', color: 'var(--gold)', textDecoration: 'none'}}>www.ktysdavids.com</a>
            </div>
          </div>
        </div>

        {/* Music */}
        <div className="card p-5 mb-4" style={{background: 'linear-gradient(135deg, rgba(15,42,43,0.95) 0%, rgba(7,21,27,0.98) 100%)'}}>
          <h3 style={{fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px'}}>
            🎵 {t('music_section')}
          </h3>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px'}}>
            <div style={{width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', background: '#000'}}>
              <img src="/dj-alka-logo.png" alt="DJ Alka" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            </div>
            <div>
              <div style={{fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)'}}>DJ Alka</div>
              <div style={{fontSize: '12px', color: 'var(--text-subtle)'}}>David A. Amundarain</div>
              <a href="https://www.dj-alka.com" target="_blank" rel="noopener noreferrer" style={{fontSize: '11px', color: 'var(--gold)', textDecoration: 'none'}}>www.dj-alka.com</a>
            </div>
          </div>
          <p style={{fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '12px'}}>
            {t('all_music_note')}
          </p>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            {['Electronica', 'Pop', 'Rock', 'Latina', 'Hip Hop', 'Chill / Lofi'].map(genre => (
              <span key={genre} style={{fontSize: '10px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(247,215,122,0.08)', border: '1px solid rgba(247,215,122,0.15)', color: 'var(--gold)', fontWeight: '600'}}>{genre}</span>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="card p-5 mb-4">
          <h3 style={{fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px'}}>
            {t('team')}
          </h3>
          <div className="space-y-3">
            {[
              { name: 'David A. Amundarain', role: 'CEO & Founder / DJ Alka', icon: '👨\u200d💻' },
              { name: 'Raul Andres Vera', role: 'COO', icon: '📊' },
              { name: 'Jesica S. Marquez', role: 'CMO', icon: '📢' },
            ].map((member, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)'}}>
                <span style={{fontSize: '22px'}}>{member.icon}</span>
                <div>
                  <div style={{fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)'}}>{member.name}</div>
                  <div style={{fontSize: '11px', color: 'var(--text-subtle)'}}>{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technology */}
        <div className="card p-5 mb-4">
          <h3 style={{fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px'}}>
            {t('tech')}
          </h3>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            {['React', 'FastAPI', 'MongoDB', 'WebSockets', 'PWA', 'i18n (7 idiomas)'].map(tech => (
              <span key={tech} style={{fontSize: '11px', padding: '5px 12px', borderRadius: '10px', background: 'rgba(98,198,255,0.08)', border: '1px solid rgba(98,198,255,0.15)', color: '#62C6FF', fontWeight: '500'}}>{tech}</span>
            ))}
          </div>
        </div>

        {/* Special Thanks */}
        <div className="card p-5 mb-4" style={{background: 'rgba(247,215,122,0.04)', borderColor: 'rgba(247,215,122,0.15)'}}>
          <h3 style={{fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px'}}>
            {t('special_thanks')}
          </h3>
          <p style={{fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7'}}>
            {t('thanks_text')}
          </p>
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
