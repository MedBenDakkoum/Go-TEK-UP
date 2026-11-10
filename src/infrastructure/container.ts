import { Notifier } from '../application/services/notifier';
import { createUseCases, type UseCases } from '../application/use-cases';
import type { Deps } from '../application/deps';
import type { RealtimeHub } from '../application/ports/services';
import { cookieSecure, EnvConfig, SystemClock } from './config/env';
import { NodemailerMailer } from './mail/mailer';
import { createPrismaClient } from './prisma/client';
import type { PrismaClient } from './prisma/generated/client';
import { createQueries } from './prisma/queries';
import { createRepositories, PrismaUnitOfWork } from './prisma/repositories';
import { MemoryRateLimiter } from './rate-limit/memory-rate-limiter';
import { SseHub } from './realtime/sse-hub';
import { BcryptHasher, CryptoSecureTokens, JoseSessionTokens } from './security/security';

export const SESSION_COOKIE = 'cc_token';
export const SESSION_MAX_AGE_S = 7 * 24 * 3600;

export interface Container {
  useCases: UseCases;
  hub: RealtimeHub;
  prisma: PrismaClient;
  deps: Deps;
  /** Options du cookie de session (httpOnly, SameSite=Lax). */
  sessionCookie: () => { httpOnly: true; sameSite: 'lax'; path: '/'; maxAge: number; secure: boolean };
}

/** Racine de composition : seul endroit où les implémentations (adapters) sont reliées aux ports de l'application. */
export function buildContainer(prisma: PrismaClient = createPrismaClient(), hub: RealtimeHub = new SseHub()): Container {
  const repos = createRepositories(prisma);
  const notifier = new Notifier(repos.notifications, hub);
  const deps: Deps = {
    repos, uow: new PrismaUnitOfWork(prisma), queries: createQueries(prisma),
    hasher: new BcryptHasher(), sessions: new JoseSessionTokens(), secureTokens: new CryptoSecureTokens(),
    mailer: new NodemailerMailer(), realtime: hub,
    loginLimiter: new MemoryRateLimiter(5, 15 * 60 * 1000), // 5 échecs / 15 min / (IP + e-mail)
    mailLimiter: new MemoryRateLimiter(3, 60 * 60 * 1000), // 3 e-mails / heure / adresse et par usage
    clock: new SystemClock(), config: new EnvConfig(), notifier,
  };
  return {
    useCases: createUseCases(deps), hub, prisma, deps,
    sessionCookie: () => ({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE_S, secure: cookieSecure() }),
  };
}

// Un seul conteneur par processus (le rechargement à chaud de Next recharge les modules : on le garde sur globalThis).
const g = globalThis as unknown as { __campusContainer?: Container };
export function getContainer(): Container {
  return (g.__campusContainer ??= buildContainer());
}
