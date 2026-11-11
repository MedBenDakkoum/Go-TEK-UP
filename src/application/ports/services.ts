/** Ports des services techniques (sécurité, e-mail, temps réel, horloge, configuration). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /** `hash` absent : compare quand même à un faux hachage (temps de réponse constant, pas d'énumération des comptes). */
  verify(plain: string, hash: string | null | undefined): Promise<boolean>;
}
export interface SessionTokens {
  sign(userId: number): Promise<string>;
  /** Identifiant d'utilisateur du jeton, ou null s'il est invalide ou expiré. */
  verify(token: string): Promise<number | null>;
}
export interface SecureTokens {
  random(): string;
  hash(token: string): string;
}
export interface Mailer {
  /** `html` est facultatif : il est joint à la version texte (repli pour les clients sans HTML). */
  send(to: string, subject: string, text: string, html?: string): Promise<void>;
}
export type RealtimeEvent = 'notification' | 'unread' | 'message';
export interface Realtime {
  emit(userId: number, event: RealtimeEvent, payload: unknown): void;
  /** Coupe les connexions temps réel ouvertes d'un utilisateur (compte suspendu). */
  disconnectUser(userId: number): void;
}
/** Limiteur de débit : `max` événements par fenêtre et par clé. */
export interface RateLimiter {
  blocked(key: string): boolean;
  add(key: string): void;
  clear(key: string): void;
}
export interface Clock { now(): Date }
export interface AppConfig {
  allowedEmailDomains(): string[];
  requireEmailVerification(): boolean;
  appUrl(): string;
}

export interface RealtimeListener {
  send(event: RealtimeEvent, payload: unknown): void;
  close(): void;
}
/** Temps réel côté serveur : en plus de l'émission, la couche présentation s'abonne pour ouvrir un flux par utilisateur. */
export interface RealtimeHub extends Realtime {
  subscribe(userId: number, listener: RealtimeListener): () => void;
}
