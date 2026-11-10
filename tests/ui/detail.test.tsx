import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { RequestDetailView } from '@/application/read-models';
import RequestDetail from '@/ui/pages/RequestDetail';
import { mockApi, renderApp, student } from './helpers';

const stats = { helps: 0, reviews: 0, avg: null, points: 0, badge: 'Nouveau', extras: [], reviewsGiven: 0 };
const perms = { isAuthor: false, isAdmin: false, canEdit: false, canComplete: false, canCancel: false, canRespond: false, canOffer: false, hasOffered: false, canReview: false, canReport: false, canPlan: false, canConfirmPlan: false, canMessage: false };
const detail = (over: Partial<RequestDetailView> = {}, p: Partial<typeof perms> = {}): RequestDetailView => ({
  request: { id: 5, authorId: 2, title: 'Aide sur SQL', description: 'Je ne comprends pas les jointures.', subject: 'Bases de données', level: 'ING2', availability: 'Mardi', status: 'open', hidden: false, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', authorName: 'Bob Mansouri', authorLevel: 'ING4', offersCount: 0 },
  authorStats: stats, offers: [], accepted: null, reviews: [], plan: null, permissions: { ...perms, ...p }, ...over,
});

describe('Détail d’une demande', () => {
  it('aidant potentiel : peut proposer son aide (formulaire validé puis envoyé)', async () => {
    const f = mockApi({ '/requests/5': detail({}, { canOffer: true, canReport: true }), 'POST /requests/5/offers': { ok: true } });
    renderApp(<RequestDetail id="5" />, student);
    await userEvent.click(await screen.findByRole('button', { name: 'Envoyer ma proposition' }));
    expect(await screen.findByText(/Message : champ requis/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Votre message/), 'Je peux vous expliquer cela ce soir.');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma proposition' }));
    await waitFor(() => expect(f.mock.calls.some(([u, o]) => u === '/api/requests/5/offers' && (o as { method: string }).method === 'POST')).toBe(true));
  });

  it('auteur : voit les propositions et peut les accepter ou refuser', async () => {
    const offer = { id: 11, helperId: 3, message: 'Je connais bien SQL.', status: 'pending' as const, createdAt: '2026-10-02T10:00:00.000Z', helperName: 'Chaima Gharbi', speciality: 'Réseaux', helperLevel: 'ING2', skills: ['SQL'], stats };
    mockApi({ '/requests/5': detail({ offers: [offer] }, { isAuthor: true, canRespond: true, canEdit: true, canCancel: true }) });
    renderApp(<RequestDetail id="5" />, { ...student, id: 2 });
    expect(await screen.findByRole('heading', { name: 'Propositions reçues (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accepter la proposition de Chaima Gharbi/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refuser la proposition de Chaima Gharbi/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer ma proposition' })).not.toBeInTheDocument();
  });

  it('demande introuvable : message d’erreur', async () => {
    mockApi({ '/requests/9': { __status: 404, body: { message: 'Demande introuvable.' } } });
    renderApp(<RequestDetail id="9" />, student);
    expect(await screen.findByRole('alert')).toHaveTextContent('Page introuvable');
  });
});
