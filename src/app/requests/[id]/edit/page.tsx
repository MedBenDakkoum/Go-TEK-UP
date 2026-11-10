import { requireUser } from '@/presentation/auth/session';
import { EditRequest } from '@/ui/pages/RequestForms';

export const metadata = { title: 'Modifier la demande' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('student');
  return <EditRequest id={(await params).id} />;
}
