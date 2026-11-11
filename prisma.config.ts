
import path from 'node:path';
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch {
  console.warn('[prisma] No .env file found; using environment variables.');
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be defined.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
