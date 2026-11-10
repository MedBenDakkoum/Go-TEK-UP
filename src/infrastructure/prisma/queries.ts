import type { AdminUserFilter, GroupListFilter, Queries, RequestListFilter } from '../../application/ports/queries';
import type { RequestCardView } from '../../application/read-models';
import { computeReputation } from '../../domain/user';
import type { Db, Prisma } from './client';

const cardInclude = { author: { select: { name: true, level: true } }, _count: { select: { offers: true } } } satisfies Prisma.RequestInclude;
type CardRow = Prisma.RequestGetPayload<{ include: typeof cardInclude }>;
const toCard = (r: CardRow): RequestCardView => ({
  id: r.id, authorId: r.authorId, title: r.title, description: r.description, subject: r.subject, level: r.level, availability: r.availability,
  status: r.status, hidden: r.hidden, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  authorName: r.author.name, authorLevel: r.author.level, offersCount: r._count.offers,
});

/** Demandes auxquelles l'utilisateur participe : comme auteur ou comme aidant retenu. */
const participates = (userId: number): Prisma.RequestWhereInput => ({
  OR: [{ authorId: userId }, { offers: { some: { helperId: userId, status: 'accepted' } } }],
});
const inGroup = (userId: number): Prisma.GroupSessionWhereInput => ({ OR: [{ hostId: userId }, { members: { some: { userId } } }] });

