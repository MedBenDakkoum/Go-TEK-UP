import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const GET = handler({}, ({ c, user, id }) => c.useCases.requests.listMessages(user, id()));
export const POST = handler({ body: s.messageSchema, status: 201 }, ({ c, user, id, body }) => c.useCases.requests.sendMessage(user, id(), body));
