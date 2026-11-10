import { requireUser } from '@/presentation/auth/session';
import { NewSession } from '@/ui/pages/Sessions';

export const metadata = { title: 'Organiser une séance' };

export default async function Page() {
  await requireUser('student');
  return <NewSession />;
}
