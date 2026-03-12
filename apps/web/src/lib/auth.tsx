import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from './api';
import { isTelegramWebApp, getTelegramUser } from './telegram';

export interface AuthUser {
  id: string;
  email: string;
  role: 'LAWYER' | 'CLIENT';
  name: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  isTelegram: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'LAWYER' | 'CLIENT') => Promise<void>;
  portalLogin: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
    isTelegram: isTelegramWebApp(),
  });

  const setAuth = useCallback((user: AuthUser | null, accessToken: string | null) => {
    api.setToken(accessToken);
    setState((s) => ({ ...s, user, accessToken, loading: false }));
  }, []);

  // Load user on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // For Telegram: initData header is auto-attached by ApiClient
        // For JWT: tries the refresh cookie via /auth/me
        // /auth/me returns user directly: { success, data: { id, email, role, ... } }
        // login/register return: { success, data: { user, accessToken } }
        const res = await api.get<AuthUser & { user?: AuthUser; accessToken?: string }>('/auth/me');
        if (!cancelled && res.data) {
          // Handle both formats: wrapped { user, accessToken } and flat user object
          const user = res.data.user ?? (res.data as unknown as AuthUser);
          const token = res.data.accessToken ?? null;
          if (user?.id) {
            setAuth(user, token);
          } else {
            setAuth(null, null);
          }
        }
      } catch {
        if (!cancelled) {
          // If in Telegram but auth failed, user might not be registered yet
          if (isTelegramWebApp()) {
            const tgUser = getTelegramUser();
            if (tgUser) {
              console.warn('[Auth] Telegram user not found in DB, showing registration prompt');
            }
          }
          setAuth(null, null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [setAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ user: AuthUser; accessToken: string }>('/auth/login', { email, password });
    if (res.data) setAuth(res.data.user, res.data.accessToken);
  };

  const register = async (name: string, email: string, password: string, role: 'LAWYER' | 'CLIENT') => {
    const res = await api.post<{ user: AuthUser; accessToken: string }>('/auth/register', { name, email, password, role });
    if (res.data) setAuth(res.data.user, res.data.accessToken);
  };

  const portalLogin = async (code: string) => {
    const res = await api.post<{ user: AuthUser; accessToken: string }>('/auth/portal-login', { code });
    if (res.data) setAuth(res.data.user, res.data.accessToken);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch { /* ignore */ }
    setAuth(null, null);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, portalLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
