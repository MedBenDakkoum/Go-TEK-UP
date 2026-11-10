import { conflict, fieldError, ForbiddenError, BadInputError, TooManyAttemptsError, UnauthorizedError } from '../../domain/errors';
import { normalizeSkills, type AuthUser } from '../../domain/user';
import type { Deps } from '../deps';
import type { LoginInput, RegisterInput, ResetInput } from '../validation/schemas';
import { toPublicUser } from './users';

export function createAuthUseCases(d: Deps) {
  const { repos } = d;

  async function sendVerification(userId: number, email: string) {
    const token = await issueToken(userId, 'verify', 24 * 3600e3);
    await d.mailer.send(
      email,
      'CampusConnect : confirmez votre adresse e-mail',
      `Bonjour,\n\nPour activer votre compte CampusConnect (lien valable 24 heures) :\n${d.config.appUrl()}/verify-email?token=${token}\n\nSi vous n’êtes pas à l’origine de cette inscription, ignorez ce message.`,
    );
  }

  async function issueToken(userId: number, purpose: 'reset' | 'verify', ttlMs: number) {
    const token = d.secureTokens.random();
    await repos.authTokens.issue({ userId, purpose, tokenHash: d.secureTokens.hash(token), expiresAt: new Date(d.clock.now().getTime() + ttlMs) });
    return token;
  }

  const consumeToken = (token: string, purpose: 'reset' | 'verify') =>
    repos.authTokens.consume(d.secureTokens.hash(token), purpose, d.clock.now());

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
      if (verify) await sendVerification(user.id, input.email);
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
      if (u && !u.emailVerified) await sendVerification(u.id, email);
    },

    async forgotPassword(email: string): Promise<void> {
      const key = `reset|${email}`;
      if (d.mailLimiter.blocked(key)) return;
      d.mailLimiter.add(key);
      const u = await repos.users.findByEmail(email);
      if (!u) return;
      const token = await issueToken(u.id, 'reset', 3600e3);
      await d.mailer.send(
        email,
        'CampusConnect : réinitialisation du mot de passe',
        `Bonjour,\n\nPour choisir un nouveau mot de passe (lien valable 1 heure) :\n${d.config.appUrl()}/reset-password?token=${token}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
      );
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
      const { id: uid, name, email, role, speciality, level, skills } = u;
      return { user: { id: uid, name, email, role, speciality, level, skills }, suspended: false };
    },

    async currentUser(userId: number) {
      return toPublicUser(d, userId);
    },
  };
}
