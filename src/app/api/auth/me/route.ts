import { handler } from '@/presentation/http/route';

/** Public : renvoie { user: null } si non connecté. */
export const GET = handler({ auth: 'public' }, async ({ c, user }) => ({ user: user ? await c.useCases.auth.currentUser(user.id) : null }));
