import { LEVELS, REQUEST_STATUSES, SUBJECTS, type RequestStatus } from '../../domain/constants';
import type { RequestEntity } from '../../domain/entities';
import { conflict, fieldError, forbid, notFound } from '../../domain/errors';
import { requestPermissions } from '../../domain/request-rules';
import { isFuture, isValidLocal, normalizeLocal } from '../../domain/time';
import { skillList, type AuthUser } from '../../domain/user';
import type { Deps } from '../deps';
import type { MessageView, Page, RequestCardView, RequestDetailView } from '../read-models';
import type { MessageInput, OfferInput, PlanInput, RequestInput, ReviewInput } from '../validation/schemas';
import { forbidAdmin } from './guards';

const PAGE_SIZE = 12;
const SORTS = ['recent', 'oldest', 'offers', 'noOffers'] as const;
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | '' => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : '');

export interface ListRequestsQuery { q?: unknown; subject?: unknown; level?: unknown; status?: unknown; sort?: unknown; page?: unknown }

const toCard = (r: RequestEntity, offersCount = 0): RequestCardView => ({
  id: r.id, authorId: r.authorId, title: r.title, description: r.description, subject: r.subject, level: r.level,
  availability: r.availability, status: r.status, hidden: r.hidden, createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(), authorName: r.authorName, authorLevel: r.authorLevel, offersCount,
});

/**
 * Règles métier du parcours d'entraide. Chaque cas d'usage vérifie lui-même l'identité et l'état : les contrôles ne
 * dépendent jamais de l'interface. Les écritures critiques s'exécutent dans une transaction avec verrou de ligne.
 */
