/**
 * Erreurs métier. Elles ne connaissent pas HTTP : la couche présentation les traduit en codes de statut.
 * Le type d'erreur est porté par `kind` (et non par `instanceof`) : en production, le serveur Next.js empaquette le code en
 * plusieurs « bundles » qui ne partagent pas les mêmes classes ; `kind` reste valable d'un bundle à l'autre.
 */
export type ErrorKind = 'domain' | 'validation' | 'bad_input' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'too_many_attempts';

export class DomainError extends Error {
  readonly isDomainError = true;
  constructor(message: string, readonly code?: string, readonly kind: ErrorKind = 'domain', name = 'DomainError') {
    super(message);
    this.name = name;
  }
}
export class ForbiddenError extends DomainError { constructor(m: string, code?: string) { super(m, code, 'forbidden', 'ForbiddenError'); } }
export class ConflictError extends DomainError { constructor(m: string, code?: string) { super(m, code, 'conflict', 'ConflictError'); } }
export class NotFoundError extends DomainError { constructor(m: string, code?: string) { super(m, code, 'not_found', 'NotFoundError'); } }
export class UnauthorizedError extends DomainError { constructor(m: string, code?: string) { super(m, code, 'unauthorized', 'UnauthorizedError'); } }
export class TooManyAttemptsError extends DomainError { constructor(m: string, code?: string) { super(m, code, 'too_many_attempts', 'TooManyAttemptsError'); } }
export class BadInputError extends DomainError { constructor(m: string, code?: string) { super(m, code, 'bad_input', 'BadInputError'); } }
export class ValidationError extends DomainError {
  constructor(readonly errors: Record<string, string>) {
    super('Données invalides', undefined, 'validation', 'ValidationError');
  }
}

/** Reconnaît une erreur métier sans dépendre de l'identité de la classe (voir plus haut). */
export const isDomainError = (e: unknown): e is DomainError => typeof e === 'object' && e !== null && (e as DomainError).isDomainError === true;

export const forbid = (m: string, code?: string): never => { throw new ForbiddenError(m, code); };
export const conflict = (m: string): never => { throw new ConflictError(m); };
export const notFound = (m = 'Ressource introuvable.'): never => { throw new NotFoundError(m); };
export const fieldError = (field: string, message: string): never => { throw new ValidationError({ [field]: message }); };
