import nodemailer from 'nodemailer';
import type { Mailer } from '../../application/ports/services';

export interface Mail { to: string; subject: string; text: string }

/**
 * Envoi d'e-mails. Si SMTP_HOST est défini (SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM), le message est envoyé ;
 * sinon (développement / démonstration) le contenu, lien compris, est écrit dans la console du serveur.
 */
export class NodemailerMailer implements Mailer {
  /** Derniers messages « envoyés » (utilisé par les tests). */
  static outbox: Mail[] = [];
  private transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;

  async send(to: string, subject: string, text: string) {
    NodemailerMailer.outbox = [...NodemailerMailer.outbox.slice(-49), { to, subject, text }];
    if (!this.transport) {
      if (process.env.NODE_ENV !== 'test') console.warn(`[Mail] SMTP non configuré : e-mail simulé pour ${to}\n  Objet : ${subject}\n  ${text.replace(/\n/g, '\n  ')}`);
      return;
    }
    try {
      await this.transport.sendMail({ from: process.env.MAIL_FROM || 'CampusConnect <no-reply@campusconnect.local>', to, subject, text });
    } catch (e) {
      console.error(`[Mail] Échec d'envoi à ${to} : ${(e as Error).message}`);
    }
  }
}
