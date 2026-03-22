import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

const SoundContext = createContext();

const GENRES = ['electronic', 'pop', 'rock', 'latin', 'hiphop', 'chill'];
const SCENES = ['main', 'game', 'victory'];

function createEmptyLibrary() {
  const out = {};
  GENRES.forEach((genre) => {
    out[genre] = {};
    SCENES.forEach((scene) => {
      out[genre][scene] = [];
    });
  });
  return out;
}

// Language-based music packs.
// For now only Spanish has real tracks; others are scaffolded and ready for future uploads.
const MUSIC_BY_LANGUAGE = {
  es: {
    electronic: {
      main: ['/music/electronic_main.mp3'],
      game: ['/music/electronic_game.mp3'],
      victory: ['/music/electronic_victory.mp3'],
    },
    pop: {
      main: ['/music/pop_main.mp3'],
      game: ['/music/pop_game.mp3'],
      victory: ['/music/pop_victory.mp3'],
    },
    rock: {
      main: ['/music/rock_main1.mp3', '/music/rock_main2.mp3'],
      game: ['/music/rock_game1.mp3', '/music/rock_game2.mp3'],
      victory: ['/music/rock_victory.mp3'],
    },
    latin: {
      main: ['/music/latin_main1.mp3', '/music/latin_main2.mp3'],
      game: ['/music/latin_game1.mp3', '/music/latin_game2.mp3'],
      victory: ['/music/latin_victory.mp3'],
    },
    hiphop: {
      main: ['/music/hiphop_main1.mp3', '/music/hiphop_main2.mp3'],
      game: ['/music/hiphop_game1.mp3', '/music/hiphop_game2.mp3'],
      victory: ['/music/hiphop_victory.mp3'],
    },
    chill: {
      main: ['/music/chill_main1.mp3', '/music/chill_main2.mp3'],
      game: ['/music/chill_game1.mp3', '/music/chill_game2.mp3'],
      victory: ['/music/chill_victory.mp3'],
    },
  },
  en: createEmptyLibrary(),
  de: createEmptyLibrary(),
  fr: createEmptyLibrary(),
  it: createEmptyLibrary(),
  pt: createEmptyLibrary(),
  zh: createEmptyLibrary(),
};