export function createQueries(db: Db): Queries {
  const reputation: Queries['reputation'] = async (userId) => {
    const [helps, received, reviewsGiven] = await Promise.all([
      db.request.count({ where: { status: 'done', offers: { some: { helperId: userId, status: 'accepted' } } } }),
      db.review.aggregate({ where: { revieweeId: userId }, _count: { _all: true }, _sum: { rating: true } }),
      db.review.count({ where: { reviewerId: userId } }),
    ]);
    return computeReputation({ helps, reviewsCount: received._count._all, ratingSum: received._sum.rating ?? 0, reviewsGiven });
  };

  async function listRequests(f: RequestListFilter) {
    const where: Prisma.RequestWhereInput = {
      hidden: false, author: { suspended: false },
      ...(f.excludeAuthorId !== undefined && { authorId: { not: f.excludeAuthorId } }),
      ...(f.q && { OR: [{ title: { contains: f.q, mode: 'insensitive' } }, { description: { contains: f.q, mode: 'insensitive' } }] }),
      ...(f.subject && { subject: f.subject }), ...(f.level && { level: f.level }), ...(f.status && { status: f.status }),
    };
    const total = await db.request.count({ where });
    const pages = Math.max(1, Math.ceil(total / f.pageSize));
    const page = Math.min(f.page, pages);
    const skip = (page - 1) * f.pageSize;
    const recent: Prisma.RequestOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];
    let rows: CardRow[];
    if (f.sort === 'noOffers') {
      // « Sans proposition d'abord », puis les plus récentes : deux séries concaténées, paginées ensemble.
      const none = { ...where, offers: { none: {} } };
      const zero = await db.request.count({ where: none });
      const first = skip < zero ? await db.request.findMany({ where: none, orderBy: recent, include: cardInclude, skip, take: f.pageSize }) : [];
      const missing = f.pageSize - first.length;
      const rest = missing > 0
        ? await db.request.findMany({ where: { ...where, offers: { some: {} } }, orderBy: recent, include: cardInclude, skip: Math.max(0, skip - zero), take: missing })
        : [];
      rows = [...first, ...rest];
    } else {
      const orderBy: Prisma.RequestOrderByWithRelationInput[] =
        f.sort === 'oldest' ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : f.sort === 'offers' ? [{ offers: { _count: 'desc' } }, { createdAt: 'desc' }]
        : recent;
      rows = await db.request.findMany({ where, orderBy, include: cardInclude, skip, take: f.pageSize });
    }
    return { items: rows.map(toCard), total, page, pages, pageSize: f.pageSize };
  }

  return {
    reputation,

    async publicStats() {
      const [students, openRequests, sessionsDone] = await Promise.all([
        db.user.count({ where: { role: 'student', suspended: false } }),
        db.request.count({ where: { status: 'open', hidden: false } }),
        db.request.count({ where: { status: 'done' } }),
      ]);
      return { students, openRequests, sessionsDone };
    },

    listRequests,

    async openRequestsForRecommendation(userId, limit) {
      const rows = await db.request.findMany({
        where: { status: 'open', hidden: false, author: { suspended: false }, authorId: { not: userId }, offers: { none: { helperId: userId } } },
        orderBy: { createdAt: 'desc' }, take: limit, include: cardInclude,
      });
      return rows.map(toCard);
    },
    async hiddenRequests() {
      return (await db.request.findMany({ where: { hidden: true }, orderBy: { updatedAt: 'desc' }, include: cardInclude })).map(toCard);
    },
    async requestsOf(userId) {
      return (await db.request.findMany({ where: { authorId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: cardInclude })).map(toCard);
    },

    async spaceRequests(userId) {
      const rows = await db.request.findMany({
        where: { authorId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { offers: { select: { status: true } } },
      });
      return rows.map((r) => ({
        id: r.id, title: r.title, subject: r.subject, level: r.level, status: r.status, hidden: r.hidden, createdAt: r.createdAt.toISOString(),
        description: r.description, offersCount: r.offers.length, pendingCount: r.offers.filter((o) => o.status === 'pending').length,
      }));
    },
    async spaceOffers(userId) {
      const rows = await db.offer.findMany({
        where: { helperId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { request: { select: { title: true, subject: true, status: true, author: { select: { name: true } } } } },
      });
      return rows.map((o) => ({
        id: o.id, requestId: o.requestId, status: o.status, createdAt: o.createdAt.toISOString(), title: o.request.title,
        subject: o.request.subject, requestStatus: o.request.status, authorName: o.request.author.name,
      }));
    },
    async spaceSessions(userId) {
      const rows = await db.request.findMany({
        where: { status: { in: ['accepted', 'done'] }, AND: [participates(userId)] }, orderBy: { updatedAt: 'desc' },
        include: {
          author: { select: { name: true } }, plan: true,
          offers: { where: { status: 'accepted' }, take: 1, include: { helper: { select: { name: true } } } },
          reviews: { where: { reviewerId: userId }, select: { id: true } },
        },
      });
      return rows.map((r) => {
        const author = r.authorId === userId;
        return {
          id: r.id, title: r.title, subject: r.subject, status: r.status, updatedAt: r.updatedAt.toISOString(),
          startsAt: r.plan?.startsAt ?? null, location: r.plan?.location ?? null, planStatus: r.plan?.status ?? null,
          role: author ? 'demandeur' as const : 'aidant' as const, otherName: author ? (r.offers[0]?.helper.name ?? '') : r.author.name,
          reviewed: r.reviews.length > 0,
        };
      });
    },
    async spaceGroups(userId) {
      const rows = await db.groupSession.findMany({
        where: inGroup(userId), orderBy: { startsAt: 'desc' },
        include: { host: { select: { name: true } }, _count: { select: { members: true } } },
      });
      return rows.map((g) => ({
        id: g.id, title: g.title, subject: g.subject, level: g.level, startsAt: g.startsAt, location: g.location, capacity: g.capacity, status: g.status,
        role: g.hostId === userId ? 'organisateur' as const : 'inscrit' as const, hostName: g.host.name, membersCount: g._count.members,
      }));
    },

    async dashboardOffers(userId) {
      const rows = await db.offer.findMany({
        where: { helperId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { request: { select: { title: true, status: true, author: { select: { name: true } } } } },
      });
      return rows.map((o) => ({
        id: o.id, requestId: o.requestId, status: o.status, createdAt: o.createdAt.toISOString(), title: o.request.title,
        requestStatus: o.request.status, authorName: o.request.author.name,
      }));
    },
    async dashboardSessions(userId) {
      const rows = await db.request.findMany({
        where: { status: 'done', AND: [participates(userId)] }, orderBy: { updatedAt: 'desc' },
        include: {
          author: { select: { name: true } },
          offers: { where: { status: 'accepted' }, take: 1, include: { helper: { select: { name: true } } } },
          reviews: { where: { reviewerId: userId }, select: { id: true } },
        },
      });
      return rows.map((r) => ({
        id: r.id, title: r.title, updatedAt: r.updatedAt.toISOString(), authorName: r.author.name,
        helperName: r.offers[0]?.helper.name ?? '', reviewed: r.reviews.length > 0,
      }));
    },
    async upcoming(userId, nowLocal) {
      const [plans, groups] = await Promise.all([
        db.sessionPlan.findMany({
          where: { startsAt: { gte: nowLocal }, request: { status: 'accepted', AND: [participates(userId)] } },
          include: { request: { select: { id: true, title: true } } },
        }),
        db.groupSession.findMany({ where: { status: 'open', startsAt: { gte: nowLocal }, AND: [inGroup(userId)] } }),
      ]);
      const items = [
        ...plans.map((p) => ({ kind: 'plan' as const, id: p.request.id, title: p.request.title, startsAt: p.startsAt, location: p.location, status: p.status as string, link: `/requests/${p.request.id}` })),
        ...groups.map((g) => ({ kind: 'group' as const, id: g.id, title: g.title, startsAt: g.startsAt, location: g.location, status: g.hostId === userId ? 'host' : 'member', link: `/sessions/${g.id}` })),
      ];
      return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 8);
    },
    async monthlyHelps(userId, from) {
      const rows = await db.request.findMany({
        where: { status: 'done', updatedAt: { gte: from }, offers: { some: { helperId: userId, status: 'accepted' } } }, select: { updatedAt: true },
      });
      const byMonth = new Map<string, number>();
      for (const r of rows) {
        const key = r.updatedAt.toISOString().slice(0, 7);
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
      }
      return byMonth;
    },

    async leaderboardEntries(from, to) {
      const [done, ratings] = await Promise.all([
        db.request.findMany({
          where: { status: 'done', updatedAt: { gte: from, lt: to }, offers: { some: { status: 'accepted' } } },
          select: { offers: { where: { status: 'accepted' }, select: { helperId: true } } },
        }),
        db.review.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { revieweeId: true, rating: true } }),
      ]);
      const score = new Map<number, { helps: number; stars: number; reviews: number }>();
      const row = (id: number) => { let s = score.get(id); if (!s) score.set(id, (s = { helps: 0, stars: 0, reviews: 0 })); return s; };
      for (const r of done) for (const o of r.offers) row(o.helperId).helps++;
      for (const v of ratings) { const s = row(v.revieweeId); s.stars += v.rating; s.reviews++; }
      if (!score.size) return [];
      const users = await db.user.findMany({
        where: { id: { in: [...score.keys()] }, suspended: false, role: 'student' }, select: { id: true, name: true, speciality: true, level: true },
      });
      return users.map((u) => ({ ...u, ...score.get(u.id)! }));
    },

    async listGroups(f: GroupListFilter) {
      const rows = await db.groupSession.findMany({
        where: {
          host: { suspended: false }, startsAt: f.upcoming ? { gte: f.nowLocal } : { lt: f.nowLocal },
          ...(f.excludeUserId !== undefined && { hostId: { not: f.excludeUserId }, members: { none: { userId: f.excludeUserId } } }),
        },
        orderBy: { startsAt: f.upcoming ? 'asc' : 'desc' }, take: 100,
        include: { host: { select: { name: true } }, _count: { select: { members: true } } },
      });
      return rows.map((g) => ({
        id: g.id, hostId: g.hostId, title: g.title, description: g.description, subject: g.subject, level: g.level, startsAt: g.startsAt,
        location: g.location, capacity: g.capacity, status: g.status, createdAt: g.createdAt.toISOString(), hostName: g.host.name, membersCount: g._count.members,
      }));
    },

    async adminReports() {
      const rows = await db.report.findMany({
        where: { status: 'open' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { request: { select: { title: true, description: true, author: { select: { name: true } } } }, reporter: { select: { name: true } } },
      });
      return rows.map((p) => ({
        id: p.id, requestId: p.requestId, reason: p.reason, createdAt: p.createdAt.toISOString(), title: p.request.title,
        description: p.request.description, authorName: p.request.author.name, reporterName: p.reporter.name,
      }));
    },
    async adminActions(limit) {
      const rows = await db.adminAction.findMany({ orderBy: { id: 'desc' }, take: limit, include: { admin: { select: { name: true } } } });
      return rows.map((a) => ({ id: a.id, action: a.action, targetType: a.targetType, targetId: a.targetId, details: a.details, createdAt: a.createdAt.toISOString(), adminName: a.admin.name }));
    },
    async adminCounts() {
      const [users, requests] = await Promise.all([db.user.count(), db.request.count()]);
      return { users, requests };
    },
    async adminUsers(f: AdminUserFilter) {
      const where: Prisma.UserWhereInput = {
        ...(f.q && { OR: [{ name: { contains: f.q, mode: 'insensitive' } }, { email: { contains: f.q, mode: 'insensitive' } }] }),
        ...(f.status === 'suspended' && { suspended: true }),
        ...(f.status === 'active' && { suspended: false, emailVerified: true }),
        ...(f.status === 'unverified' && { emailVerified: false }),
        ...(f.role && { role: f.role }),
      };
      const total = await db.user.count({ where });
      const pages = Math.max(1, Math.ceil(total / f.pageSize));
      const page = Math.min(f.page, pages);
      const rows = await db.user.findMany({
        where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * f.pageSize, take: f.pageSize,
        include: { _count: { select: { requests: true, offers: true } } },
      });
      const reports = await db.report.findMany({ where: { request: { authorId: { in: rows.map((u) => u.id) } } }, select: { request: { select: { authorId: true } } } });
      const reported = new Map<number, number>();
      for (const r of reports) reported.set(r.request.authorId, (reported.get(r.request.authorId) ?? 0) + 1);
      return {
        total, page, pages,
        items: rows.map((u) => ({
          id: u.id, name: u.name, email: u.email, role: u.role, speciality: u.speciality, level: u.level, emailVerified: u.emailVerified,
          suspended: u.suspended, suspendedReason: u.suspendedReason, suspendedAt: u.suspendedAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(), requestsCount: u._count.requests, offersCount: u._count.offers, reportsCount: reported.get(u.id) ?? 0,
        })),
      };
    },

    async reminderPlans() {
      const rows = await db.sessionPlan.findMany({
        where: { status: 'confirmed', request: { status: 'accepted' } },
        include: { request: { select: { id: true, title: true, authorId: true, offers: { where: { status: 'accepted' }, select: { helperId: true } } } } },
      });
      return rows.map((p) => ({
        id: p.request.id, title: p.request.title, startsAt: p.startsAt, location: p.location,
        userIds: [p.request.authorId, ...p.request.offers.map((o) => o.helperId)],
      }));
    },
    async reminderGroups() {
      const rows = await db.groupSession.findMany({ where: { status: 'open' }, include: { members: { select: { userId: true } } } });
      return rows.map((g) => ({ id: g.id, title: g.title, startsAt: g.startsAt, location: g.location, userIds: [g.hostId, ...g.members.map((m) => m.userId)] }));
    },
  };
}
