import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const POST = handler({ body: s.reviewSchema, status: 201 }, ({ c, user, id, body }) => c.useCases.requests.review(user, id(), body));
