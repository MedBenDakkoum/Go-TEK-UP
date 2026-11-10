import { createPrismaClient } from '../src/infrastructure/prisma/client';
import { seedDemo } from '../src/infrastructure/seed';

// `npm run db:seed` : (ré)initialise les données de démonstration. Efface d'abord les tables : réservé au développement.
try { process.loadEnvFile(); } catch { /* pas de fichier .env : on utilise l'environnement */ }

const prisma = createPrismaClient();
try {
  await prisma.$executeRawUnsafe('TRUNCATE users, requests, offers, reviews, reports, session_plans, group_sessions, group_members, notifications, messages, auth_tokens, admin_actions, reminders_sent RESTART IDENTITY CASCADE');
  await seedDemo(prisma);
  console.log('Données de démonstration créées.');
} finally {
  await prisma.$disconnect();
}
