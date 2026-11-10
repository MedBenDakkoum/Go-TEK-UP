import { isMonth, monthRange, rank } from '../../domain/leaderboard';
import { recommend } from '../../domain/recommendation';
import { nowLocal } from '../../domain/time';
import { normalizeSkills, skillList, type AuthUser } from '../../domain/user';
import type { Deps } from '../deps';
import type { DashboardView, LeaderboardView, PublicStatsView, PublicUserView, SpaceView } from '../read-models';
import type { ProfileInput } from '../validation/schemas';

export async function toPublicUser(d: Deps, id: number): Promise<PublicUserView | null> {
  const u = await d.repos.users.findById(id);
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, speciality: u.speciality, level: u.level,
    skills: skillList(u.skills), skillsText: u.skills, stats: await d.queries.reputation(id),
  };
}

export function createUserUseCases(d: Deps) {
  return {
    async updateProfile(user: AuthUser, input: ProfileInput): Promise<PublicUserView | null> {
      await d.repos.users.update(user.id, { name: input.name, speciality: input.speciality, level: input.level, skills: normalizeSkills(input.skills) });
      return toPublicUser(d, user.id);
    },

    /** « Mon espace » : uniquement les données de l'utilisateur, séparées de la liste commune des demandes. */
    async space(user: AuthUser): Promise<SpaceView> {
      const [requests, offers, sessions, groups] = await Promise.all([
        d.queries.spaceRequests(user.id), d.queries.spaceOffers(user.id), d.queries.spaceSessions(user.id), d.queries.spaceGroups(user.id),
      ]);
      return { requests, offers, sessions, groups, now: nowLocal(d.clock.now()) };
    },

    async dashboard(user: AuthUser): Promise<DashboardView> {
      const now = d.clock.now();
      const [published, offered, sessions, candidates, stats, upcoming, monthly] = await Promise.all([
        d.queries.requestsOf(user.id),
        d.queries.dashboardOffers(user.id),
        d.queries.dashboardSessions(user.id),
        user.role === 'admin' ? Promise.resolve([]) : d.queries.openRequestsForRecommendation(user.id, 200),
        d.queries.reputation(user.id),
        d.queries.upcoming(user.id, nowLocal(now)),
        monthlyHelps(user.id),
      ]);
      return { published, offered, sessions, recommendations: recommend(user, candidates), stats, upcoming, monthly };
    },

    /** Classement mensuel : 10 points par aide terminée dans le mois + notes reçues dans le mois. */
    async leaderboard(user: AuthUser, monthParam?: string): Promise<LeaderboardView> {
      const month = isMonth(monthParam) ? monthParam : d.clock.now().toISOString().slice(0, 7);
      const { from, to } = monthRange(month);
      const entries = await d.queries.leaderboardEntries(from, to);
      const withBadges = await Promise.all(entries.map(async (e) => ({ ...e, badge: (await d.queries.reputation(e.id)).badge })));
      const ranking = rank(withBadges);
      return { month, items: ranking.slice(0, 10), me: ranking.find((x) => x.id === user.id) ?? null };
    },

    async publicStats(): Promise<PublicStatsView> {
      return d.queries.publicStats();
    },
  };

  /** Aides terminées par mois sur les 6 derniers mois (graphique du tableau de bord). */
  async function monthlyHelps(userId: number) {
    const base = d.clock.now();
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 5, 1));
    const byMonth = await d.queries.monthlyHelps(userId, start);
    const out: { month: string; helps: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const key = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
      out.push({ month: key, helps: byMonth.get(key) ?? 0 });
    }
    return out;
  }
}
