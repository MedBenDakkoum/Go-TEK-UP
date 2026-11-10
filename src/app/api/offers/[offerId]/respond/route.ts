import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ body: s.respondSchema }, ({ c, user, id, body }) => c.useCases.requests.respond(user, id('offerId'), body.decision));
