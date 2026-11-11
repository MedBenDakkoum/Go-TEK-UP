import { conflict, DomainError, fieldError, ForbiddenError, BadInputError, TooManyAttemptsError, UnauthorizedError } from '../../domain/errors';
import { normalizeSkills, type AuthUser } from '../../domain/user';
import { verificationEmail } from '../services/email-templates';
import type { Deps } from '../deps';
import type { LoginInput, RegisterInput, ResetInput } from '../validation/schemas';
import { toPublicUser } from './users';

export function createAuthUseCases(d: Deps) {
  const { repos } = d;

  const consumeToken = (token: string, purpose: 'reset' | 'verify') =>
    repos.authTokens.consume(d.secureTokens.hash(token), purpose, d.clock.now());

  async function issueToken(userId: number, purpose: 'reset' | 'verify', ttlMs: number) {
    const token = d.secureTokens.random();
    await repos.authTokens.issue({ userId, purpose, tokenHash: d.secureTokens.hash(token), expiresAt: new Date(d.clock.now().getTime() + ttlMs) });
    return token;
  }

  async function sendVerification(userId: number, email: string, name: string) {
    const token = d.secureTokens.random();
    const expiresAt = new Date(d.clock.now().getTime() + 24 * 3600e3);
    // Le nouveau jeton est stocké avant l'envoi, mais les anciens restent valides tant que l'envoi n'a pas réussi.
    const tokenId = await repos.authTokens.create({ userId, purpose: 'verify', tokenHash: d.secureTokens.hash(token), expiresAt });
    try {
      const content = verificationEmail({ name, link: `${d.config.appUrl()}/verify-email?token=${encodeURIComponent(token)}` });
      await d.mailer.send(email, content.subject, content.text, content.html);
    } catch (e) {
      // Envoi échoué : on supprime uniquement le nouveau jeton, le lien précédent reste utilisable.
      await repos.authTokens.deleteById(tokenId).catch((err) => console.error('[Auth] Suppression du jeton non envoyé échouée :', (err as Error).message));
      throw e;
    }
    // Envoi réussi : les jetons de vérification plus anciens deviennent inutilisables, sans toucher aux plus récents.
    await repos.authTokens.invalidateOlder(userId, 'verify', tokenId)
      .catch((err) => console.error('[Auth] Invalidation des anciens jetons échouée :', (err as Error).message));
  }

  return {
    /** Crée le compte. Si une vérification d'e-mail est requise, aucune session n'est ouverte avant la confirmation. */
    async register(input: RegisterInput): Promise<{ id: number; pendingVerification: boolean }> {
      if (input.password !== input.confirm) fieldError('confirm', 'Les mots de passe ne correspondent pas');
      const domains = d.config.allowedEmailDomains();
      const domain = input.email.split('@')[1]?.toLowerCase();
      if (domains.length && !domains.includes(domain)) {
        fieldError('email', `Inscription réservée aux adresses de l’école (${domains.map((x) => '@' + x).join(', ')})`);
      }
      if (await repos.users.findByEmail(input.email)) conflict('Cette adresse e-mail est déjà utilisée.');
      const verify = d.config.requireEmailVerification();
      const user = await repos.users.create({
        name: input.name, email: input.email, passwordHash: await d.hasher.hash(input.password),
        speciality: input.speciality, level: input.level, skills: normalizeSkills(input.skills), emailVerified: !verify,
      });
      if (verify) {
        try {
          await sendVerification(user.id, input.email, user.name);
        } catch {
          // Inscription atomique : sans e-mail envoyé, on retire le compte pour permettre un nouvel essai.
          await repos.users.delete(user.id).catch((e) => console.error('[Auth] Nettoyage du compte échoué :', (e as Error).message));
          throw new DomainError(
            'L’e-mail de confirmation n’a pas pu être envoyé. Vérifiez votre adresse e-mail puis réessayez dans quelques minutes.',
            'EMAIL_DELIVERY_FAILED',
          );
        }
      }
      return { id: user.id, pendingVerification: verify };
    },

    /** Retourne l'identifiant de l'utilisateur connecté (la couche présentation ouvre la session). */
    async login(input: LoginInput, ip = ''): Promise<number> {
      const key = `${ip}|${input.email}`;
      if (d.loginLimiter.blocked(key)) throw new TooManyAttemptsError('Trop de tentatives de connexion. Réessayez dans 15 minutes.');
      const u = await repos.users.findByEmail(input.email);
      const ok = await d.hasher.verify(input.password, u?.passwordHash);
      if (!u || !ok) {
        d.loginLimiter.add(key);
        throw new UnauthorizedError('E-mail ou mot de passe incorrect.');
      }
      d.loginLimiter.clear(key);
      if (u.suspended) throw new ForbiddenError(`Votre compte est suspendu. Motif : ${u.suspendedReason || 'non précisé'}.`, 'ACCOUNT_SUSPENDED');
      if (!u.emailVerified) throw new ForbiddenError('Adresse e-mail non vérifiée : cliquez sur le lien reçu par e-mail.', 'EMAIL_NOT_VERIFIED');
      return u.id;
    },

    openSession: (userId: number) => d.sessions.sign(userId),

    async verifyEmail(token: string): Promise<void> {
      const userId = await consumeToken(token, 'verify');
      if (userId === null) throw new BadInputError('Lien invalide ou expiré. Demandez un nouveau lien depuis la page de connexion.');
      await repos.users.update(userId, { emailVerified: true });
    },

    /** Réponse identique que le compte existe ou non (pas d'énumération des e-mails). */
    async resendVerification(email: string): Promise<void> {
      const key = `verify|${email}`;
      if (d.mailLimiter.blocked(key)) return;
      d.mailLimiter.add(key);
      const u = await repos.users.findByEmail(email);
      if (u && !u.emailVerified) {
        // Réponse volontairement identique en cas d'échec SMTP (pas d'énumération des comptes).
        await sendVerification(u.id, email, u.name).catch(() => undefined);
      }
    },

    async forgotPassword(email: string): Promise<void> {
      const key = `reset|${email}`;
      if (d.mailLimiter.blocked(key)) return;
      d.mailLimiter.add(key);
      const u = await repos.users.findByEmail(email);
      if (!u) return;
      const token = await issueToken(u.id, 'reset', 3600e3);
      try {
        await d.mailer.send(
          email,
          'Go-TEK-UP : réinitialisation du mot de passe',
          `Bonjour,\n\nPour choisir un nouveau mot de passe (lien valable 1 heure) :\n${d.config.appUrl()}/reset-password?token=${encodeURIComponent(token)}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
        );
      } catch {
        // Même réponse au client ; le jeton créé est invalidé pour ne pas rester orphelin.
        await consumeToken(token, 'reset').catch(() => undefined);
      }
    },

    async resetPassword(input: ResetInput): Promise<void> {
      if (input.password !== input.confirm) fieldError('confirm', 'Les mots de passe ne correspondent pas');
      const userId = await consumeToken(input.token, 'reset');
      if (userId === null) throw new BadInputError('Lien invalide ou expiré. Refaites une demande.');
      await repos.users.update(userId, { passwordHash: await d.hasher.hash(input.password) });
    },

    /**
     * Identifie l'appelant à partir du jeton de session. Le rôle et la suspension sont relus en base à chaque appel
     * (une suspension prend effet immédiatement, le jeton ne fait jamais foi).
     */
    async authenticate(token: string | undefined | null): Promise<{ user: AuthUser | null; suspended: boolean }> {
      if (!token) return { user: null, suspended: false };
      const id = await d.sessions.verify(token);
      if (id === null) return { user: null, suspended: false };
      const u = await repos.users.findById(id);
      if (!u) return { user: null, suspended: false };
      if (u.suspended) return { user: null, suspended: true };
      // Une session existante ne doit pas contourner une vérification d'e-mail devenue obligatoire.
      if (d.config.requireEmailVerification() && !u.emailVerified) return { user: null, suspended: false };
      const { id: uid, name, email, role, speciality, level, skills } = u;
      return { user: { id: uid, name, email, role, speciality, level, skills }, suspended: false };
    },

    async currentUser(userId: number) {
      return toPublicUser(d, userId);
    },
  };
}
