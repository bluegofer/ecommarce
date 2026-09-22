'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api/client';
import { readAuthHint, writeAuthHint, clearAuthHint } from './storage';

// ── DTOs (mirror Step 2 API) ──

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  roles: string[];
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface OtpRequestResponse {
  ok: boolean;
  /** In dev mode the API returns the code so the client can auto-fill. */
  devCode?: string;
  /** Seconds until next OTP can be requested. */
  resendAfterSeconds?: number;
}

export interface RegisterResponse {
  ok: boolean;
  devCode?: string;
}

interface AuthContextValue {
  /** Currently signed-in user; null when anonymous. */
  user: AuthUser | null;
  /** True while the initial refresh attempt is pending (avoid render flash). */
  loading: boolean;
  /** True when a user is present. */
  signedIn: boolean;
  /** Sign in with phone + password. */
  login: (input: LoginRequest) => Promise<void>;
  /** Request an OTP for phone verification (used by register flow). */
  requestOtp: (phone: string) => Promise<OtpRequestResponse>;
  /** Register a new account with OTP. */
  register: (input: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    otp: string;
  }) => Promise<void>;
  /** Sign out and clear local state + hint. */
  logout: () => Promise<void>;
  /** The access token (in-memory); null when anonymous. Pass to api() calls. */
  accessToken: string | null;
  /**
   * Complete a Google OAuth sign-in using the access token issued by
   * the API's /auth/google/callback redirect. Fetches the user profile
   * via /auth/me and hydrates the provider. (TDD Appendix C §C.5)
   */
  completeOAuthLogin: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshedRef = useRef(false);

  // Silent session restore on mount (only if a hint exists).
  useEffect(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;

    const hint = readAuthHint();
    if (!hint) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ accessToken: string; user: AuthUser }>(
          '/auth/refresh',
          {},
        );
        if (cancelled) return;
        setAccessToken(res.accessToken);
        setUser(res.user);
      } catch (err) {
        if (cancelled) return;
        // Cookie expired or invalid — treat as anonymous.
        if (err instanceof ApiError && err.status !== 401) {
          // Unexpected — log, but don't fail the app.
          // eslint-disable-next-line no-console
          console.warn('[auth] refresh failed:', err.status, err.message);
        }
        clearAuthHint();
        setAccessToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    const res = await api.post<LoginResponse>('/auth/login', input);
    setAccessToken(res.accessToken);
    setUser(res.user);
    writeAuthHint();
  }, []);

  const requestOtp = useCallback(async (phone: string): Promise<OtpRequestResponse> => {
    return api.post<OtpRequestResponse>('/auth/otp/request', { phone });
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    // Step 1: register (creates user, sends OTP)
    await api.post<RegisterResponse>('/auth/register', {
      phone: input.phone,
      email: input.email || undefined,
      fullName: input.fullName,
      password: input.password,
    });
    // Step 2: verify OTP (returns tokens per Step 2 API)
    const res = await api.post<LoginResponse>('/auth/otp/verify', {
      phone: input.phone,
      code: input.otp,
    });
    setAccessToken(res.accessToken);
    setUser(res.user);
    writeAuthHint();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Best-effort — local state cleared regardless
    }
    setAccessToken(null);
    setUser(null);
    clearAuthHint();
  }, []);

  /**
   * Google OAuth — completes sign-in using an access token delivered by the
   * API's /auth/google/callback redirect. Fetches the profile via /auth/me
   * with the token as a Bearer, then hydrates local state exactly like a
   * password login. (TDD Appendix C §C.3 / §C.5)
   */
  const completeOAuthLogin = useCallback(async (token: string) => {
    const profile = await api.get<AuthUser>('/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
    });
    setAccessToken(token);
    setUser(profile);
    writeAuthHint();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signedIn: user !== null,
      login,
      requestOtp,
      register,
      logout,
      accessToken,
      completeOAuthLogin,
    }),
    [user, loading, login, requestOtp, register, logout, accessToken, completeOAuthLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}