import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase, { isSupabaseConfigured } from '../config/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile from public.profiles, with safe fallback to auth metadata
  const fetchProfile = async (sessionUser) => {
    if (!sessionUser) return null;

    let profileData = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (!error && data) {
        profileData = data;
      }
    } catch (err) {
      console.warn('Could not fetch from public.profiles, falling back to auth metadata:', err.message);
    }

    const metadata = sessionUser.user_metadata || {};

    return {
      id: profileData?.id || sessionUser.id,
      email: profileData?.email || sessionUser.email,
      name: profileData?.name || metadata.name || sessionUser.email?.split('@')[0] || 'Farmer',
      phone: profileData?.phone || metadata.phone || '',
      location: profileData?.location || metadata.location || '',
      preferred_language: profileData?.preferred_language || metadata.preferred_language || 'en',
      created_at: profileData?.created_at || sessionUser.created_at,
      updated_at: profileData?.updated_at || sessionUser.updated_at
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user && isMounted) {
          const accessToken = session.access_token;
          setToken(accessToken);
          localStorage.setItem('kisansaarthi_token', accessToken);

          const fullProfile = await fetchProfile(session.user);
          if (isMounted) setUser(fullProfile);
        } else if (isMounted) {
          // If no Supabase session, check if there is an existing local token for backward compatibility
          const existingToken = localStorage.getItem('kisansaarthi_token');
          if (existingToken && !isSupabaseConfigured) {
            try {
              const res = await api.get('/auth/me');
              if (res?.success && res.data?.user && isMounted) {
                setUser(res.data.user);
                setToken(existingToken);
              }
            } catch (legacyErr) {
              localStorage.removeItem('kisansaarthi_token');
            }
          } else {
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('Session initialization warning:', err.message);
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const accessToken = session.access_token;
          setToken(accessToken);
          localStorage.setItem('kisansaarthi_token', accessToken);

          const fullProfile = await fetchProfile(session.user);
          if (isMounted) setUser(fullProfile);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('kisansaarthi_token');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      throw new Error(error.message || 'Invalid email or password.');
    }

    if (data?.session) {
      const accessToken = data.session.access_token;
      setToken(accessToken);
      localStorage.setItem('kisansaarthi_token', accessToken);

      const fullProfile = await fetchProfile(data.user);
      setUser(fullProfile);
      return fullProfile;
    }

    throw new Error('Authentication failed. No active session established.');
  };

  const register = async (userData) => {
    const { email, password, name, phone, location, preferred_language } = userData;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name?.trim() || '',
          phone: phone?.trim() || '',
          location: location?.trim() || '',
          preferred_language: preferred_language || 'en'
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Registration failed.');
    }

    // Check if email confirmation is required by Supabase project
    if (data?.user && !data.session) {
      return {
        user: data.user,
        confirmationRequired: true,
        message: 'Account created! Please check your email inbox to confirm your email before signing in.'
      };
    }

    if (data?.session) {
      const accessToken = data.session.access_token;
      setToken(accessToken);
      localStorage.setItem('kisansaarthi_token', accessToken);

      const fullProfile = await fetchProfile(data.user);
      setUser(fullProfile);
      return fullProfile;
    }

    return { user: data.user };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut warning:', err.message);
    }

    // Also attempt legacy endpoint cleanup if running against Express backend
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    }

    localStorage.removeItem('kisansaarthi_token');
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (updates) => {
    if (!user?.id) throw new Error('No authenticated user');

    // Update public.profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      // Fallback: also try auth metadata update
      await supabase.auth.updateUser({
        data: updates
      });
    }

    // Update local state with latest values
    const updatedUser = {
      ...user,
      ...updates,
      ...(data || {})
    };

    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
        isAuthenticated: Boolean(user)
      }}
    >
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
