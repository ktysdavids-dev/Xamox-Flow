import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

import { API } from '../config';

export default function AchievementsPage() {
  const { t, tContent } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    axios.get(`${API}/achievements`).then(r => setAchievements(r.data.achievements));
  }, []);

  const userAchievements = user?.achievements || [];

  return (
    <div className="min-h-screen page-bg" data-testid="achievements-page">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-full glass hover:bg-[var(--surface-2)] transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{t('achievements')}</h1>
          <span className="text-sm text-[var(--text-subtle)]">
            {userAchievements.length}/{achievements.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((ach, i) => {
            const unlocked = userAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`card p-4 transition-all ${unlocked ? 'border-[var(--gold-deep)]' : 'opacity-60'}`}
                style={{ animationDelay: `${i * 50}ms`, animation: 'fadeIn 0.4s ease-out both' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                    unlocked ? 'bg-[rgba(247,215,122,0.15)] border border-[var(--gold-deep)]' : 'bg-[var(--surface-3)]'
                  }`}>
                    {ach.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{tContent(ach.name)}</h3>
                      {unlocked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(247,215,122,0.15)] text-[var(--gold)] font-semibold">{t('unlocked')}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-subtle)] mt-0.5">{tContent(ach.description)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
