import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const GET = handler({}, ({ c, user, query }) => c.useCases.requests.list(user, Object.fromEntries(query)));
export const POST = handler({ body: s.requestSchema, status: 201 }, ({ c, user, body }) => c.useCases.requests.create(user, body));
