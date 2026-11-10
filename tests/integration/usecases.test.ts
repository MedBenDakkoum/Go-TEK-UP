import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Container } from '@/infrastructure/container';
import { NodemailerMailer } from '@/infrastructure/mail/mailer';
import * as s from '@/application/validation/schemas';
import { as, freshContainer, futureLocal, rejects } from './harness';

let c: Container;
let uc: Container['useCases'];
beforeAll(async () => { c = await freshContainer(); uc = c.useCases; });
afterAll(async () => { await c.prisma.$disconnect(); });

const reg = (over: Record<string, unknown> = {}) => s.registerSchema.parse({
  name: 'Nouvel Étudiant', email: 'nouveau@campus.tn', password: 'Secret123', confirm: 'Secret123', speciality: 'Informatique', level: 'ING2', skills: '', ...over,
});
const newRequest = (over: Record<string, unknown> = {}) => s.requestSchema.parse({
  title: 'Aide sur les arbres binaires', description: 'Je voudrais comprendre le parcours en profondeur et en largeur.', subject: 'Algorithmique', level: 'ING2', availability: 'Lundi soir', ...over,
});

describe('authentification', () => {
  it('inscription : domaine de l’école, e-mail à vérifier, jeton à usage unique', async () => {
    await rejects(uc.auth.register(reg({ email: 'x@gmail.com' })), 'ValidationError');
    await rejects(uc.auth.register(reg({ confirm: 'autre' })), 'ValidationError');
    await rejects(uc.auth.register(reg({ email: 'alice@campus.tn' })), 'ConflictError');
    const r = await uc.auth.register(reg());
    expect(r.pendingVerification).toBe(true);
    await rejects(uc.auth.login({ email: 'nouveau@campus.tn', password: 'Secret123' }), 'ForbiddenError', /non vérifiée/);
    const mail = NodemailerMailer.outbox.at(-1)!;
    const token = /token=([a-f0-9]+)/.exec(mail.text)![1];
    await uc.auth.verifyEmail(token);
    await rejects(uc.auth.verifyEmail(token), 'BadInputError');
    expect(await uc.auth.login({ email: 'nouveau@campus.tn', password: 'Secret123' }, '1.1.1.1')).toBe(r.id);
  });

  it('schémas : champs inconnus refusés (pas d’élévation de rôle)', () => {
    expect(s.registerSchema.safeParse({ ...reg(), role: 'admin' }).success).toBe(false);
    expect(s.loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false);
  });

  it('mot de passe oublié : réponse identique, jeton à usage unique', async () => {
    await uc.auth.forgotPassword('inconnu@campus.tn');
    const before = NodemailerMailer.outbox.length;
    await uc.auth.forgotPassword('alice@campus.tn');
    expect(NodemailerMailer.outbox.length).toBe(before + 1);
    const token = /token=([a-f0-9]+)/.exec(NodemailerMailer.outbox.at(-1)!.text)![1];
    await uc.auth.resetPassword({ token, password: 'Nouveau123', confirm: 'Nouveau123' });
    await rejects(uc.auth.resetPassword({ token, password: 'Autre12345', confirm: 'Autre12345' }), 'BadInputError');
    await uc.auth.login({ email: 'alice@campus.tn', password: 'Nouveau123' }, '2.2.2.2');
    await rejects(uc.auth.login({ email: 'alice@campus.tn', password: 'Student123!' }, '2.2.2.2'), 'UnauthorizedError');
  });

  it('limitation des tentatives de connexion', async () => {
    for (let i = 0; i < 5; i++) await rejects(uc.auth.login({ email: 'bob@campus.tn', password: 'faux' }, '9.9.9.9'), 'UnauthorizedError');
    await rejects(uc.auth.login({ email: 'bob@campus.tn', password: 'Student123!' }, '9.9.9.9'), 'TooManyAttemptsError');
  });

  it('authenticate relit le compte : une suspension prend effet immédiatement', async () => {
    const token = await uc.auth.openSession((await as(c, 'chaima@campus.tn')).id);
    expect((await uc.auth.authenticate(token)).user?.email).toBe('chaima@campus.tn');
    expect((await uc.auth.authenticate('garbage')).user).toBeNull();
  });
});

