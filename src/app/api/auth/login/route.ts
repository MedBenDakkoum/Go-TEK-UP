import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ auth: 'public', body: s.loginSchema }, async ({ c, body, ip, setSession }) => {
  const id = await c.useCases.auth.login(body, ip);
  setSession(await c.useCases.auth.openSession(id));
  return { user: await c.useCases.auth.currentUser(id) };
});
