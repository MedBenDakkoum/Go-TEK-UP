import type { GroupStatus, OfferStatus, PlanStatus, RequestStatus, Role } from '../domain/constants';
import type { RankedEntry } from '../domain/leaderboard';
import type { Reputation } from '../domain/user';

/**
 * Modèles de lecture (vues) renvoyés par les cas d'usage. Les dates sont des chaînes ISO 8601 (sérialisables en JSON) ;
 * les dates de séances restent en heure locale « AAAA-MM-JJ HH:MM ». L'interface importe ces types, jamais l'inverse.
 */
export interface Page<T> { items: T[]; total: number; page: number; pages: number; pageSize: number }

export interface RequestCardView {
  id: number; authorId: number; title: string; description: string; subject: string; level: string; availability: string;
  status: RequestStatus; hidden: boolean; createdAt: string; updatedAt: string; authorName: string; authorLevel: string; offersCount: number;
}
export interface RecommendationView extends RequestCardView { matched: string[]; score: number }

export interface PublicUserView {
  id: number; name: string; email: string; role: Role; speciality: string; level: string;
  skills: string[]; skillsText: string; stats: Reputation;
}

export interface SpaceRequestView { id: number; title: string; subject: string; level: string; status: RequestStatus; hidden: boolean; createdAt: string; description: string; offersCount: number; pendingCount: number }
export interface SpaceOfferView { id: number; requestId: number; status: OfferStatus; createdAt: string; title: string; subject: string; requestStatus: RequestStatus; authorName: string }
export interface SpaceSessionView {
  id: number; title: string; subject: string; status: RequestStatus; updatedAt: string; startsAt: string | null; location: string | null;
  planStatus: PlanStatus | null; role: 'demandeur' | 'aidant'; otherName: string; reviewed: boolean;
}
export interface SpaceGroupView {
  id: number; title: string; subject: string; level: string; startsAt: string; location: string; capacity: number; status: GroupStatus;
  role: 'organisateur' | 'inscrit'; hostName: string; membersCount: number;
}
export interface SpaceView { requests: SpaceRequestView[]; offers: SpaceOfferView[]; sessions: SpaceSessionView[]; groups: SpaceGroupView[]; now: string }

export interface DashboardOfferView { id: number; requestId: number; status: OfferStatus; createdAt: string; title: string; requestStatus: RequestStatus; authorName: string }
export interface DashboardSessionView { id: number; title: string; updatedAt: string; authorName: string; helperName: string; reviewed: boolean }
export interface UpcomingItem { kind: 'plan' | 'group'; id: number; title: string; startsAt: string; location: string; status: string; link: string }
export interface DashboardView {
  published: RequestCardView[]; offered: DashboardOfferView[]; sessions: DashboardSessionView[]; recommendations: RecommendationView[];
  stats: Reputation; upcoming: UpcomingItem[]; monthly: { month: string; helps: number }[];
}

export interface LeaderboardView { month: string; items: RankedEntry[]; me: RankedEntry | null }
export interface PublicStatsView { students: number; openRequests: number; sessionsDone: number }

export interface OfferView {
  id: number; helperId: number; message: string; status: OfferStatus; createdAt: string; helperName: string; speciality: string;
  helperLevel: string; skills: string[]; stats: Reputation;
}
export interface ReviewView { id: number; requestId: number; reviewerId: number; revieweeId: number; rating: number; comment: string; createdAt: string; reviewerName: string; revieweeName: string }
export interface RequestPermissionsView {
  isAuthor: boolean; isAdmin: boolean; canEdit: boolean; canComplete: boolean; canCancel: boolean; canRespond: boolean; canOffer: boolean;
  hasOffered: boolean; canReview: boolean; canReport: boolean; canPlan: boolean; canConfirmPlan: boolean; canMessage: boolean;
}
export interface RequestDetailView {
  request: RequestCardView;
  authorStats: Reputation;
  offers: OfferView[];
  accepted: { helperId: number; helperName: string; contact: string | null } | null;
  reviews: ReviewView[];
  plan: { startsAt: string; location: string; status: PlanStatus; proposedBy: number; proposedByName: string } | null;
  permissions: RequestPermissionsView;
}
export interface MessageView { id: number; body: string; createdAt: string; senderId: number; senderName: string }

export interface GroupCardView {
  id: number; hostId: number; title: string; description: string; subject: string; level: string; startsAt: string; location: string;
  capacity: number; status: GroupStatus; createdAt: string; hostName: string; membersCount: number;
}
export interface GroupDetailView {
  session: GroupCardView;
  members: { id: number; name: string; speciality: string; level: string }[];
  permissions: { isHost: boolean; joined: boolean; isAdmin: boolean; canJoin: boolean; canLeave: boolean; canCancel: boolean; full: boolean; past: boolean };
}

export interface NotificationView { id: number; type: string; message: string; link: string; read: boolean; createdAt: string }

export interface AdminReportView { id: number; requestId: number; reason: string; createdAt: string; title: string; description: string; authorName: string; reporterName: string }
export interface AdminActionView { id: number; action: string; targetType: string; targetId: number | null; details: string; createdAt: string; adminName: string }
export interface AdminOverviewView {
  counts: { users: number; requests: number; openReports: number };
  reports: AdminReportView[]; hidden: RequestCardView[]; actions: AdminActionView[];
}
export interface AdminUserView {
  id: number; name: string; email: string; role: Role; speciality: string; level: string; emailVerified: boolean; suspended: boolean;
  suspendedReason: string; suspendedAt: string | null; createdAt: string; requestsCount: number; offersCount: number; reportsCount: number;
}
