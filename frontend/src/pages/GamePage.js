import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import Board from '../components/Board';
import EventModal from '../components/EventModal';
import SettingsModal from '../components/SettingsModal';
import SaveLoadModal from '../components/SaveLoadModal';
import axios from 'axios';

import { API } from '../config';

const DIFFICULTY_MODIFIERS = {
  easy: { event_positive_chance: 0.65, investment_cost_modifier: 0.7, tax_modifier: 0.5, starting_cash_bonus: 1.5, trivia_reward_modifier: 1.3, negative_event_modifier: 0.6 },
  medium: { event_positive_chance: 0.5, investment_cost_modifier: 1.0, tax_modifier: 1.0, starting_cash_bonus: 1.0, trivia_reward_modifier: 1.0, negative_event_modifier: 1.0 },
  hard: { event_positive_chance: 0.35, investment_cost_modifier: 1.3, tax_modifier: 1.5, starting_cash_bonus: 0.7, trivia_reward_modifier: 0.8, negative_event_modifier: 1.4 },
};

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const normalizeDifficulty = (value) => (VALID_DIFFICULTIES.includes(value) ? value : 'medium');
const pickRandom = (arr, fallback = null) => (Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : fallback);

export default function GamePage() {
  const { t, tContent, lang } = useLanguage();
  const { user, token } = useAuth();
  const { playSfx, playMusic, stopMusic, musicEnabled } = useAudio();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [gameState, setGameState] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [content, setContent] = useState(null);
  const [diceValues, setDiceValues] = useState([0, 0]);
  const [isRolling, setIsRolling] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [phase, setPhase] = useState('roll');
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [paydayInfo, setPaydayInfo] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [winAnimPhase, setWinAnimPhase] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(() => localStorage.getItem('xamox_game_speed') || 'medium');
  const [loadError, setLoadError] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState('');
  const [boardImpactPulse, setBoardImpactPulse] = useState(false);
  
  // Speed multipliers: slow=2x delays, medium=1x, fast=0.4x
  const speedRef = useRef({ slow: 2.0, medium: 1.0, fast: 0.4 });
  const gameSpeedRef = useRef(gameSpeed);
  gameSpeedRef.current = gameSpeed;
  const getDelay = useCallback((base) => Math.round(base * (speedRef.current[gameSpeedRef.current] || 1)), []);
  
  // Trivia no-repeat tracker
  const usedTriviaRef = useRef(new Set());
  
  // Better dice - PURE crypto random, no bias (like real dice)
  const diceHistoryRef = useRef([]);
  const totalHistoryRef = useRef([]);
  const rollBetterDice = useCallback(() => {
    const arr = new Uint32Array(2);
    try { crypto.getRandomValues(arr); } catch(e) { arr[0] = Math.random() * 4294967295; arr[1] = Math.random() * 4294967295; }
    const d1 = (arr[0] % 6) + 1;
    const d2 = (arr[1] % 6) + 1;
    return [d1, d2];
  }, []);
  
  // Solo mode floating reactions
  const [soloReactions, setSoloReactions] = useState([]);
  const addSoloReaction = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    setSoloReactions(prev => [...prev, { id, emoji }]);
    setTimeout(() => setSoloReactions(prev => prev.filter(r => r.id !== id)), 2000);
  }, []);
  
  // Read from URL params (reliable on all mobile browsers)
  const professionId = useRef(searchParams.get('prof') || sessionStorage.getItem('xamox_profession') || 'engineer');
  const difficulty = useRef(normalizeDifficulty(searchParams.get('diff') || sessionStorage.getItem('xamox_difficulty') || 'medium'));
  const diffMods = DIFFICULTY_MODIFIERS[difficulty.current] || DIFFICULTY_MODIFIERS.medium;

  useEffect(() => {
    if (!API) {
      setLoadError(true);
      setLoadErrorDetail('Sin URL de API / Missing API URL');
      return;
    }
    Promise.all([
      axios.get(`${API}/game/board`),
      axios.get(`${API}/game/content`),
      axios.get(`${API}/game/professions`),
    ]).then(([boardRes, contentRes, profRes]) => {
      setTiles(boardRes.data.tiles || []);
      setContent(contentRes.data);
      
      const allProfs = profRes.data.professions || [];
      const prof = allProfs.find(p => p.id === professionId.current) || allProfs[0] || {
        id: 'engineer', name: {es:'Ingeniero',en:'Engineer'}, salary: 5000, expenses: 2800, 
        net_flow: 2200, starting_cash: 1000, difficulty: 'easy',
        description: {es:'Buen salario',en:'Good salary'}
      };
      
      const savedState = sessionStorage.getItem('xamox_game_state');
      if (savedState) {
        try {
          setGameState(JSON.parse(savedState));
        } catch (e) {
          console.warn('Failed to load saved state');
        }
        sessionStorage.removeItem('xamox_game_state');
      } else {
        const startingCash = Math.round(prof.starting_cash * diffMods.starting_cash_bonus);
        setGameState({
          position: 0,
          cash: startingCash,
          salary: prof.salary,
          expenses: prof.expenses,
          passive_income: 0,
          assets: [],
          month: 1,
          net_worth: startingCash,
          profession: prof,
          trivia_streak: 0,
          negative_events: 0,
          turns: 0,
          difficulty: difficulty.current,
        });
      }
    }).catch(err => {
      console.error('Failed to load game:', err);
      setLoadError(true);
      const st = err.response?.status;
      const hint = st ? `HTTP ${st}` : err.message || 'Network Error';
      setLoadErrorDetail(String(hint));
    });

    // Start game music when entering game page
    if (musicEnabled) {
      try { playMusic('game'); } catch(e) {}
    }
    // Stop game music when leaving
    return () => { try { stopMusic(); } catch(e) {} };
  }, []); // eslint-disable-line

  const rollDice = useCallback(() => {
    if (phase !== 'roll' || isRolling) return;
    setIsRolling(true);
    playSfx('dice');
    setPhase('moving');

    const [d1, d2] = rollBetterDice();
    
    setTimeout(() => {
      setDiceValues([d1, d2]);
      setIsRolling(false);
      
      const boardSize = tiles.length || 24;
      const total = d1 + d2;
      const oldPos = gameState.position;
      const finalPos = (oldPos + total) % boardSize;
      const passedPayday = finalPos < oldPos || (oldPos === 0 && total >= boardSize);

      const stepDelay = getDelay(80);
      let step = 0;
      
      const animateStep = () => {
        step++;
        const currentPos = (oldPos + step) % (tiles.length || 24);
        playSfx('hop');
        setGameState(prev => {
          if (!prev) return prev;
          return { ...prev, position: currentPos };
        });
        
        if (step < total) {
          setTimeout(animateStep, stepDelay);
        } else {
          setTimeout(() => {
            setGameState(prev => {
              if (!prev) return prev;
              let newState = { ...prev, position: finalPos, turns: prev.turns + 1 };
              if (passedPayday) {
                const paydayAmount = prev.salary - prev.expenses + prev.passive_income;
                newState.cash += paydayAmount;
                newState.month += 1;
                setPaydayInfo({ amount: paydayAmount });
                playSfx('coin');
              }
              return newState;
            });
            playSfx('land');
            setBoardImpactPulse(true);
            setTimeout(() => setBoardImpactPulse(false), 350);
            
            setTimeout(() => {
              const tile = tiles[finalPos];
              if (!tile || !content) { setPhase('roll'); return; }
              resolveTile(tile, passedPayday);
            }, passedPayday ? getDelay(600) : getDelay(100));
          }, getDelay(80));
        }
      };
      
      setTimeout(animateStep, getDelay(200));
    }, getDelay(500));
  }, [phase, isRolling, gameState, tiles, content, playSfx, getDelay, rollBetterDice]);

  const resolveTile = useCallback((tile, passedPayday) => {
    if (!content) return;
    
    const positiveEvents = (content.events || []).filter(e => e.type === 'positive');
    const negativeEvents = (content.events || []).filter(e => e.type === 'negative');
    
    switch (tile.type) {
      case 'event':
        playSfx('tile_event');
        const usePositive = Math.random() < diffMods.event_positive_chance;
        const eventPool = usePositive ? positiveEvents : negativeEvents;
        const event = pickRandom(eventPool, pickRandom(content.events, null));
        if (!event) { setPhase('roll'); break; }
        const modifiedEvent = { ...event };
        if (modifiedEvent.amount < 0) {
          modifiedEvent.amount = Math.round(modifiedEvent.amount * diffMods.negative_event_modifier);
        }
        setCurrentEvent({ type: 'event', data: modifiedEvent });
        setPhase('event');
        break;
      case 'trivia':
        playSfx('tile_trivia');
        // Filter trivia by game difficulty
        const diffMap = { easy: 'easy', medium: 'medium', hard: 'hard' };
        const gameDiff = diffMap[gameState?.difficulty] || 'medium';
        let diffTrivia = (content.trivia || []).filter(q => q.difficulty === gameDiff);
        if (diffTrivia.length === 0) diffTrivia = content.trivia || []; // fallback
        if (diffTrivia.length === 0) { setPhase('roll'); break; }
        
        // No-repeat: pick from unused questions first
        let availableTrivia = diffTrivia.filter(q => !usedTriviaRef.current.has(q.id));
        if (availableTrivia.length === 0) {
          usedTriviaRef.current.clear();
          availableTrivia = diffTrivia;
        }
        const trivia = pickRandom(availableTrivia, null);
        if (!trivia) { setPhase('roll'); break; }
        usedTriviaRef.current.add(trivia.id);
        
        // SHUFFLE options so correct answer is in random position
        const shuffledTrivia = { ...trivia, reward: Math.round(trivia.reward * diffMods.trivia_reward_modifier) };
        const langs = Object.keys(shuffledTrivia.options || {});
        const numOpts = (shuffledTrivia.options[langs[0]] || []).length;
        // Create shuffle indices [0,1,2,3] then randomize
        const indices = Array.from({length: numOpts}, (_, i) => i);
        for (let si = indices.length - 1; si > 0; si--) {
          const sj = Math.floor(Math.random() * (si + 1));
          [indices[si], indices[sj]] = [indices[sj], indices[si]];
        }
        // Apply shuffle to all language options
        const newOptions = {};
        langs.forEach(l => {
          const orig = shuffledTrivia.options[l] || [];
          newOptions[l] = indices.map(idx => orig[idx]);
        });
        shuffledTrivia.options = newOptions;
        shuffledTrivia.correct = indices.indexOf(trivia.correct);
        
        setCurrentEvent({ type: 'trivia', data: shuffledTrivia });
        setPhase('event');
        break;
      case 'investment':
      case 'real_estate':
        playSfx('tile_invest');
        const inv = pickRandom(content.investments, null);
        if (!inv) { setPhase('roll'); break; }
        const modInv = { ...inv, down_payment: Math.round((inv.down_payment || inv.cost) * diffMods.investment_cost_modifier) };
        setCurrentEvent({ type: 'investment', data: modInv });
        setPhase('event');
        break;
      case 'market':
        playSfx('tile_market');
        const market = pickRandom(content.market_events, null);
        if (!market) { setPhase('roll'); break; }
        setCurrentEvent({ type: 'market', data: market });
        setPhase('event');
        break;
      case 'opportunity':
        playSfx('tile_opportunity');
        const opp = pickRandom(content.opportunities, null);
        if (!opp) { setPhase('roll'); break; }
        setCurrentEvent({ type: 'opportunity', data: opp });
        setPhase('event');
        break;
      case 'tax':
        playSfx('tile_tax');
        const tax = pickRandom(content.tax_events, null);
        if (!tax) { setPhase('roll'); break; }
        const modTax = { ...tax, percentage: Math.round(tax.percentage * diffMods.tax_modifier) };
        setCurrentEvent({ type: 'tax', data: modTax });
        setPhase('event');
        break;
      case 'payday':
        playSfx('tile_payday');
        setGameState(prev => ({ ...prev, cash: prev.cash + 500 }));
        playSfx('coin');
        setCurrentEvent({ type: 'payday_bonus', data: { amount: 500 } });
        setPhase('event');
        break;
      default:
        setPhase('roll');
    }
  }, [content, playSfx, diffMods]);

  const handleEventResolve = useCallback((action) => {
    if (!currentEvent) return;
    
    setGameState(prev => {
      let newState = { ...prev, assets: [...prev.assets] };
      
      switch (action.type) {
        case 'event_resolved':
          newState.cash += action.amount;
          if (action.amount < 0) newState.negative_events += 1;
          break;
        case 'trivia_correct':
          newState.cash += action.reward;
          newState.trivia_streak += 1;
          playSfx('success');
          break;
        case 'trivia_incorrect':
          newState.trivia_streak = 0;
          playSfx('error');
          break;
        case 'investment_bought':
          newState.cash -= action.cost;
          newState.assets = [...newState.assets, action.investment];
          newState.passive_income += action.income;
          playSfx('coin');
          break;
        case 'sell_and_buy':
          // Sell specified assets first, then buy new one
          const soldIndices = action.soldIndices || [];
          let saleProceeds = 0;
          // Remove sold assets (in reverse order to not mess up indices)
          const sortedIndices = [...soldIndices].sort((a, b) => b - a);
          sortedIndices.forEach(idx => {
            const asset = newState.assets[idx];
            if (asset) {
              saleProceeds += Math.floor((asset.cost || asset.down_payment || 5000) * 0.8);
              newState.passive_income -= (asset.monthly_income || 0);
              newState.assets.splice(idx, 1);
            }
          });
          newState.cash += saleProceeds;
          // Now buy the new investment
          newState.cash -= action.cost;
          newState.assets = [...newState.assets, action.investment];
          newState.passive_income += action.income;
          playSfx('coin');
          break;
        case 'opportunity_taken':
          newState.cash -= action.cost;
          newState.assets = [...newState.assets, action.opportunity];
          newState.passive_income += action.income;
          playSfx('coin');
          break;
        case 'tax_paid':
          const taxAmount = Math.floor(newState.cash * (action.percentage / 100));
          newState.cash -= taxAmount;
          break;
        case 'market_resolved':
        case 'skip':
        case 'payday_collected':
          break;
        default:
          break;
      }
      
      if (newState.cash < 0) newState.cash = 0;
      const assetValue = newState.assets.reduce((sum, a) => sum + (a.cost || 0), 0);
      newState.net_worth = newState.cash + assetValue;
      
      if (newState.passive_income >= newState.expenses && newState.passive_income > 0) {
        setTimeout(() => {
          setWinAnimPhase(1);
          setShowWin(true);
          playSfx('win');
          try { playMusic('victory'); } catch(e) {}
          // Animate through phases
          setTimeout(() => setWinAnimPhase(2), 1500);
          setTimeout(() => setWinAnimPhase(3), 3000);
          setTimeout(() => setWinAnimPhase(4), 4500);
          if (token) {
            axios.post(`${API}/game/complete`, {
              token, won: true, score: newState.net_worth,
              turns: newState.turns, net_worth: newState.net_worth, achievements: [],
            }).catch(() => {});
          }
        }, 500);
      }
      
      return newState;
    });
    
    setCurrentEvent(null);
    setPaydayInfo(null);
    setPhase('roll');
  }, [currentEvent, playSfx, token]);

  const handleSave = useCallback(async () => {
    if (!gameState) return;
    try {
      await axios.post(`${API}/game/save?token=${token || ''}`, {
        game_state: gameState,
        slot_name: `${tContent(gameState.profession?.name)} - ${t('month')} ${gameState.month}`,
      });
      playSfx('success');
    } catch (e) {
      console.error('Save failed:', e);
    }
  }, [gameState, token, playSfx, t, tContent]);

  const handleLoad = useCallback((savedState) => {
    setGameState(savedState.game_state);
    setShowSaveLoad(false);
    setPhase('roll');
    playSfx('success');
  }, [playSfx]);

  const sellAsset = useCallback((index) => {
    setGameState(prev => {
      const asset = prev.assets[index];
      if (!asset) return prev;
      const salePrice = Math.floor((asset.cost || asset.down_payment || 5000) * 0.8);
      const newAssets = [...prev.assets];
      newAssets.splice(index, 1);
      const newState = {
        ...prev,
        cash: prev.cash + salePrice,
        assets: newAssets,
        passive_income: Math.max(0, prev.passive_income - (asset.monthly_income || 0)),
      };
      const assetValue = newState.assets.reduce((sum, a) => sum + (a.cost || 0), 0);
      newState.net_worth = newState.cash + assetValue;
      return newState;
    });
    playSfx('coin');
  }, [playSfx]);

  const handleExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen page-bg flex flex-col items-center justify-center px-4">
        <p className="text-[var(--text-muted)] text-center mb-4">
          {lang === 'es' ? 'No se pudo conectar con el servidor. ¿Está el backend en marcha?' : 'Could not connect to server. Is the backend running?'}
        </p>
        {loadErrorDetail ? (
          <p className="text-xs text-[var(--danger)] text-center mb-4 font-mono break-all px-2">{loadErrorDetail}</p>
        ) : null}
        <p className="text-sm text-[var(--text-subtle)] text-center mb-6">
          {lang === 'es'
            ? 'Cierra y vuelve a abrir JUGAR_MOVIL.command (arregla solo build y caché). En el móvil usa la URL http://TU_IP:8000 que muestra la Terminal.'
            : 'Close and run JUGAR_MOVIL.command again (it rebuilds and refreshes PWA caches). On your phone use the http://YOUR_IP:8000 URL from Terminal.'}
        </p>
        <button onClick={() => navigate('/select-profession')} className="btn-gold px-6 py-3 rounded-xl font-bold">
          {lang === 'es' ? 'Volver a elegir profesión' : 'Back to profession'}
        </button>
      </div>
    );
  }

  if (!gameState || !tiles.length) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-[var(--gold)] text-lg animate-pulse">{t('connecting')}...</div>
      </div>
    );
  }

  const freedomPercent = gameState.expenses > 0
    ? Math.min(100, Math.round((gameState.passive_income / gameState.expenses) * 100))
    : 0;

  const diffLabel = { easy: 'Fácil', medium: 'Moderado', hard: 'Difícil' };

  return (
    <div className="min-h-screen page-bg flex flex-col" data-testid="game-page">
      {/* Top HUD */}
      <div className="glass-strong premium-hud px-3 py-2 flex items-center justify-between gap-2 text-sm z-30 sticky top-0">
        <div className="flex items-center gap-2">
          {/* Back/Home button */}
          <button
            data-testid="game-home-btn"
            onClick={handleExit}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all"
            title={t('back_home')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{{'teacher':'\ud83d\udcda','engineer':'\u2699\ufe0f','doctor':'\ud83e\ude7a','janitor':'\ud83e\uddf9','nurse':'\ud83c\udfe5','lawyer':'\u2696\ufe0f','entrepreneur':'\ud83d\udca1','pilot':'\u2708\ufe0f'}[gameState.profession?.id] || '\ud83d\udcbc'}</span>
            <div>
              <div className="font-bold text-sm leading-none">{tContent(gameState.profession?.name)}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">{t('month')} {gameState.month} | {diffLabel[gameState.difficulty] || 'Moderado'}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center hidden sm:block">
            <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide">{t('cash')}</div>
            <div className="font-bold text-[var(--gold)] tabular-nums">${gameState.cash.toLocaleString()}</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide">{t('passive_income')}</div>
            <div className="font-bold text-[var(--success)] tabular-nums">${gameState.passive_income.toLocaleString()}</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wide">{t('expenses')}</div>
            <div className="font-bold text-[var(--danger)] tabular-nums">${gameState.expenses.toLocaleString()}</div>
          </div>
          <div className="text-center sm:hidden">
            <div className="font-bold text-[var(--gold)] tabular-nums text-base">${gameState.cash.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSaveLoad(true)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all" title={t('save_game')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all" title={t('settings')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/></svg>
          </button>
          {/* Speed selector */}
          <button onClick={() => {
            const speeds = ['slow', 'medium', 'fast'];
            const idx = speeds.indexOf(gameSpeed);
            const next = speeds[(idx + 1) % speeds.length];
            setGameSpeed(next);
            localStorage.setItem('xamox_game_speed', next);
          }} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-all text-[10px] font-bold" title={lang === 'es' ? 'Velocidad' : 'Speed'}
            style={{color: gameSpeed === 'fast' ? 'var(--success)' : gameSpeed === 'slow' ? 'var(--info)' : 'var(--gold)'}}>
            {gameSpeed === 'fast' ? '⚡' : gameSpeed === 'slow' ? '🐢' : '▶️'}
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center p-2 pt-0 overflow-y-auto">
        <div className={boardImpactPulse ? 'animate-board-shake' : ''} style={{ width: '100%', maxWidth: '520px', aspectRatio: '1 / 1', maxHeight: 'calc(100vh - 100px)' }}>
            <Board
              tiles={tiles}
              playerPosition={gameState.position}
              playerColor={user?.avatar_color || '#FFD700'}
              playerName={user?.username || tContent(gameState.profession?.name)}
              playerAvatar={user?.avatar_url || ''}
              diceValues={diceValues}
              rolling={isRolling}
              onRollDice={rollDice}
              phase={phase}
              rollLabel={t('roll_dice')}
              professionId={gameState.profession?.id || professionId.current}
              gameSpeed={gameSpeed}
            />
        </div>

        {/* Financial Summary Panel */}
        <div className="w-full max-w-[520px] mt-2 space-y-2 px-1 pb-4">
          <div className="card panel-premium p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🎯</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t('progress_freedom')}</span>
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mb-1 tabular-nums">
              <span>$0</span>
              <span className={freedomPercent >= 100 ? 'text-[var(--success)]' : 'text-[var(--gold)]'}>{freedomPercent}%</span>
              <span>${gameState.expenses.toLocaleString()}</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${freedomPercent}%` }} /></div>
          </div>

          <div className="card panel-premium p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{t('salary')}</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t('salary')}</span>
                <span className="font-semibold text-[var(--success)] tabular-nums">+${gameState.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t('passive_income')}</span>
                <span className="font-semibold text-[var(--success)] tabular-nums">+${gameState.passive_income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t('monthly_expenses')}</span>
                <span className="font-semibold text-[var(--danger)] tabular-nums">-${gameState.expenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-[var(--border)] pt-1.5">
                <span className="font-semibold">{t('net_flow')}</span>
                <span className={`font-bold tabular-nums ${(gameState.salary + gameState.passive_income - gameState.expenses) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {(gameState.salary + gameState.passive_income - gameState.expenses) >= 0 ? '+' : ''}${(gameState.salary + gameState.passive_income - gameState.expenses).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="card panel-premium p-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <span>🏦</span> {t('my_assets')} ({gameState.assets.length})
            </h3>
            {gameState.assets.length === 0 ? (
              <div className="text-center py-3 text-[var(--text-subtle)] text-xs">
                <div className="text-2xl mb-1">🏗️</div>
                {t('no_assets')}
              </div>
            ) : (
              <div className="space-y-1.5">
                {gameState.assets.map((asset, i) => {
                  const sellPrice = Math.floor((asset.cost || asset.down_payment || 5000) * 0.8);
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{tContent(asset.name)}</div>
                        <div className="flex items-center gap-1.5 text-[9px]">
                          <span className="text-[var(--success)] tabular-nums">+${(asset.monthly_income || 0).toLocaleString()}/{t('month')}</span>
                        </div>
                      </div>
                      <button onClick={() => sellAsset(i)} className="text-[9px] font-bold text-[var(--gold)] px-2 py-1 rounded-lg bg-[rgba(255,90,106,0.1)] border border-[rgba(255,90,106,0.2)] flex-shrink-0 ml-2" data-testid={`sell-asset-${i}`}>
                        {t('sell')} ${sellPrice.toLocaleString()}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel — hidden on mobile, only desktop */}
      <div className="hidden lg:flex fixed right-0 top-14 bottom-0 w-80 flex-col gap-3 p-3 overflow-y-auto z-10" style={{background: 'rgba(4,10,14,0.85)', backdropFilter: 'blur(10px)'}}>
          <div className="card panel-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t('progress_freedom')}</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-subtle)] mb-1 tabular-nums">
              <span>$0</span>
              <span className={freedomPercent >= 100 ? 'text-[var(--success)]' : 'text-[var(--gold)]'}>{freedomPercent}%</span>
              <span>${gameState.expenses.toLocaleString()}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${freedomPercent}%` }} />
            </div>
          </div>

          <div className="card panel-premium p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3">{t('salary')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{t('salary')}</span>
                <span className="font-semibold text-[var(--success)] tabular-nums">+${gameState.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{t('passive_income')}</span>
                <span className="font-semibold text-[var(--success)] tabular-nums">+${gameState.passive_income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{t('monthly_expenses')}</span>
                <span className="font-semibold text-[var(--danger)] tabular-nums">-${gameState.expenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-[var(--border)] pt-2">
                <span className="font-semibold">{t('net_flow')}</span>
                <span className={`font-bold tabular-nums ${(gameState.salary + gameState.passive_income - gameState.expenses) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {(gameState.salary + gameState.passive_income - gameState.expenses) >= 0 ? '+' : ''}${(gameState.salary + gameState.passive_income - gameState.expenses).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="card panel-premium p-4 flex-1 overflow-y-auto max-h-[300px]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3 flex items-center gap-1">
              <span>🏦</span> {t('my_assets')} ({gameState.assets.length})
            </h3>
            {gameState.assets.length === 0 ? (
              <div className="text-center py-6 text-[var(--text-subtle)] text-sm">
                <div className="text-3xl mb-2">🏗️</div>
                {t('no_assets')}
              </div>
            ) : (
              <div className="space-y-2">
                {gameState.assets.map((asset, i) => {
                  const sellPrice = Math.floor((asset.cost || asset.down_payment || 5000) * 0.8);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{tContent(asset.name)}</div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-[var(--success)] tabular-nums">+${(asset.monthly_income || 0).toLocaleString()}/{t('month')}</span>
                          <span className="text-[var(--text-subtle)]">|</span>
                          <span className="text-[var(--text-subtle)] tabular-nums">{lang === 'es' ? 'Valor' : 'Value'}: ${(asset.cost || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <button onClick={() => sellAsset(i)} className="text-[10px] font-bold text-[var(--gold)] hover:text-white px-2.5 py-1.5 rounded-lg bg-[rgba(255,90,106,0.1)] hover:bg-[rgba(255,90,106,0.25)] border border-[rgba(255,90,106,0.2)] transition-all flex-shrink-0 ml-2" data-testid={`sell-asset-${i}`}>
                        {t('sell')} ${sellPrice.toLocaleString()}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>

      {/* Floating Solo Reactions */}
      {soloReactions.map(r => (
        <div key={r.id} className="fixed z-50 pointer-events-none"
             style={{
               left: `${20 + (r.id % 60)}%`,
               bottom: '25%',
               fontSize: '42px',
               animation: 'reactionFloat 2s ease-out forwards',
             }}>
          {r.emoji}
        </div>
      ))}

      {/* Payday notification */}
      {paydayInfo && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="px-6 py-3 rounded-2xl flex items-center gap-2 text-base font-bold"
               style={{background: 'linear-gradient(135deg, #39D98A 0%, #2BC47C 100%)', color: 'white'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            {t('payday')} {paydayInfo.amount >= 0 ? '+' : ''}${paydayInfo.amount.toLocaleString()}
          </div>
        </div>
      )}

      {currentEvent && <EventModal event={currentEvent} playerCash={gameState.cash} playerAssets={gameState.assets} onResolve={handleEventResolve} />}

      {/* Premium Win Animation - Escape the Rat Race */}
      {showWin && (
        <div className="modal-overlay" data-testid="win-modal" style={{background: 'rgba(0,0,0,0.85)', zIndex: 999}}>
          {/* Particle effects */}
          <div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none'}}>
            {[...Array(20)].map((_, i) => (
              <div key={i} style={{
                position:'absolute',
                width: `${6 + Math.random() * 10}px`,
                height: `${6 + Math.random() * 10}px`,
                borderRadius: '50%',
                background: ['#F7D77A', '#43D685', '#62C6FF', '#FF9F40', '#AA7AFF'][i % 5],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: winAnimPhase >= 2 ? 0.8 : 0,
                animation: winAnimPhase >= 2 ? `floatParticle ${2 + Math.random() * 3}s ease-in-out infinite` : 'none',
                animationDelay: `${Math.random() * 2}s`,
                transition: 'opacity 0.5s ease',
              }} />
            ))}
          </div>

          <div className="modal-content" style={{maxWidth: '440px', width: '92%', background: 'transparent', boxShadow: 'none', overflow: 'visible'}}>
            {/* Phase 1: Breaking chains / Rat race circle */}
            <div style={{
              opacity: winAnimPhase >= 1 ? 1 : 0,
              transform: winAnimPhase >= 1 ? 'scale(1)' : 'scale(0.3)',
              transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '120px', height: '120px', margin: '0 auto 16px',
                borderRadius: '50%',
                background: winAnimPhase >= 2 
                  ? 'linear-gradient(135deg, rgba(67,214,133,0.3) 0%, rgba(247,215,122,0.3) 100%)'
                  : 'linear-gradient(135deg, rgba(255,90,106,0.3) 0%, rgba(255,159,64,0.3) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `3px solid ${winAnimPhase >= 2 ? 'rgba(67,214,133,0.6)' : 'rgba(255,90,106,0.4)'}`,
                transition: 'all 0.8s ease',
                boxShadow: winAnimPhase >= 3 ? '0 0 40px rgba(247,215,122,0.4), 0 0 80px rgba(67,214,133,0.2)' : 'none',
              }}>
                <span style={{
                  fontSize: winAnimPhase >= 2 ? '56px' : '48px',
                  transition: 'all 0.5s ease',
                  filter: winAnimPhase >= 3 ? 'drop-shadow(0 0 12px rgba(247,215,122,0.6))' : 'none',
                }}>
                  {winAnimPhase < 2 ? '🐀' : winAnimPhase < 3 ? '🔓' : '🦅'}
                </span>
              </div>
            </div>

            {/* Phase 2: Breaking free message */}
            <div style={{
              opacity: winAnimPhase >= 2 ? 1 : 0,
              transform: winAnimPhase >= 2 ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.7s ease',
              textAlign: 'center',
              marginBottom: '12px',
            }}>
              <div style={{
                fontSize: '13px',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: 'rgba(67,214,133,0.9)',
                fontWeight: '700',
                marginBottom: '8px',
              }}>
                {lang === 'es' ? '¡HAS ESCAPADO!' : lang === 'pt' ? 'VOCE ESCAPOU!' : lang === 'fr' ? 'VOUS ETES LIBRE!' : lang === 'de' ? 'DU BIST FREI!' : lang === 'it' ? 'SEI LIBERO!' : lang === 'zh' ? '你自由了！' : 'YOU ESCAPED!'}
              </div>
            </div>

            {/* Phase 3: Financial Freedom title */}
            <div style={{
              opacity: winAnimPhase >= 3 ? 1 : 0,
              transform: winAnimPhase >= 3 ? 'scale(1)' : 'scale(0.8)',
              transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #F7D77A 0%, #FFB347 50%, #F7D77A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px',
                textShadow: 'none',
                lineHeight: 1.2,
              }}>
                {t('financial_freedom')}
              </h2>
              <p style={{color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.5}}>
                {lang === 'es' ? '¡Tus ingresos pasivos superan tus gastos! Has salido de la rueda de la rata y eres financieramente libre.' 
                  : lang === 'pt' ? 'Sua renda passiva supera suas despesas! Voce saiu da corrida dos ratos e e financeiramente livre.'
                  : lang === 'fr' ? 'Vos revenus passifs depassent vos depenses! Vous etes sorti de la course au rat et etes financierement libre.'
                  : lang === 'de' ? 'Ihr passives Einkommen ubersteigt Ihre Ausgaben! Sie sind dem Hamsterrad entkommen!'
                  : lang === 'it' ? 'Il tuo reddito passivo supera le tue spese! Sei uscito dalla corsa del topo e sei finanziariamente libero.'
                  : lang === 'zh' ? '你的被动收入超过了你的支出！你已经逃离了老鼠赛跑，实现了财务自由。'
                  : 'Your passive income exceeds your expenses! You escaped the rat race and are financially free.'}
              </p>
            </div>

            {/* Phase 4: Stats + Actions */}
            <div style={{
              opacity: winAnimPhase >= 4 ? 1 : 0,
              transform: winAnimPhase >= 4 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.5s ease',
            }}>
              {/* Stats cards */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px'}}>
                <div className="card" style={{padding: '14px', textAlign: 'center', background: 'rgba(7,21,27,0.8)', border: '1px solid rgba(247,215,122,0.2)'}}>
                  <div style={{fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px'}}>{t('net_worth')}</div>
                  <div style={{fontSize: '22px', fontWeight: '800', color: '#F7D77A'}}>${gameState.net_worth.toLocaleString()}</div>
                </div>
                <div className="card" style={{padding: '14px', textAlign: 'center', background: 'rgba(7,21,27,0.8)', border: '1px solid rgba(67,214,133,0.2)'}}>
                  <div style={{fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px'}}>{t('passive_income')}</div>
                  <div style={{fontSize: '22px', fontWeight: '800', color: '#43D685'}}>${gameState.passive_income.toLocaleString()}/m</div>
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px'}}>
                <div className="card" style={{padding: '10px', textAlign: 'center', background: 'rgba(7,21,27,0.6)'}}>
                  <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.4)'}}>
                    {lang === 'es' ? 'Turnos' : lang === 'pt' ? 'Turnos' : lang === 'fr' ? 'Tours' : lang === 'de' ? 'Runden' : lang === 'it' ? 'Turni' : lang === 'zh' ? '回合' : 'Turns'}
                  </div>
                  <div style={{fontSize: '18px', fontWeight: '700', color: '#62C6FF'}}>{gameState.turns}</div>
                </div>
                <div className="card" style={{padding: '10px', textAlign: 'center', background: 'rgba(7,21,27,0.6)'}}>
                  <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.4)'}}>
                    {lang === 'es' ? 'Activos' : lang === 'pt' ? 'Ativos' : lang === 'fr' ? 'Actifs' : lang === 'de' ? 'Anlagen' : lang === 'it' ? 'Asset' : lang === 'zh' ? '资产' : 'Assets'}
                  </div>
                  <div style={{fontSize: '18px', fontWeight: '700', color: '#AA7AFF'}}>{gameState.assets.length}</div>
                </div>
                <div className="card" style={{padding: '10px', textAlign: 'center', background: 'rgba(7,21,27,0.6)'}}>
                  <div style={{fontSize: '10px', color: 'rgba(255,255,255,0.4)'}}>
                    {lang === 'es' ? 'Racha Trivia' : lang === 'pt' ? 'Sequencia' : lang === 'fr' ? 'Serie' : lang === 'de' ? 'Serie' : lang === 'it' ? 'Serie' : lang === 'zh' ? '连胜' : 'Streak'}
                  </div>
                  <div style={{fontSize: '18px', fontWeight: '700', color: '#FF9F40'}}>{gameState.trivia_streak}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={() => navigate('/')} className="btn-outline-gold" style={{flex: 1, padding: '14px', borderRadius: '14px', fontWeight: '700', fontSize: '14px'}} data-testid="win-home-btn">
                  {t('back_home')}
                </button>
                <button onClick={() => { setShowWin(false); setWinAnimPhase(0); navigate('/select-profession'); }} className="btn-gold" style={{flex: 1, padding: '14px', borderRadius: '14px', fontWeight: '700', fontSize: '14px'}} data-testid="win-play-again-btn">
                  {t('play_again')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirm */}
      {showExitConfirm && (
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal-content card p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{t('confirm_delete')}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {lang === 'es' ? 'Perderás tu progreso si no guardas.' : 'You will lose progress if you don\'t save.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 btn-outline-gold py-2.5 rounded-xl font-bold">{t('cancel')}</button>
              <button onClick={async () => { await handleSave(); navigate('/'); }} className="flex-1 btn-gold py-2.5 rounded-xl font-bold">{t('save')} & {t('back')}</button>
              <button onClick={() => navigate('/')} className="flex-1 py-2.5 rounded-xl font-bold bg-[var(--danger)] text-white">{t('back')}</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showSaveLoad && <SaveLoadModal onClose={() => setShowSaveLoad(false)} onSave={handleSave} onLoad={handleLoad} currentState={gameState} />}
    </div>
  );
}
