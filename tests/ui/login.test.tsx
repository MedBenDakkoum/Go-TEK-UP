import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Login } from '@/ui/pages/AuthPages';
import { router } from './setup';
import { mockApi, renderApp, student } from './helpers';

describe('Connexion', () => {
  it('affiche les erreurs de validation sans appeler le serveur', async () => {
    const fetchMock = mockApi({});
    renderApp(<Login />, null);
    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('Adresse e-mail invalide')).toBeInTheDocument();
    expect(screen.getByText('Mot de passe requis')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Veuillez corriger');
    expect(screen.getByLabelText(/Adresse e-mail/)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([, o]) => (o as { method?: string })?.method === 'POST')).toBe(false);
  });

  it('envoie les identifiants puis redirige vers le tableau de bord', async () => {
    const fetchMock = mockApi({ 'POST /auth/login': { user: student } });
    renderApp(<Login />, null);
    await userEvent.type(await screen.findByLabelText(/Adresse e-mail/), 'alice@campus.tn');
    await userEvent.type(screen.getByLabelText(/Mot de passe/), 'Student123!');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
    const call = fetchMock.mock.calls.find(([u]) => u === '/api/auth/login')!;
    expect(JSON.parse((call[1] as { body: string }).body)).toEqual({ email: 'alice@campus.tn', password: 'Student123!' });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('ne redirige jamais vers un site externe (paramètre « from »)', async () => {
    mockApi({ 'POST /auth/login': { user: student } });
    renderApp(<Login from="//evil.example" />, null);
    await userEvent.type(await screen.findByLabelText(/Adresse e-mail/), 'alice@campus.tn');
    await userEvent.type(screen.getByLabelText(/Mot de passe/), 'Student123!');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('affiche l’erreur renvoyée par le serveur', async () => {
    mockApi({ 'POST /auth/login': { __status: 401, body: { message: 'E-mail ou mot de passe incorrect.' } } });
    renderApp(<Login />, null);
    await userEvent.type(await screen.findByLabelText(/Adresse e-mail/), 'alice@campus.tn');
    await userEvent.type(screen.getByLabelText(/Mot de passe/), 'mauvais123');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.');
  });
});
