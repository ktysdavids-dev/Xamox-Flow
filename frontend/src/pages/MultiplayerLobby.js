import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { getPublicUrl } from '../utils/publicUrl';
import Board from '../components/Board';
import Dice3D from '../components/Dice3D';
import EventModal from '../components/EventModal';
import SettingsModal from '../components/SettingsModal';
import axios from 'axios';

import { API, getWebsocketOrigin, isAndroidAppClient } from '../config';
const WS_BASE = getWebsocketOrigin();

// Multiplayer translations for all 7 languages
const ML = {
  share_code: { es:'Comparte este codigo con tus rivales', en:'Share this code with your opponents', pt:'Compartilhe este codigo com seus rivais', fr:'Partagez ce code avec vos rivaux', de:'Teile diesen Code mit deinen Gegnern', it:'Condividi questo codice con i tuoi rivali', zh:'与对手分享此代码' },
  copy_code: { es:'Compartir codigo', en:'Share code', pt:'Compartilhar codigo', fr:'Partager le code', de:'Code teilen', it:'Condividi codice', zh:'分享代码' },
  code_copied: { es:'Codigo copiado!', en:'Code copied!', pt:'Codigo copiado!', fr:'Code copie!', de:'Code kopiert!', it:'Codice copiato!', zh:'代码已复制！' },
  choose_prof: { es:'1. Elige tu profesion', en:'1. Choose your profession', pt:'1. Escolha sua profissao', fr:'1. Choisissez votre profession', de:'1. Wahle deinen Beruf', it:'1. Scegli la tua professione', zh:'1. 选择你的职业' },
  per_month: { es:'mes', en:'mo', pt:'mes', fr:'mois', de:'Mo', it:'mese', zh:'月' },
  waiting_players: { es:'Esperando mas jugadores...', en:'Waiting for more players...', pt:'Esperando mais jogadores...', fr:'En attente de joueurs...', de:'Warte auf Spieler...', it:'In attesa di giocatori...', zh:'等待更多玩家...' },
  choose_first: { es:'Elige profesion primero', en:'Choose profession first', pt:'Escolha profissao primeiro', fr:'Choisissez d\'abord', de:'Wahle zuerst einen Beruf', it:'Scegli prima la professione', zh:'请先选择职业' },
  ready_btn: { es:'Listo', en:'Ready', pt:'Pronto', fr:'Pret', de:'Bereit', it:'Pronto', zh:'准备好了' },
  ready_waiting: { es:'¡Listo! Esperando a los demas...', en:'Ready! Waiting for others...', pt:'Pronto! Esperando os outros...', fr:'Pret! En attente des autres...', de:'Bereit! Warte auf andere...', it:'Pronto! Aspettando gli altri...', zh:'准备好了！等待其他人...' },
  cancel: { es:'Cancelar', en:'Cancel', pt:'Cancelar', fr:'Annuler', de:'Abbrechen', it:'Annulla', zh:'取消' },
  all_ready: { es:'¡Todos listos! Iniciando partida...', en:'All ready! Starting game...', pt:'Todos prontos! Iniciando...', fr:'Tous prets! Demarrage...', de:'Alle bereit! Spiel startet...', it:'Tutti pronti! Avvio...', zh:'全部准备好了！开始游戏...' },
  your_turn: { es:'¡Tu turno!', en:'Your turn!', pt:'Sua vez!', fr:'Votre tour!', de:'Dein Zug!', it:'Il tuo turno!', zh:'轮到你了！' },
  turn_of: { es:'Turno de', en:'Turn of', pt:'Vez de', fr:'Tour de', de:'Zug von', it:'Turno di', zh:'轮到' },
  you_won: { es:'¡Has ganado!', en:'You won!', pt:'Voce ganhou!', fr:'Vous avez gagne!', de:'Du hast gewonnen!', it:'Hai vinto!', zh:'你赢了！' },
  wins: { es:'ha ganado!', en:'wins!', pt:'ganhou!', fr:'a gagne!', de:'hat gewonnen!', it:'ha vinto!', zh:'赢了！' },
  left_game: { es:'se ha retirado de la partida', en:'has left the game', pt:'saiu do jogo', fr:'a quitte la partie', de:'hat das Spiel verlassen', it:'ha lasciato la partita', zh:'已退出游戏' },
  win_forfeit: { es:'¡Victoria por retirada del rival!', en:'Victory by opponent forfeit!', pt:'Vitoria por desistencia!', fr:'Victoire par forfait!', de:'Sieg durch Aufgabe!', it:'Vittoria per ritiro!', zh:'对手弃权获胜！' },
  game_over: { es:'Partida Terminada', en:'Game Over', pt:'Fim de Jogo', fr:'Partie Terminee', de:'Spiel Vorbei', it:'Partita Finita', zh:'游戏结束' },
  forfeit_loss: { es:'Tu rival ha ganado por tu retirada', en:'Your opponent won by your forfeit', pt:'Seu rival ganhou pela sua desistencia', fr:'Votre rival a gagne par votre forfait', de:'Dein Gegner hat durch deine Aufgabe gewonnen', it:'Il tuo rivale ha vinto per il tuo ritiro', zh:'你的对手因你的弃权而获胜' },
  create_room: { es:'Crea una sala y comparte el codigo', en:'Create a room and share the code', pt:'Crie uma sala e compartilhe o codigo', fr:'Creez une salle et partagez le code', de:'Erstelle einen Raum und teile den Code', it:'Crea una stanza e condividi il codice', zh:'创建房间并分享代码' },
  conn_error: { es:'Error de conexion', en:'Connection error', pt:'Erro de conexao', fr:'Erreur de connexion', de:'Verbindungsfehler', it:'Errore di connessione', zh:'连接错误' },
  create_error: { es:'Error al crear sala', en:'Error creating room', pt:'Erro ao criar sala', fr:'Erreur creation salle', de:'Fehler beim Erstellen', it:'Errore creazione stanza', zh:'创建房间错误' },
  no_connect: { es:'No se pudo conectar', en:'Could not connect', pt:'Nao foi possivel conectar', fr:'Connexion impossible', de:'Verbindung fehlgeschlagen', it:'Connessione fallita', zh:'无法连接' },
  type_msg: { es:'Escribe un mensaje...', en:'Type a message...', pt:'Digite uma mensagem...', fr:'Ecrivez un message...', de:'Nachricht schreiben...', it:'Scrivi un messaggio...', zh:'输入消息...' },
};
const ml = (key, l) => ML[key]?.[l] || ML[key]?.en || key;
export default function MultiplayerLobby() {
  const { t, tContent, lang } = useLanguage();
  const { user, token, isLoggedIn } = useAuth();
  const { playSfx, playMusic, stopMusic, musicEnabled } = useAudio();
  const navigate = useNavigate();

  // Lobby state
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Game state (when playing inside room)
  const [gameState, setGameState] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [content, setContent] = useState(null);
  const [diceValues, setDiceValues] = useState([0, 0]);
  const [isRolling, setIsRolling] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [gamePhase, setGamePhase] = useState(null); // null = lobby, 'playing' = in game
  const [forfeitInfo, setForfeitInfo] = useState(null); // {winner_id, leaver_name}
  const [showSettings, setShowSettings] = useState(false);
  const [botMessage, setBotMessage] = useState(null);
  const [turnTimer, setTurnTimer] = useState(15);
  const turnTimerRef = useRef(null);
  const rollAnimTimeoutRef = useRef(null);
  const DICE_ANIMATION_MS = 1100;
  const isAppClient = isAndroidAppClient();

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadRooms();
    loadGameContent();

    const params = new URLSearchParams(window.location.search);
    const roomFromFriend = params.get('room');
    if (roomFromFriend) connectToRoom(roomFromFriend);

    return () => {
      if (wsRef.current) { try { wsRef.current.close(); } catch(e){} }
      if (rollAnimTimeoutRef.current) {
        clearTimeout(rollAnimTimeoutRef.current);
        rollAnimTimeoutRef.current = null;
      }
    };
  }, [isLoggedIn]); // eslint-disable-line

  const loadRooms = async () => {
    try {
      const r = await axios.get(`${API}/rooms/active`);
      setRooms(r.data.rooms);
    } catch (e) {}
  };

  const loadGameContent = async () => {
    try {
      const [boardRes, contentRes] = await Promise.all([
        axios.get(`${API}/game/board`),
        axios.get(`${API}/game/content`),
      ]);
      setTiles(boardRes.data.tiles);
      setContent(contentRes.data);
    } catch (e) {}
  };

  const createRoom = async () => {
    try {
      const r = await axios.post(`${API}/rooms/create`, { token, from_app: isAppClient });
      playSfx('success');
      connectToRoom(r.data.code);
    } catch (e) {
      setError(ml('create_error', lang));
      setTimeout(() => setError(''), 3000);
    }
  };

  const joinRoom = async (code) => {
    const codeToUse = (code || joinCode).toUpperCase().trim();
    if (!codeToUse) return;
    try {
      await axios.post(`${API}/rooms/join`, { token, code: codeToUse, from_app: isAppClient });
      playSfx('success');
      connectToRoom(codeToUse);
    } catch (e) {
      setError(e.response?.data?.detail || 'Cannot join room');
      setTimeout(() => setError(''), 3000);
    }
  };

  const connectToRoom = useCallback((code) => {
    try {
      if (wsRef.current) { try { wsRef.current.close(); } catch(e){} }

      const wsUrl = `${WS_BASE}/api/ws/${code}/${user.id}${isAppClient ? '?from_app=1' : ''}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setError('');
        // Start heartbeat ping every 25 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try { socket.send(JSON.stringify({ type: 'ping' })); } catch(e) {}
          }
        }, 25000);
        socket._pingInterval = pingInterval;
      };

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const getEventTypeFromTile = (tileType) => {
            if (tileType === 'trivia') return 'trivia';
            if (tileType === 'investment' || tileType === 'real_estate') return 'investment';
            if (tileType === 'market') return 'market';
            if (tileType === 'opportunity') return 'opportunity';
            if (tileType === 'tax') return 'tax';
            if (tileType === 'payday') return 'payday_bonus';
            return 'event';
          };
          switch (data.type) {
            case 'room_state':
              setCurrentRoom(data.room);
              if (data.room.chat_messages) setChatMessages(data.room.chat_messages);
              // If game already in progress, set game state
              if (data.room.status === 'playing' && data.room.game_state) {
                setGameState(data.room.game_state);
                setGamePhase('playing');
              }
              break;
            case 'chat':
              setChatMessages(prev => [...prev, data.message]);
              break;
            case 'game_started':
              setGameState(data.game_state);
              setGamePhase('playing');
              playSfx('success');
              // Switch to game music
              if (musicEnabled) { try { playMusic('game'); } catch(e) {} }
              break;
            case 'dice_rolled':
              // Keep a visible, synchronized roll animation on all clients.
              if (rollAnimTimeoutRef.current) {
                clearTimeout(rollAnimTimeoutRef.current);
                rollAnimTimeoutRef.current = null;
              }
              setCurrentEvent(null);
              setIsRolling(true);
              setDiceValues(data.dice);
              // Avoid duplicate local SFX, but still play remote throws.
              if (data.user_id !== user.id) {
                playSfx('dice');
              }
              rollAnimTimeoutRef.current = setTimeout(() => {
                setIsRolling(false);
                setGameState(data.game_state);
                if (data.passed_payday) playSfx('coin');
                // Show modal only for real player turns (not bot autoplay)
                if (data.tile_event && !data.is_bot_roll) {
                  setCurrentEvent({ type: getEventTypeFromTile(data.tile?.type), data: data.tile_event });
                } else {
                  setCurrentEvent(null);
                }
                rollAnimTimeoutRef.current = null;
              }, DICE_ANIMATION_MS);
              break;
            case 'turn_resolved':
              setGameState(data.game_state);
              setCurrentEvent(null);
              break;
            case 'game_over':
              setGameState(data.game_state);
              setCurrentEvent(null);
              playSfx('win');
              // Switch to victory music
              if (musicEnabled) { try { playMusic('victory'); } catch(e) {} }
              break;
            case 'player_forfeited':
              setGameState(data.game_state);
              setCurrentEvent(null);
              setForfeitInfo({ winner_id: data.winner_id, leaver_name: data.leaver_name });
              if (data.winner_id === user.id) {
                playSfx('win');
                if (musicEnabled) { try { playMusic('victory'); } catch(e) {} }
              }
              break;
            case 'player_connected':
            case 'player_disconnected':
            case 'player_left':
              if (data.room) setCurrentRoom(data.room);
              break;
            case 'bot_activated':
              setBotMessage(lang === 'es' ? data.message_es : data.message_en);
              setTimeout(() => setBotMessage(null), 4000);
              break;
            case 'reaction':
              // Show floating emoji - auto-remove after 2 seconds
              const rId = Date.now() + Math.random();
              setFloatingReactions(prev => [...prev, { id: rId, emoji: data.emoji, username: data.username }]);
              setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== rId));
              }, 2000);
              break;
            case 'player_kicked':
              setBotMessage(lang === 'es' ? data.message_es : data.message_en);
              if (data.kicked_id === user.id) {
                setTimeout(() => { setBotMessage(null); leaveRoom(); }, 3000);
              } else {
                setTimeout(() => setBotMessage(null), 5000);
              }
              break;
            case 'player_left_game':
              setGameState(data.game_state);
              setBotMessage(lang === 'es' ? data.message_es : data.message_en);
              setTimeout(() => setBotMessage(null), 4000);
              break;
            case 'pong':
              break;
            default:
              break;
          }
        } catch (err) {}
      };

      socket.onerror = () => {
        setError(ml('conn_error', lang));
        setTimeout(() => setError(''), 3000);
      };

      socket.onclose = (event) => {
        if (socket._pingInterval) clearInterval(socket._pingInterval);
        // Auto-reconnect after 2 seconds if not intentionally closed
        if (wsRef.current === socket) {
          setTimeout(() => {
            if (wsRef.current === socket) {
              console.log('WebSocket reconnecting...');
              connectToRoom(code);
            }
          }, 2000);
        }
      };
      wsRef.current = socket;
    } catch (e) {
      setError(ml('no_connect', lang));
    }
  }, [user, lang, playSfx, isAppClient]);

  const sendChat = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'chat', username: user.username, message: chatInput.trim() }));
    setChatInput('');
  };

  const [myProfession, setMyProfession] = useState('');
  const [professions, setProfessions] = useState([]);

  // Load professions list
  useEffect(() => {
    axios.get(`${API}/game/professions`).then(r => setProfessions(r.data.professions)).catch(() => {});
  }, []);

  const toggleReady = () => {
    if (!wsRef.current || !myProfession) return;
    const me = currentRoom?.players?.find(p => p.id === user.id);
    const newReady = !me?.ready;
    wsRef.current.send(JSON.stringify({ type: 'ready', ready: newReady, profession: myProfession }));
  };

  const startGame = () => {
    if (!wsRef.current) return;
    // Collect professions from ready data (or use defaults)
    const profMap = {};
    currentRoom?.players?.forEach((p) => {
      profMap[p.id] = p.profession || 'engineer';
    });
    wsRef.current.send(JSON.stringify({ type: 'start_game', professions: profMap }));
  };

  const leaveRoom = () => {
    const ws = wsRef.current;
    wsRef.current = null; // Set to null FIRST to prevent auto-reconnect
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'leave_room' })); } catch(e){}
      if (ws._pingInterval) clearInterval(ws._pingInterval);
      try { ws.close(); } catch(e){}
    }
    setCurrentRoom(null);
    setChatMessages([]);
    setGameState(null);
    setGamePhase(null);
    setForfeitInfo(null);
    setBotMessage(null);
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    if (rollAnimTimeoutRef.current) {
      clearTimeout(rollAnimTimeoutRef.current);
      rollAnimTimeoutRef.current = null;
    }
    loadRooms();
  };

  // Game actions
  const rollDice = () => {
    if (!wsRef.current || !gameState) return;
    if (gameState.current_turn !== user.id) return;
    if (gameState.phase !== 'roll') return;
    setIsRolling(true);
    playSfx('dice');
    wsRef.current.send(JSON.stringify({ type: 'roll_dice' }));
  };

  const handleEventResolve = (action) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'resolve_turn', action }));
    setCurrentEvent(null);
  };

  const sendReaction = (emoji) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'reaction', username: user.username, emoji }));
  };

  const [showGameChat, setShowGameChat] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Turn timer countdown effect
  useEffect(() => {
    if (gamePhase === 'playing' && gameState?.phase === 'roll') {
      setTurnTimer(15);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
      return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current); };
    } else {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    }
  }, [gamePhase, gameState?.phase, gameState?.current_turn]);

  // ==================== RENDER: IN-GAME ====================
  if (gamePhase === 'playing' && gameState && currentRoom) {
    const myState = gameState.players?.[user.id];
    const isMyTurn = gameState.current_turn === user.id;
    const winner = Object.values(gameState.players || {}).find(p => p.has_won);

    const opponents = Object.values(gameState.players || {}).filter(p => p.id !== user.id);

    const PlayerAvatar = ({ p, size = 28 }) => (
      <div className="rounded-full overflow-hidden flex items-center justify-center font-bold border-2 border-white/30 flex-shrink-0"
           style={{ width: size, height: size, background: p.avatar_url ? 'transparent' : (p.color || '#FFD700'), fontSize: size * 0.35 }}>
        {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p.name?.charAt(0)?.toUpperCase() || '?')}
      </div>
    );

    return (
      <div className="min-h-screen page-bg flex flex-col" data-testid="multiplayer-game">
        {/* Top HUD - Player cards */}
        <div className="glass-strong px-2 py-2 z-30 sticky top-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button onClick={leaveRoom} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            {Object.values(gameState.players || {}).filter(p => !p.kicked).map(p => {
              const isTurn = p.id === gameState.current_turn;
              const isMe = p.id === user.id;
              return (
                <div key={p.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl flex-shrink-0 min-w-0 ${isTurn ? 'bg-[rgba(247,215,122,0.12)] border border-[var(--gold)]' : 'bg-[var(--surface-2)] border border-transparent'}`}>
                  <PlayerAvatar p={p} size={30} />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold leading-tight truncate max-w-[80px]">
                      {p.name}{isMe ? ' (Tu)' : ''} {isTurn ? '🎲' : ''}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] tabular-nums">
                      <span className="text-[var(--gold)]">${(p.cash||0).toLocaleString()}</span>
                      <span className="text-[var(--success)]">+{(p.passive_income||0)}</span>
                      <span className="text-[var(--danger)]">-{(p.expenses||0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Settings gear */}
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] flex-shrink-0 ml-auto" data-testid="game-settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        {/* Turn indicator with timer */}
        <div className={`text-center py-1.5 text-sm font-bold ${isMyTurn ? 'text-[var(--gold)] bg-[rgba(247,215,122,0.08)]' : 'text-[var(--text-subtle)]'}`}>
          {isMyTurn 
            ? `🎲 ${ml('your_turn', lang)} (${turnTimer}s)` 
            : `⏳ ${ml('turn_of', lang)} ${gameState.players?.[gameState.current_turn]?.name || '...'} (${turnTimer}s)`}
        </div>

        {/* Bot message overlay */}
        {botMessage && (
          <div className="text-center py-2 px-4 bg-[rgba(255,159,64,0.15)] border-b border-[rgba(255,159,64,0.3)]">
            <span className="text-sm font-bold text-[#FF9F40]">🤖 {botMessage}</span>
          </div>
        )}

        {/* Board */}
        <div className="flex-1 flex flex-col items-center justify-center p-2">
          <Board
            tiles={tiles}
            playerPosition={myState?.position || 0}
            playerColor={user?.avatar_color || '#FFD700'}
            playerName={user?.username || 'You'}
            playerAvatar={user?.avatar_url || ''}
            players={opponents}
            diceValues={diceValues}
            rolling={isRolling}
            onRollDice={isMyTurn ? rollDice : undefined}
            phase={isMyTurn ? gameState.phase : 'wait'}
            rollLabel={`🎲 ${t('roll_dice')}`}
            activePlayerId={gameState.current_turn}
            selfPlayerId={user.id}
          />
        </div>

        {/* Quick Reactions Bar */}
        <div className="glass-strong px-2 py-1.5 flex items-center gap-1 justify-center">
          {['👍', '😂', '🔥', '😮', '👏', '💪', '😎', '🎉'].map(emoji => (
            <button key={emoji} onClick={() => sendReaction(emoji)} className="text-lg p-1 rounded-lg hover:bg-[var(--surface-2)] active:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
          <button onClick={() => setShowGameChat(!showGameChat)} className="ml-1 p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>

        {/* Floating Reactions - rise up and fade out */}
        {floatingReactions.map(r => (
          <div key={r.id} className="fixed z-50 pointer-events-none"
               style={{
                 left: `${20 + (r.id % 60)}%`,
                 bottom: '15%',
                 fontSize: '40px',
                 animation: 'reactionFloat 2s ease-out forwards',
               }}>
            {r.emoji}
          </div>
        ))}

        {/* In-game Chat Panel */}
        {showGameChat && (
          <div className="fixed bottom-0 left-0 right-0 z-40 glass-strong" style={{maxHeight: '40vh'}}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
              <span className="text-sm font-bold">{t('chat')}</span>
              <button onClick={() => setShowGameChat(false)} className="p-1 rounded hover:bg-[var(--surface-2)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-2 space-y-1" style={{maxHeight: '25vh'}}>
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-xs">
                  <span className="font-bold text-[var(--gold)]">{msg.username}: </span>
                  <span className="text-[var(--text-muted)]">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="px-3 py-2 border-t border-[var(--border)] flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={ml('type_msg', lang)} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm focus:border-[var(--gold)] focus:outline-none" />
              <button onClick={sendChat} className="btn-gold px-3 py-1.5 rounded-lg text-sm font-bold">{t('send')}</button>
            </div>
          </div>
        )}

        {/* Financial panel - detailed */}
        <div className="glass-strong px-3 py-2">
          {Object.values(gameState.players || {}).filter(p => !p.kicked).map(p => {
            const isMe = p.id === user.id;
            return (
              <div key={p.id} className={`flex items-center gap-2 py-1.5 ${!isMe ? 'opacity-60' : ''} ${Object.values(gameState.players).length > 1 ? 'border-b border-[var(--border)] last:border-0' : ''}`}>
                <PlayerAvatar p={p} size={24} />
                <span className="text-[10px] font-bold w-16 truncate">{p.name}{isMe ? ' (Tu)' : ''}</span>
                <div className="flex-1 flex items-center justify-end gap-3 text-[10px] tabular-nums">
                  <div className="text-center">
                    <div className="text-[8px] text-[var(--text-subtle)]">Efectivo</div>
                    <div className="font-bold text-[var(--gold)]">${(p.cash||0).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[var(--text-subtle)]">Pasivo</div>
                    <div className="font-bold text-[var(--success)]">+${(p.passive_income||0).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[var(--text-subtle)]">Gastos</div>
                    <div className="font-bold text-[var(--danger)]">-${(p.expenses||0).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[var(--text-subtle)]">Activos</div>
                    <div className="font-bold">{p.assets?.length||0}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event Modal - only for current turn player */}
        {currentEvent && isMyTurn && (
          <EventModal event={currentEvent} playerCash={myState?.cash || 0} playerAssets={myState?.assets || []} onResolve={handleEventResolve} />
        )}

        {/* EPIC Win Modal - Multiplayer Victory */}
        {winner && !forfeitInfo && (
          <div className="modal-overlay" style={{background: 'rgba(0,0,0,0.9)', zIndex: 999}}>
            {/* Confetti particles */}
            <div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none'}}>
              {[...Array(30)].map((_, i) => (
                <div key={i} style={{
                  position:'absolute',
                  width: `${4 + Math.random() * 8}px`,
                  height: `${4 + Math.random() * 8}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  background: ['#F7D77A','#43D685','#62C6FF','#FF9F40','#AA7AFF','#FF5A6A','#FFB347'][i % 7],
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  animation: `confettiFall ${2 + Math.random() * 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 3}s`,
                }} />
              ))}
            </div>

            <div className="modal-content" style={{maxWidth:'420px', width:'92%', background:'transparent', boxShadow:'none', overflow:'visible'}}>
              {/* Trophy with glow */}
              <div style={{textAlign:'center', marginBottom:'16px', animation:'bounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
                <div style={{
                  width:'110px', height:'110px', margin:'0 auto', borderRadius:'50%',
                  background: winner.id === user.id 
                    ? 'linear-gradient(135deg, rgba(247,215,122,0.3) 0%, rgba(67,214,133,0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(98,198,255,0.2) 0%, rgba(170,122,255,0.2) 100%)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border: `3px solid ${winner.id === user.id ? 'rgba(247,215,122,0.5)' : 'rgba(98,198,255,0.4)'}`,
                  boxShadow: winner.id === user.id 
                    ? '0 0 50px rgba(247,215,122,0.4), 0 0 100px rgba(247,215,122,0.15)'
                    : '0 0 40px rgba(98,198,255,0.3)',
                }}>
                  <span style={{fontSize:'60px', filter:'drop-shadow(0 0 12px rgba(247,215,122,0.6))'}}>
                    {winner.id === user.id ? '🏆' : '🥈'}
                  </span>
                </div>
              </div>

              {/* Winner announcement */}
              <div style={{textAlign:'center', marginBottom:'16px'}}>
                {winner.id === user.id ? (
                  <>
                    <div style={{fontSize:'11px', letterSpacing:'4px', textTransform:'uppercase', color:'rgba(67,214,133,0.9)', fontWeight:'700', marginBottom:'6px'}}>
                      {lang === 'es' ? '¡VICTORIA!' : lang === 'pt' ? 'VITORIA!' : lang === 'fr' ? 'VICTOIRE!' : lang === 'de' ? 'SIEG!' : lang === 'it' ? 'VITTORIA!' : lang === 'zh' ? '胜利！' : 'VICTORY!'}
                    </div>
                    <h2 style={{fontSize:'26px', fontWeight:'800', background:'linear-gradient(135deg, #F7D77A 0%, #FFB347 50%, #F7D77A 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'8px'}}>
                      {lang === 'es' ? '¡Has alcanzado la libertad financiera!' : lang === 'pt' ? 'Voce alcancou a liberdade financeira!' : lang === 'fr' ? 'Liberte financiere atteinte!' : lang === 'de' ? 'Finanzielle Freiheit erreicht!' : lang === 'it' ? 'Liberta finanziaria raggiunta!' : lang === 'zh' ? '实现了财务自由！' : 'You achieved financial freedom!'}
                    </h2>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)'}}>
                      {lang === 'es' ? 'Tus ingresos pasivos superan tus gastos. ¡Eres libre!' : 'Your passive income exceeds expenses. You are free!'}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 style={{fontSize:'22px', fontWeight:'700', color:'#62C6FF', marginBottom:'8px'}}>
                      {winner.name} {lang === 'es' ? 'ha ganado la partida' : 'won the game'}
                    </h2>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)'}}>
                      {lang === 'es' ? 'Mejor suerte la proxima vez' : 'Better luck next time'}
                    </p>
                  </>
                )}
              </div>

              {/* Stats */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px'}}>
                <div style={{padding:'12px', borderRadius:'12px', background:'rgba(7,21,27,0.8)', border:'1px solid rgba(247,215,122,0.2)', textAlign:'center'}}>
                  <div style={{fontSize:'10px', color:'rgba(255,255,255,0.4)'}}>Patrimonio</div>
                  <div style={{fontSize:'20px', fontWeight:'800', color:'#F7D77A'}}>${(winner.net_worth||0).toLocaleString()}</div>
                </div>
                <div style={{padding:'12px', borderRadius:'12px', background:'rgba(7,21,27,0.8)', border:'1px solid rgba(67,214,133,0.2)', textAlign:'center'}}>
                  <div style={{fontSize:'10px', color:'rgba(255,255,255,0.4)'}}>{lang === 'es' ? 'Ingreso Pasivo' : 'Passive Income'}</div>
                  <div style={{fontSize:'20px', fontWeight:'800', color:'#43D685'}}>${(winner.passive_income||0).toLocaleString()}/m</div>
                </div>
              </div>

              {/* All players ranking */}
              <div style={{marginBottom:'16px', padding:'12px', borderRadius:'12px', background:'rgba(7,21,27,0.6)', border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:'10px', fontWeight:'700', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'2px', marginBottom:'8px', textAlign:'center'}}>
                  {lang === 'es' ? 'Clasificacion Final' : 'Final Ranking'}
                </div>
                {Object.values(gameState.players || {}).filter(p => !p.kicked).sort((a,b) => (b.net_worth||0) - (a.net_worth||0)).map((p, idx) => (
                  <div key={p.id} style={{display:'flex', alignItems:'center', gap:'8px', padding:'6px 8px', borderRadius:'8px', background: idx === 0 ? 'rgba(247,215,122,0.08)' : 'transparent', marginBottom:'2px'}}>
                    <span style={{fontSize:'14px', width:'20px', textAlign:'center'}}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}.`}</span>
                    <span style={{flex:1, fontSize:'12px', fontWeight:'600', color: p.id === user.id ? '#F7D77A' : 'rgba(255,255,255,0.8)'}}>{p.name} {p.id === user.id ? '(Tu)' : ''}</span>
                    <span style={{fontSize:'11px', fontWeight:'700', color:'#F7D77A'}}>${(p.net_worth||0).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => { setForfeitInfo(null); leaveRoom(); }} className="btn-gold" style={{width:'100%', padding:'14px', borderRadius:'14px', fontWeight:'700', fontSize:'15px'}}>
                {t('back_home')}
              </button>
            </div>
          </div>
        )}

        {/* Forfeit Modal - Player left */}
        {forfeitInfo && (
          <div className="modal-overlay" style={{background: 'rgba(0,0,0,0.9)', zIndex: 999}}>
            <div className="modal-content" style={{maxWidth:'400px', width:'92%', background:'transparent', boxShadow:'none'}}>
              <div style={{textAlign:'center', marginBottom:'16px'}}>
                <div style={{
                  width:'100px', height:'100px', margin:'0 auto 16px', borderRadius:'50%',
                  background: forfeitInfo.winner_id === user.id ? 'linear-gradient(135deg, rgba(247,215,122,0.25), rgba(67,214,133,0.2))' : 'linear-gradient(135deg, rgba(255,90,106,0.2), rgba(170,122,255,0.15))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border: `3px solid ${forfeitInfo.winner_id === user.id ? 'rgba(247,215,122,0.4)' : 'rgba(255,90,106,0.3)'}`,
                  boxShadow: forfeitInfo.winner_id === user.id ? '0 0 40px rgba(247,215,122,0.3)' : '0 0 30px rgba(255,90,106,0.2)',
                }}>
                  <span style={{fontSize:'50px'}}>{forfeitInfo.winner_id === user.id ? '🏆' : '🏳️'}</span>
                </div>
              </div>
              {forfeitInfo.winner_id === user.id ? (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'11px', letterSpacing:'3px', color:'rgba(67,214,133,0.9)', fontWeight:'700', marginBottom:'6px'}}>
                    {lang === 'es' ? '¡VICTORIA!' : 'VICTORY!'}
                  </div>
                  <h2 style={{fontSize:'24px', fontWeight:'800', color:'#F7D77A', marginBottom:'8px'}}>{ml('you_won', lang)}</h2>
                  <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'6px'}}>
                    <b style={{color:'rgba(255,255,255,0.8)'}}>{forfeitInfo.leaver_name}</b> {ml('left_game', lang)}
                  </p>
                  <p style={{fontSize:'12px', color:'#43D685', marginBottom:'20px'}}>{ml('win_forfeit', lang)}</p>
                </div>
              ) : (
                <div style={{textAlign:'center'}}>
                  <h2 style={{fontSize:'22px', fontWeight:'700', color:'#FF5A6A', marginBottom:'8px'}}>{ml('game_over', lang)}</h2>
                  <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'20px'}}>{ml('forfeit_loss', lang)}</p>
                </div>
              )}
              <button onClick={() => { setForfeitInfo(null); leaveRoom(); }} className="btn-gold" style={{width:'100%', padding:'14px', borderRadius:'14px', fontWeight:'700', fontSize:'15px'}}>
                {t('back_home')}
              </button>
            </div>
          </div>
        )}

        {/* Settings Modal (in-game) */}
        {showSettings && <SettingsModal onClose={Object.assign(() => setShowSettings(false), { __inGame: true })} />}
      </div>
    );
  }

  // ==================== RENDER: ROOM LOBBY ====================
  if (currentRoom) {
    const isHost = currentRoom.host_id === user?.id;
    const allReady = currentRoom.players?.length >= 2 && currentRoom.players?.every(p => p.ready);
    const me = currentRoom.players?.find(p => p.id === user.id);
    const imReady = me?.ready;

    const profIcons = {
      teacher: '📚', engineer: '⚙️', doctor: '🩺', janitor: '🧹',
      nurse: '🏥', lawyer: '⚖️', entrepreneur: '💡', pilot: '✈️'
    };

    return (
      <div className="min-h-screen page-bg" data-testid="multiplayer-room">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={leaveRoom} className="p-2 rounded-full glass hover:bg-[var(--surface-2)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className="text-lg font-bold">{t('room_code')}: <span className="text-[var(--gold)] tracking-widest">{currentRoom.code}</span></h1>
                <p className="text-xs text-[var(--text-subtle)]">
                  {ml('share_code', lang)}
                </p>
              </div>
            </div>
            <button onClick={leaveRoom} className="text-sm text-[var(--danger)] hover:underline">{t('leave_room')}</button>
          </div>

          {/* Share code */}
          <div className="card p-4 mb-4 text-center">
            <div className="text-3xl font-bold text-[var(--gold)] tracking-[8px] mb-2">{currentRoom.code}</div>
            <button
              onClick={() => {
                const base = getPublicUrl() || window.location.origin;
                const text = `${ml('code_copied', lang).replace('!','')} Xamox Flow! ${lang === 'es' ? 'Codigo' : 'Code'}: ${currentRoom.code} - ${base}/multiplayer`;
                if (navigator.share) {
                  navigator.share({ title: 'Xamox Flow', text }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(currentRoom.code);
                  setError(ml('code_copied', lang));
                  setTimeout(() => setError(''), 2000);
                }
              }}
              className="btn-outline-gold px-4 py-2 rounded-xl text-sm"
            >
              📋 {ml('copy_code', lang)}
            </button>
          </div>

          {error && <div className="mb-4 p-3 rounded-xl bg-[rgba(247,215,122,0.1)] border border-[var(--gold-deep)] text-[var(--gold)] text-sm text-center">{error}</div>}

          {/* Profession Selection - only if not ready yet */}
          {!imReady && (
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold text-[var(--gold)] mb-3 uppercase tracking-wide">
                {ml('choose_prof', lang)}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {professions.map(prof => (
                  <button
                    key={prof.id}
                    onClick={() => { setMyProfession(prof.id); playSfx('click'); }}
                    className={`p-3 rounded-xl text-center transition-all ${
                      myProfession === prof.id
                        ? 'bg-[rgba(247,215,122,0.15)] border-2 border-[var(--gold)] shadow-[0_0_15px_rgba(247,215,122,0.2)]'
                        : 'bg-[var(--surface-2)] border-2 border-transparent hover:border-[var(--border)]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{profIcons[prof.id] || '💼'}</div>
                    <div className="text-xs font-bold">{tContent(prof.name)}</div>
                    <div className="text-[9px] text-[var(--text-subtle)]">${prof.salary?.toLocaleString()}/{ml('per_month', lang)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Players */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">{t('players')} ({currentRoom.players?.length || 0}/6)</h3>
              <div className="space-y-2">
                {currentRoom.players?.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{background: p.color}}>
                        {p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{p.name} {p.id === user.id ? '(Tu)' : ''}</div>
                        <div className="flex items-center gap-1">
                          {p.id === currentRoom.host_id && <span className="text-[10px] text-[var(--gold)]">Host</span>}
                          {p.profession && <span className="text-[10px] text-[var(--text-subtle)]">{profIcons[p.profession] || ''} {p.profession}</span>}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.ready ? 'bg-[rgba(57,217,138,0.15)] text-[var(--success)]' : 'bg-[rgba(255,90,106,0.1)] text-[var(--danger)]'}`}>
                      {p.ready ? '✓ ' + t('ready') : t('not_ready')}
                    </span>
                  </div>
                ))}

                {currentRoom.players?.length < 2 && (
                  <div className="p-3 rounded-xl border-2 border-dashed border-[var(--border)] text-center text-[var(--text-subtle)] text-sm">
                    {ml('waiting_players', lang)}
                  </div>
                )}
              </div>

              <div className="mt-4">
                {!imReady ? (
                  <button 
                    onClick={toggleReady} 
                    disabled={!myProfession}
                    className="w-full btn-gold py-3 rounded-xl font-bold disabled:opacity-40"
                  >
                    {!myProfession 
                      ? ml('choose_first', lang)
                      : `✓ ${ml('ready_btn', lang)} (${profIcons[myProfession] || ''} ${professions.find(p => p.id === myProfession)?.name?.[lang] || professions.find(p => p.id === myProfession)?.name?.es || myProfession})`
                    }
                  </button>
                ) : (
                  <div className="text-center">
                    <div className="text-sm text-[var(--success)] font-bold mb-2">✓ {ml('ready_waiting', lang)}</div>
                    <button onClick={toggleReady} className="text-xs text-[var(--text-subtle)] underline">
                      {ml('cancel', lang)}
                    </button>
                  </div>
                )}
                {allReady && (
                  <div className="mt-3 text-center text-sm font-bold text-[var(--gold)] animate-pulse">
                    {ml('all_ready', lang)}
                  </div>
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="card flex flex-col h-[350px]">
              <div className="p-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text-muted)]">{t('chat')}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="animate-fade-in">
                    <span className="text-xs font-semibold text-[var(--gold)]">{msg.username}: </span>
                    <span className="text-sm text-[var(--text-muted)]">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-[var(--border)] flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder={t('type_message')} className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm focus:border-[var(--gold)] focus:outline-none" />
                <button onClick={sendChat} className="btn-gold px-4 py-2 rounded-xl text-sm font-bold">{t('send')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: LOBBY LIST ====================
  return (
    <div className="min-h-screen page-bg" data-testid="multiplayer-lobby">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-full glass hover:bg-[var(--surface-2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{t('multiplayer')}</h1>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-[rgba(255,90,106,0.1)] border border-[var(--danger)] text-[var(--danger)] text-sm text-center">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button onClick={createRoom} className="card p-6 text-center card-hover cursor-pointer" data-testid="create-room-btn">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="text-lg font-bold mb-1">{t('create_room')}</h3>
            <p className="text-sm text-[var(--text-subtle)]">{ml('create_room', lang)}</p>
          </button>
          <div className="card p-6">
            <div className="text-4xl mb-3 text-center">🔗</div>
            <h3 className="text-lg font-bold mb-3 text-center">{t('join_room')}</h3>
            <div className="flex gap-2">
              <input data-testid="join-code-input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder={t('enter_code')} maxLength={6} className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center font-bold tracking-widest uppercase focus:border-[var(--gold)] focus:outline-none" />
              <button onClick={() => joinRoom()} className="btn-gold px-6 py-3 rounded-xl font-bold">{t('join_room')}</button>
            </div>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">{t('active_rooms')} ({rooms.length})</h3>
            <div className="space-y-2">
              {rooms.map(room => (
                <div key={room.code} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--gold)]">{room.code}</span>
                    <div className="flex -space-x-1">
                      {room.players?.map((p, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--surface-2)]" style={{background: p.color}} />
                      ))}
                    </div>
                    <span className="text-xs text-[var(--text-subtle)]">{room.player_count}/{room.max_players}</span>
                  </div>
                  <button onClick={() => joinRoom(room.code)} className="btn-outline-gold px-4 py-1.5 rounded-lg text-xs font-bold">
                    {room.player_count >= room.max_players ? t('room_full') : t('join_room')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
