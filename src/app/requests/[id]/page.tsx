import { requireUser } from '@/presentation/auth/session';
import RequestDetail from '@/ui/pages/RequestDetail';

export const metadata = { title: 'Demande' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  return <RequestDetail id={(await params).id} />;
}
