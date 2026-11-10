import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { PublicUserView } from '@/application';
import type { Role } from '@/domain';
import { getContainer, SESSION_COOKIE } from '@/infrastructure/container';

/** Utilisateur de la session courante (rendu serveur), ou null. Mis en cache le temps d'une requête. */
export const getSessionUser = cache(async (): Promise<PublicUserView | null> => {
  const c = getContainer();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const { user } = await c.useCases.auth.authenticate(token);
  return user ? c.useCases.auth.currentUser(user.id) : null;
});

/** Page d'accueil après connexion, selon le rôle. */
export const homePathFor = (role: Role) => (role === 'admin' ? '/admin' : '/dashboard');

/** Page protégée : non connecté → /login ; rôle insuffisant → page d'accueil de son rôle. (L'API refait ces contrôles.) */
export async function requireUser(role?: Role): Promise<PublicUserView> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (role && user.role !== role) redirect(homePathFor(user.role));
  return user;
}
