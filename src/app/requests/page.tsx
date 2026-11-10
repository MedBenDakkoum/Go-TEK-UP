import { requireUser } from '@/presentation/auth/session';
import Requests from '@/ui/pages/Requests';

export const metadata = { title: 'Demandes d’aide' };

export default async function Page() {
  await requireUser();
  return <Requests />;
}
