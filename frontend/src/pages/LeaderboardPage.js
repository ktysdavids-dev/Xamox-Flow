import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';

import { API } from '../config';

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/leaderboard`)
      .then(r => setLeaderboard(r.data.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const podiumEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen page-bg" data-testid="leaderboard-page">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-full glass hover:bg-[var(--surface-2)] transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{t('rankings')}</h1>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="text-[var(--gold)] animate-pulse">Loading...</div></div>
        ) : leaderboard.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-lg font-bold mb-2">{t('no_rankings')}</h3>
            <p className="text-sm text-[var(--text-subtle)]">Play games to appear on the leaderboard!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-6">
                {[1, 0, 2].map(idx => {
                  const p = leaderboard[idx];
                  if (!p) return null;
                  return (
                    <div key={idx} className={`card p-4 text-center ${idx === 0 ? 'pb-8' : 'pb-6'}`} style={{width: idx === 0 ? '140px' : '120px'}}>
                      <div className="text-3xl mb-1">{podiumEmojis[idx]}</div>
                      <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-sm font-bold mb-2" style={{background: p.avatar_color, border: `3px solid ${podiumColors[idx]}`}}>
                        {p.username?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="font-bold text-sm truncate">{p.username}</div>
                      <div className="text-[var(--gold)] font-bold tabular-nums">{p.games_won} {t('wins')}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full List */}
            <div className="card overflow-hidden">
              <div className="grid grid-cols-4 gap-2 p-3 text-xs text-[var(--text-subtle)] font-semibold uppercase tracking-wide border-b border-[var(--border)]">
                <span>{t('rank')}</span>
                <span className="col-span-2">{t('player')}</span>
                <span className="text-right">{t('wins')}</span>
              </div>
              {leaderboard.map((player, i) => (
                <div key={i} className={`grid grid-cols-4 gap-2 p-3 items-center text-sm ${i < 3 ? 'bg-[rgba(247,215,122,0.04)]' : ''} border-b border-[var(--border)] last:border-0`}>
                  <span className="font-bold tabular-nums text-[var(--text-muted)]">{i < 3 ? podiumEmojis[i] : `#${i + 1}`}</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{background: player.avatar_color}}>
                      {player.username?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="font-medium truncate">{player.username}</span>
                  </div>
                  <span className="text-right font-bold text-[var(--gold)] tabular-nums">{player.games_won}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
