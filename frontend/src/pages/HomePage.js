import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { getPublicUrl } from '../utils/publicUrl';
import SettingsModal from '../components/SettingsModal';
import { Footer } from '../components/Footer';
import { LANG_FLAGS } from '../i18n/translations';

const LOGO_URL = '/logo-xamox.png';

export default function HomePage() {
  const { t, lang } = useLanguage();
  const { user, isLoggedIn, logout } = useAuth();
  const { playSfx, playMusic, musicEnabled } = useAudio();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  // Play main/home music when on home page
  useEffect(() => {
    if (musicEnabled) {
      try { playMusic('main'); } catch(e) {}
    }
  }, []); // eslint-disable-line

  const handleNav = (path) => {
    playSfx('click');
    navigate(path);
  };

  const UserAvatar = ({ size = 32 }) => {
    if (user?.avatar_url) {
      return <img src={user.avatar_url} alt="" className="rounded-full object-cover" style={{width: size, height: size}} />;
    }
    return (
      <div className="rounded-full flex items-center justify-center text-xs font-bold" style={{ background: user?.avatar_color || '#FFD700', width: size, height: size }}>
        {user?.username?.charAt(0)?.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen page-bg flex flex-col" data-testid="home-page">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full glass text-sm border border-[var(--border)]">
            <span className="text-lg">{LANG_FLAGS[lang]?.flag}</span>
            <span className="text-[var(--text-muted)] text-xs">{LANG_FLAGS[lang]?.name}</span>
            <span className="text-[9px] font-bold text-[var(--gold)] ml-1">LOCK</span>
          </div>
          <button
            data-testid="settings-btn"
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full glass hover:border-[var(--gold-deep)] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('/profile')}>
                <UserAvatar size={32} />
                <span className="text-sm font-medium hidden sm:block">{user?.username}</span>
              </div>
              <button onClick={logout} className="text-xs text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors">
                {t('logout')}
              </button>
            </div>
          ) : (
            <button
              data-testid="login-btn"
              onClick={() => handleNav('/login')}
              className="btn-outline-gold px-4 py-2 rounded-full text-sm"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 -mt-4">
        {/* Logo Image */}
        <div className="mb-4 animate-float card panel-premium px-8 py-4 rounded-3xl">
          <img
            src={LOGO_URL}
            alt="Xamox Flow"
            className="w-40 h-40 sm:w-52 sm:h-52 object-contain drop-shadow-2xl"
            style={{filter: 'drop-shadow(0 0 30px rgba(247,215,122,0.25))'}}
          />
        </div>

        <p className="text-[var(--text-muted)] text-sm sm:text-base mb-6 text-center">{t('tagline')}</p>

        {/* Menu Buttons */}
        <div className="w-full max-w-sm space-y-3 card panel-premium p-4 rounded-2xl">
          <button
            data-testid="play-solo-btn"
            onClick={() => handleNav('/select-profession')}
            className="w-full btn-gold py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 animate-pulse-gold"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            {t('play_solo')}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              data-testid="multiplayer-btn"
              onClick={() => handleNav('/multiplayer')}
              className="btn-outline-gold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {t('multiplayer')}
            </button>
            <button
              data-testid="friends-btn"
              onClick={() => handleNav('/friends')}
              className="btn-outline-gold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              {t('friends')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              data-testid="rankings-btn"
              onClick={() => handleNav('/leaderboard')}
              className="btn-outline-gold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7m12-3h1.5a2.5 2.5 0 0 1 0 5H18m-12 7v-3m6 3v-3m6 3v-3M5 20h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>
              {t('rankings')}
            </button>
            <button
              data-testid="achievements-btn"
              onClick={() => handleNav('/achievements')}
              className="btn-outline-gold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
              {t('achievements')}
            </button>
          </div>

          {/* Music Section Button */}
          <button
            data-testid="music-btn"
            onClick={() => handleNav('/music')}
            className="w-full btn-outline-gold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            🎵 {lang === 'es' ? 'Música - DJ Alka' : 'Music - DJ Alka'}
          </button>

          {/* Social Sharing */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <a href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPublicUrl() || window.location?.origin || '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full glass hover:bg-[rgba(59,89,152,0.2)] transition-all" title="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#4267B2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full glass hover:bg-[rgba(225,48,108,0.2)] transition-all" title="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full glass hover:bg-[rgba(255,255,255,0.1)] transition-all" title="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.83 4.83 0 01-3.77-1.24V6.69z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
