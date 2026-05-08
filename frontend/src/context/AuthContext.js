// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(localStorage.getItem('vw_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('vw_token');
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      axios.get(`${API}/auth/me`)
        .then(res => { setUser(res.data); setToken(savedToken); })
        .catch(() => { localStorage.removeItem('vw_token'); setToken(null); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('vw_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); setUser(u);
    return u;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('vw_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('vw_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
