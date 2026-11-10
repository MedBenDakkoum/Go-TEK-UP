import { requireUser } from '@/presentation/auth/session';
import { SessionDetail } from '@/ui/pages/Sessions';

export const metadata = { title: 'Séance' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  return <SessionDetail id={(await params).id} />;
}
