import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('kisansaarthi_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data?.user) {
            setUser(res.data.user);
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          localStorage.removeItem('kisansaarthi_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { user, token } = res.data;
      setUser(user);
      setToken(token);
      localStorage.setItem('kisansaarthi_token', token);
      return user;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.success && res.data) {
      const { user, token } = res.data;
      setUser(user);
      setToken(token);
      localStorage.setItem('kisansaarthi_token', token);
      return user;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('kisansaarthi_token');
      setUser(null);
      setToken(null);
    }
  };

  const updateProfile = async (updates) => {
    const res = await api.patch('/profile', updates);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
