import { handler } from '@/presentation/http/route';

/** Chiffres de la page d'accueil (publics, sans donnée personnelle). */
export const GET = handler({ auth: 'public' }, ({ c }) => c.useCases.users.publicStats());
