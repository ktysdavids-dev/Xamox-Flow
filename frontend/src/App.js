import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AudioProvider } from "./contexts/AudioContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import GamePage from "./pages/GamePage";
import ProfessionSelectPage from "./pages/ProfessionSelectPage";
import MultiplayerLobby from "./pages/MultiplayerLobby";
import FriendsPage from "./pages/FriendsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AchievementsPage from "./pages/AchievementsPage";
import ProfilePage from "./pages/ProfilePage";
import MusicPage from "./pages/MusicPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import CreditsPage from "./pages/CreditsPage";
import { LANG_FLAGS } from "./i18n/translations";

// Error Boundary to catch React errors gracefully
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.warn('App error caught:', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#07151B', color: '#EAF2F3', fontFamily: 'sans-serif', padding: 20, textAlign: 'center'
        }}>
          <div>
            <img src="/logo-xamox.png" alt="Xamox Flow" style={{width: 100, height: 100, margin: '0 auto 16px'}} />
            <h2 style={{color: '#F7D77A', marginBottom: 8}}>Xamox Flow</h2>
            <p style={{opacity: 0.7, marginBottom: 16}}>Algo salio mal. Recarga la pagina.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              style={{
                background: 'linear-gradient(135deg, #F7D77A, #B8821D)', color: '#07151B',
                border: 'none', padding: '12px 32px', borderRadius: 12, fontWeight: 700,
                fontSize: 16, cursor: 'pointer'
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Handle return from Google OAuth: URL has ?token=... (our backend redirected here)
function GoogleTokenHandler() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  useEffect(() => {
    if (token) {
      localStorage.setItem('xamox_token', token);
      window.location.href = '/';
    }
  }, [token]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07151B' }}>
      <div style={{ textAlign: 'center', color: '#F7D77A' }}>
        <img src="/logo-xamox.png" alt="" style={{ width: 80, height: 80, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Iniciando sesión...</div>
      </div>
    </div>
  );
}

// Router that detects Google auth callback
function AppRouter() {
  const location = useLocation();
  const hasToken = new URLSearchParams(location.search).get('token');
  if (hasToken) return <GoogleTokenHandler />;
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/select-profession" element={<ProfessionSelectPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/multiplayer" element={<MultiplayerLobby />} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/music" element={<MusicPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/credits" element={<CreditsPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function LanguageGate({ children }) {
  const { needsLanguageSelection, setInitialLanguage } = useLanguage();

  if (!needsLanguageSelection) return children;

  return (
    <div
      className="min-h-screen page-bg flex items-center justify-center p-4"
      data-testid="language-gate"
    >
      <div className="card panel-premium p-6 w-full max-w-xl">
        <div className="text-center mb-5">
          <img
            src="/logo-xamox.png"
            alt="Xamox Flow"
            style={{ width: 88, height: 88, margin: "0 auto 10px", objectFit: "contain" }}
          />
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)" }}>Xamox Flow</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
            Elige el idioma inicial del juego
          </p>
          <p style={{ color: "var(--text-subtle)", marginTop: 4, fontSize: 12 }}>
            Choose your game language (locked after selection)
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(LANG_FLAGS).map(([code, { flag, name }]) => (
            <button
              key={code}
              onClick={() => setInitialLanguage(code)}
              className="btn-outline-gold rounded-xl py-3 px-2 text-sm font-bold flex flex-col items-center gap-1"
              data-testid={`initial-lang-${code}`}
            >
              <span style={{ fontSize: 22 }}>{flag}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AudioProvider>
            <LanguageGate>
              <div className="App page-bg">
                <BrowserRouter>
                  <AppRouter />
                </BrowserRouter>
              </div>
            </LanguageGate>
          </AudioProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
