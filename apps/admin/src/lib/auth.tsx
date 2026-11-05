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
  userId: string;
  customerId: string | null;
  email: string | null;
  fullName: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  totalOrders: number;
  totalSpentPoisha: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ requireTotp: boolean; mustEnrollTotp?: boolean }>;
  verifyTotp: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
// Session storage for the temp token during the two-step login (F-13).
const TEMP_TOKEN_KEY = 'admin_temp_totp_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>('/api/v1/me');
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
        mustEnrollTotp?: boolean;
        tempToken?: string;
        user?: AuthUser;
      }>(
        '/api/v1/auth/login',
        { identifier: email, password },
        { skipAuth: true },
      );

      if (res.requireTotp) {
        if (res.tempToken && typeof window !== 'undefined') {
          window.sessionStorage.setItem(TEMP_TOKEN_KEY, res.tempToken);
        }
        return { requireTotp: true };
      }

      if (res.accessToken) {
        setAccessToken(res.accessToken);
        if (res.user) setUser(res.user);
        else await loadMe();
      }

      if (res.mustEnrollTotp) {
        return { requireTotp: false, mustEnrollTotp: true };
      }

      return { requireTotp: false };
    },
    [loadMe],
  );

  const verifyTotp = useCallback(
    async (code: string) => {
      const tempToken =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(TEMP_TOKEN_KEY)
          : null;
      if (!tempToken) throw new Error('No TOTP challenge token');

      const res = await api.post<{ accessToken: string; user: AuthUser }>(
        '/api/v1/auth/totp/verify',
        { code },
        { skipAuth: true, headers: { Authorization: `Bearer ${tempToken}` } },
      );
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(TEMP_TOKEN_KEY);
      }
      setAccessToken(res.accessToken);
      await loadMe();
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TEMP_TOKEN_KEY);
    }
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