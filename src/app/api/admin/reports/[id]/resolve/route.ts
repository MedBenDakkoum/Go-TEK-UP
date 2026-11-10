import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ auth: 'admin', body: s.resolveSchema }, ({ c, user, id, body }) => c.useCases.admin.resolveReport(user, id(), body.decision));
