import { redirect } from 'next/navigation';
import { getSessionUser, homePathFor } from '@/presentation/auth/session';
import { Login } from '@/ui/pages/AuthPages';

export const metadata = { title: 'Connexion' };

export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user.role));
  return <Login from={(await searchParams).from} />;
}
