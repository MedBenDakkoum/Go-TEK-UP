import type { NotificationRepository } from '../ports/repositories';
import type { Realtime } from '../ports/services';

/** Crée les notifications et les pousse en temps réel (cloche, toasts, rechargement des pages concernées). */
export class Notifier {
  constructor(private notifications: NotificationRepository, private realtime: Realtime) {}

  /** Ignorée si pas de destinataire ou si le destinataire est l'auteur de l'action (`exceptUserId`). */
  async create(userId: number | undefined | null, type: string, message: string, link = '', exceptUserId?: number): Promise<void> {
    if (!userId || userId === exceptUserId) return;
    const n = await this.notifications.create({ userId, type, message, link });
    this.realtime.emit(userId, 'notification', { id: n.id, type: n.type, message: n.message, link: n.link, read: false, createdAt: n.createdAt.toISOString() });
    this.realtime.emit(userId, 'unread', { unread: await this.notifications.countUnread(userId) });
  }

  /** Pour les messages de chat : une seule notification non lue par conversation. */
  async createOnce(userId: number, type: string, message: string, link: string): Promise<void> {
    if (await this.notifications.hasUnread(userId, type, link)) return;
    await this.create(userId, type, message, link);
  }
}
