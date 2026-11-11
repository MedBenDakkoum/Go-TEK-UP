export { SUBJECTS } from './subjects';
export const SUBJECT_MAX_LENGTH = 100;
export const LEVELS = ['ING1', 'ING2', 'ING3', 'ING4', 'ING5'] as const;

export const REQUEST_STATUSES = ['open', 'accepted', 'done', 'cancelled'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type OfferStatus = 'pending' | 'accepted' | 'rejected';
export type ReportStatus = 'open' | 'resolved';
export type PlanStatus = 'proposed' | 'confirmed';
export type GroupStatus = 'open' | 'cancelled';
export type Role = 'student' | 'admin';
export type TokenPurpose = 'reset' | 'verify';
