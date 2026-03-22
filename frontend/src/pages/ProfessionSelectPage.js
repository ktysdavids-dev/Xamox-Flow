import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAudio } from '../contexts/AudioContext';
import axios from 'axios';

import { API } from '../config';

// Lista de respaldo si el backend no responde (misma estructura que /api/game/professions)
const FALLBACK_PROFESSIONS = [
  { id: 'teacher', name: { es: 'Maestro', en: 'Teacher' }, difficulty: 'medium', salary: 3000, expenses: 1800, net_flow: 1200, starting_cash: 400, description: { es: 'Vida sencilla, salario modesto', en: 'Simple life, modest salary' } },
  { id: 'engineer', name: { es: 'Ingeniero', en: 'Engineer' }, difficulty: 'easy', salary: 5000, expenses: 2800, net_flow: 2200, starting_cash: 1000, description: { es: 'Buen salario, gastos moderados', en: 'Good salary, moderate expenses' } },
  { id: 'doctor', name: { es: 'Doctor', en: 'Doctor' }, difficulty: 'hard', salary: 13000, expenses: 8300, net_flow: 4700, starting_cash: 2500, description: { es: 'Alto salario, altos gastos', en: 'High salary, high expenses' } },
  { id: 'nurse', name: { es: 'Enfermera', en: 'Nurse' }, difficulty: 'medium', salary: 3800, expenses: 2150, net_flow: 1650, starting_cash: 600, description: { es: 'Equilibrio ingresos y gastos', en: 'Balance income and expenses' } },
  { id: 'lawyer', name: { es: 'Abogado', en: 'Lawyer' }, difficulty: 'hard', salary: 9500, expenses: 6100, net_flow: 3400, starting_cash: 1800, description: { es: 'Profesional con deudas estudiantiles', en: 'Professional with student loans' } },
  { id: 'entrepreneur', name: { es: 'Emprendedor', en: 'Entrepreneur' }, difficulty: 'expert', salary: 2000, expenses: 1500, net_flow: 500, starting_cash: 5000, description: { es: 'Bajo salario fijo, alto capital inicial', en: 'Low fixed salary, high starting capital' } },
  { id: 'pilot', name: { es: 'Piloto', en: 'Pilot' }, difficulty: 'medium', salary: 7000, expenses: 4500, net_flow: 2500, starting_cash: 1200, description: { es: 'Salario alto, estilo de vida activo', en: 'High salary, active lifestyle' } },
  { id: 'janitor', name: { es: 'Conserje', en: 'Janitor' }, difficulty: 'expert', salary: 1600, expenses: 1000, net_flow: 600, starting_cash: 200, description: { es: 'Salario bajo, gastos mínimos', en: 'Low salary, minimal expenses' } },
];

const DIFFICULTY_INFO = {
  easy: {
    label: { es: 'Fácil', en: 'Easy', pt: 'Fácil', fr: 'Facile', de: 'Leicht', it: 'Facile', zh: '简单' },
    desc: { es: 'Mas eventos positivos, inversiones baratas', en: 'More positive events, cheaper investments', pt: 'Mais eventos positivos', fr: 'Plus d\'evenements positifs', de: 'Mehr positive Ereignisse', it: 'Piu eventi positivi', zh: '更多积极事件' },
    color: 'text-[var(--success)]',
    bg: 'bg-[rgba(57,217,138,0.12)]',
    border: 'border-[rgba(57,217,138,0.4)]',
  },
  medium: {
    label: { es: 'Moderado', en: 'Medium', pt: 'Moderado', fr: 'Moyen', de: 'Mittel', it: 'Moderato', zh: '中等' },
    desc: { es: 'Experiencia equilibrada', en: 'Balanced experience', pt: 'Experiencia equilibrada', fr: 'Experience equilibree', de: 'Ausgewogene Erfahrung', it: 'Esperienza equilibrata', zh: '平衡体验' },
    color: 'text-[var(--gold)]',
    bg: 'bg-[rgba(247,215,122,0.12)]',
    border: 'border-[rgba(247,215,122,0.4)]',
  },
  hard: {
    label: { es: 'Difícil', en: 'Hard', pt: 'Difícil', fr: 'Difficile', de: 'Schwer', it: 'Difficile', zh: '困难' },
    desc: { es: 'Mas impuestos, inversiones caras, menos recompensas', en: 'More taxes, expensive investments, fewer rewards', pt: 'Mais impostos, investimentos caros', fr: 'Plus d\'impots, investissements chers', de: 'Mehr Steuern, teure Investitionen', it: 'Piu tasse, investimenti costosi', zh: '更多税收，昂贵投资' },
    color: 'text-[var(--danger)]',
    bg: 'bg-[rgba(255,90,106,0.12)]',
    border: 'border-[rgba(255,90,106,0.4)]',
  },
};

