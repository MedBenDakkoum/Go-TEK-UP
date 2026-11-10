import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AppConfig, Clock } from '../../application/ports/services';

/** Réglages lus à chaque appel (variables d'environnement, voir README). */
export class EnvConfig implements AppConfig {
  allowedEmailDomains(): string[] {
    return (process.env.ALLOWED_EMAIL_DOMAINS ?? 'tek-up.de,tek-up.tn').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  requireEmailVerification(): boolean { return process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'; }
  appUrl(): string { return process.env.APP_URL || 'http://localhost:3000'; }
}

export class SystemClock implements Clock {
  now(): Date { return new Date(); }
}

export const cookieSecure = (): boolean => process.env.COOKIE_SECURE === 'true';
export const dataDir = (): string => process.env.DATA_DIR || path.join(process.cwd(), 'data');

/** Secret JWT : variable d'environnement, sinon généré une fois et conservé dans le dossier de données (développement). */
export function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET est obligatoire en production (ex. : openssl rand -hex 32).');
  const file = path.join(dataDir(), 'jwt.secret');
  fs.mkdirSync(dataDir(), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'));
  return fs.readFileSync(file, 'utf8');
}
