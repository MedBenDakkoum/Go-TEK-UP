import type { Role } from './constants';

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  speciality: string;
  level: string;
  skills: string;
  emailVerified: boolean;
  suspended: boolean;
  suspendedReason: string;
  suspendedAt: Date | null;
  createdAt: Date;
}

/** Utilisateur authentifié tel que vu par les cas d'usage (jamais de hachage de mot de passe). */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  speciality: string;
  level: string;
  skills: string;
}

/** Dédoublonne (sans tenir compte de la casse), tronque à 30 caractères et garde 10 compétences au plus. */
export function normalizeSkills(str = ''): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of str.split(',').map((x) => x.trim()).filter(Boolean)) {
    const k = s.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(s.slice(0, 30)); }
  }
  return out.slice(0, 10).join(', ');
}

export const skillList = (str?: string): string[] => (str ? str.split(',').map((s) => s.trim()).filter(Boolean) : []);

export interface Reputation {
  helps: number;
  reviews: number;
  avg: number | null;
  points: number;
  badge: string;
  extras: string[];
  reviewsGiven: number;
}

/** Réputation : 10 points par aide terminée + somme des notes reçues ; badges Contributeur / Mentor / Super évaluateur. */
export function computeReputation(input: { helps: number; reviewsCount: number; ratingSum: number; reviewsGiven: number }): Reputation {
  const { helps, reviewsCount, ratingSum, reviewsGiven } = input;
  const avg = reviewsCount ? Math.round((ratingSum / reviewsCount) * 10) / 10 : null;
  let badge = 'Nouveau';
  if (helps >= 3 && avg !== null && avg >= 4) badge = 'Mentor';
  else if (helps >= 1) badge = 'Contributeur';
  return {
    helps, reviews: reviewsCount, avg, points: helps * 10 + ratingSum, badge,
    extras: reviewsGiven >= 5 ? ['Super évaluateur'] : [], reviewsGiven,
  };
}
