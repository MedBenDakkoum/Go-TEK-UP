import { HOUR_MS, localToMs } from './time';

export type ReminderPlan =
  | { kind: 'none' }
  | { kind: 'day'; today: boolean; time: string }
  | { kind: 'hour'; time: string };

/**
 * Quel rappel envoyer pour une séance commençant à `startsAt` (heure locale) ?
 *  - dans l'heure : rappel « imminent » (le rappel « veille » est alors considéré comme passé) ;
 *  - entre 1 h et 24 h : rappel « veille » (aujourd'hui ou demain) ; sinon : rien.
 */
export function planReminder(startsAt: string, now: Date): ReminderPlan {
  const until = localToMs(startsAt) - now.getTime();
  if (until <= 0 || until > 24 * HOUR_MS) return { kind: 'none' };
  const time = startsAt.slice(11, 16);
  if (until <= HOUR_MS) return { kind: 'hour', time };
  const today = new Date(now.getTime() + HOUR_MS).toISOString().slice(0, 10) === startsAt.slice(0, 10);
  return { kind: 'day', today, time };
}
