import { requireUser } from '@/presentation/auth/session';
import Leaderboard from '@/ui/pages/Leaderboard';

export const metadata = { title: 'Classement' };

export default async function Page() {
  await requireUser();
  return <Leaderboard />;
}
