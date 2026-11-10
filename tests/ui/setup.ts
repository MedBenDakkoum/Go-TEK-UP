import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// next/navigation : routeur factice (les tests vérifient les navigations demandées).
export const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() };
export const nav = { pathname: '/', search: '' };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  redirect: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  nav.pathname = '/'; nav.search = '';
  localStorage.clear();
});
window.scrollTo = () => {};
