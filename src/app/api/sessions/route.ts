import { handler } from '@/presentation/http/route';
import * as s from '@/application/validation/schemas';

export const GET = handler({}, ({ c, user, query }) => c.useCases.groups.list(user, query.get('scope') ?? undefined));
export const POST = handler({ body: s.groupSchema, status: 201 }, ({ c, user, body }) => c.useCases.groups.create(user, body));
