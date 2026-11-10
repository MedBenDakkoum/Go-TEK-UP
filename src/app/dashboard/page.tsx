import { requireUser } from '@/presentation/auth/session';
import Dashboard from '@/ui/pages/Dashboard';

export const metadata = { title: 'Tableau de bord' };

export default async function Page() {
  await requireUser('student');
  return <Dashboard />;
}
