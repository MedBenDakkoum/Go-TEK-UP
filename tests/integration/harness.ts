import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { buildContainer, type Container } from '@/infrastructure/container';
import { createPrismaClient } from '@/infrastructure/prisma/client';
import { SseHub } from '@/infrastructure/realtime/sse-hub';
import { seedDemo } from '@/infrastructure/seed';
import { NodemailerMailer } from '@/infrastructure/mail/mailer';
import type { AuthUser } from '@/domain';

export const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://campus:campus@localhost:5432/cc_test';

/** Repart d'un schéma vide : applique les migrations Prisma (fichiers SQL) puis les données de démonstration. */
export async function freshContainer(): Promise<Container> {
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
  process.env.ALLOWED_EMAIL_DOMAINS = 'campus.tn';
  process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
  const client = new pg.Client({ connectionString: TEST_DB });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const dir = path.resolve(__dirname, '../../prisma/migrations');
  for (const m of fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory()).sort()) {
    await client.query(fs.readFileSync(path.join(dir, m, 'migration.sql'), 'utf8'));
  }
  await client.end();
  NodemailerMailer.outbox = [];
  const prisma = createPrismaClient(TEST_DB);
  await seedDemo(prisma);
  return buildContainer(prisma, new SseHub());
}

/** Utilisateur authentifié (comme le ferait la couche HTTP à partir du cookie). */
export async function as(c: Container, email: string): Promise<AuthUser> {
  const u = await c.deps.repos.users.findByEmail(email);
  if (!u) throw new Error('utilisateur de test introuvable : ' + email);
  const { id, name, role, speciality, level, skills } = u;
  return { id, name, email, role, speciality, level, skills };
}

export const rejects = async (p: Promise<unknown>, name: string, message?: RegExp) => {
  const err = await p.then(() => null, (e: Error) => e);
  if (!err) throw new Error('une erreur ' + name + ' était attendue');
  if (err.name !== name) throw new Error(`attendu ${name}, reçu ${err.name} : ${err.message}`);
  if (message && !message.test(err.message)) throw new Error(`message inattendu : ${err.message}`);
};

export const futureLocal = (days = 2, hour = 15) => {
  const t = new Date(Date.now() + 3600e3 + days * 86400e3);
  return `${t.toISOString().slice(0, 10)} ${String(hour).padStart(2, '0')}:00`;
};
