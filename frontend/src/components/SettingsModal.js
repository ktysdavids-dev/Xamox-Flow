import React, { useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import axios from 'axios';

import { API } from '../config';

export default function SettingsModal({ onClose }) {
  const { t, lang } = useLanguage();
  const { user, token } = useAuth();
  const {
    musicEnabled, sfxEnabled, hasMusicTracks,
    musicVolume, sfxVolume,
    toggleMusic, toggleSfx, playTestSound,
    changeMusicVolume, changeSfxVolume,
  } = useAudio();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'es' ? 'Archivo muy grande (max 2MB)' : 'File too large (max 2MB)');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', token);
      await axios.post(`${API}/auth/upload-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      window.location.reload();
    } catch (e) {
      alert(lang === 'es' ? 'Error al subir foto' : 'Upload failed');
    }
    setUploading(false);
  };

  const VolumeSlider = ({ value, onChange, color }) => (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="text-[10px] text-[var(--text-subtle)]">🔈</span>
      <input
        type="range" min="0" max="100"
        value={Math.round(value * 100)}
        onChange={e => onChange(parseInt(e.target.value) / 100)}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${value * 100}%, var(--surface-3) ${value * 100}%)`,
          accentColor: color,
        }}
      />
      <span className="text-[10px] text-[var(--text-subtle)]">🔊</span>
      <span className="text-[10px] font-bold tabular-nums w-8 text-right" style={{color}}>{Math.round(value * 100)}%</span>
    </div>
  );

  return (
    <div className="modal-overlay" data-testid="settings-modal" onClick={onClose}>
      <div className="modal-content card p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{t('settings')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-all" data-testid="settings-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Profile Photo - only when logged in */}
        {user && token && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">{t('profile')}</h3>
            <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="relative flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--gold)]" />
                ) : (
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 border-[var(--gold)]"
                       style={{background: user.avatar_color || '#FFD700'}}>
                    {user.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--gold)] flex items-center justify-center text-[var(--bg)] hover:bg-[var(--gold-2)] transition-all"
                >
                  {uploading ? '...' : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{user.username}</div>
                <div className="text-[10px] text-[var(--text-subtle)] truncate">{user.email}</div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="text-[10px] text-[var(--gold)] font-semibold mt-0.5">
                  {uploading ? '...' : (lang === 'es' ? 'Cambiar foto' : 'Change photo')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audio Section */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Audio</h3>
          <div className="space-y-3">
            {/* Music */}
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{musicEnabled ? '🎵' : '🔇'}</span>
                  <div>
                    <span className="text-sm font-medium">{t('music')}</span>
                    <div className="text-[10px] text-[var(--text-subtle)]">
                      {!hasMusicTracks ? (lang === 'es' ? 'Sin pistas' : 'No tracks')
                        : musicEnabled ? (lang === 'es' ? 'Activada' : 'Enabled') : (lang === 'es' ? 'Silenciada' : 'Muted')}
                    </div>
                  </div>
                </div>
                <button data-testid="music-toggle" onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
                  className={`w-14 h-8 rounded-full transition-all duration-300 relative flex-shrink-0 ${musicEnabled ? 'bg-[var(--gold)]' : 'bg-[var(--surface-3)]'}`}>
                  <div className={`w-6 h-6 rounded-full bg-white shadow-lg absolute top-1 transition-all duration-300 ${musicEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {musicEnabled && <VolumeSlider value={musicVolume} onChange={changeMusicVolume} color="var(--gold)" />}
            </div>

            {/* SFX */}
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sfxEnabled ? '🔊' : '🔇'}</span>
                  <div>
                    <span className="text-sm font-medium">{t('sound_effects')}</span>
                    <div className="text-[10px] text-[var(--text-subtle)]">
                      {sfxEnabled ? (lang === 'es' ? 'Activados' : 'Enabled') : (lang === 'es' ? 'Desactivados' : 'Disabled')}
                    </div>
                  </div>
                </div>
                <button data-testid="sfx-toggle" onClick={(e) => { e.stopPropagation(); toggleSfx(); }}
                  className={`w-14 h-8 rounded-full transition-all duration-300 relative flex-shrink-0 ${sfxEnabled ? 'bg-[var(--gold)]' : 'bg-[var(--surface-3)]'}`}>
                  <div className={`w-6 h-6 rounded-full bg-white shadow-lg absolute top-1 transition-all duration-300 ${sfxEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {sfxEnabled && <VolumeSlider value={sfxVolume} onChange={changeSfxVolume} color="var(--info)" />}
            </div>

            <button onClick={(e) => { e.stopPropagation(); playTestSound(); }} data-testid="test-sound-btn"
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--gold-deep)] transition-all flex items-center justify-center gap-2">
              🔔 {lang === 'es' ? 'Probar Sonido' : 'Test Sound'}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="w-full btn-gold py-3 rounded-xl font-bold">{t('close')}</button>
      </div>
    </div>
  );
}
