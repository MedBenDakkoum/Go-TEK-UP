import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ auth: 'public', body: s.resetSchema }, async ({ c, body }) => { await c.useCases.auth.resetPassword(body); });
