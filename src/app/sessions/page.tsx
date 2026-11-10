import { requireUser } from '@/presentation/auth/session';
import { Sessions } from '@/ui/pages/Sessions';

export const metadata = { title: 'Séances collectives' };

export default async function Page() {
  await requireUser();
  return <Sessions />;
}
