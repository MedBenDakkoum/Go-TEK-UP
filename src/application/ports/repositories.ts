import type {
  AcceptedOffer, GroupEntity, GroupMemberEntity, MessageEntity, NotificationEntity, OfferEntity, OfferWithHelper, PlanEntity,
  RequestEntity, ReviewEntity,
} from '../../domain/entities';
import type { GroupStatus, OfferStatus, RequestStatus, Role, TokenPurpose } from '../../domain/constants';
import type { User } from '../../domain/user';

/**
 * Ports de persistance (écriture et lectures unitaires). Définis par la couche application, implémentés par l'infrastructure
 * (Prisma) : le métier ne dépend jamais de la base. Les méthodes `lock*` ne sont utilisables qu'à l'intérieur d'une transaction.
 */
export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: { name: string; email: string; passwordHash: string; role?: Role; speciality: string; level: string; skills: string; emailVerified: boolean }): Promise<User>;
  update(id: number, patch: Partial<Pick<User, 'name' | 'speciality' | 'level' | 'skills' | 'passwordHash' | 'emailVerified' | 'suspended' | 'suspendedReason' | 'suspendedAt'>>): Promise<void>;
  hasAdmin(): Promise<boolean>;
  count(): Promise<number>;
}

export interface RequestRepository {
  findById(id: number): Promise<RequestEntity | null>;
  /** Verrouille la ligne (SELECT … FOR UPDATE) puis la retourne : sérialise les écritures concurrentes. */
  lockById(id: number): Promise<RequestEntity | null>;
  create(data: { authorId: number; title: string; description: string; subject: string; level: string; availability: string }): Promise<number>;
  update(id: number, data: { title: string; description: string; subject: string; level: string; availability: string }): Promise<void>;
  setStatus(id: number, status: RequestStatus): Promise<void>;
  /** Retourne false si la demande n'existe pas. */
  setHidden(id: number, hidden: boolean): Promise<boolean>;
}

export interface OfferRepository {
  findById(id: number): Promise<OfferEntity | null>;
  lockById(id: number): Promise<OfferEntity | null>;
  exists(requestId: number, helperId: number): Promise<boolean>;
  create(data: { requestId: number; helperId: number; message: string }): Promise<void>;
  listByRequest(requestId: number): Promise<OfferWithHelper[]>;
  findAccepted(requestId: number): Promise<AcceptedOffer | null>;
  setStatus(id: number, status: OfferStatus): Promise<void>;
  pendingHelperIds(requestId: number, exceptOfferId: number): Promise<number[]>;
  rejectPendingExcept(requestId: number, exceptOfferId: number): Promise<void>;
  rejectAllPending(requestId: number): Promise<void>;
  helperIds(requestId: number): Promise<number[]>;
}

export interface ReviewRepository {
  exists(requestId: number, reviewerId: number): Promise<boolean>;
  create(data: { requestId: number; reviewerId: number; revieweeId: number; rating: number; comment: string }): Promise<void>;
  listByRequest(requestId: number): Promise<ReviewEntity[]>;
}

export interface ReportRepository {
  findById(id: number): Promise<{ id: number; requestId: number; reason: string } | null>;
  exists(requestId: number, reporterId: number): Promise<boolean>;
  create(data: { requestId: number; reporterId: number; reason: string }): Promise<void>;
  resolve(id: number): Promise<void>;
  resolveAllForRequest(requestId: number): Promise<void>;
}

export interface PlanRepository {
  findByRequest(requestId: number): Promise<PlanEntity | null>;
  upsert(data: { requestId: number; proposedBy: number; startsAt: string; location: string }): Promise<void>;
  confirm(requestId: number): Promise<void>;
  deleteByRequest(requestId: number): Promise<void>;
}

export interface MessageRepository {
  create(data: { requestId: number; senderId: number; body: string }): Promise<number>;
  listByRequest(requestId: number, limit: number): Promise<MessageEntity[]>;
}

export interface GroupRepository {
  findById(id: number): Promise<GroupEntity | null>;
  lockById(id: number): Promise<GroupEntity | null>;
  create(data: { hostId: number; title: string; description: string; subject: string; level: string; startsAt: string; location: string; capacity: number }): Promise<number>;
  setStatus(id: number, status: GroupStatus): Promise<void>;
  isMember(sessionId: number, userId: number): Promise<boolean>;
  countMembers(sessionId: number): Promise<number>;
  addMember(sessionId: number, userId: number): Promise<void>;
  removeMember(sessionId: number, userId: number): Promise<void>;
  members(sessionId: number): Promise<GroupMemberEntity[]>;
  memberIds(sessionId: number): Promise<number[]>;
}

export interface NotificationRepository {
  create(data: { userId: number; type: string; message: string; link: string }): Promise<NotificationEntity>;
  findById(id: number): Promise<NotificationEntity | null>;
  hasUnread(userId: number, type: string, link: string): Promise<boolean>;
  list(userId: number, limit: number): Promise<NotificationEntity[]>;
  countUnread(userId: number): Promise<number>;
  markAllRead(userId: number): Promise<void>;
  markRead(id: number): Promise<void>;
}

export interface AuthTokenRepository {
  /** Invalide les jetons actifs du même usage puis enregistre le nouveau (atomique). */
  issue(data: { userId: number; purpose: TokenPurpose; tokenHash: string; expiresAt: Date }): Promise<void>;
  /** Marque le jeton comme utilisé et retourne l'utilisateur, de façon atomique ; null s'il est inconnu, expiré ou déjà utilisé. */
  consume(tokenHash: string, purpose: TokenPurpose, now: Date): Promise<number | null>;
}

export interface AdminActionRepository {
  record(data: { adminId: number; action: string; targetType: string; targetId: number | null; details: string }): Promise<void>;
}

export interface ReminderRepository {
  /** true si le rappel n'avait pas encore été marqué (donc à envoyer). */
  markSent(kind: string, refId: number, userId: number, type: 'day' | 'hour'): Promise<boolean>;
  clear(kind: string, refId: number): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  requests: RequestRepository;
  offers: OfferRepository;
  reviews: ReviewRepository;
  reports: ReportRepository;
  plans: PlanRepository;
  messages: MessageRepository;
  groups: GroupRepository;
  notifications: NotificationRepository;
  authTokens: AuthTokenRepository;
  adminActions: AdminActionRepository;
  reminders: ReminderRepository;
}

/** Exécute `work` dans une transaction : validée si la fonction réussit, annulée si elle lève une exception. */
export interface UnitOfWork {
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
