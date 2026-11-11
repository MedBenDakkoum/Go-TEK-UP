import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AppConfig, Clock } from '../../application/ports/services';

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(?:\/|$)/i;
const stripTrailingSlashes = (url: string) => url.trim().replace(/\/+$/, '');
const stripProtocol = (host: string) => host.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

/**
 * URL publique du site, utilisée notamment dans les liens de vérification.
 * En production (Vercel), si APP_URL est absent ou pointe encore vers localhost, on retombe sur le domaine
 * de production fourni par Vercel : un lien cassé ne doit jamais être envoyé par e-mail.
 */
export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  const isDeployment = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  if (isDeployment && vercelHost && (!explicit || LOCAL_HOST.test(explicit))) {
    return `https://${stripProtocol(vercelHost)}`;
  }
  return stripTrailingSlashes(explicit || 'http://localhost:3000');
}

/** Réglages lus à chaque appel (variables d'environnement, voir README). */
export class EnvConfig implements AppConfig {
  allowedEmailDomains(): string[] {
    return (process.env.ALLOWED_EMAIL_DOMAINS ?? 'tek-up.de,tek-up.tn').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  requireEmailVerification(): boolean {
    // En production, la vérification d'e-mail est toujours exigée (impossible de la désactiver par erreur).
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) return true;
    return process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
  }
  appUrl(): string { return appUrl(); }
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
