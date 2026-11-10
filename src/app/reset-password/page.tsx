import { ResetPassword } from '@/ui/pages/AuthPages';

export const metadata = { title: 'Nouveau mot de passe' };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <ResetPassword token={(await searchParams).token} />;
}
