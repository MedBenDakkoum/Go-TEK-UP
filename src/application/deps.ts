import type { Queries } from './ports/queries';
import type { Repositories, UnitOfWork } from './ports/repositories';
import type { AppConfig, Clock, Mailer, PasswordHasher, RateLimiter, Realtime, SecureTokens, SessionTokens } from './ports/services';
import type { Notifier } from './services/notifier';

/** Tout ce dont les cas d'usage ont besoin, fourni par la racine de composition (infrastructure/container.ts). */
export interface Deps {
  repos: Repositories;
  uow: UnitOfWork;
  queries: Queries;
  hasher: PasswordHasher;
  sessions: SessionTokens;
  secureTokens: SecureTokens;
  mailer: Mailer;
  realtime: Realtime;
  loginLimiter: RateLimiter;
  mailLimiter: RateLimiter;
  clock: Clock;
  config: AppConfig;
  notifier: Notifier;
}
