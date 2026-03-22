import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import axios from 'axios';

import { API } from '../config';
const DJ_ALKA_URL = 'https://www.dj-alka.com/';

// Translations for music page
const MT = {
  title: { es:'Musica del Juego', en:'Game Music', pt:'Musica do Jogo', fr:'Musique du Jeu', de:'Spielmusik', it:'Musica del Gioco', zh:'游戏音乐' },
  original_by: { es:'Musica Original por', en:'Original Music by', pt:'Musica Original por', fr:'Musique Originale par', de:'Originalmusik von', it:'Musica Originale di', zh:'原创音乐' },
  collaborator: { es:'Colaborador Musical Oficial de Xamox Flow', en:'Official Music Collaborator of Xamox Flow', pt:'Colaborador Musical Oficial do Xamox Flow', fr:'Collaborateur Musical Officiel de Xamox Flow', de:'Offizieller Musik-Mitarbeiter von Xamox Flow', it:'Collaboratore Musicale Ufficiale di Xamox Flow', zh:'Xamox Flow官方音乐合作者' },
  description: { es:'Toda la musica de Xamox Flow ha sido creada y producida exclusivamente para este juego. Temas originales con vocales para cada estilo y momento del juego.', en:'All Xamox Flow music was created and produced exclusively for this game. Original tracks with vocals for every style and game moment.', pt:'Toda a musica do Xamox Flow foi criada exclusivamente para este jogo.', fr:'Toute la musique de Xamox Flow a ete creee exclusivement pour ce jeu.', de:'Die gesamte Musik von Xamox Flow wurde exklusiv fur dieses Spiel erstellt.', it:'Tutta la musica di Xamox Flow e stata creata esclusivamente per questo gioco.', zh:'所有Xamox Flow音乐均为本游戏独家制作。' },
  visit: { es:'Visitar DJ Alka', en:'Visit DJ Alka', pt:'Visitar DJ Alka', fr:'Visiter DJ Alka', de:'DJ Alka besuchen', it:'Visita DJ Alka', zh:'访问DJ Alka' },
  volume: { es:'Volumen de Musica', en:'Music Volume', pt:'Volume da Musica', fr:'Volume de la Musique', de:'Musiklautstarke', it:'Volume della Musica', zh:'音乐音量' },
  disclaimer: { es:'Puedes ajustar el volumen de la musica desde aqui o desde Configuracion (⚙️). La musica cambia automaticamente segun el momento: Menu, Juego y Victoria.', en:'You can adjust the music volume here or from Settings (⚙️). Music changes automatically: Menu, Game and Victory.', pt:'Voce pode ajustar o volume da musica aqui ou nas Configuracoes.', fr:'Vous pouvez ajuster le volume de la musique ici ou dans les Parametres.', de:'Sie konnen die Musiklautstarke hier oder in den Einstellungen anpassen.', it:'Puoi regolare il volume della musica qui o nelle Impostazioni.', zh:'您可以在此处或设置中调整音乐音量。' },
  choose: { es:'Elige tu Estilo Musical', en:'Choose your Music Style', pt:'Escolha seu Estilo Musical', fr:'Choisissez votre Style Musical', de:'Wahle deinen Musikstil', it:'Scegli il tuo Stile Musicale', zh:'选择你的音乐风格' },
  tracks_of: { es:'Pistas de', en:'Tracks for', pt:'Faixas de', fr:'Pistes de', de:'Titel von', it:'Tracce di', zh:'曲目' },
  main_theme: { es:'Tema Principal', en:'Main Theme', pt:'Tema Principal', fr:'Theme Principal', de:'Hauptthema', it:'Tema Principale', zh:'主题曲' },
  main_sub: { es:'Menu e inicio del juego', en:'Menu and game start', pt:'Menu e inicio do jogo', fr:'Menu et debut du jeu', de:'Menu und Spielstart', it:'Menu e inizio gioco', zh:'菜单和游戏开始' },
  game_theme: { es:'Tema de Juego', en:'Game Theme', pt:'Tema do Jogo', fr:'Theme de Jeu', de:'Spielthema', it:'Tema di Gioco', zh:'游戏主题' },
  game_sub: { es:'Se reproduce durante la partida', en:'Plays during gameplay', pt:'Reproduz durante o jogo', fr:'Joue pendant la partie', de:'Spielt wahrend des Spiels', it:'Riproduce durante la partita', zh:'游戏中播放' },
  victory_theme: { es:'Tema de Victoria', en:'Victory Theme', pt:'Tema de Vitoria', fr:'Theme de Victoire', de:'Siegesthema', it:'Tema della Vittoria', zh:'胜利主题' },
  victory_sub: { es:'Suena al ganar - ¡Tu recompensa musical!', en:'Plays when winning - Your musical reward!', pt:'Toca ao vencer - Sua recompensa musical!', fr:'Joue en gagnant - Votre recompense musicale!', de:'Spielt beim Gewinnen - Deine musikalische Belohnung!', it:'Suona alla vittoria - La tua ricompensa musicale!', zh:'获胜时播放 - 你的音乐奖励！' },
  coming_soon: { es:'Proximamente...', en:'Coming soon...', pt:'Em breve...', fr:'Prochainement...', de:'Bald verfugbar...', it:'Prossimamente...', zh:'即将推出...' },
  selected: { es:'Seleccionado', en:'Selected', pt:'Selecionado', fr:'Selectionne', de:'Ausgewahlt', it:'Selezionato', zh:'已选择' },
  produced: { es:'Producido por DJ Alka + IA exclusivamente para Xamox Flow', en:'Produced by DJ Alka + AI exclusively for Xamox Flow', pt:'Produzido por DJ Alka + IA exclusivamente para Xamox Flow', fr:'Produit par DJ Alka + IA exclusivement pour Xamox Flow', de:'Produziert von DJ Alka + KI exklusiv fur Xamox Flow', it:'Prodotto da DJ Alka + IA esclusivamente per Xamox Flow', zh:'DJ Alka + AI为Xamox Flow独家制作' },
  auto_save: { es:'Tu preferencia se guarda automaticamente', en:'Your preference saves automatically', pt:'Sua preferencia salva automaticamente', fr:'Votre preference est sauvegardee automatiquement', de:'Deine Einstellung wird automatisch gespeichert', it:'La tua preferenza viene salvata automaticamente', zh:'您的偏好会自动保存' },
  language_pack_ready: { es:'Pack musical disponible para este idioma', en:'Music pack available for this language', pt:'Pacote musical disponivel para este idioma', fr:'Pack musical disponible pour cette langue', de:'Musikpaket fur diese Sprache verfugbar', it:'Pacchetto musicale disponibile per questa lingua', zh:'该语言的音乐包可用' },
  language_pack_pending: { es:'Pack musical en preparacion para este idioma', en:'Music pack in preparation for this language', pt:'Pacote musical em preparacao para este idioma', fr:'Pack musical en preparation pour cette langue', de:'Musikpaket fur diese Sprache in Vorbereitung', it:'Pacchetto musicale in preparazione per questa lingua', zh:'该语言的音乐包准备中' },
  language_locked_note: { es:'El idioma elegido al inicio define la musica de futuras actualizaciones', en:'The language selected at startup defines music for future updates', pt:'O idioma escolhido no inicio define a musica das futuras atualizacoes', fr:'La langue choisie au debut definit la musique des futures mises a jour', de:'Die beim Start gewahlte Sprache bestimmt die Musik fur zukunftige Updates', it:'La lingua scelta all avvio definisce la musica dei futuri aggiornamenti', zh:'启动时选择的语言将决定未来更新的音乐' },
};

