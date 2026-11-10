import { requireUser } from '@/presentation/auth/session';
import Mine from '@/ui/pages/Mine';

export const metadata = { title: 'Mon espace' };

export default async function Page() {
  await requireUser('student');
  return <Mine />;
}
