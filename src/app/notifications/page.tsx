import { requireUser } from '@/presentation/auth/session';
import Notifications from '@/ui/pages/Notifications';

export const metadata = { title: 'Notifications' };

export default async function Page() {
  await requireUser();
  return <Notifications />;
}
