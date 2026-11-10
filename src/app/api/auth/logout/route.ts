import { handler } from '@/presentation/http/route';

export const POST = handler({ auth: 'public' }, ({ clearSession }) => {
  clearSession();
  return { ok: true };
});
