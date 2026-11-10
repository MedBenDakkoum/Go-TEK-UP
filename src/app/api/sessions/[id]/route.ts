import { handler } from '@/presentation/http/route';

export const GET = handler({}, ({ c, user, id }) => c.useCases.groups.detail(user, id()));
