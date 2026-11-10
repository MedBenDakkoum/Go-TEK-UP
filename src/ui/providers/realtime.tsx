'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { useAuth } from './auth';
import { useToast } from './toast';

type Handler = (payload: any) => void;
const Ctx = createContext<{ unread: number; connected: boolean; subscribe: (event: string, fn: Handler) => () => void }>({
  unread: 0, connected: false, subscribe: () => () => {},
});
export const useRealtime = () => useContext(Ctx);

/**
 * Temps réel (Server-Sent Events sur /api/realtime) : compteur de notifications, toast à chaque notification, et abonnements
 * pour que les pages se rechargent toutes seules. Si la connexion échoue, un rafraîchissement lent (60 s) prend le relais.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const handlers = useRef<Record<string, Set<Handler>>>({});

  const subscribe = useCallback((event: string, fn: Handler) => {
    (handlers.current[event] ??= new Set()).add(fn);
    return () => { handlers.current[event]?.delete(fn); };
  }, []);
  const dispatch = (event: string, payload: unknown) => handlers.current[event]?.forEach((fn) => fn(payload));

  useEffect(() => {
    if (!user) { setUnread(0); setConnected(false); return undefined; }
    const loadCount = () => api('/notifications/count').then((d) => setUnread(d.unread)).catch(() => {});
    loadCount();
    const fallback = setInterval(loadCount, 60_000);
    let source: EventSource | undefined;
    if (typeof EventSource !== 'undefined') {
      source = new EventSource('/api/realtime');
      source.onopen = () => setConnected(true);
      source.onerror = () => setConnected(false);
      source.addEventListener('unread', (e) => setUnread(JSON.parse((e as MessageEvent).data).unread));
      source.addEventListener('notification', (e) => { const n = JSON.parse((e as MessageEvent).data); toast(n.message); dispatch('notification', n); });
      source.addEventListener('message', (e) => dispatch('message', JSON.parse((e as MessageEvent).data)));
    }
    return () => { clearInterval(fallback); source?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return <Ctx.Provider value={{ unread, connected, subscribe }}>{children}</Ctx.Provider>;
}

/** Appelle `fn` à chaque événement temps réel `event` (ex. recharger une page). */
export function useRealtimeEvent(event: string, fn: Handler) {
  const { subscribe } = useRealtime();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => subscribe(event, (p) => ref.current(p)), [subscribe, event]);
}
