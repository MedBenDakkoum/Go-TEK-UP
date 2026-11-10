import { handler } from '@/presentation/http/route';

export const POST = handler({ auth: 'admin' }, ({ c, user, id }) => c.useCases.admin.reactivate(user, id()));
