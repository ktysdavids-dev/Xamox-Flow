import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import axios from 'axios';

import { API } from '../config';

const AVATAR_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12', '#8E44AD', '#2ECC71', '#E74C3C'];

export default function ProfilePage() {
  const { t, lang } = useLanguage();
  const { user, token, updateUser } = useAuth();
  const { playSfx } = useAudio();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user?.username || '');
  const fileRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'es' ? 'Archivo muy grande (max 2MB)' : 'File too large (max 2MB)');
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('token', token);
      const r = await axios.post(`${API}/auth/upload-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      playSfx('success');
      // Force reload user data
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    }
    setUploading(false);
  };

  const handleColorChange = async (color) => {
    try {
      await updateUser({ avatar_color: color });
      playSfx('click');
    } catch (e) { console.error(e); }
  };

  const handleNameSave = async () => {
    if (!newName.trim()) return;
    try {
      await updateUser({ username: newName.trim() });
      playSfx('success');
      setEditName(false);
    } catch (e) { console.error(e); }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen page-bg" data-testid="profile-page">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-full glass hover:bg-[var(--surface-2)] transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl font-bold">{t('profile')}</h1>
        </div>

        {/* Avatar Section */}
        <div className="card p-6 text-center mb-4">
          <div className="relative inline-block mb-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-[var(--gold)]" />
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-[var(--gold)]" style={{background: user.avatar_color || '#FFD700'}}>
                {user.username?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center text-[var(--bg)] hover:bg-[var(--gold-2)] transition-all"
              disabled={uploading}
            >
              {uploading ? '...' : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {editName ? (
            <div className="flex items-center gap-2 justify-center mb-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-center font-bold focus:border-[var(--gold)] focus:outline-none"
                autoFocus
              />
              <button onClick={handleNameSave} className="btn-gold px-3 py-1.5 rounded-lg text-xs font-bold">{t('save')}</button>
              <button onClick={() => setEditName(false)} className="text-xs text-[var(--text-subtle)]">{t('cancel')}</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-center mb-1">
              <h2 className="text-xl font-bold">{user.username}</h2>
              <button onClick={() => { setEditName(true); setNewName(user.username); }} className="text-[var(--text-subtle)] hover:text-[var(--gold)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          )}
          <p className="text-sm text-[var(--text-subtle)]">{user.email}</p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold border border-[var(--border)] bg-[var(--surface-2)]">
            <span>
              {user.auth_provider === 'google' ? '🟢 Google' : '✉️ Email'}
            </span>
            {Array.isArray(user.connected_providers) && user.connected_providers.includes('google') && (
              <span className="text-[var(--success)]">{lang === 'es' ? 'Google conectado' : 'Google connected'}</span>
            )}
          </div>
        </div>

        {/* Color Picker */}
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">{lang === 'es' ? 'Color de Avatar' : 'Avatar Color'}</h3>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map(color => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-8 h-8 rounded-full transition-all ${user.avatar_color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg)]' : 'hover:scale-110'}`}
                style={{background: color}}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">{lang === 'es' ? 'Estadisticas' : 'Statistics'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-[var(--surface-2)]">
              <div className="text-xl font-bold text-[var(--gold)] tabular-nums">{user.games_played || 0}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">{t('games_played')}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-[var(--surface-2)]">
              <div className="text-xl font-bold text-[var(--success)] tabular-nums">{user.games_won || 0}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">{t('games_won')}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-[var(--surface-2)]">
              <div className="text-xl font-bold tabular-nums">${(user.best_score || 0).toLocaleString()}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">{t('best_score')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
