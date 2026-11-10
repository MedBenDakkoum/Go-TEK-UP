import type { OfferStatus, PlanStatus, RequestStatus } from './constants';

export interface RequestPermissionsInput {
  status: RequestStatus;
  hidden: boolean;
  isAuthor: boolean;
  isAdmin: boolean;
  isHelper: boolean;
  hasOffered: boolean;
  hasReviewed: boolean;
  plan: { status: PlanStatus; proposedBy: number } | null;
  userId: number;
}

/** Ce que l'utilisateur peut faire sur une demande (l'interface s'en sert pour afficher ; le serveur refait les contrôles). */
export function requestPermissions(i: RequestPermissionsInput) {
  const open = i.status === 'open';
  const participant = i.isAuthor || i.isHelper;
  return {
    isAuthor: i.isAuthor,
    isAdmin: i.isAdmin,
    canEdit: i.isAuthor && (open || i.status === 'accepted'),
    canComplete: i.isAuthor && i.status === 'accepted',
    canCancel: i.isAuthor && (open || i.status === 'accepted'),
    canRespond: i.isAuthor && open,
    canOffer: !i.isAdmin && !i.isAuthor && !i.hidden && open && !i.hasOffered,
    hasOffered: i.hasOffered,
    canReview: participant && i.status === 'done' && !i.hasReviewed,
    canReport: !i.isAdmin && !i.isAuthor && !i.hidden,
    canPlan: participant && i.status === 'accepted',
    canConfirmPlan: participant && i.status === 'accepted' && !!i.plan && i.plan.status === 'proposed' && i.plan.proposedBy !== i.userId,
    canMessage: participant && (i.status === 'accepted' || i.status === 'done'),
  };
}

export type { OfferStatus };
