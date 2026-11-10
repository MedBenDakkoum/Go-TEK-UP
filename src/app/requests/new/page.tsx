import { requireUser } from '@/presentation/auth/session';
import { NewRequest } from '@/ui/pages/RequestForms';

export const metadata = { title: 'Nouvelle demande' };

export default async function Page() {
  await requireUser('student');
  return <NewRequest />;
}
