import { handler } from '@/presentation/http/route';

export const GET = handler({}, ({ c, user, query }) => c.useCases.users.leaderboard(user, query.get('month') ?? undefined));
