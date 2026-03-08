/**
 * Konteksti i autentifikimit: përdoruesi, tokeni, login, register, logout.
 * Ruajtja në localStorage dhe ridrejtimi sipas specifikës.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StoredUser } from '../services/api';
import {
  apiAuthRequest,
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
} from '../services/api';

interface AuthState {
  user: StoredUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<StoredUser>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user) {
      setState({ token, user, loading: false });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, token } = await apiAuthRequest('/api/auth/login', { email, password });
    setStoredAuth(token, data);
    setState({ user: data, token, loading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data, token } = await apiAuthRequest('/api/auth/register', { name, email, password });
    setStoredAuth(token, data);
    setState({ user: data, token, loading: false });
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setState({ user: null, token: null, loading: false });
  }, []);

  const updateUser = useCallback((partial: Partial<StoredUser>) => {
    setState((s) => {
      if (!s.user) return s;
      const nextUser = { ...s.user, ...partial };
      const token = getStoredToken();
      if (token) setStoredAuth(token, nextUser);
      return { ...s, user: nextUser };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateUser,
      isAdmin: state.user?.role === 'admin',
    }),
    [state, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth duhet përdorur brenda AuthProvider');
  return ctx;
}
