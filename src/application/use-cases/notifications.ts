import { notFound } from '../../domain/errors';
import type { AuthUser } from '../../domain/user';
import type { Deps } from '../deps';
import type { NotificationView } from '../read-models';

export function createNotificationUseCases(d: Deps) {
  const { repos, realtime } = d;
  return {
    async list(user: AuthUser): Promise<{ items: NotificationView[]; unread: number }> {
      const items = await repos.notifications.list(user.id, 50);
      return {
        items: items.map((n) => ({ id: n.id, type: n.type, message: n.message, link: n.link, read: n.read, createdAt: n.createdAt.toISOString() })),
        unread: await repos.notifications.countUnread(user.id),
      };
    },
    async unread(user: AuthUser) {
      return { unread: await repos.notifications.countUnread(user.id) };
    },
    async markAll(user: AuthUser) {
      await repos.notifications.markAllRead(user.id);
      realtime.emit(user.id, 'unread', { unread: 0 });
      return { ok: true };
    },
    async markOne(user: AuthUser, id: number) {
      const n = await repos.notifications.findById(id);
      if (!n || n.userId !== user.id) notFound('Notification introuvable.');
      await repos.notifications.markRead(id);
      realtime.emit(user.id, 'unread', { unread: await repos.notifications.countUnread(user.id) });
      return { ok: true };
    },
  };
}
