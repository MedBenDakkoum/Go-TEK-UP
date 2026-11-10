import { redirect } from 'next/navigation';
import { getSessionUser, homePathFor } from '@/presentation/auth/session';
import { Register } from '@/ui/pages/AuthPages';

export const metadata = { title: 'Inscription' };

export default async function Page() {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user.role));
  return <Register />;
}
