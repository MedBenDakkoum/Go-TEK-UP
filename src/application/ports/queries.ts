import type { GroupStatus, RequestStatus, Role } from '../../domain/constants';
import type { LeaderboardEntry } from '../../domain/leaderboard';
import type { Reputation } from '../../domain/user';
import type {
  AdminActionView, AdminReportView, AdminUserView, DashboardOfferView, DashboardSessionView, GroupCardView, Page, RequestCardView,
  SpaceGroupView, SpaceOfferView, SpaceRequestView, SpaceSessionView, UpcomingItem,
} from '../read-models';

export interface RequestListFilter {
  /** Exclut les demandes de cet auteur (liste commune : les siennes sont dans « Mon espace »). */
  excludeAuthorId?: number;
  q?: string; subject?: string; level?: string; status?: RequestStatus | '';
  sort: 'recent' | 'oldest' | 'offers' | 'noOffers';
  page: number; pageSize: number;
}
export interface AdminUserFilter { q?: string; status?: 'suspended' | 'active' | 'unverified'; role?: Role; page: number; pageSize: number }
export interface GroupListFilter { upcoming: boolean; nowLocal: string; excludeUserId?: number }

export interface ReminderPlanTarget { id: number; title: string; startsAt: string; location: string; userIds: number[] }

/**
 * Ports de lecture (CQRS léger) : requêtes agrégées qui renvoient directement des modèles de lecture.
 * L'infrastructure les implémente avec Prisma ; les cas d'usage n'écrivent jamais par ce biais.
 */
export interface Queries {
  reputation(userId: number): Promise<Reputation>;
  publicStats(): Promise<{ students: number; openRequests: number; sessionsDone: number }>;

  listRequests(filter: RequestListFilter): Promise<Page<RequestCardView>>;
  openRequestsForRecommendation(userId: number, limit: number): Promise<RequestCardView[]>;
  hiddenRequests(): Promise<RequestCardView[]>;
  requestsOf(userId: number): Promise<RequestCardView[]>;

  spaceRequests(userId: number): Promise<SpaceRequestView[]>;
  spaceOffers(userId: number): Promise<SpaceOfferView[]>;
  spaceSessions(userId: number): Promise<SpaceSessionView[]>;
  spaceGroups(userId: number): Promise<SpaceGroupView[]>;

  dashboardOffers(userId: number): Promise<DashboardOfferView[]>;
  dashboardSessions(userId: number): Promise<DashboardSessionView[]>;
  upcoming(userId: number, nowLocal: string): Promise<UpcomingItem[]>;
  /** Aides terminées (en tant qu'aidant) par mois « AAAA-MM ». */
  monthlyHelps(userId: number, from: Date): Promise<Map<string, number>>;

  /** Entrées du classement du mois (étudiants actifs ayant au moins une aide ou une note ce mois-ci), sans badge. */
  leaderboardEntries(from: Date, to: Date): Promise<Omit<LeaderboardEntry, 'badge'>[]>;

  listGroups(filter: GroupListFilter): Promise<GroupCardView[]>;

  adminReports(): Promise<AdminReportView[]>;
  adminActions(limit: number): Promise<AdminActionView[]>;
  adminCounts(): Promise<{ users: number; requests: number }>;
  adminUsers(filter: AdminUserFilter): Promise<Omit<Page<AdminUserView>, 'pageSize'>>;

  reminderPlans(): Promise<ReminderPlanTarget[]>;
  reminderGroups(): Promise<ReminderPlanTarget[]>;
}

export type { GroupStatus };
