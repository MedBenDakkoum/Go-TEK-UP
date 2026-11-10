/**
 * La Tunisie est à UTC+1 toute l'année : les dates de séances sont stockées en heure locale « AAAA-MM-JJ HH:MM ».
 * Toutes les fonctions prennent l'instant courant en paramètre (testables, sans horloge globale).
 */
const HOUR = 3600e3;
export const nowLocal = (now: Date = new Date()) => new Date(now.getTime() + HOUR).toISOString().slice(0, 16).replace('T', ' ');
export const normalizeLocal = (s: string) => s.trim().replace('T', ' ');
export const isFuture = (s: string, now: Date = new Date()) => normalizeLocal(s) > nowLocal(now);
export const isValidLocal = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};
/** « AAAA-MM-JJ HH:MM » (heure locale) → millisecondes depuis l'époque (UTC). */
export const localToMs = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s)!;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - HOUR;
};
export const HOUR_MS = HOUR;