export default function ProfessionSelectPage() {
  const { t, tContent, lang } = useLanguage();
  const { playSfx } = useAudio();
  const navigate = useNavigate();
  const [professions, setProfessions] = useState(FALLBACK_PROFESSIONS);
  const [selected, setSelected] = useState(null);
  const [gameDifficulty, setGameDifficulty] = useState('medium');

  useEffect(() => {
    if (!API) {
      setProfessions(FALLBACK_PROFESSIONS);
      return;
    }
    axios.get(`${API}/game/professions`)
      .then(r => {
        if (Array.isArray(r.data?.professions) && r.data.professions.length > 0) {
          setProfessions(r.data.professions);
        }
      })
      .catch(() => setProfessions(FALLBACK_PROFESSIONS));
  }, []);

  const diffColors = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard', expert: 'badge-expert' };
  const profIcons = {
    teacher: '\ud83d\udcda', engineer: '\u2699\ufe0f', doctor: '\ud83e\ude7a', janitor: '\ud83e\uddf9',
    nurse: '\ud83c\udfe5', lawyer: '\u2696\ufe0f', entrepreneur: '\ud83d\udca1', pilot: '\u2708\ufe0f'
  };

  const handleSelect = (prof) => {
    setSelected(prof.id);
    playSfx('click');
    // Use URL params instead of sessionStorage (more reliable on mobile)
    setTimeout(() => navigate(`/game?prof=${prof.id}&diff=${gameDifficulty}`), 300);
  };

  return (
    <div className="min-h-screen page-bg" data-testid="profession-select-page">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            data-testid="back-btn"
            onClick={() => navigate('/')}
            className="p-2 rounded-full glass hover:bg-[var(--surface-2)] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{t('choose_profession')}</h1>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
            {lang === 'es' ? 'Dificultad del Juego' : lang === 'en' ? 'Game Difficulty' : 'Difficulty'}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
              <button
                key={key}
                data-testid={`difficulty-${key}`}
                onClick={() => { setGameDifficulty(key); playSfx('click'); }}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  gameDifficulty === key
                    ? `${info.bg} ${info.border} ${info.color}`
                    : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                <div className={`text-sm font-bold ${gameDifficulty === key ? info.color : ''}`}>
                  {tContent(info.label)}
                </div>
                <div className="text-[10px] mt-0.5 opacity-70">{tContent(info.desc)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {professions.map((prof, i) => (
            <div
              key={prof.id}
              data-testid={`profession-${prof.id}`}
              onClick={() => handleSelect(prof)}
              className={`card p-5 cursor-pointer transition-all duration-200 hover:border-[var(--gold-deep)] flex flex-col ${
                selected === prof.id ? 'border-[var(--gold)] shadow-[0_0_30px_rgba(247,215,122,0.2)]' : ''
              }`}
              style={{ animationDelay: `${i * 50}ms`, animation: 'fadeIn 0.4s ease-out both' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold">{tContent(prof.name)}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${diffColors[prof.difficulty]} font-medium`}>
                    {t(`difficulty.${prof.difficulty}`)}
                  </span>
                </div>
                <span className="text-3xl">{profIcons[prof.id] || '\ud83d\udcbc'}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-3 min-h-[40px]">{tContent(prof.description)}</p>
              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t('salary')}</span>
                  <span className="font-semibold text-[var(--success)] tabular-nums">${prof.salary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t('expenses')}</span>
                  <span className="font-semibold text-[var(--danger)] tabular-nums">${prof.expenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[var(--border)] pt-1.5">
                  <span className="text-[var(--text-muted)]">{t('net_flow')}</span>
                  <span className="font-bold text-[var(--gold)] tabular-nums">+${prof.net_flow.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t('starting_cash')}</span>
                  <span className="font-semibold tabular-nums">${prof.starting_cash.toLocaleString()}</span>
                </div>
              </div>
              <button className="w-full btn-gold py-2.5 rounded-xl mt-4 text-sm font-bold">{t('select')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
