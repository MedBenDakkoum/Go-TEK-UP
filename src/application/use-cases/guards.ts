import { forbid } from '../../domain/errors';

/** Les administrateurs modèrent la plateforme : ils ne publient pas de demande et n'aident personne. */
export const forbidAdmin = (user: { role: string }): void => {
  if (user.role === 'admin') forbid('Un compte administrateur ne participe pas à l’entraide : il sert uniquement à modérer.');
};
