import { handler } from '@/presentation/http/route';

export const POST = handler({}, ({ c, user }) => c.useCases.notifications.markAll(user));
