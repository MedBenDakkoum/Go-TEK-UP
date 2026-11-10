import { defineConfig } from 'prisma/config';

// Prisma 7 : l'URL de connexion n'est plus dans schema.prisma. Elle est lue ici (variable d'environnement DATABASE_URL).
try { process.loadEnvFile(); } catch { /* pas de .env */ }

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://campus:campus@localhost:5432/campusconnect' },
});
