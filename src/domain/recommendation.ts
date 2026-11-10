import { LEVELS } from './constants';
import { skillList, type AuthUser } from './user';

export interface RecommendableRequest { subject: string; title: string; description: string; level: string }

/**
 * Recommandation selon les compétences : une demande est retenue si une compétence ou la spécialité du profil apparaît dans
 * sa matière, son titre ou sa description. Un niveau égal ou inférieur au sien ajoute un bonus au classement.
 */
export function recommend<T extends RecommendableRequest>(user: AuthUser, candidates: T[], limit = 5): (T & { matched: string[]; score: number })[] {
  const keywords = [...skillList(user.skills), user.speciality].map((s) => s.toLowerCase()).filter((s) => s.length >= 3);
  if (!keywords.length || user.role === 'admin') return [];
  const myIdx = (LEVELS as readonly string[]).indexOf(user.level);
  return candidates
    .map((r) => {
      const hay = `${r.subject} ${r.title} ${r.description}`.toLowerCase();
      const matched = keywords.filter((k) => hay.includes(k));
      const bonus = (LEVELS as readonly string[]).indexOf(r.level) <= myIdx ? 0.5 : 0;
      return { ...r, matched, score: matched.length ? matched.length + bonus : 0 };
    })
    .filter((r) => r.matched.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
