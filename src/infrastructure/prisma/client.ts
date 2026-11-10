import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/client';

export type { Prisma };
export type Db = PrismaClient | Prisma.TransactionClient;

export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL manquant : définissez-le dans le fichier .env (ex. postgresql://campus:campus@localhost:5432/campusconnect).');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
