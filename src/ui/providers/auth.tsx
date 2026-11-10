'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicUserView } from '@/application/read-models';
import { api } from '../api';
import { useToast } from './toast';

interface AuthValue {
  user: PublicUserView | null;
  login(v: { email: string; password: string }): Promise<PublicUserView>;
  register(v: Record<string, unknown>): Promise<{ pendingVerification: boolean; email?: string; user?: PublicUserView }>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  setUser(u: PublicUserView | null): void;
}
const AuthCtx = createContext<AuthValue>(null as unknown as AuthValue);
export const useAuth = () => useContext(AuthCtx);

/** L'utilisateur initial vient du rendu serveur (cookie de session) : pas d'écran de chargement ni de page qui « clignote ». */
export function AuthProvider({ initialUser, children }: { initialUser: PublicUserView | null; children: ReactNode }) {
  const [user, setUser] = useState<PublicUserView | null>(initialUser);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => setUser(initialUser), [initialUser]);

  const refresh = useCallback(async () => {
    try { setUser((await api<{ user: PublicUserView | null }>('/auth/me')).user); } catch { setUser(null); }
  }, []);

  // Émis par api.ts quand le serveur indique que la session n'est plus valable (expirée ou compte suspendu).
  useEffect(() => {
    const onLost = (e: Event) => {
      setUser((u) => {
        if (u) toast((e as CustomEvent).detail === 'ACCOUNT_SUSPENDED' ? 'Votre compte a été suspendu.' : 'Votre session a expiré : reconnectez-vous.', 'error');
        return null;
      });
      router.push('/login');
      router.refresh();
    };
    window.addEventListener('cc:auth-lost', onLost);
    return () => window.removeEventListener('cc:auth-lost', onLost);
  }, [toast, router]);

  const login: AuthValue['login'] = async (v) => {
    const { user: u } = await api<{ user: PublicUserView }>('/auth/login', { method: 'POST', body: { email: v.email, password: v.password } });
    setUser(u);
    return u;
  };
  /** Retourne { pendingVerification, email } : sans session tant que l'adresse n'est pas vérifiée. */
  const register: AuthValue['register'] = async (v) => {
    const r = await api('/auth/register', { method: 'POST', body: v });
    if (r.user) setUser(r.user);
    return r;
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); };

  return <AuthCtx.Provider value={{ user, login, register, logout, refresh, setUser }}>{children}</AuthCtx.Provider>;
}
