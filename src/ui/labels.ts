import { SUBJECTS } from '@/domain/constants';

export const STATUSES: Record<string, string> = { open: 'Ouverte', accepted: 'Aide acceptée', done: 'Terminée', cancelled: 'Annulée' };
export const OFFER_STATUSES: Record<string, string> = { pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée' };
export const SORTS: Record<string, string> = { recent: 'Plus récentes', oldest: 'Plus anciennes', offers: 'Plus de propositions', noOffers: 'Sans proposition d’abord' };

/** Classe CSS de couleur par matière (voir .s-0 … .s-8 dans globals.css). */
export const subjectClass = (subject: string) => `s-${Math.max(0, (SUBJECTS as readonly string[]).indexOf(subject))}`;
