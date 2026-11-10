import { requireUser } from '@/presentation/auth/session';
import Admin from '@/ui/pages/Admin';

export const metadata = { title: 'Administration' };

export default async function Page() {
  await requireUser('admin');
  return <Admin />;
}
