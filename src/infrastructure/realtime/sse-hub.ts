import type { RealtimeEvent, RealtimeHub, RealtimeListener } from '../../application/ports/services';

/**
 * Temps réel par Server-Sent Events : chaque utilisateur ouvre un flux authentifié (cookie de session) et ne reçoit que ses
 * propres événements (« notification », « unread », « message »). Les abonnés sont gardés en mémoire du processus.
 */
export class SseHub implements RealtimeHub {
  private listeners = new Map<number, Set<RealtimeListener>>();

  subscribe(userId: number, listener: RealtimeListener) {
    let set = this.listeners.get(userId);
    if (!set) this.listeners.set(userId, (set = new Set()));
    const current = set;
    current.add(listener);
    return () => {
      current.delete(listener);
      if (!current.size) this.listeners.delete(userId);
    };
  }

  emit(userId: number, event: RealtimeEvent, payload: unknown) {
    for (const l of this.listeners.get(userId) ?? []) {
      try { l.send(event, payload); } catch { /* connexion déjà fermée */ }
    }
  }

  disconnectUser(userId: number) {
    for (const l of [...(this.listeners.get(userId) ?? [])]) {
      try { l.close(); } catch { /* déjà fermée */ }
    }
    this.listeners.delete(userId);
  }
}
