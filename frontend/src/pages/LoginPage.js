import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { API, getBackendHttpOrigin } from '../config';

export default function LoginPage() {
  const { t, lang } = useLanguage();
  const { login, register, providers } = useAuth();
  const { playSfx } = useAudio();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (form.password !== form.confirm) { setError('Passwords do not match'); setLoading(false); return; }
        if (form.password.length < 4) { setError('Password too short'); setLoading(false); return; }
        await register(form.username, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      playSfx('success');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error occurred');
      playSfx('error');
    }
    setLoading(false);
  };

  // Google login: redirect to our backend, which redirects to Google and returns with token (no third-party auth).
  const apiBase = getBackendHttpOrigin();
  const handleGoogleLogin = () => {
    if (!apiBase) return;
    const host = window.location.hostname;
    const isLoopback = host === 'localhost' || host === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    // Google OAuth blocks insecure (http) callbacks for non-localhost origins.
    if (!isHttps && !isLoopback) {
      setError(
        lang === 'es'
          ? 'Google Login requiere HTTPS en móvil/red local. Abre el juego con una URL HTTPS pública (Render o túnel HTTPS) o prueba en http://localhost:8000 en tu Mac.'
          : 'Google Login requires HTTPS on mobile/LAN. Open the game from a public HTTPS URL (Render or HTTPS tunnel) or test on http://localhost:8000 on your Mac.'
      );
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/');
    window.location.href = `${apiBase.replace(/\/$/, '')}/api/auth/google?redirect_uri=${redirectUri}`;
  };
  const showGoogleButton = Boolean(apiBase) && !!providers.google?.enabled;
  const showFacebookButton = Boolean(apiBase);
  const facebookEnabled = !!providers.facebook?.enabled;
  const facebookStatus = providers.facebook?.status || 'coming_soon';
  const handleFacebookLogin = () => {
    if (!apiBase || !facebookEnabled) return;
    const redirectUri = encodeURIComponent(window.location.origin + '/');
    window.location.href = `${apiBase.replace(/\/$/, '')}/api/auth/facebook?redirect_uri=${redirectUri}`;
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center px-4" data-testid="login-page">
      <div className="card p-8 w-full max-w-md animate-fade-in-scale">
        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/logo-xamox.png" alt="Xamox Flow" className="w-20 h-20 mx-auto mb-3 object-contain" />
          <h2 className="text-xl font-bold">{isRegister ? t('register') : t('login')}</h2>
        </div>

        {/* Social login */}
        <div className="space-y-2 mb-4">
          {showGoogleButton ? (
            <button
              data-testid="google-login-btn"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-gray-800 font-bold text-sm hover:bg-gray-100 transition-all shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {lang === 'es' ? 'Iniciar con Google' : 'Sign in with Google'}
            </button>
          ) : (
            <div className="w-full py-2.5 px-3 rounded-xl bg-[rgba(255,90,106,0.1)] border border-[rgba(255,90,106,0.35)] text-[11px] text-[var(--danger)] text-center">
              {lang === 'es' ? 'Google login no configurado en servidor' : 'Google login not configured on server'}
            </div>
          )}

          {showFacebookButton && (
            <button
              data-testid="facebook-login-btn"
              onClick={handleFacebookLogin}
              disabled={!facebookEnabled}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-[#1877F2] text-white font-bold text-sm transition-all ${
                facebookEnabled ? 'hover:brightness-110 shadow-md' : 'opacity-60 cursor-not-allowed'
              }`}
              title={
                facebookEnabled
                  ? (lang === 'es' ? 'Iniciar con Facebook' : 'Sign in with Facebook')
                  : (lang === 'es' ? 'Disponible en próxima actualización' : 'Available in next update')
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.87v-6.98H7.9V12h2.54V9.8c0-2.5 1.49-3.88 3.78-3.88 1.1 0 2.26.2 2.26.2v2.48h-1.27c-1.25 0-1.64.77-1.64 1.57V12h2.8l-.45 2.89h-2.35v6.98A10 10 0 0 0 22 12Z"/></svg>
              {facebookEnabled
                ? (lang === 'es' ? 'Iniciar con Facebook' : 'Sign in with Facebook')
                : (facebookStatus === 'coming_soon'
                  ? (lang === 'es' ? 'Facebook (próximamente)' : 'Facebook (coming soon)')
                  : (lang === 'es' ? 'Facebook no configurado' : 'Facebook not configured'))}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[var(--border)]"></div>
          <span className="text-xs text-[var(--text-subtle)]">{lang === 'es' ? 'o con email' : 'or with email'}</span>
          <div className="flex-1 h-px bg-[var(--border)]"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(255,90,106,0.1)] border border-[var(--danger)] text-[var(--danger)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('username')}</label>
              <input
                data-testid="username-input"
                type="text"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                required
              />
            </div>
          )}
          <div>
            <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('email')}</label>
            <input
              data-testid="email-input"
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('password')}</label>
            <input
              data-testid="password-input"
              type="password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none transition-colors"
              required
            />
          </div>
          {isRegister && (
            <div>
              <label className="text-sm text-[var(--text-muted)] mb-1 block">{t('confirm_password')}</label>
              <input
                data-testid="confirm-password-input"
                type="password"
                value={form.confirm}
                onChange={e => setForm({...form, confirm: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                required
              />
            </div>
          )}
          <button
            data-testid="submit-btn"
            type="submit"
            disabled={loading}
            className="w-full btn-gold py-3 rounded-xl text-base font-bold disabled:opacity-50"
          >
            {loading ? '...' : isRegister ? t('register') : t('login')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            data-testid="toggle-auth"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-sm text-[var(--gold)] hover:text-[var(--gold-2)] transition-colors"
          >
            {isRegister ? t('already_have_account') : t('dont_have_account')}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            data-testid="guest-btn"
            onClick={() => navigate('/')}
            className="text-sm text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
          >
            {t('play_as_guest')}
          </button>
        </div>
      </div>
    </div>
  );
}
