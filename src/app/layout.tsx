import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getSessionUser } from '@/presentation/auth/session';
import Shell from '@/ui/components/Shell';
import { Providers } from '@/ui/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Go-TEK-UP',
    template: '%s | Go-TEK-UP',
  },
  description: 'Go-TEK-UP — A collaborative platform for the Tek-Up University community.',
};


export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="fr">
      <body>
        <Providers initialUser={user}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
