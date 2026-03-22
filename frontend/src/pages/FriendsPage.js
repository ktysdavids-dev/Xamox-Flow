import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import { getPublicUrl } from '../utils/publicUrl';
import axios from 'axios';

import { API } from '../config';

export default function FriendsPage() {
  const { t, lang } = useLanguage();
  const { user, token, isLoggedIn } = useAuth();
  const { playSfx } = useAudio();
  const navigate = useNavigate();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [useCodeInput, setUseCodeInput] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadFriends();
    loadInviteCode();
    loadChallenges();
    const interval = setInterval(loadChallenges, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]); // eslint-disable-line

  const loadChallenges = async () => {
    try {
      const r = await axios.get(`${API}/challenges/pending?token=${token}`);
      setChallenges(r.data.challenges || []);
    } catch (e) {}
  };

  const acceptChallenge = async (challenge) => {
    try {
      const r = await axios.post(`${API}/challenges/respond`, { token, challenge_id: challenge.id, accept: true });
      playSfx('success');
      if (r.data.room_code) {
        // Join the room and navigate to multiplayer
        await axios.post(`${API}/rooms/join`, { token, code: r.data.room_code });
        navigate(`/multiplayer?room=${r.data.room_code}`);
      }
    } catch (e) {
      setMsg(lang === 'es' ? 'Error al aceptar desafio' : 'Error accepting challenge');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const rejectChallenge = async (challenge) => {
    try {
      await axios.post(`${API}/challenges/respond`, { token, challenge_id: challenge.id, accept: false });
      loadChallenges();
    } catch (e) {}
  };

  const loadFriends = async () => {
    try {
      const r = await axios.get(`${API}/friends/list?token=${token}`);
      setFriends(r.data.friends);
      setRequests(r.data.requests);
    } catch (e) { console.error(e); }
  };

  const loadInviteCode = async () => {
    try {
      const r = await axios.get(`${API}/user/invite-code?token=${token}`);
      setInviteCode(r.data.invite_code);
    } catch (e) { console.error(e); }
  };

  const sendRequest = async () => {
    if (!searchQuery.trim()) return;
    try {
      await axios.post(`${API}/friends/request`, { token, username: searchQuery.trim() });
      setSearchQuery('');
      setMsg(lang === 'es' ? 'Solicitud enviada!' : 'Request sent!');
      playSfx('success');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Error');
      playSfx('error');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const applyInviteCode = async () => {
    if (!useCodeInput.trim()) return;
    try {
      const r = await axios.post(`${API}/user/use-invite`, { token, code: useCodeInput.trim() });
      setMsg(r.data.message);
      playSfx('success');
      setUseCodeInput('');
      loadFriends();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Error');
      playSfx('error');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const acceptRequest = async (userId) => {
    try {
      await axios.post(`${API}/friends/accept`, { token, user_id: userId });
      playSfx('success');
      loadFriends();
    } catch (e) { console.error(e); }
  };

  const rejectRequest = async (userId) => {
    try {
      await axios.post(`${API}/friends/reject`, { token, user_id: userId });
      loadFriends();
    } catch (e) { console.error(e); }
  };

  const removeFriend = async (userId) => {
    try {
      await axios.post(`${API}/friends/remove`, { token, user_id: userId });
      loadFriends();
    } catch (e) { console.error(e); }
  };

  const challengeFriend = async (friend) => {
    try {
      // Create a room first
      const roomRes = await axios.post(`${API}/rooms/create`, { token });
      const roomCode = roomRes.data.code;
      // Send challenge to friend with room code
      await axios.post(`${API}/challenges/send`, { token, friend_id: friend.id, room_code: roomCode });
      playSfx('success');
      setMsg(lang === 'es' ? `Desafio enviado a ${friend.username}! Sala: ${roomCode}` : `Challenge sent to ${friend.username}! Room: ${roomCode}`);
      setTimeout(() => setMsg(''), 5000);
      // Navigate to the room
      navigate(`/multiplayer?room=${roomCode}`);
    } catch (e) {
      setMsg(lang === 'es' ? 'Error al enviar desafio' : 'Error sending challenge');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard?.writeText(inviteCode).then(() => {
      setMsg(lang === 'es' ? 'Codigo copiado!' : 'Code copied!');
      playSfx('success');
      setTimeout(() => setMsg(''), 2000);
    });
  };

  const shareWhatsApp = () => {
    const base = getPublicUrl() || window.location?.origin || '';
    const text = lang === 'es'
      ? `Juega Xamox Flow conmigo! Usa mi codigo de invitacion: ${inviteCode} - ${base}`
      : `Play Xamox Flow with me! Use my invite code: ${inviteCode} - ${base}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareFacebook = () => {
    const base = getPublicUrl() || window.location?.origin || '';
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(base)}&quote=Join%20me%20on%20Xamox%20Flow!%20Code:%20${inviteCode}`, '_blank');
  };

  const Avatar = ({ u, size = 40 }) => {
    if (u?.avatar_url) {
      return <img src={u.avatar_url} alt="" className="rounded-full object-cover" style={{width: size, height: size}} />;
    }
    return (
      <div className="rounded-full flex items-center justify-center text-sm font-bold" style={{background: u?.avatar_color || '#FFD700', width: size, height: size}}>
        {u?.username?.charAt(0)?.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen page-bg" data-testid="friends-page">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="p-2 rounded-full glass hover:bg-[var(--surface-2)] transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{t('friends')}</h1>
        </div>

        {/* Invite Code Card */}
        {inviteCode && (
          <div className="card p-4 mb-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">
                {lang === 'es' ? 'Tu Codigo de Invitacion' : 'Your Invite Code'}
              </h3>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--gold-deep)] text-center font-bold text-lg text-[var(--gold)] tracking-widest">
                {inviteCode}
              </div>
              <button onClick={copyInviteCode} className="p-2.5 rounded-xl glass hover:bg-[var(--surface-2)]" title="Copy">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={shareWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{background:'#25D366'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={shareFacebook} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{background:'#4267B2'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
            </div>
          </div>
        )}

        {/* Use Invite Code */}
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-2">
            {lang === 'es' ? 'Usar Codigo de Invitacion' : 'Use Invite Code'}
          </h3>
          <div className="flex gap-2">
            <input
              value={useCodeInput}
              onChange={e => setUseCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && applyInviteCode()}
              placeholder="XF-XXXX-0000"
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center font-bold tracking-widest uppercase focus:border-[var(--gold)] focus:outline-none"
            />
            <button onClick={applyInviteCode} className="btn-gold px-6 py-2.5 rounded-xl font-bold text-sm">{t('accept')}</button>
          </div>
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-xl bg-[rgba(247,215,122,0.1)] border border-[var(--gold-deep)] text-[var(--gold)] text-sm text-center animate-fade-in">
            {msg}
          </div>
        )}

        {/* Pending Challenges */}
        {challenges.length > 0 && (
          <div className="mb-4">
            {challenges.map(ch => (
              <div key={ch.id} className="card p-4 mb-2 border-2 border-[var(--gold)] animate-fade-in" style={{boxShadow:'0 0 20px rgba(247,215,122,0.15)'}}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <div className="font-bold text-[var(--gold)]">
                      {lang === 'es' ? 'Desafio de' : 'Challenge from'} {ch.from_name}!
                    </div>
                    <div className="text-xs text-[var(--text-subtle)]">
                      {lang === 'es' ? 'Te invita a jugar una partida' : 'Invites you to play a match'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptChallenge(ch)} className="flex-1 btn-gold py-2.5 rounded-xl font-bold text-sm">
                    {lang === 'es' ? 'Aceptar Desafio' : 'Accept Challenge'}
                  </button>
                  <button onClick={() => rejectChallenge(ch)} className="flex-1 btn-outline-gold py-2.5 rounded-xl font-bold text-sm">
                    {lang === 'es' ? 'Rechazar' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl glass mb-4">
          {['friends', 'requests', 'search'].map(tabName => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === tabName ? 'bg-[var(--surface-3)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {tabName === 'friends' ? `${t('friends')} (${friends.length})` : tabName === 'requests' ? `${t('friend_requests')} ${requests.length > 0 ? `(${requests.length})` : ''}` : t('add_friend')}
            </button>
          ))}
        </div>

        {tab === 'friends' && (
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-[var(--text-subtle)]">{t('no_friends')}</p>
                <p className="text-xs text-[var(--text-subtle)] mt-2">
                  {lang === 'es' ? 'Comparte tu codigo de invitacion para agregar amigos!' : 'Share your invite code to add friends!'}
                </p>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="card p-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar u={friend} size={40} />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface-1)] ${friend.is_online ? 'bg-[var(--success)]' : 'bg-[var(--text-subtle)]'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{friend.username}</div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {friend.is_online ? t('online') : t('offline')} - {friend.games_won || 0} {t('wins')}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFriend(friend.id)} className="text-xs text-[var(--danger)] hover:underline">{t('remove')}</button>
                  </div>
                  {/* Challenge button */}
                  <button
                    onClick={() => challengeFriend(friend)}
                    className="w-full mt-3 btn-gold py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    ⚔️ {lang === 'es' ? 'Desafiar a jugar' : 'Challenge to play'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">📬</div>
                <p className="text-[var(--text-subtle)]">{lang === 'es' ? 'Sin solicitudes pendientes' : 'No pending requests'}</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="card p-4 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Avatar u={req} size={40} />
                    <span className="font-medium text-sm">{req.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(req.id)} className="btn-gold px-3 py-1.5 rounded-lg text-xs font-bold">{t('accept')}</button>
                    <button onClick={() => rejectRequest(req.id)} className="btn-outline-gold px-3 py-1.5 rounded-lg text-xs">{t('reject')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'search' && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                data-testid="friend-search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendRequest()}
                placeholder={t('search_players')}
                className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[var(--gold)] focus:outline-none"
              />
              <button onClick={sendRequest} className="btn-gold px-6 py-3 rounded-xl font-bold">{t('add_friend')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
