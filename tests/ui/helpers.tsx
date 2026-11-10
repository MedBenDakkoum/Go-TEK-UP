import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import type { PublicUserView } from '@/application/read-models';
import { Providers } from '@/ui/providers';

const stats = { helps: 0, reviews: 0, avg: null, points: 0, badge: 'Nouveau', extras: [], reviewsGiven: 0 };
export const student: PublicUserView = { id: 1, name: 'Alice Trabelsi', email: 'alice@campus.tn', role: 'student', speciality: 'Informatique', level: 'ING3', skills: ['React'], skillsText: 'React', stats };
export const admin: PublicUserView = { ...student, id: 9, name: 'Administrateur', email: 'admin@campus.tn', role: 'admin', skills: [], skillsText: '' };

type Reply = unknown | { __status: number; body: unknown };
/** fetch factice : clés « MÉTHODE /chemin » (sans /api) ; toute route non déclarée répond 404. */
export function mockApi(routes: Record<string, Reply>) {
  const fn = vi.fn(async (url: string, opts?: { method?: string }) => {
    const method = opts?.method ?? 'GET';
    const path = String(url).replace(/^\/api/, '');
    const bare = path.split('?')[0];
    // Clés acceptées : « MÉTHODE /chemin?query », « MÉTHODE /chemin » ou simplement « /chemin » (GET).
    const hit = [`${method} ${path}`, `${method} ${bare}`, ...(method === 'GET' ? [path, bare] : [])].map((k) => routes[k]).find((v) => v !== undefined);
    const status = hit && typeof hit === 'object' && '__status' in hit ? (hit as { __status: number }).__status : hit === undefined ? 404 : 200;
    const body = hit && typeof hit === 'object' && '__status' in hit ? (hit as unknown as { body: unknown }).body : hit === undefined ? { message: 'Introuvable' } : hit;
    return { ok: status < 400, status, json: async () => body } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const renderApp = (ui: ReactElement, user: PublicUserView | null = student) =>
  render(<Providers initialUser={user}>{ui}</Providers>);