const EMPTY_TRACKS = {
  electronic: { main: null, game: null, victory: null },
  pop: { main: null, game: null, victory: null },
  rock: { main: null, game: null, victory: null },
  latin: { main: null, game: null, victory: null },
  hiphop: { main: null, game: null, victory: null },
  chill: { main: null, game: null, victory: null },
};

// Tracks organized by game language.
// Spanish is active now; other languages are scaffolded for future uploads.
const TRACK_NAMES_BY_LANGUAGE = {
  es: {
    electronic: {
      main: 'Xamox Flow Oficial 2026 By DJ Alka',
      game: 'Xamox Flow Focus By DJ Alka',
      victory: 'Xamox Flow Winner By DJ Alka',
    },
    pop: {
      main: 'Xamox Flow Pop Home By DJ Alka + IA',
      game: 'Xamox Flow Pop Game By DJ Alka + IA',
      victory: 'Xamox Flow Pop Winner By DJ Alka + IA',
    },
    rock: {
      main: 'Xamox Flow Home Rock V1 & V2 By DJ Alka + IA',
      game: 'Xamox Flow Game Rock V1 & V2 By DJ Alka + IA',
      victory: 'Xamox Flow Winner Rock V1 By DJ Alka + IA',
    },
    latin: {
      main: 'Xamox Flow Home Latin V1 & V2 By DJ Alka + IA',
      game: 'Xamox Flow Game Latin V1 & V2 By DJ Alka + IA',
      victory: 'Xamox Flow Winner Latin V1 By DJ Alka + IA',
    },
    hiphop: {
      main: 'Xamox Flow Home Hip-Hop V1 & V2 By DJ Alka + IA',
      game: 'Xamox Flow Game Hip-Hop V1 & V2 By DJ Alka + IA',
      victory: 'Xamox Flow Winner Hip-Hop V2 By DJ Alka + IA',
    },
    chill: {
      main: 'Xamox Flow Home Chill/Loft V1 & V2 By DJ Alka + IA',
      game: 'Xamox Flow Game Chill/Loft V1 & V2 By DJ Alka + IA',
      victory: 'Xamox Flow Winner Chill/Loft By DJ Alka + IA',
    },
  },
  en: EMPTY_TRACKS,
  de: EMPTY_TRACKS,
  fr: EMPTY_TRACKS,
  it: EMPTY_TRACKS,
  pt: EMPTY_TRACKS,
  zh: EMPTY_TRACKS,
};

