import { handler } from '@/presentation/http/route';

export const GET = handler({}, ({ c, user }) => c.useCases.users.dashboard(user));
