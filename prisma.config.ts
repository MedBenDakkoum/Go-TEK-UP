import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 ne charge plus automatiquement .env : on le charge explicitement ici (sans écraser
// les variables déjà définies dans l'environnement, qui restent prioritaires).
try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch {
  console.warn('[prisma] Aucun fichier .env trouvé : utilisation des variables d’environnement existantes.');
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Valeur de repli uniquement pour `prisma generate` (qui ne se connecte pas à la base).
    url: databaseUrl ?? 'postgresql://postgres:postgres@127.0.0.1:5433/TEK_DB',
  },
});