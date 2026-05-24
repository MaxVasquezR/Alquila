import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setToken, getToken } from './api';
import { getSocket, disconnectSocket } from './socket';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    displayName: string;
    phone: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserLocal: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('alquila_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
      localStorage.removeItem('alquila_user');
    }
  }, []);

  const persist = useCallback((u: User, token: string) => {
    setToken(token);
    setUser(u);
    localStorage.setItem('alquila_user', JSON.stringify(u));
    getSocket();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return;
    const summary = await api<{ id: string; email: string; displayName: string; kycVerified: boolean; kycStatus: string; phoneVerified: boolean; avatarUrl?: string; membershipTier: string; membershipExpiresAt?: string; stats: { dealsClosed: number } }>('/account/summary');
    setUser((prev) => {
      if (!prev) return prev;
      const updated: User = {
        ...prev,
        displayName: summary.displayName,
        kycVerified: summary.kycVerified,
        kycStatus: summary.kycStatus as User['kycStatus'],
        phoneVerified: summary.phoneVerified,
        avatarUrl: summary.avatarUrl,
        membershipTier: summary.membershipTier,
        membershipExpiresAt: summary.membershipExpiresAt,
        dealsClosedCount: summary.stats.dealsClosed,
        canPublish: summary.kycVerified && summary.phoneVerified,
      };
      localStorage.setItem('alquila_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setUserLocal = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('alquila_user', JSON.stringify(u));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const res = await api<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          auth: false,
        });
        persist(res.user, res.token);
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      displayName: string;
      phone: string;
    }) => {
      setLoading(true);
      try {
        const res = await api<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ ...data, acceptTerms: true }),
          auth: false,
        });
        persist(res.user, res.token);
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const logout = useCallback(() => {
    disconnectSocket();
    setToken(null);
    setUser(null);
    localStorage.removeItem('alquila_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, refreshUser, setUserLocal, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
