import { requireUser } from '@/presentation/auth/session';
import AdminUsers from '@/ui/pages/AdminUsers';

export const metadata = { title: 'Utilisateurs' };

export default async function Page() {
  await requireUser('admin');
  return <AdminUsers />;
}
