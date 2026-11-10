import { requireUser } from '@/presentation/auth/session';
import Profile from '@/ui/pages/Profile';

export const metadata = { title: 'Mon profil' };

export default async function Page() {
  await requireUser();
  return <Profile />;
}
