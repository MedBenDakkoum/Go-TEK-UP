import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ body: s.planSchema }, ({ c, user, id, body }) => c.useCases.requests.proposePlan(user, id(), body));
