import { handler } from '@/presentation/http/route';

export const GET = handler({ auth: 'admin' }, ({ c }) => c.useCases.admin.actions(100));
