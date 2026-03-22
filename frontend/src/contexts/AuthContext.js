import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('xamox_token'));
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({
    google: { enabled: false },
    facebook: { enabled: false, status: 'coming_soon' },
  });

  useEffect(() => {
    if (!API) return;
    axios.get(`${API}/auth/providers`)
      .then((res) => {
        const p = res.data?.providers || {};
        setProviders({
          google: { enabled: !!p.google?.enabled },
          facebook: { enabled: !!p.facebook?.enabled, status: p.facebook?.status || 'coming_soon' },
        });
      })
      .catch(() => {
        // Keep defaults; auth can still work with email.
      });
  }, []);

  useEffect(() => {
    if (!API) {
      setLoading(false);
      return;
    }
    if (token) {
      axios.get(`${API}/auth/me?token=${token}`)
        .then(res => { setUser(res.data.user); setLoading(false); })
        .catch(() => { setToken(null); localStorage.removeItem('xamox_token'); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    if (!API) throw new Error('Backend no configurado');
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('xamox_token', res.data.token);
    return res.data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    if (!API) throw new Error('Backend no configurado');
    const res = await axios.post(`${API}/auth/register`, { username, email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('xamox_token', res.data.token);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('xamox_token');
  }, []);

  const updateUser = useCallback(async (settings) => {
    if (!API) throw new Error('Backend no configurado');
    const res = await axios.put(`${API}/auth/settings`, { ...settings, token });
    setUser(res.data.user);
    return res.data.user;
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, providers, login, register, logout, updateUser, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
