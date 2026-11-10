import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ body: s.reportSchema, status: 201 }, ({ c, user, id, body }) => c.useCases.requests.report(user, id(), body.reason));
