import type { RateLimiter } from '../../application/ports/services';

/** Limiteur en mémoire : `max` événements par fenêtre de `windowMs` et par clé (remis à zéro au redémarrage). */
export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}

  private recent(key: string) {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.hits.set(key, arr);
    return arr;
  }
  blocked(key: string) { return this.recent(key).length >= this.max; }
  add(key: string) { this.recent(key).push(Date.now()); }
  clear(key: string) { this.hits.delete(key); }
}
