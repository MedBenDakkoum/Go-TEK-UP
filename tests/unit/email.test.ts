import { afterEach, describe, expect, it } from 'vitest';
import { appUrl } from '@/infrastructure/config/env';
import { verificationEmail } from '@/application/services/email-templates';

const ENV_KEYS = ['APP_URL', 'VERCEL', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL'] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('URL publique et modèles d’e-mail', () => {
  it('retire le slash final de APP_URL', () => {
    process.env.APP_URL = 'https://go-tek-up.vercel.app/';
    expect(appUrl()).toBe('https://go-tek-up.vercel.app');
  });

  it('sur Vercel, remplace un APP_URL localhost par le domaine de production', () => {
    process.env.VERCEL = '1';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'go-tek-up.vercel.app';
    expect(appUrl()).toBe('https://go-tek-up.vercel.app');
  });

  it('sur Vercel sans APP_URL, utilise l’URL de déploiement', () => {
    delete process.env.APP_URL;
    process.env.VERCEL = '1';
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = 'preview-abc.vercel.app';
    expect(appUrl()).toBe('https://preview-abc.vercel.app');
  });

  it('produit un lien texte et un HTML échappé', () => {
    const link = 'https://go-tek-up.vercel.app/verify-email?token=abc123';
    const mail = verificationEmail({ name: '<Alice> & Bob', link });
    expect(mail.subject).toContain('confirmez');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(link);
    expect(mail.html).toContain('&lt;Alice&gt;');
    expect(mail.html).not.toContain('<Alice>');
  });
});
