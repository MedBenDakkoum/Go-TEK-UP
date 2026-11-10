import { handler } from '@/presentation/http/route';

export const POST = handler({}, ({ c, user, id }) => c.useCases.groups.cancel(user, id()));
