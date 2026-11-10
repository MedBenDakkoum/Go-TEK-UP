import { seedIfEmpty } from './seed';
import { getContainer } from './container';

const g = globalThis as unknown as { __campusJobs?: NodeJS.Timeout };

/** Au démarrage du serveur : données initiales si la base est vide, puis rappels de séance toutes les minutes. */
export async function startBackgroundJobs(): Promise<void> {
  const c = getContainer();
  await seedIfEmpty(c.prisma).catch((e) => console.error('[Seed]', e));
  if (process.env.DISABLE_SCHEDULER === '1' || g.__campusJobs) return;
  const tick = () => c.useCases.reminders.run().catch((e: Error) => console.error('[Rappels]', e.message));
  g.__campusJobs = setInterval(tick, 60_000);
  g.__campusJobs.unref?.();
  void tick();
}
