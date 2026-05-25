import React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  signIn: async () => ({ data: null, error: null }),
  signUp: async () => ({ data: null, error: null }),
  signOut: async () => ({ data: null, error: null }),
  refreshSession: async () => ({ data: null, error: null }),
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refreshSession() {
    setLoading(true);
    const { data, error: sessionError } = await authService.getSession();
    setError(sessionError);
    setSession(data?.session ?? null);
    setUser(data?.session?.user ?? null);
    setLoading(false);

    return { data, error: sessionError };
  }

  async function signIn(email, password) {
    const result = await authService.signIn(email, password);
    if (result.error) {
      setError(result.error);
      return result;
    }

    setSession(result.data?.session ?? null);
    setUser(result.data?.user ?? null);
    setError(null);
    return result;
  }

  async function signUp(email, password, metadata) {
    const result = await authService.signUp(email, password, metadata);
    if (result.error) {
      setError(result.error);
      return result;
    }

    setSession(result.data?.session ?? null);
    setUser(result.data?.user ?? null);
    setError(null);
    return result;
  }

  async function signOut() {
    const result = await authService.signOut();
    if (!result.error) {
      setSession(null);
      setUser(null);
    }

    setError(result.error);
    return result;
  }

  useEffect(() => {
    refreshSession();

    const { data } = authService.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      isAuthenticated: Boolean(user),
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [error, loading, session, user],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