export function AudioProvider({ children }) {
  const { lang } = useLanguage();
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('xamox_music') !== 'false');
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('xamox_sfx') !== 'false');
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentGenre, setCurrentGenre] = useState(() => localStorage.getItem('xamox_music_genre') || 'electronic');
  const [currentScene, setCurrentScene] = useState('main');
  const [musicVolume, setMusicVolume] = useState(() => parseFloat(localStorage.getItem('xamox_music_vol') || '0.3'));
  const [sfxVolume, setSfxVolume] = useState(() => parseFloat(localStorage.getItem('xamox_sfx_vol') || '0.5'));

  const musicAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const trackIndexRef = useRef(0);

  const getCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch (e) { return null; }
  }, []);

  const getTrackListForLanguage = useCallback((language, genre, scene) => {
    const pack = MUSIC_BY_LANGUAGE[language] || MUSIC_BY_LANGUAGE.es || {};
    const byGenre = pack[genre] || {};
    const list = byGenre[scene] || [];
    return Array.isArray(list) ? list : [];
  }, []);

  const playMusic = useCallback((scene, genre) => {
    if (!musicEnabled) return;
    const g = genre || currentGenre;
    const selectedScene = scene || 'main';
    const trackList = getTrackListForLanguage(lang, g, selectedScene);
    if (!trackList || trackList.length === 0) return;

    try {
      if (!musicAudioRef.current) {
        musicAudioRef.current = new Audio();
        musicAudioRef.current.preload = 'auto';
        musicAudioRef.current.playsInline = true;
      }
      musicAudioRef.current.volume = musicVolume;

      const loadAndPlayTrack = (index) => {
        trackIndexRef.current = index;
        const src = trackList[trackIndexRef.current];
        if (!src) return;
        musicAudioRef.current.src = src;
        musicAudioRef.current.play().catch(() => {});
      };

      // Pick first track in sequence.
      trackIndexRef.current = 0;
      const src = trackList[trackIndexRef.current];

      // Don't restart if already playing same track
      if (musicAudioRef.current.src?.endsWith(src) && !musicAudioRef.current.paused) return;

      // Set up sequential playback - when track ends, play next
      musicAudioRef.current.onended = () => {
        if (trackList.length > 1) {
          const nextIndex = (trackIndexRef.current + 1) % trackList.length;
          loadAndPlayTrack(nextIndex);
        } else if (selectedScene !== 'victory') {
          musicAudioRef.current.currentTime = 0;
          musicAudioRef.current.play().catch(() => {});
        }
      };
      musicAudioRef.current.onerror = () => {
        // If one file fails, try next track; if all fail, stop gracefully.
        if (trackList.length > 1) {
          const nextIndex = (trackIndexRef.current + 1) % trackList.length;
          if (nextIndex !== trackIndexRef.current) {
            loadAndPlayTrack(nextIndex);
            return;
          }
        }
        setMusicPlaying(false);
      };

      musicAudioRef.current.loop = false;
      musicAudioRef.current.src = src;
      const playPromise = musicAudioRef.current.play();
      if (playPromise) {
        playPromise
          .then(() => setMusicPlaying(true))
          .catch(() => {
            // Autoplay blocked - retry on next user interaction
            setMusicPlaying(false);
            const retryPlay = () => {
              if (musicAudioRef.current && musicAudioRef.current.paused) {
                musicAudioRef.current.play()
                  .then(() => { setMusicPlaying(true); document.removeEventListener('click', retryPlay); })
                  .catch(() => {});
              }
            };
            document.addEventListener('click', retryPlay, { once: true });
          });
      }
      setCurrentScene(selectedScene);
    } catch (e) {
      setMusicPlaying(false);
    }
  }, [currentGenre, getTrackListForLanguage, lang, musicEnabled, musicVolume]);

  const stopMusic = useCallback(() => {
    try {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = 0;
      }
    } catch (e) {}
    setMusicPlaying(false);
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(prev => {
      const next = !prev;
      localStorage.setItem('xamox_music', String(next));
      if (next) { playMusic(currentScene); } else { stopMusic(); }
      return next;
    });
  }, [playMusic, stopMusic, currentScene]);

  const changeGenre = useCallback((genre) => {
    setCurrentGenre(genre);
    localStorage.setItem('xamox_music_genre', genre);
    if (musicEnabled && musicPlaying) {
      // Restart music with new genre
      setTimeout(() => playMusic(currentScene, genre), 100);
    }
  }, [musicEnabled, musicPlaying, currentScene, playMusic]);

  const changeMusicVolume = useCallback((vol) => {
    const v = Math.max(0, Math.min(1, vol));
    setMusicVolume(v);
    localStorage.setItem('xamox_music_vol', String(v));
    if (musicAudioRef.current) musicAudioRef.current.volume = v;
  }, []);

  useEffect(() => {
    // Warm audio on first gesture to reduce autoplay friction on mobile.
    const warmup = () => {
      const ctx = getCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    document.addEventListener('touchstart', warmup, { once: true });
    document.addEventListener('click', warmup, { once: true });
    return () => {
      document.removeEventListener('touchstart', warmup);
      document.removeEventListener('click', warmup);
    };
  }, [getCtx]);

  const changeSfxVolume = useCallback((vol) => {
    const v = Math.max(0, Math.min(1, vol));
    setSfxVolume(v);
    localStorage.setItem('xamox_sfx_vol', String(v));
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxEnabled(prev => {
      const next = !prev;
      localStorage.setItem('xamox_sfx', String(next));
      return next;
    });
  }, []);

  // ===================== SOUND EFFECTS =====================
  const playSfx = useCallback((type) => {
    if (!sfxEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const tone = (freq, dur, oscType, vol, t0) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = oscType || 'sine';
        const actualVol = (vol || 0.08) * sfxVolume;
        g.gain.setValueAtTime(actualVol, t0 || now);
        g.gain.exponentialRampToValueAtTime(0.001, (t0 || now) + dur);
        osc.start(t0 || now); osc.stop((t0 || now) + dur);
      };
      switch (type) {
        case 'dice': {
          // Professional dice rolling sound - layered design
          const noiseHit = (dur, vol, freq, q, t0) => {
            const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = freq * 3;
            const g = ctx.createGain();
            const v = (vol || 0.06) * sfxVolume;
            g.gain.setValueAtTime(v, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
            src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(ctx.destination);
            src.start(t0); src.stop(t0 + dur);
          };
          // Initial shake/rattle (dice in hand)
          for (let i = 0; i < 6; i++) {
            noiseHit(0.012, 0.03 + Math.random() * 0.02, 2000 + Math.random() * 1500, 3, now + i * 0.025);
          }
          // Throw release whoosh
          noiseHit(0.08, 0.06, 300, 0.5, now + 0.15);
          // Table impact bounces (the main satisfying part)
          noiseHit(0.05, 0.18, 500, 0.8, now + 0.25);
          tone(140, 0.08, 'sine', 0.07, now + 0.25);
          noiseHit(0.04, 0.13, 600, 1.0, now + 0.34);
          tone(120, 0.06, 'sine', 0.05, now + 0.34);
          noiseHit(0.03, 0.09, 700, 1.2, now + 0.41);
          noiseHit(0.025, 0.06, 800, 1.5, now + 0.47);
          noiseHit(0.02, 0.04, 900, 2, now + 0.52);
          // Final settle thud
          noiseHit(0.07, 0.12, 350, 0.6, now + 0.56);
          tone(90, 0.10, 'sine', 0.04, now + 0.56);
          // Bright finish ping
          tone(800, 0.08, 'triangle', 0.03, now + 0.62);
          break;
        }
        case 'coin': tone(1200,0.25,'sine',0.1,now); tone(1600,0.2,'sine',0.07,now+0.08); break;
        case 'hop': {
          const stepPitch = 180 + Math.random() * 60;
          tone(stepPitch, 0.08, 'triangle', 0.04, now);
          tone(stepPitch * 0.7, 0.05, 'sine', 0.03, now + 0.01);
          const bLen = Math.max(1, Math.floor(ctx.sampleRate * 0.03));
          const bBuf = ctx.createBuffer(1, bLen, ctx.sampleRate);
          const bD = bBuf.getChannelData(0);
          for (let ii = 0; ii < bLen; ii++) bD[ii] = (Math.random() * 2 - 1);
          const bSrc = ctx.createBufferSource(); bSrc.buffer = bBuf;
          const bFilt = ctx.createBiquadFilter(); bFilt.type = 'lowpass'; bFilt.frequency.value = 400;
          const bG = ctx.createGain(); bG.gain.setValueAtTime(0.04 * sfxVolume, now); bG.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          bSrc.connect(bFilt); bFilt.connect(bG); bG.connect(ctx.destination); bSrc.start(now); bSrc.stop(now + 0.03);
          break;
        }
        case 'land': {
          // Strong tile landing punch: low thud + bright hit.
          const noiseHit = (dur, vol, freq, q, t0) => {
            const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
            const g = ctx.createGain();
            const v = (vol || 0.08) * sfxVolume;
            g.gain.setValueAtTime(v, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
            src.connect(bp); bp.connect(g); g.connect(ctx.destination);
            src.start(t0); src.stop(t0 + dur);
          };
          tone(82, 0.22, 'sine', 0.1, now);
          tone(120, 0.14, 'triangle', 0.08, now + 0.03);
          noiseHit(0.08, 0.1, 380, 0.8, now + 0.01);
          tone(980, 0.08, 'triangle', 0.04, now + 0.08);
          break;
        }
        case 'tile_event': tone(700,0.1,'triangle',0.07,now); tone(520,0.12,'sawtooth',0.06,now+0.06); break;
        case 'tile_trivia': tone(980,0.08,'sine',0.05,now); tone(1260,0.12,'triangle',0.05,now+0.06); break;
        case 'tile_invest': tone(430,0.1,'triangle',0.06,now); tone(645,0.12,'sine',0.07,now+0.08); break;
        case 'tile_tax': tone(190,0.18,'sawtooth',0.08,now); break;
        case 'tile_market': tone(520,0.07,'triangle',0.05,now); tone(740,0.1,'sine',0.05,now+0.05); break;
        case 'tile_opportunity': tone(860,0.09,'triangle',0.06,now); tone(1120,0.11,'sine',0.05,now+0.06); break;
        case 'tile_payday': tone(740,0.06,'triangle',0.05,now); tone(980,0.12,'sine',0.07,now+0.05); tone(1320,0.15,'sine',0.05,now+0.14); break;
        case 'success': tone(523,0.25,'sine',0.08,now); tone(659,0.25,'sine',0.08,now+0.12); tone(784,0.3,'sine',0.08,now+0.24); break;
        case 'error': tone(300,0.3,'sawtooth',0.06,now); break;
        case 'click': tone(800,0.04,'sine',0.04,now); break;
        case 'win': tone(523,0.3,'sine',0.1,now); tone(659,0.3,'sine',0.1,now+0.18); tone(784,0.3,'sine',0.1,now+0.36); tone(1047,0.5,'sine',0.12,now+0.54); break;
        default: tone(440,0.1,'sine',0.05,now);
      }
    } catch (e) {}
  }, [sfxEnabled, getCtx, sfxVolume]);

  const playTestSound = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = 660; osc.type = 'sine';
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }, [getCtx]);

  const hasMusicTracks = Object.values((MUSIC_BY_LANGUAGE[lang] || {})[currentGenre] || {}).some(
    (v) => Array.isArray(v) && v.length > 0
  );

  return (
    <SoundContext.Provider value={{
      musicEnabled, sfxEnabled, musicPlaying, hasMusicTracks,
      currentGenre, currentScene, musicVolume, sfxVolume,
      toggleMusic, toggleSfx, playSfx, playTestSound,
      playMusic, stopMusic, changeGenre,
      changeMusicVolume, changeSfxVolume,
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useAudio = () => useContext(SoundContext);
