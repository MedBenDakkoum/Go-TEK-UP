import { handler } from '@/presentation/http/route';

export const GET = handler({ auth: 'admin' }, ({ c, query }) => c.useCases.admin.users(Object.fromEntries(query)));