describe('parcours d’entraide', () => {
  it('workflow complet : publication → proposition → acceptation → plan → clôture → évaluations', async () => {
    const bob = await as(c, 'bob@campus.tn'), chaima = await as(c, 'chaima@campus.tn'), alice = await as(c, 'alice@campus.tn');
    const { id } = await uc.requests.create(chaima, newRequest());
    await rejects(uc.requests.createOffer(chaima, id, { message: 'Je me propose moi-même' }), 'ForbiddenError');
    await uc.requests.createOffer(bob, id, { message: 'Je peux t’aider avec cet exercice.' });
    await rejects(uc.requests.createOffer(bob, id, { message: 'Encore une fois ici' }), 'ConflictError');
    await uc.requests.createOffer(alice, id, { message: 'Moi aussi, avec plaisir !' });

    // un aidant ne voit que sa proposition ; le contact est masqué aux non-participants
    const asBob = await uc.requests.detail(bob, id);
    expect(asBob.offers).toHaveLength(1);
    expect(asBob.accepted).toBeNull();
    const asAuthor = await uc.requests.detail(chaima, id);
    expect(asAuthor.offers).toHaveLength(2);

    const bobOffer = asAuthor.offers.find((o) => o.helperId === bob.id)!;
    await rejects(uc.requests.respond(bob, bobOffer.id, 'accept'), 'ForbiddenError');
    await uc.requests.respond(chaima, bobOffer.id, 'accept');
    await rejects(uc.requests.respond(chaima, asAuthor.offers.find((o) => o.helperId === alice.id)!.id, 'accept'), 'ConflictError');
    await rejects(uc.requests.createOffer(alice, id, { message: 'Trop tard maintenant' }), 'ConflictError');

    const accepted = await uc.requests.detail(chaima, id);
    expect(accepted.request.status).toBe('accepted');
    expect(accepted.accepted).toMatchObject({ helperName: 'Bob Mansouri', contact: 'bob@campus.tn' });
    expect((await uc.requests.detail(bob, id)).accepted?.contact).toBe('chaima@campus.tn');
    expect((await uc.requests.detail(alice, id)).accepted?.contact).toBeNull();

    // calendrier : proposition → confirmation par l'autre participant seulement
    await rejects(uc.requests.proposePlan(chaima, id, { startsAt: '2020-01-01 10:00', location: 'Salle 1' }), 'ValidationError');
    await uc.requests.proposePlan(chaima, id, { startsAt: futureLocal(), location: 'Bibliothèque' });
    await rejects(uc.requests.confirmPlan(chaima, id), 'ForbiddenError');
    await rejects(uc.requests.confirmPlan(alice, id), 'ForbiddenError');
    await uc.requests.confirmPlan(bob, id);
    expect((await uc.requests.detail(bob, id)).plan?.status).toBe('confirmed');

    // messagerie : participants uniquement
    await uc.requests.sendMessage(bob, id, { body: 'Bonjour !' });
    await rejects(uc.requests.listMessages(alice, id), 'ForbiddenError');
    expect((await uc.requests.listMessages(chaima, id)).items).toHaveLength(1);

    // clôture puis évaluations (une seule fois, participants seulement)
    await rejects(uc.requests.review(chaima, id, { rating: 5 }), 'ConflictError');
    await rejects(uc.requests.complete(bob, id), 'ForbiddenError');
    await uc.requests.complete(chaima, id);
    await rejects(uc.requests.update(chaima, id, newRequest()), 'ConflictError');
    await rejects(uc.requests.review(alice, id, { rating: 5 }), 'ForbiddenError');
    await uc.requests.review(chaima, id, { rating: 5, comment: 'Top' });
    await rejects(uc.requests.review(chaima, id, { rating: 4 }), 'ConflictError');
    await uc.requests.review(bob, id, { rating: 4 });
    const final = await uc.requests.detail(chaima, id);
    expect(final.reviews).toHaveLength(2);
    expect(final.permissions.canReview).toBe(false);
  });

  it('annulation : propositions en attente rejetées, auteur seul', async () => {
    const bob = await as(c, 'bob@campus.tn'), chaima = await as(c, 'chaima@campus.tn');
    const { id } = await uc.requests.create(chaima, newRequest({ title: 'À annuler bientôt' }));
    await uc.requests.createOffer(bob, id, { message: 'Je veux bien aider ici.' });
    await rejects(uc.requests.cancel(bob, id), 'ForbiddenError');
    await uc.requests.cancel(chaima, id);
    const d = await uc.requests.detail(chaima, id);
    expect(d.request.status).toBe('cancelled');
    expect(d.offers[0].status).toBe('rejected');
    await rejects(uc.requests.cancel(chaima, id), 'ConflictError');
  });

  it('acceptations concurrentes : une seule gagne (verrous PostgreSQL)', async () => {
    const bob = await as(c, 'bob@campus.tn'), chaima = await as(c, 'chaima@campus.tn'), alice = await as(c, 'alice@campus.tn');
    const { id } = await uc.requests.create(chaima, newRequest({ title: 'Course aux acceptations' }));
    await uc.requests.createOffer(bob, id, { message: 'Moi je peux aider ici.' });
    await uc.requests.createOffer(alice, id, { message: 'Moi aussi, ça m’intéresse.' });
    const offers = (await uc.requests.detail(chaima, id)).offers;
    const results = await Promise.allSettled(offers.map((o) => uc.requests.respond(chaima, o.id, 'accept')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const after = await uc.requests.detail(chaima, id);
    expect(after.offers.filter((o) => o.status === 'accepted')).toHaveLength(1);
  });

  it('liste commune : sans mes demandes, tri, pagination, recherche avec caractères spéciaux', async () => {
    const alice = await as(c, 'alice@campus.tn');
    const all = await uc.requests.list(alice, {});
    expect(all.items.every((r) => r.authorId !== alice.id)).toBe(true);
    const bad = await uc.requests.list(alice, { q: "%_'\"; DROP TABLE users;--", sort: 'nope', page: '-3' });
    expect(bad.total).toBe(0);
    const noOffers = await uc.requests.list(alice, { sort: 'noOffers' });
    const flags = noOffers.items.map((r) => r.offersCount === 0);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
    const small = await uc.requests.list(alice, { status: 'open', subject: 'Anglais' });
    expect(small.items.every((r) => r.subject === 'Anglais' && r.status === 'open')).toBe(true);
  });

  it('mon espace, tableau de bord et recommandations', async () => {
    const alice = await as(c, 'alice@campus.tn');
    const space = await uc.users.space(alice);
    expect(space.requests.every((r) => r.id > 0)).toBe(true);
    expect(space.groups.length).toBeGreaterThan(0);
    const dash = await uc.users.dashboard(alice);
    expect(dash.monthly).toHaveLength(6);
    expect(dash.recommendations.every((r) => r.matched.length > 0)).toBe(true);
    const admin = await as(c, 'admin@campus.tn');
    expect((await uc.users.dashboard(admin)).recommendations).toEqual([]);
  });
});

describe('séances collectives', () => {
  it('inscription, places limitées, annulation', async () => {
    const alice = await as(c, 'alice@campus.tn'), bob = await as(c, 'bob@campus.tn'), chaima = await as(c, 'chaima@campus.tn');
    const input = s.groupSchema.parse({ title: 'Révision express', description: 'Révisions de dernière minute avant le contrôle.', subject: 'Mathématiques', level: 'ING2', startsAt: futureLocal(3, 10), location: 'Salle C3', capacity: 2 });
    const { id } = await uc.groups.create(alice, input);
    await rejects(uc.groups.join(alice, id), 'ForbiddenError');
    await uc.groups.join(bob, id);
    await rejects(uc.groups.join(bob, id), 'ConflictError');
    await uc.groups.join(chaima, id);
    const d = await uc.groups.detail(alice, id);
    expect(d.session.membersCount).toBe(2);
    expect(d.permissions.full).toBe(true);
    // places limitées sous concurrence
    const small = await uc.groups.create(alice, { ...input, title: 'Une seule place', capacity: 2 });
    const joiners = await Promise.allSettled([uc.groups.join(bob, small.id), uc.groups.join(chaima, small.id)]);
    expect(joiners.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    await uc.groups.leave(bob, id);
    await rejects(uc.groups.cancel(bob, id), 'ForbiddenError');
    await uc.groups.cancel(alice, id);
    await rejects(uc.groups.join(bob, id), 'ConflictError');
    await rejects(uc.groups.create(alice, { ...input, startsAt: '2020-01-01 10:00' }), 'ValidationError');
  });
});

describe('notifications, classement, administration', () => {
  it('notifications : compteur, lecture, cloisonnement', async () => {
    const bob = await as(c, 'bob@campus.tn'), alice = await as(c, 'alice@campus.tn');
    const list = await uc.notifications.list(bob);
    expect(list.unread).toBeGreaterThan(0);
    await rejects(uc.notifications.markOne(alice, list.items[0].id), 'NotFoundError');
    await uc.notifications.markOne(bob, list.items[0].id);
    await uc.notifications.markAll(bob);
    expect((await uc.notifications.unread(bob)).unread).toBe(0);
  });

  it('temps réel : événements privés poussés à l’utilisateur concerné', async () => {
    const bob = await as(c, 'bob@campus.tn'), alice = await as(c, 'alice@campus.tn');
    const got: string[] = [];
    c.hub.subscribe(bob.id, { send: (e) => got.push(e), close: () => {} });
    const other: string[] = [];
    c.hub.subscribe(alice.id, { send: (e) => other.push(e), close: () => {} });
    await c.deps.notifier.create(bob.id, 'test', 'Bonjour', '/x');
    expect(got).toEqual(['notification', 'unread']);
    expect(other).toEqual([]);
  });

  it('classement mensuel et statistiques publiques', async () => {
    const alice = await as(c, 'alice@campus.tn');
    const lb = await uc.users.leaderboard(alice, undefined);
    expect(lb.items[0].rank).toBe(1);
    expect(lb.items.every((e, i, a) => i === 0 || a[i - 1].points >= e.points)).toBe(true);
    expect((await uc.users.leaderboard(alice, '1999-01')).items).toEqual([]);
    expect((await uc.users.publicStats()).students).toBeGreaterThan(0);
  });

  it('signalement, modération journalisée, administrateur hors entraide', async () => {
    const admin = await as(c, 'admin@campus.tn'), bob = await as(c, 'bob@campus.tn'), alice = await as(c, 'alice@campus.tn');
    await rejects(uc.requests.create(admin, newRequest()), 'ForbiddenError');
    await rejects(uc.requests.report(admin, 1, 'Signalement admin'), 'ForbiddenError');
    const { id } = await uc.requests.create(alice, newRequest({ title: 'Demande à signaler ici' }));
    await uc.requests.report(bob, id, 'Contenu inapproprié');
    await rejects(uc.requests.report(bob, id, 'Contenu inapproprié'), 'ConflictError');
    const ov = await uc.admin.overview();
    const rep = ov.reports.find((r) => r.requestId === id)!;
    await uc.admin.resolveReport(admin, rep.id, 'hide');
    await rejects(uc.requests.detail(bob, id), 'NotFoundError');
    expect((await uc.requests.detail(alice, id)).request.hidden).toBe(true);
    await uc.admin.restoreRequest(admin, id);
    expect((await uc.requests.detail(bob, id)).request.hidden).toBe(false);
    expect((await uc.admin.actions()).items.map((a) => a.action)).toEqual(expect.arrayContaining(['Demande masquée', 'Demande rétablie']));
  });

  it('gestion des utilisateurs : recherche, suspension, réactivation', async () => {
    const admin = await as(c, 'admin@campus.tn'), chaima = await as(c, 'chaima@campus.tn');
    const found = await uc.admin.users({ q: 'chaima' });
    expect(found.items.map((u) => u.email)).toEqual(['chaima@campus.tn']);
    await rejects(uc.admin.suspend(admin, admin.id, 'Test suspension'), 'ForbiddenError');
    await rejects(uc.admin.suspend(admin, 99999, 'Test suspension'), 'NotFoundError');
    const token = await uc.auth.openSession(chaima.id);
    let closed = 0;
    c.hub.subscribe(chaima.id, { send: () => {}, close: () => { closed++; } });
    await uc.admin.suspend(admin, chaima.id, 'Comportement abusif');
    expect(closed).toBe(1);
    expect(await uc.auth.authenticate(token)).toEqual({ user: null, suspended: true });
    await rejects(uc.auth.login({ email: 'chaima@campus.tn', password: 'Student123!' }, '3.3.3.3'), 'ForbiddenError', /suspendu/);
    expect((await uc.requests.list(await as(c, 'alice@campus.tn'), {})).items.every((r) => r.authorName !== 'Chaima Gharbi')).toBe(true);
    await uc.admin.reactivate(admin, chaima.id);
    expect((await uc.auth.authenticate(token)).user?.id).toBe(chaima.id);
    expect((await uc.admin.users({ status: 'suspended' })).items).toHaveLength(0);
  });
});

describe('rappels de séance', () => {
  it('veille puis une heure avant, une seule fois chacun, uniquement si confirmée', async () => {
    const alice = await as(c, 'alice@campus.tn'), chaima = await as(c, 'chaima@campus.tn');
    const { id } = await uc.requests.create(chaima, newRequest({ title: 'Séance pour les rappels' }));
    await uc.requests.createOffer(alice, id, { message: 'Avec plaisir, je suis disponible.' });
    const offer = (await uc.requests.detail(chaima, id)).offers[0];
    await uc.requests.respond(chaima, offer.id, 'accept');
    const tomorrow = new Date(Date.now() + 3600e3 + 20 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
    await uc.requests.proposePlan(chaima, id, { startsAt: tomorrow, location: 'Salle 7' });
    const countRemind = async (u: typeof alice) => (await uc.notifications.list(u)).items.filter((n) => n.type === 'reminder').length;
    expect(await uc.reminders.run()).toBe(0); // proposée mais pas confirmée
    await uc.requests.confirmPlan(alice, id);
    const before = await countRemind(chaima);
    expect(await uc.reminders.run()).toBe(2);
    expect(await uc.reminders.run()).toBe(0);
    expect(await countRemind(chaima)).toBe(before + 1);
    // une heure avant : le rappel imminent part une seule fois, puis plus rien
    const startMs = Date.parse(tomorrow.replace(' ', 'T') + ':00Z') - 3600e3;
    const nearly = new Date(startMs - 30 * 60e3);
    expect(await uc.reminders.run(nearly)).toBe(2);
    expect(await uc.reminders.run(nearly)).toBe(0);
  });
});
