import type { GroupEntity } from '../../domain/entities';
import { conflict, fieldError, forbid, notFound } from '../../domain/errors';
import { isFuture, isValidLocal, nowLocal, normalizeLocal } from '../../domain/time';
import type { AuthUser } from '../../domain/user';
import type { Deps } from '../deps';
import type { GroupCardView, GroupDetailView } from '../read-models';
import type { GroupInput } from '../validation/schemas';
import { forbidAdmin } from './guards';

const toCard = (g: GroupEntity): GroupCardView => ({
  id: g.id, hostId: g.hostId, title: g.title, description: g.description, subject: g.subject, level: g.level, startsAt: g.startsAt,
  location: g.location, capacity: g.capacity, status: g.status, createdAt: g.createdAt.toISOString(), hostName: g.hostName, membersCount: g.membersCount,
});

/** Séances collectives de révision : un étudiant en organise une, d'autres s'y inscrivent dans la limite des places. */
export function createGroupUseCases(d: Deps) {
  const { repos, notifier } = d;
  const mustFind = async (id: number) => (await repos.groups.findById(id)) ?? notFound('Séance introuvable.');
  const link = (id: number) => `/sessions/${id}`;

  return {
    /**
     * Séances proposées par les AUTRES étudiants (celles que vous organisez ou avez rejointes sont dans « Mon espace »).
     * L'administrateur voit toutes les séances.
     */
    async list(user: AuthUser, scope?: string): Promise<{ items: GroupCardView[] }> {
      const items = await d.queries.listGroups({
        upcoming: scope !== 'past', nowLocal: nowLocal(d.clock.now()), excludeUserId: user.role === 'admin' ? undefined : user.id,
      });
      return { items };
    },

    async create(user: AuthUser, input: GroupInput) {
      forbidAdmin(user);
      if (!isValidLocal(input.startsAt)) fieldError('startsAt', 'Date et heure invalides');
      if (!isFuture(input.startsAt, d.clock.now())) fieldError('startsAt', 'La séance doit avoir lieu dans le futur');
      const id = await repos.groups.create({ hostId: user.id, ...input, startsAt: normalizeLocal(input.startsAt) });
      return { id };
    },

    async detail(user: AuthUser, id: number): Promise<GroupDetailView> {
      const g = await mustFind(id);
      const isHost = g.hostId === user.id;
      const members = await repos.groups.members(id);
      const joined = members.some((m) => m.id === user.id);
      const future = isFuture(g.startsAt, d.clock.now());
      const isAdmin = user.role === 'admin';
      return {
        session: toCard(g),
        // La liste nominative des inscrits n'est visible que de l'organisateur, des inscrits et de l'administrateur.
        members: isHost || joined || isAdmin ? members : [],
        permissions: {
          isHost, joined, isAdmin,
          canJoin: !isAdmin && !isHost && !joined && g.status === 'open' && future && g.membersCount < g.capacity,
          canLeave: joined && g.status === 'open',
          canCancel: isHost && g.status === 'open',
          full: g.membersCount >= g.capacity,
          past: !future,
        },
      };
    },

    async join(user: AuthUser, id: number) {
      forbidAdmin(user);
      const g = await d.uow.run(async (tx) => {
        // 1) on verrouille la séance ; 2) ensuite seulement on compte les inscrits (lecture faite après le verrou) :
        // deux inscriptions simultanées ne peuvent donc pas dépasser le nombre de places.
        const g = await tx.groups.lockById(id);
        if (!g) notFound('Séance introuvable.');
        const grp = g as GroupEntity;
        if (grp.hostId === user.id) forbid('Vous organisez déjà cette séance.');
        if (grp.status !== 'open') conflict('Cette séance a été annulée.');
        if (!isFuture(grp.startsAt, d.clock.now())) conflict('Cette séance est déjà passée.');
        if (await tx.groups.isMember(id, user.id)) conflict('Vous êtes déjà inscrit(e).');
        if ((await tx.groups.countMembers(id)) >= grp.capacity) conflict('Cette séance est complète.');
        await tx.groups.addMember(id, user.id);
        return grp;
      });
      await notifier.create(g.hostId, 'group', `${user.name} a rejoint votre séance « ${g.title} ».`, link(id));
      return { ok: true };
    },

    async leave(user: AuthUser, id: number) {
      const g = await mustFind(id);
      if (!(await repos.groups.isMember(id, user.id))) conflict('Vous n’êtes pas inscrit(e) à cette séance.');
      if (g.status !== 'open') conflict('Cette séance a été annulée.');
      await repos.groups.removeMember(id, user.id);
      await notifier.create(g.hostId, 'group', `${user.name} s’est désinscrit(e) de « ${g.title} ».`, link(id));
      return { ok: true };
    },

    async cancel(user: AuthUser, id: number) {
      const g = await mustFind(id);
      if (g.hostId !== user.id) forbid('Seul l’organisateur peut annuler la séance.');
      if (g.status !== 'open') conflict('Cette séance est déjà annulée.');
      await repos.groups.setStatus(id, 'cancelled');
      for (const uid of await repos.groups.memberIds(id)) {
        await notifier.create(uid, 'group', `La séance « ${g.title} » a été annulée par son organisateur.`, link(id));
      }
      return { ok: true };
    },
  };
}
