import type { GroupStatus, OfferStatus, PlanStatus, RequestStatus } from './constants';

/** Demande d'aide, avec les informations de son auteur nécessaires aux règles métier. */
export interface RequestEntity {
  id: number;
  authorId: number;
  title: string;
  description: string;
  subject: string;
  level: string;
  availability: string;
  status: RequestStatus;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
  authorEmail: string;
  authorLevel: string;
}

export interface OfferEntity { id: number; requestId: number; helperId: number; message: string; status: OfferStatus; createdAt: Date }
export interface AcceptedOffer extends OfferEntity { helperName: string; helperEmail: string }
export interface OfferWithHelper extends OfferEntity { helperName: string; speciality: string; helperLevel: string; skills: string }

export interface ReviewEntity {
  id: number; requestId: number; reviewerId: number; revieweeId: number; rating: number; comment: string; createdAt: Date;
  reviewerName: string; revieweeName: string;
}

export interface PlanEntity { requestId: number; proposedBy: number; proposedByName: string; startsAt: string; location: string; status: PlanStatus }

export interface MessageEntity { id: number; body: string; createdAt: Date; senderId: number; senderName: string }

export interface GroupEntity {
  id: number; hostId: number; title: string; description: string; subject: string; level: string;
  startsAt: string; location: string; capacity: number; status: GroupStatus; createdAt: Date; hostName: string; membersCount: number;
}
export interface GroupMemberEntity { id: number; name: string; speciality: string; level: string }

export interface NotificationEntity { id: number; userId: number; type: string; message: string; link: string; read: boolean; createdAt: Date }
