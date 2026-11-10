import type {
  AdminActionRepository, AuthTokenRepository, GroupRepository, MessageRepository, NotificationRepository, OfferRepository, PlanRepository,
  ReminderRepository, ReportRepository, RequestRepository, Repositories, ReviewRepository, UnitOfWork, UserRepository,
} from '../../application/ports/repositories';
import type { RequestEntity } from '../../domain/entities';
import type { Db, Prisma } from './client';
import type { PrismaClient } from './generated/client';

/** Exécute `fn` dans une transaction (ou directement si `db` en est déjà une). */
const inTx = <T>(db: Db, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> =>
  '$transaction' in db ? (db as PrismaClient).$transaction(fn) : fn(db as Prisma.TransactionClient);

const requestInclude = { author: { select: { name: true, email: true, level: true } } } satisfies Prisma.RequestInclude;
type RequestRow = Prisma.RequestGetPayload<{ include: typeof requestInclude }>;
const toRequest = (r: RequestRow): RequestEntity => ({
  id: r.id, authorId: r.authorId, title: r.title, description: r.description, subject: r.subject, level: r.level,
  availability: r.availability, status: r.status, hidden: r.hidden, createdAt: r.createdAt, updatedAt: r.updatedAt,
  authorName: r.author.name, authorEmail: r.author.email, authorLevel: r.author.level,
});

const groupInclude = { host: { select: { name: true } }, _count: { select: { members: true } } } satisfies Prisma.GroupSessionInclude;
const toGroup = (g: Prisma.GroupSessionGetPayload<{ include: typeof groupInclude }>) => ({
  id: g.id, hostId: g.hostId, title: g.title, description: g.description, subject: g.subject, level: g.level, startsAt: g.startsAt,
  location: g.location, capacity: g.capacity, status: g.status, createdAt: g.createdAt, hostName: g.host.name, membersCount: g._count.members,
});

export function createRepositories(db: Db): Repositories {
  const users: UserRepository = {
    findById: (id) => db.user.findUnique({ where: { id } }),
    findByEmail: (email) => db.user.findUnique({ where: { email: email.trim().toLowerCase() } }),
    create: (data) => db.user.create({ data: { ...data, email: data.email.trim().toLowerCase() } }),
    async update(id, patch) { await db.user.update({ where: { id }, data: patch }); },
    async hasAdmin() { return (await db.user.count({ where: { role: 'admin' } })) > 0; },
    count: () => db.user.count(),
  };

  const requests: RequestRepository = {
    async findById(id) {
      const r = await db.request.findUnique({ where: { id }, include: requestInclude });
      return r && toRequest(r);
    },
    async lockById(id) {
      await db.$queryRaw`SELECT id FROM requests WHERE id = ${id} FOR UPDATE`;
      return requests.findById(id);
    },
    async create(data) { return (await db.request.create({ data, select: { id: true } })).id; },
    async update(id, data) { await db.request.update({ where: { id }, data: { ...data, updatedAt: new Date() } }); },
    async setStatus(id, status) { await db.request.update({ where: { id }, data: { status, updatedAt: new Date() } }); },
    async setHidden(id, hidden) {
      return (await db.request.updateMany({ where: { id }, data: { hidden, updatedAt: new Date() } })).count > 0;
    },
  };

  const offers: OfferRepository = {
    findById: (id) => db.offer.findUnique({ where: { id } }),
    async lockById(id) {
      await db.$queryRaw`SELECT id FROM offers WHERE id = ${id} FOR UPDATE`;
      return db.offer.findUnique({ where: { id } });
    },
    async exists(requestId, helperId) { return (await db.offer.count({ where: { requestId, helperId } })) > 0; },
    async create(data) { await db.offer.create({ data }); },
    async listByRequest(requestId) {
      const rows = await db.offer.findMany({
        where: { requestId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { helper: { select: { name: true, speciality: true, level: true, skills: true } } },
      });
      return rows.map(({ helper, ...o }) => ({ ...o, helperName: helper.name, speciality: helper.speciality, helperLevel: helper.level, skills: helper.skills }));
    },
    async findAccepted(requestId) {
      const o = await db.offer.findFirst({ where: { requestId, status: 'accepted' }, include: { helper: { select: { name: true, email: true } } } });
      if (!o) return null;
      const { helper, ...rest } = o;
      return { ...rest, helperName: helper.name, helperEmail: helper.email };
    },
    async setStatus(id, status) { await db.offer.update({ where: { id }, data: { status } }); },
    async pendingHelperIds(requestId, exceptOfferId) {
      return (await db.offer.findMany({ where: { requestId, status: 'pending', id: { not: exceptOfferId } }, select: { helperId: true } })).map((o) => o.helperId);
    },
    async rejectPendingExcept(requestId, exceptOfferId) {
      await db.offer.updateMany({ where: { requestId, status: 'pending', id: { not: exceptOfferId } }, data: { status: 'rejected' } });
    },
    async rejectAllPending(requestId) { await db.offer.updateMany({ where: { requestId, status: 'pending' }, data: { status: 'rejected' } }); },
    async helperIds(requestId) { return (await db.offer.findMany({ where: { requestId }, select: { helperId: true } })).map((o) => o.helperId); },
  };

  const reviews: ReviewRepository = {
    async exists(requestId, reviewerId) { return (await db.review.count({ where: { requestId, reviewerId } })) > 0; },
    async create(data) { await db.review.create({ data }); },
    async listByRequest(requestId) {
      const rows = await db.review.findMany({
        where: { requestId }, orderBy: { id: 'asc' },
        include: { reviewer: { select: { name: true } }, reviewee: { select: { name: true } } },
      });
      return rows.map(({ reviewer, reviewee, ...v }) => ({ ...v, reviewerName: reviewer.name, revieweeName: reviewee.name }));
    },
  };

  const reports: ReportRepository = {
    findById: (id) => db.report.findUnique({ where: { id }, select: { id: true, requestId: true, reason: true } }),
    async exists(requestId, reporterId) { return (await db.report.count({ where: { requestId, reporterId } })) > 0; },
    async create(data) { await db.report.create({ data }); },
    async resolve(id) { await db.report.update({ where: { id }, data: { status: 'resolved' } }); },
    async resolveAllForRequest(requestId) { await db.report.updateMany({ where: { requestId }, data: { status: 'resolved' } }); },
  };

  const plans: PlanRepository = {
    async findByRequest(requestId) {
      const p = await db.sessionPlan.findUnique({ where: { requestId }, include: { proposer: { select: { name: true } } } });
      return p && { requestId: p.requestId, proposedBy: p.proposedBy, proposedByName: p.proposer.name, startsAt: p.startsAt, location: p.location, status: p.status };
    },
    async upsert({ requestId, proposedBy, startsAt, location }) {
      await db.sessionPlan.upsert({
        where: { requestId },
        create: { requestId, proposedBy, startsAt, location, status: 'proposed' },
        update: { proposedBy, startsAt, location, status: 'proposed', updatedAt: new Date() },
      });
    },
    async confirm(requestId) { await db.sessionPlan.update({ where: { requestId }, data: { status: 'confirmed', updatedAt: new Date() } }); },
    async deleteByRequest(requestId) { await db.sessionPlan.deleteMany({ where: { requestId } }); },
  };

  const messages: MessageRepository = {
    async create(data) { return (await db.message.create({ data, select: { id: true } })).id; },
    async listByRequest(requestId, limit) {
      const rows = await db.message.findMany({ where: { requestId }, orderBy: { id: 'asc' }, take: limit, include: { sender: { select: { name: true } } } });
      return rows.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, senderId: m.senderId, senderName: m.sender.name }));
    },
  };

  const groups: GroupRepository = {
    async findById(id) {
      const g = await db.groupSession.findUnique({ where: { id }, include: groupInclude });
      return g && toGroup(g);
    },
    async lockById(id) {
      await db.$queryRaw`SELECT id FROM group_sessions WHERE id = ${id} FOR UPDATE`;
      return groups.findById(id);
    },
    async create(data) { return (await db.groupSession.create({ data, select: { id: true } })).id; },
    async setStatus(id, status) { await db.groupSession.update({ where: { id }, data: { status } }); },
    async isMember(sessionId, userId) { return (await db.groupMember.count({ where: { sessionId, userId } })) > 0; },
    countMembers: (sessionId) => db.groupMember.count({ where: { sessionId } }),
    async addMember(sessionId, userId) { await db.groupMember.create({ data: { sessionId, userId } }); },
    async removeMember(sessionId, userId) { await db.groupMember.deleteMany({ where: { sessionId, userId } }); },
    async members(sessionId) {
      const rows = await db.groupMember.findMany({ where: { sessionId }, orderBy: { id: 'asc' }, include: { user: { select: { id: true, name: true, speciality: true, level: true } } } });
      return rows.map((m) => m.user);
    },
    async memberIds(sessionId) { return (await db.groupMember.findMany({ where: { sessionId }, select: { userId: true } })).map((m) => m.userId); },
  };

  const notifications: NotificationRepository = {
    create: (data) => db.notification.create({ data }),
    findById: (id) => db.notification.findUnique({ where: { id } }),
    async hasUnread(userId, type, link) { return (await db.notification.count({ where: { userId, type, link, read: false } })) > 0; },
    list: (userId, limit) => db.notification.findMany({ where: { userId }, orderBy: { id: 'desc' }, take: limit }),
    countUnread: (userId) => db.notification.count({ where: { userId, read: false } }),
    async markAllRead(userId) { await db.notification.updateMany({ where: { userId }, data: { read: true } }); },
    async markRead(id) { await db.notification.update({ where: { id }, data: { read: true } }); },
  };

  const authTokens: AuthTokenRepository = {
    issue({ userId, purpose, tokenHash, expiresAt }) {
      return inTx(db, async (tx) => {
        await tx.authToken.updateMany({ where: { userId, purpose, used: false }, data: { used: true } });
        await tx.authToken.create({ data: { userId, purpose, tokenHash, expiresAt } });
      });
    },
    async consume(tokenHash, purpose, now) {
      // Mise à jour conditionnelle : une seule requête peut « gagner » le jeton, même en cas d'appels simultanés.
      const res = await db.authToken.updateMany({ where: { tokenHash, purpose, used: false, expiresAt: { gt: now } }, data: { used: true } });
      if (res.count !== 1) return null;
      return (await db.authToken.findUnique({ where: { tokenHash }, select: { userId: true } }))?.userId ?? null;
    },
  };

  const adminActions: AdminActionRepository = {
    async record(data) { await db.adminAction.create({ data }); },
  };

  const reminders: ReminderRepository = {
    async markSent(kind, refId, userId, type) {
      return (await db.reminderSent.createMany({ data: [{ kind, refId, userId, type }], skipDuplicates: true })).count > 0;
    },
    async clear(kind, refId) { await db.reminderSent.deleteMany({ where: { kind, refId } }); },
  };

  return { users, requests, offers, reviews, reports, plans, messages, groups, notifications, authTokens, adminActions, reminders };
}

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private prisma: PrismaClient) {}
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(createRepositories(tx)), { timeout: 15_000 });
  }
}
