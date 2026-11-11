import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Mailer } from '../../application/ports/services';

export interface Mail { to: string; subject: string; text: string; html?: string }

/** Erreur d'envoi destinée à l'application : ne contient jamais les identifiants SMTP. */
export class MailDeliveryError extends Error {
  constructor(message: string, readonly causeCode?: string) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

interface SmtpError extends Error {
  code?: string;
  command?: string;
  responseCode?: number;
  response?: string;
}

const isProduction = () => process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const isGmailHost = (host: string) => /(^|\.)gmail\.com$/i.test(host.trim());

/** Adresse nue d'un champ `Nom <adresse@domaine>` ou `adresse@domaine`, en minuscules. */
const normalizeAddress = (value: string) => {
  const angle = /<([^>]+)>/.exec(value);
  return (angle ? angle[1] : value).trim().toLowerCase();
};

/** Résumé sûr pour les journaux serveur (jamais de mot de passe, jamais le contenu du message). */
const describeSmtpError = (e: unknown): string => {
  const err = e as SmtpError;
  return [
    err.code,
    err.responseCode ? `SMTP ${err.responseCode}` : '',
    err.command ? `commande ${err.command}` : '',
    err.message,
  ].filter(Boolean).join(' | ');
};

const smtpSettings = () => {
  const host = process.env.SMTP_HOST?.trim();
  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER?.trim(),
    // Mot de passe d'application Google : les espaces de présentation ne font pas partie du secret.
    pass: (process.env.SMTP_PASS ?? '').replace(/\s+/g, ''),
    mailFrom: process.env.MAIL_FROM?.trim(),
    production: isProduction(),
  };
};

const assertSenderIdentity = (settings: ReturnType<typeof smtpSettings>) => {
  if (!settings.production || !settings.host) return;
  if (!settings.user || !settings.mailFrom) {
    throw new Error('Configuration SMTP invalide : SMTP_USER et MAIL_FROM sont obligatoires en production.');
  }
  if (isGmailHost(settings.host)) {
    const from = normalizeAddress(settings.mailFrom);
    const user = normalizeAddress(settings.user);
    if (from !== user) {
      throw new Error('Configuration SMTP invalide : MAIL_FROM doit correspondre à SMTP_USER (même adresse e-mail).');
    }
  }
};

/**
 * Envoi d'e-mails. Si SMTP_HOST est défini (SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM), le message est envoyé ;
 * sinon (développement / démonstration) le contenu, lien compris, est écrit dans la console du serveur.
 *
 * En production, l'absence de SMTP ou une erreur d'envoi lève `MailDeliveryError` : l'appelant peut ainsi annuler
 * l'inscription au lieu de laisser un compte non vérifiable.
 */
export class NodemailerMailer implements Mailer {
  /** Derniers messages « envoyés » (utilisé par les tests). */
  static outbox: Mail[] = [];
  private transport: Transporter | null;
  private from: string;

  constructor() {
    const settings = smtpSettings();
    assertSenderIdentity(settings);
    this.transport = settings.host
      ? nodemailer.createTransport({
          host: settings.host,
          port: settings.port,
          // 465 = TLS implicite ; 587 (Gmail) = STARTTLS obligatoire sur une connexion claire.
          secure: settings.port === 465,
          requireTLS: settings.port !== 465,
          auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
          tls: { minVersion: 'TLSv1.2' as const },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
          pool: false,
        })
      : null;
    this.from = settings.mailFrom || 'Go-TEK-UP <no-reply@go-tek-up.local>';
    if (!settings.production && settings.host && settings.user && settings.mailFrom
      && normalizeAddress(settings.mailFrom) !== normalizeAddress(settings.user)) {
      // Gmail refuse un expéditeur différent du compte authentifié (ou d'un alias vérifié).
      console.warn('[Mail] MAIL_FROM ne correspond pas à SMTP_USER : Gmail peut refuser l’envoi.');
    }
  }

  async send(to: string, subject: string, text: string, html?: string) {
    NodemailerMailer.outbox = [...NodemailerMailer.outbox.slice(-49), { to, subject, text, ...(html ? { html } : {}) }];
    if (!this.transport) {
      if (process.env.NODE_ENV === 'production') {
        const message = 'SMTP non configuré : impossible d’envoyer les e-mails de vérification.';
        console.error(`[Mail] ${message} Destinataire : ${to}`);
        throw new MailDeliveryError(message, 'SMTP_NOT_CONFIGURED');
      }
      if (process.env.NODE_ENV !== 'test') console.warn(`[Mail] SMTP non configuré : e-mail simulé pour ${to}\n  Objet : ${subject}\n  ${text.replace(/\n/g, '\n  ')}`);
      return;
    }
    try {
      await this.transport.sendMail({ from: this.from, to, subject, text, ...(html ? { html } : {}) });
    } catch (e) {
      const details = describeSmtpError(e);
      console.error(`[Mail] Échec d'envoi à ${to} : ${details}`);
      throw new MailDeliveryError('L’envoi de l’e-mail a échoué.', (e as SmtpError).code);
    }
  }
}
