import { planReminder } from '../../domain/reminders';
import type { Deps } from '../deps';

/**
 * Rappels de séance : une notification (en temps réel) la veille (dans les 24 h) et une heure avant, pour les séances
 * individuelles CONFIRMÉES et les séances collectives ouvertes, à chaque participant. Chaque rappel n'est envoyé qu'une fois.
 */
export function createReminderUseCases(d: Deps) {
  let running = false;

  async function remind(kind: 'plan' | 'group', s: { id: number; title: string; startsAt: string; location: string; userIds: number[] }, link: string, now: Date) {
    const plan = planReminder(s.startsAt, now);
    if (plan.kind === 'none') return 0;
    let sent = 0;
    for (const uid of new Set(s.userIds)) {
      if (plan.kind === 'hour') {
        // Dans l'heure : rappel « imminent » ; le rappel « veille » est marqué comme passé pour ne pas arriver ensuite.
        await d.repos.reminders.markSent(kind, s.id, uid, 'day');
        if (await d.repos.reminders.markSent(kind, s.id, uid, 'hour')) {
          await d.notifier.create(uid, 'reminder', `Rappel : « ${s.title} » commence dans moins d’une heure (${plan.time}, ${s.location}).`, link);
          sent++;
        }
      } else if (await d.repos.reminders.markSent(kind, s.id, uid, 'day')) {
        await d.notifier.create(uid, 'reminder', `Rappel : « ${s.title} » a lieu ${plan.today ? 'aujourd’hui' : 'demain'} à ${plan.time} (${s.location}).`, link);
        sent++;
      }
    }
    return sent;
  }

  return {
    /** Traite les rappels dus à l'instant `now` ; retourne le nombre de notifications envoyées. */
    async run(now: Date = d.clock.now()): Promise<number> {
      if (running) return 0;
      running = true;
      try {
        let sent = 0;
        for (const p of await d.queries.reminderPlans()) sent += await remind('plan', p, `/requests/${p.id}`, now);
        for (const g of await d.queries.reminderGroups()) sent += await remind('group', g, `/sessions/${g.id}`, now);
        return sent;
      } finally {
        running = false;
      }
    },
  };
}
