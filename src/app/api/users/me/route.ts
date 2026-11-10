import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const PATCH = handler({ body: s.profileSchema }, async ({ c, user, body }) => ({ user: await c.useCases.users.updateProfile(user, body) }));
