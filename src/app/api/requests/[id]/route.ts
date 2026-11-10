import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const GET = handler({}, ({ c, user, id }) => c.useCases.requests.detail(user, id()));
export const PATCH = handler({ body: s.requestSchema }, ({ c, user, id, body }) => c.useCases.requests.update(user, id(), body));
