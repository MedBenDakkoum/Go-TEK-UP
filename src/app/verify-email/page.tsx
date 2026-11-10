import { VerifyEmail } from '@/ui/pages/AuthPages';

export const metadata = { title: 'Confirmation de l’adresse e-mail' };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <VerifyEmail token={(await searchParams).token} />;
}
