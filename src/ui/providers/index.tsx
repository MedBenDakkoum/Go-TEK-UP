'use client';
import type { ReactNode } from 'react';
import type { PublicUserView } from '@/application/read-models';
import { AuthProvider } from './auth';
import { RealtimeProvider } from './realtime';
import { ThemeProvider } from './theme';
import { ToastProvider } from './toast';

export function Providers({ initialUser, children }: { initialUser: PublicUserView | null; children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider initialUser={initialUser}>
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
