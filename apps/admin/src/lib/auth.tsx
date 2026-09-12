'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setAccessToken, refreshAccessToken } from './api';

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string;
  phone: string;
  roles: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ requireTotp: boolean }>;
  verifyTotp: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>('/api/v1/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = await refreshAccessToken();
    if (token) await loadMe();
    else setUser(null);
  }, [loadMe]);

  // Silent restore on mount
  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{
        accessToken?: string;
        requireTotp?: boolean;
        user?: AuthUser;
      }>(
        '/api/v1/auth/login',
        { email, password },
        { skipAuth: true },
      );
      if (res.requireTotp) return { requireTotp: true };
      if (res.accessToken) {
        setAccessToken(res.accessToken);
        if (res.user) setUser(res.user);
        else await loadMe();
      }
      return { requireTotp: false };
    },
    [loadMe],
  );

  const verifyTotp = useCallback(
    async (code: string) => {
      const res = await api.post<{ accessToken: string; user: AuthUser }>(
        '/api/v1/auth/totp/verify',
        { code },
        { skipAuth: true },
      );
      setAccessToken(res.accessToken);
      setUser(res.user);
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, verifyTotp, signOut, refresh }),
    [user, loading, signIn, verifyTotp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}