export default function MusicPage() {
  const { lang } = useLanguage();
  const { user, token } = useAuth();
  const { playSfx, changeGenre: setAudioGenre, playMusic, musicEnabled, musicVolume, changeMusicVolume } = useAudio();
  const navigate = useNavigate();
  const [genres, setGenres] = useState({});
  const [selectedGenre, setSelectedGenre] = useState(user?.music_genre || 'electronic');
  const [saving, setSaving] = useState(false);
  const currentLangTracks = TRACK_NAMES_BY_LANGUAGE[lang] || EMPTY_TRACKS;
  const isLanguagePackReady = Object.values(currentLangTracks).some((genrePack) =>
    Object.values(genrePack || {}).some(Boolean)
  );

  useEffect(() => {
    axios.get(`${API}/music/genres`).then(r => setGenres(r.data.genres));
  }, []);

  const selectGenre = async (genre) => {
    setSelectedGenre(genre);
    playSfx('click');
    setAudioGenre(genre);
    if (musicEnabled) { try { playMusic('main', genre); } catch(e) {} }
    if (token) {
      setSaving(true);
      try { await axios.put(`${API}/music/preference`, { token, genre }); } catch (e) {}
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen page-bg" data-testid="music-page">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full glass hover:bg-[var(--surface-2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl font-bold">🎵 {MT.title[lang] || MT.title.en}</h1>
        </div>

        {/* DJ Alka Section - Premium with real logo */}
        <div className="card mb-6 overflow-hidden relative" style={{background:'linear-gradient(135deg, rgba(15,42,43,0.95) 0%, rgba(7,21,27,0.98) 100%)'}}>
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[rgba(247,215,122,0.06)] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[rgba(98,198,255,0.04)] blur-3xl" />
          
          <div className="relative z-10 p-5">
            <div className="flex items-center gap-4 mb-4">
              {/* DJ Alka Logo */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.1)]" style={{background:'#000'}}>
                <img src="/dj-alka-logo.png" alt="DJ Alka" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-[10px] text-[var(--gold)] font-semibold uppercase tracking-[3px]">
                  {MT.original_by[lang] || MT.original_by.en}
                </div>
                <h2 className="text-2xl font-bold tracking-tight" style={{fontFamily:'Space Grotesk'}}>DJ Alka</h2>
                <div className="text-xs text-[var(--text-subtle)]">
                  {MT.collaborator[lang] || MT.collaborator.en}
                </div>
              </div>
            </div>
            
            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed">
              {MT.description[lang] || MT.description.en}
            </p>
            
            <a href={DJ_ALKA_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 btn-gold px-5 py-2.5 rounded-xl text-sm font-bold">
              🌐 {MT.visit[lang] || MT.visit.en}
            </a>
          </div>
        </div>

        <div className="card p-3 mb-4 border-[var(--gold-deep)]" style={{background:'rgba(247,215,122,0.05)'}}>
          <p className="text-xs text-center font-semibold" style={{color: isLanguagePackReady ? 'var(--success)' : 'var(--warning)'}}>
            {isLanguagePackReady ? `✓ ${MT.language_pack_ready[lang] || MT.language_pack_ready.en}` : `⏳ ${MT.language_pack_pending[lang] || MT.language_pack_pending.en}`}
          </p>
          <p className="text-[10px] text-center text-[var(--text-subtle)] mt-1">
            {MT.language_locked_note[lang] || MT.language_locked_note.en}
          </p>
        </div>

        {/* Volume Control */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-muted)]">
              🔊 {MT.volume[lang] || MT.volume.en}
            </h3>
            <span className="text-sm font-bold text-[var(--gold)] tabular-nums">{Math.round(musicVolume * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="100"
            value={Math.round(musicVolume * 100)}
            onChange={e => changeMusicVolume(parseInt(e.target.value) / 100)}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--gold) ${musicVolume * 100}%, var(--surface-3) ${musicVolume * 100}%)`,
              accentColor: 'var(--gold)',
            }}
          />
          <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mt-1">
            <span>🔈 Min</span>
            <span>🔊 Max</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="card p-3 mb-5 border-[var(--gold-deep)]" style={{background:'rgba(247,215,122,0.05)'}}>
          <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
            💡 {MT.disclaimer[lang] || MT.disclaimer.en}
          </p>
        </div>

        {/* Genre Selection */}
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          {MT.choose[lang] || MT.choose.en}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Object.entries(genres).map(([key, genre]) => {
            const isSelected = selectedGenre === key;
            const name = genre.name?.[lang] || genre.name?.en || key;
            return (
              <button
                key={key}
                onClick={() => selectGenre(key)}
                className={`card p-4 text-center transition-all duration-200 ${
                  isSelected ? 'border-2 scale-[1.02]' : 'hover:border-[var(--border-strong)]'
                }`}
                style={isSelected ? {borderColor: genre.color, boxShadow: `0 0 20px ${genre.color}30`} : {}}
              >
                <div className="text-3xl mb-2">{genre.icon}</div>
                <div className="font-bold text-sm">{name}</div>
                {isSelected && (
                  <div className="text-[10px] mt-1 font-semibold" style={{color: genre.color}}>
                    ✓ {MT.selected[lang] || MT.selected.en}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Track Info - Shows REAL track names per selected genre */}
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">
            🎶 {MT.tracks_of[lang] || MT.tracks_of.en} {genres[selectedGenre]?.name?.[lang] || genres[selectedGenre]?.name?.en || selectedGenre}
          </h3>
          <div className="space-y-2 text-sm">
            {[
              { scene: 'main', icon: '🏠', label: MT.main_theme[lang] || MT.main_theme.en, sub: MT.main_sub[lang] || MT.main_sub.en },
              { scene: 'game', icon: '🎲', label: MT.game_theme[lang] || MT.game_theme.en, sub: MT.game_sub[lang] || MT.game_sub.en },
              { scene: 'victory', icon: '🏆', label: MT.victory_theme[lang] || MT.victory_theme.en, sub: MT.victory_sub[lang] || MT.victory_sub.en },
            ].map(track => {
              const trackName = currentLangTracks[selectedGenre]?.[track.scene];
              const hasTrack = !!trackName;
              return (
                <div key={track.scene} className={`flex items-center gap-3 p-3 rounded-xl ${hasTrack ? 'bg-[var(--surface-2)] border border-[var(--border)]' : 'bg-[var(--surface-1)] opacity-50'}`}>
                  <span className="text-xl">{track.icon}</span>
                  <div className="flex-1 min-w-0">
                    {hasTrack ? (
                      <>
                        <div className="font-bold text-[var(--gold)] truncate">{trackName}</div>
                        <div className="text-[10px] text-[var(--text-subtle)]">{track.sub}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-[var(--text-muted)]">{track.label}</div>
                        <div className="text-[10px] text-[var(--text-subtle)]">{MT.coming_soon[lang] || MT.coming_soon.en}</div>
                      </>
                    )}
                  </div>
                  {hasTrack && <span className="text-[var(--success)] text-xs">✓</span>}
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-center text-[var(--text-subtle)] mt-3">
            {MT.produced[lang] || MT.produced.en}
          </div>
        </div>

        <div className="text-center text-xs text-[var(--text-subtle)] mb-4">
          {saving ? '...' : (MT.auto_save[lang] || MT.auto_save.en)}
        </div>
      </div>
    </div>
  );
}
