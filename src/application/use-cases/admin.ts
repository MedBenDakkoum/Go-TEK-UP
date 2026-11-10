import { conflict, forbid, notFound } from '../../domain/errors';
import type { AuthUser } from '../../domain/user';
import type { Deps } from '../deps';
import type { AdminActionView, AdminOverviewView, AdminUserView, Page } from '../read-models';

const USERS_PAGE = 20;

/** Modération. Chaque action sensible est consignée dans le journal (admin_actions). */
export function createAdminUseCases(d: Deps) {
  const { repos } = d;

  async function target(admin: AuthUser, id: number) {
    const u = (await repos.users.findById(id)) ?? notFound('Utilisateur introuvable.');
    if (u.id === admin.id) forbid('Vous ne pouvez pas modifier votre propre compte.');
    if (u.role === 'admin') forbid('Un compte administrateur ne peut pas être suspendu.');
    return u;
  }

  return {
    async overview(): Promise<AdminOverviewView> {
      const [reports, hidden, counts, actions] = await Promise.all([
        d.queries.adminReports(), d.queries.hiddenRequests(), d.queries.adminCounts(), d.queries.adminActions(15),
      ]);
      return { counts: { ...counts, openReports: reports.length }, reports, hidden, actions };
    },

    async actions(limit = 100): Promise<{ items: AdminActionView[] }> {
      return { items: await d.queries.adminActions(Math.min(limit, 200)) };
    },

    async resolveReport(admin: AuthUser, reportId: number, decision: 'hide' | 'dismiss') {
      await d.uow.run(async (tx) => {
        const p = (await tx.reports.findById(reportId)) ?? notFound('Signalement introuvable.');
        if (decision === 'hide') {
          await tx.requests.setHidden(p.requestId, true);
          await tx.reports.resolveAllForRequest(p.requestId);
          await tx.adminActions.record({ adminId: admin.id, action: 'Demande masquée', targetType: 'request', targetId: p.requestId, details: p.reason });
        } else {
          await tx.reports.resolve(reportId);
          await tx.adminActions.record({ adminId: admin.id, action: 'Signalement classé sans suite', targetType: 'request', targetId: p.requestId, details: p.reason });
        }
      });
      return { ok: true };
    },

    async restoreRequest(admin: AuthUser, requestId: number) {
      if (!(await repos.requests.setHidden(requestId, false))) notFound('Demande introuvable.');
      await repos.adminActions.record({ adminId: admin.id, action: 'Demande rétablie', targetType: 'request', targetId: requestId, details: '' });
      return { ok: true };
    },

    async users(query: { q?: unknown; status?: unknown; role?: unknown; page?: unknown }): Promise<Page<AdminUserView>> {
      const q = typeof query.q === 'string' ? query.q.trim().slice(0, 80) : '';
      const status = (['suspended', 'active', 'unverified'] as const).find((s) => s === query.status);
      const role = (['student', 'admin'] as const).find((r) => r === query.role);
      const page = Math.max(parseInt(String(query.page), 10) || 1, 1);
      const res = await d.queries.adminUsers({ q, status, role, page, pageSize: USERS_PAGE });
      return { ...res, pageSize: USERS_PAGE };
    },

    async suspend(admin: AuthUser, id: number, reason: string) {
      const u = await target(admin, id);
      if (u.suspended) conflict('Ce compte est déjà suspendu.');
      await d.uow.run(async (tx) => {
        await tx.users.update(id, { suspended: true, suspendedReason: reason, suspendedAt: d.clock.now() });
        await tx.adminActions.record({ adminId: admin.id, action: 'Compte suspendu', targetType: 'user', targetId: id, details: `${u.name} — ${reason}` });
      });
      d.realtime.disconnectUser(id); // coupe les connexions temps réel ouvertes ; l'API refuse déjà ses requêtes
      return { ok: true };
    },

    async reactivate(admin: AuthUser, id: number) {
      const u = await target(admin, id);
      if (!u.suspended) conflict('Ce compte n’est pas suspendu.');
      await d.uow.run(async (tx) => {
        await tx.users.update(id, { suspended: false, suspendedReason: '', suspendedAt: null });
        await tx.adminActions.record({ adminId: admin.id, action: 'Compte réactivé', targetType: 'user', targetId: id, details: u.name });
      });
      return { ok: true };
    },
  };
}