export function createRequestUseCases(d: Deps) {
  const { repos, notifier } = d;
  const link = (id: number) => `/requests/${id}`;

  /** Auteur ou aidant retenu, et état autorisé ; retourne la demande et l'autre participant. */
  async function participantContext(user: AuthUser, requestId: number, statuses: RequestStatus[], what: string) {
    const r = await repos.requests.findById(requestId);
    if (!r || r.hidden) notFound('Demande introuvable.');
    const req = r as RequestEntity;
    const acc = await repos.offers.findAccepted(requestId);
    const other = user.id === req.authorId ? acc?.helperId : user.id === acc?.helperId ? req.authorId : undefined;
    if (!other) forbid(`Seuls l’auteur et l’aidant retenu peuvent ${what}.`);
    if (!statuses.includes(req.status)) conflict(`Action impossible : la demande est « ${req.status} ».`);
    return { r: req, other: other as number };
  }

  const mustFind = async (id: number) => (await repos.requests.findById(id)) ?? notFound('Demande introuvable.');

  return {
    /** Liste commune : les demandes des AUTRES étudiants (les siennes sont dans « Mon espace »). L'admin voit tout. */
    async list(user: AuthUser, query: ListRequestsQuery): Promise<Page<RequestCardView>> {
      const q = typeof query.q === 'string' ? query.q.trim().slice(0, 80) : '';
      const sort = (SORTS as readonly string[]).includes(query.sort as string) ? (query.sort as (typeof SORTS)[number]) : 'recent';
      const page = Math.max(parseInt(String(query.page), 10) || 1, 1);
      return d.queries.listRequests({
        excludeAuthorId: user.role === 'admin' ? undefined : user.id,
        q, subject: pick(query.subject, SUBJECTS), level: pick(query.level, LEVELS), status: pick(query.status, REQUEST_STATUSES),
        sort, page, pageSize: PAGE_SIZE,
      });
    },

    async create(user: AuthUser, input: RequestInput) {
      forbidAdmin(user);
      return { id: await repos.requests.create({ authorId: user.id, ...input }) };
    },

    async update(user: AuthUser, id: number, input: RequestInput) {
      const r = await mustFind(id);
      if (r.authorId !== user.id) forbid('Seul l’auteur peut modifier sa demande.');
      if (r.status === 'done') conflict('Une demande terminée ne peut plus être modifiée.');
      if (r.status === 'cancelled') conflict('Une demande annulée ne peut plus être modifiée.');
      await repos.requests.update(id, input);
      return { id };
    },

    async complete(user: AuthUser, id: number) {
      const r = await mustFind(id);
      if (r.authorId !== user.id) forbid('Seul l’auteur peut clôturer sa demande.');
      if (r.status !== 'accepted') conflict('Seule une demande dont l’aide a été acceptée peut être clôturée.');
      await repos.requests.setStatus(id, 'done');
      const acc = await repos.offers.findAccepted(id);
      await notifier.create(acc?.helperId, 'done', `« ${r.title} » est terminée : pensez à évaluer la séance.`, link(id));
      return { ok: true };
    },

    async cancel(user: AuthUser, id: number) {
      const r = await mustFind(id);
      if (r.authorId !== user.id) forbid('Seul l’auteur peut annuler sa demande.');
      if (r.status !== 'open' && r.status !== 'accepted') conflict('Cette demande ne peut plus être annulée.');
      await d.uow.run(async (tx) => {
        await tx.requests.setStatus(id, 'cancelled');
        await tx.offers.rejectAllPending(id);
        await tx.plans.deleteByRequest(id);
      });
      for (const helperId of await repos.offers.helperIds(id)) {
        await notifier.create(helperId, 'cancelled', `La demande « ${r.title} » a été annulée par son auteur.`, link(id));
      }
      return { ok: true };
    },

    /* ---------------------------------------------------------------- Propositions */

    async createOffer(user: AuthUser, requestId: number, input: OfferInput) {
      forbidAdmin(user);
      const r = await d.uow.run(async (tx) => {
        const r = await tx.requests.lockById(requestId);
        if (!r || r.hidden) notFound('Demande introuvable.');
        const req = r as RequestEntity;
        if (req.authorId === user.id) forbid('Vous ne pouvez pas proposer votre aide sur votre propre demande.');
        if (req.status !== 'open') conflict('Cette demande n’accepte plus de propositions.');
        if (await tx.offers.exists(requestId, user.id)) conflict('Vous avez déjà proposé votre aide sur cette demande.');
        await tx.offers.create({ requestId, helperId: user.id, message: input.message });
        return req;
      });
      await notifier.create(r.authorId, 'offer', `${user.name} propose son aide pour « ${r.title} ».`, link(requestId));
      return { ok: true };
    },

    async respond(user: AuthUser, offerId: number, decision: 'accept' | 'reject') {
      const out = await d.uow.run(async (tx) => {
        const o = (await tx.offers.findById(offerId)) ?? notFound('Proposition introuvable.');
        const r = (await tx.requests.lockById(o.requestId)) as RequestEntity;
        if (r.authorId !== user.id) forbid('Seul l’auteur de la demande peut répondre aux propositions.');
        if (r.status !== 'open') conflict('Cette demande n’est plus ouverte : une aide a déjà été acceptée, ou elle est terminée ou annulée.');
        const fresh = await tx.offers.lockById(offerId);
        if (fresh?.status !== 'pending') conflict('Cette proposition a déjà reçu une réponse.');
        let others: number[] = [];
        if (decision === 'accept') {
          others = await tx.offers.pendingHelperIds(r.id, o.id);
          await tx.offers.setStatus(o.id, 'accepted');
          await tx.offers.rejectPendingExcept(r.id, o.id);
          await tx.requests.setStatus(r.id, 'accepted');
        } else {
          await tx.offers.setStatus(o.id, 'rejected');
        }
        return { r, o, others };
      });
      const { r, o, others } = out;
      if (decision === 'accept') {
        await notifier.create(o.helperId, 'accepted', `${user.name} a accepté votre aide pour « ${r.title} ». Proposez une date de séance !`, link(r.id));
        for (const helperId of others) await notifier.create(helperId, 'rejected', `Une autre proposition a été retenue pour « ${r.title} ».`, link(r.id));
      } else {
        await notifier.create(o.helperId, 'rejected', `Votre proposition pour « ${r.title} » n’a pas été retenue.`, link(r.id));
      }
      return { ok: true };
    },

    /* ---------------------------------------------------------------- Évaluations et signalements */

    async review(user: AuthUser, requestId: number, input: ReviewInput) {
      const { r, revieweeId } = await d.uow.run(async (tx) => {
        const r = (await tx.requests.lockById(requestId)) ?? notFound('Demande introuvable.');
        if (r.status !== 'done') conflict('L’évaluation n’est possible qu’une fois la séance terminée.');
        const acc = await tx.offers.findAccepted(requestId);
        if (user.id !== r.authorId && user.id !== acc?.helperId) forbid('Seuls les participants à la séance peuvent l’évaluer.');
        const revieweeId = user.id === r.authorId ? (acc as NonNullable<typeof acc>).helperId : r.authorId;
        if (await tx.reviews.exists(requestId, user.id)) conflict('Vous avez déjà évalué cette séance.');
        await tx.reviews.create({ requestId, reviewerId: user.id, revieweeId, rating: input.rating, comment: input.comment ?? '' });
        return { r, revieweeId };
      });
      await notifier.create(revieweeId, 'review', `${user.name} vous a donné ${input.rating}/5 pour « ${r.title} ».`, link(requestId));
      return { ok: true };
    },

    async report(user: AuthUser, requestId: number, reason: string) {
      forbidAdmin(user);
      const r = await repos.requests.findById(requestId);
      if (!r || r.hidden) notFound('Demande introuvable.');
      if ((r as RequestEntity).authorId === user.id) forbid('Vous ne pouvez pas signaler votre propre demande.');
      if (await repos.reports.exists(requestId, user.id)) conflict('Vous avez déjà signalé cette demande.');
      await repos.reports.create({ requestId, reporterId: user.id, reason });
      return { ok: true };
    },

    /* ---------------------------------------------------------------- Calendrier de séance */

    async proposePlan(user: AuthUser, requestId: number, input: PlanInput) {
      const { r, other } = await participantContext(user, requestId, ['accepted'], 'organiser la séance');
      if (!isValidLocal(input.startsAt)) fieldError('startsAt', 'Date et heure invalides');
      if (!isFuture(input.startsAt, d.clock.now())) fieldError('startsAt', 'La séance doit avoir lieu dans le futur');
      const startsAt = normalizeLocal(input.startsAt);
      await d.uow.run(async (tx) => {
        await tx.plans.upsert({ requestId, proposedBy: user.id, startsAt, location: input.location });
        await tx.reminders.clear('plan', requestId); // une nouvelle date annule les rappels déjà envoyés pour l'ancienne
      });
      await notifier.create(other, 'plan', `${user.name} propose une séance le ${startsAt} (${input.location}) pour « ${r.title} ».`, link(requestId));
      return { ok: true };
    },

    async confirmPlan(user: AuthUser, requestId: number) {
      const { r, other } = await participantContext(user, requestId, ['accepted'], 'confirmer la séance');
      const plan = (await repos.plans.findByRequest(requestId)) ?? notFound('Aucune date proposée.');
      if (plan.proposedBy === user.id) forbid('Votre interlocuteur doit confirmer la date que vous avez proposée.');
      if (plan.status === 'confirmed') conflict('La séance est déjà confirmée.');
      if (!isFuture(plan.startsAt, d.clock.now())) conflict('Cette date est dépassée : proposez-en une nouvelle.');
      await repos.plans.confirm(requestId);
      await notifier.create(other, 'plan', `${user.name} a confirmé la séance du ${plan.startsAt} pour « ${r.title} ». Vous recevrez un rappel.`, link(requestId));
      return { ok: true };
    },

    /* ---------------------------------------------------------------- Messagerie (auteur ↔ aidant retenu) */

    async listMessages(user: AuthUser, requestId: number): Promise<{ items: MessageView[] }> {
      await participantContext(user, requestId, ['accepted', 'done'], 'lire les messages');
      const items = await repos.messages.listByRequest(requestId, 300);
      return { items: items.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), senderId: m.senderId, senderName: m.senderName })) };
    },

    async sendMessage(user: AuthUser, requestId: number, input: MessageInput) {
      const { r, other } = await participantContext(user, requestId, ['accepted', 'done'], 'envoyer des messages');
      const id = await repos.messages.create({ requestId, senderId: user.id, body: input.body });
      // Temps réel : l'autre participant (et les autres onglets de l'expéditeur) rechargent la conversation.
      d.realtime.emit(other, 'message', { requestId, id });
      d.realtime.emit(user.id, 'message', { requestId, id });
      await notifier.createOnce(other, 'message', `Nouveau message de ${user.name} à propos de « ${r.title} ».`, link(requestId));
      return { ok: true };
    },

    /* ---------------------------------------------------------------- Détail d'une demande */

    async detail(user: AuthUser, id: number): Promise<RequestDetailView> {
      const r = await repos.requests.findById(id);
      const isAdmin = user.role === 'admin';
      const isAuthor = !!r && r.authorId === user.id;
      if (!r || (r.hidden && !isAuthor && !isAdmin)) notFound('Demande introuvable.');
      const req = r as RequestEntity;

      const allOffers = await repos.offers.listByRequest(id);
      // L'auteur et l'admin voient toutes les propositions ; un aidant ne voit que la sienne.
      const visible = isAuthor || isAdmin ? allOffers : allOffers.filter((o) => o.helperId === user.id);
      const offers = await Promise.all(visible.map(async (o) => ({
        id: o.id, helperId: o.helperId, message: o.message, status: o.status, createdAt: o.createdAt.toISOString(),
        helperName: o.helperName, speciality: o.speciality, helperLevel: o.helperLevel, skills: skillList(o.skills),
        stats: await d.queries.reputation(o.helperId),
      })));
      const acc = await repos.offers.findAccepted(id);
      const isHelper = acc?.helperId === user.id;
      const participant = isAuthor || isHelper;
      const reviews = await repos.reviews.listByRequest(id);
      const planEntity = participant ? await repos.plans.findByRequest(id) : null;

      const permissions = requestPermissions({
        status: req.status, hidden: req.hidden, isAuthor, isAdmin, isHelper,
        hasOffered: allOffers.some((o) => o.helperId === user.id),
        hasReviewed: reviews.some((v) => v.reviewerId === user.id),
        plan: planEntity ? { status: planEntity.status, proposedBy: planEntity.proposedBy } : null, userId: user.id,
      });

      return {
        request: toCard(req, allOffers.length),
        authorStats: await d.queries.reputation(req.authorId),
        offers,
        accepted: acc
          ? {
              helperId: acc.helperId, helperName: acc.helperName,
              // L'e-mail de contact n'est visible que par l'auteur et l'aidant retenu.
              contact: participant ? (isAuthor ? acc.helperEmail : req.authorEmail) : null,
            }
          : null,
        reviews: reviews.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
        plan: planEntity
          ? { startsAt: planEntity.startsAt, location: planEntity.location, status: planEntity.status, proposedBy: planEntity.proposedBy, proposedByName: planEntity.proposedByName }
          : null,
        permissions,
      };
    },
  };
}
