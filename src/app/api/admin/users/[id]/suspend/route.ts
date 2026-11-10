import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ auth: 'admin', body: s.suspendSchema }, ({ c, user, id, body }) => c.useCases.admin.suspend(user, id(), body.reason));
