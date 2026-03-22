import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

import { API } from '../config';

export default function SaveLoadModal({ onClose, onSave, onLoad, currentState }) {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [saves, setSaves] = useState([]);
  const [tab, setTab] = useState('save');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSaves();
  }, []);

  const loadSaves = async () => {
    try {
      const r = await axios.get(`${API}/game/saves?token=${token || ''}`);
      setSaves(r.data.saves);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    setLoading(true);
    await onSave();
    await loadSaves();
    setLoading(false);
  };

  const handleDelete = async (saveId) => {
    try {
      await axios.delete(`${API}/game/saves/${saveId}?token=${token || ''}`);
      await loadSaves();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="save-load-modal">
      <div className="modal-content card p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{tab === 'save' ? t('save_game') : t('load_game')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl glass mb-4">
          <button onClick={() => setTab('save')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'save' ? 'bg-[var(--surface-3)] text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}>{t('save')}</button>
          <button onClick={() => setTab('load')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'load' ? 'bg-[var(--surface-3)] text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}>{t('load')}</button>
        </div>

        {tab === 'save' && (
          <div>
            <div className="card p-4 mb-4 bg-[var(--surface-2)]">
              <div className="text-sm text-[var(--text-muted)] mb-2">Current game state:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{t('month')}: <span className="font-bold">{currentState?.month}</span></div>
                <div>{t('cash')}: <span className="font-bold text-[var(--gold)] tabular-nums">${currentState?.cash?.toLocaleString()}</span></div>
              </div>
            </div>
            <button onClick={handleSave} disabled={loading} className="w-full btn-gold py-3 rounded-xl font-bold disabled:opacity-50">
              {loading ? '...' : t('save')}
            </button>
          </div>
        )}

        {tab === 'load' && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {saves.length === 0 ? (
              <div className="text-center py-6 text-[var(--text-subtle)]">
                <div className="text-3xl mb-2">\ud83d\udcbe</div>
                <p className="text-sm">{t('no_saves')}</p>
              </div>
            ) : (
              saves.map(save => (
                <div key={save.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div>
                    <div className="text-sm font-medium">{save.slot_name}</div>
                    <div className="text-xs text-[var(--text-subtle)]">
                      {new Date(save.updated_at).toLocaleDateString()} - ${save.game_state?.cash?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onLoad(save)} className="btn-gold px-3 py-1.5 rounded-lg text-xs font-bold">{t('load')}</button>
                    <button onClick={() => handleDelete(save.id)} className="text-xs text-[var(--danger)] px-2 py-1.5 hover:bg-[rgba(255,90,106,0.1)] rounded-lg">{t('delete')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
