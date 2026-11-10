export interface LeaderboardEntry { id: number; name: string; speciality: string; level: string; helps: number; stars: number; reviews: number; badge: string }
export interface RankedEntry extends LeaderboardEntry { rank: number; points: number }

/** Classement mensuel : 10 points par aide terminée dans le mois + notes reçues dans le mois. */
export function rank(entries: LeaderboardEntry[]): RankedEntry[] {
  return entries
    .map((e) => ({ ...e, points: e.helps * 10 + e.stars }))
    .sort((a, b) => b.points - a.points || b.helps - a.helps || a.name.localeCompare(b.name))
    .map((e, i) => ({ rank: i + 1, ...e }));
}

export const isMonth = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/** Bornes [début, fin[ d'un mois « AAAA-MM » en UTC. */
export function monthRange(month: string): { from: Date; to: Date } {
  const [y, m] = month.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}
