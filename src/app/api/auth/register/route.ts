import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ auth: 'public', body: s.registerSchema, status: 201 }, async ({ c, body, setSession }) => {
  const { id, pendingVerification } = await c.useCases.auth.register(body);
  if (pendingVerification) return { pendingVerification: true, email: body.email };
  setSession(await c.useCases.auth.openSession(id));
  return { pendingVerification: false, user: await c.useCases.auth.currentUser(id) };
});
