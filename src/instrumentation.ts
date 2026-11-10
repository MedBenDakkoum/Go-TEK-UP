/** Démarrage du serveur Next.js : données initiales (base vide) et planificateur des rappels de séance. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBackgroundJobs } = await import('./infrastructure/jobs');
    await startBackgroundJobs();
  }
}
