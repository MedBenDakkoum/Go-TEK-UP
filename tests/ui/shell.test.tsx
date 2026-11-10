import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Shell from '@/ui/components/Shell';
import { router } from './setup';
import { admin, mockApi, renderApp, student } from './helpers';

const nav = () => within(screen.getByRole('navigation', { name: 'Navigation principale' }));

describe('En-tête et navigation', () => {
  it('visiteur : connexion et inscription seulement', () => {
    mockApi({});
    renderApp(<Shell>contenu</Shell>, null);
    expect(nav().getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', '/login');
    expect(nav().getByRole('link', { name: 'Inscription' })).toBeInTheDocument();
    expect(nav().queryByRole('link', { name: 'Mon espace' })).not.toBeInTheDocument();
  });

  it('étudiant : espace personnel, tableau de bord, classement', () => {
    mockApi({ '/notifications/count': { unread: 3 } });
    renderApp(<Shell>contenu</Shell>, student);
    for (const l of ['Demandes', 'Séances', 'Mon espace', 'Tableau de bord', 'Classement', 'Profil']) expect(nav().getByRole('link', { name: l })).toBeInTheDocument();
    expect(nav().queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
  });

  it('administrateur : modération, pas d’espace personnel', () => {
    mockApi({ '/notifications/count': { unread: 0 } });
    renderApp(<Shell>contenu</Shell>, admin);
    expect(nav().getByRole('link', { name: 'Administration' })).toBeInTheDocument();
    expect(nav().getByRole('link', { name: 'Utilisateurs' })).toBeInTheDocument();
    expect(nav().queryByRole('link', { name: 'Mon espace' })).not.toBeInTheDocument();
    expect(nav().queryByRole('link', { name: 'Tableau de bord' })).not.toBeInTheDocument();
  });

  it('déconnexion : appelle l’API puis revient à l’accueil', async () => {
    const f = mockApi({ '/notifications/count': { unread: 0 }, 'POST /auth/logout': { ok: true } });
    renderApp(<Shell>contenu</Shell>, student);
    await userEvent.click(nav().getByRole('button', { name: /Déconnexion \(Alice\)/ }));
    expect(f.mock.calls.some(([u, o]) => u === '/api/auth/logout' && (o as { method: string }).method === 'POST')).toBe(true);
    await screen.findByRole('navigation');
    expect(router.push).toHaveBeenCalledWith('/');
  });

  it('le compteur de notifications non lues est annoncé', async () => {
    mockApi({ '/notifications/count': { unread: 3 } });
    renderApp(<Shell>contenu</Shell>, student);
    expect(await screen.findByRole('link', { name: 'Notifications, 3 non lues' })).toBeInTheDocument();
  });
});
