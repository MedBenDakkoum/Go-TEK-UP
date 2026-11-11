import { z } from 'zod';
import { LEVELS, SUBJECTS, SUBJECT_MAX_LENGTH } from '../../domain/constants';

/**
 * Schémas de validation des entrées (source unique côté serveur). `strictObject` refuse les champs inconnus.
 * Messages en français, un message par champ renvoyé au client : { errors: { champ: message } }.
 */
const text = (label: string, min: number, max: number, req = `${label} requis`) =>
  z.string({ error: req }).trim().min(min, `${label} : entre ${min} et ${max} caractères`).max(max, `${label} : entre ${min} et ${max} caractères`);
const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} : ${max} caractères maximum`).optional();
const oneOf = (list: readonly string[], message: string) => z.string({ error: message }).refine((v) => list.includes(v), message);
const requestSubject = z.string({ error: 'Matière : champ requis' }).trim()
  .min(1, 'Matière : champ requis')
  .max(SUBJECT_MAX_LENGTH, `Matière : ${SUBJECT_MAX_LENGTH} caractères maximum`);
const email = z.string({ error: 'Adresse e-mail invalide' }).trim().toLowerCase().max(120, 'E-mail trop long').pipe(z.email('Adresse e-mail invalide'));
const password = z.string({ error: 'Mot de passe requis' })
  .min(8, '8 caractères minimum').max(72, '72 caractères maximum')
  .regex(/[A-Za-z]/, 'Doit contenir au moins une lettre').regex(/\d/, 'Doit contenir au moins un chiffre');
const localDate = z.string({ error: 'Date requise' }).regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/, 'Date et heure invalides');
const token = z.string({ error: 'Jeton requis' }).min(20, 'Jeton invalide').max(200, 'Jeton invalide');

const profileShape = {
  name: text('Nom', 2, 60),
  speciality: text('Spécialité', 2, 60, 'Spécialité requise'),
  level: oneOf(LEVELS, 'Niveau invalide'),
  skills: optionalText('Compétences', 200),
};
const requestShape = {
  title: text('Titre', 5, 100),
  description: text('Description', 20, 1000, 'Description requise'),
  subject: requestSubject,
  level: oneOf(LEVELS, 'Niveau invalide'),
  availability: text('Disponibilités', 3, 200, 'Disponibilités requises'),
};

export const profileSchema = z.strictObject(profileShape);
export const registerSchema = z.strictObject({
  ...profileShape, email, password, confirm: z.string({ error: 'Confirmation requise' }),
});
export const loginSchema = z.strictObject({ email: z.string({ error: 'Adresse e-mail invalide' }).trim().toLowerCase().pipe(z.email('Adresse e-mail invalide')), password: z.string({ error: 'Mot de passe requis' }).min(1, 'Mot de passe requis') });
export const forgotSchema = z.strictObject({ email: z.string({ error: 'Adresse e-mail invalide' }).trim().toLowerCase().pipe(z.email('Adresse e-mail invalide')) });
export const resendSchema = forgotSchema;
export const resetSchema = z.strictObject({ token, password, confirm: z.string({ error: 'Confirmation requise' }) });
export const verifySchema = z.strictObject({ token });

export const requestSchema = z.strictObject(requestShape);
export const offerSchema = z.strictObject({ message: text('Message', 10, 500) });
export const respondSchema = z.strictObject({ decision: z.enum(['accept', 'reject'], { error: 'Décision invalide' }) });
export const reviewSchema = z.strictObject({
  rating: z.number({ error: 'Note invalide' }).int('Note invalide').min(1, 'Note entre 1 et 5').max(5, 'Note entre 1 et 5'),
  comment: optionalText('Commentaire', 300),
});
export const reportSchema = z.strictObject({ reason: text('Motif', 5, 300, 'Motif requis') });
export const resolveSchema = z.strictObject({ decision: z.enum(['hide', 'dismiss'], { error: 'Décision invalide' }) });
export const suspendSchema = reportSchema;
export const planSchema = z.strictObject({ startsAt: localDate, location: text('Lieu', 2, 100, 'Lieu requis') });
export const messageSchema = z.strictObject({ body: text('Message', 1, 500) });
export const groupSchema = z.strictObject({
  title: text('Titre', 5, 100),
  description: text('Description', 20, 1000, 'Description requise'),
  subject: oneOf(SUBJECTS, 'Matière invalide'),
  level: oneOf(LEVELS, 'Niveau invalide'),
  startsAt: localDate,
  location: text('Lieu', 2, 100, 'Lieu requis'),
  capacity: z.number({ error: 'Capacité invalide' }).int('Capacité invalide').min(2, 'Capacité : 2 places minimum').max(50, 'Capacité : 50 places maximum'),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
export type RequestInput = z.infer<typeof requestSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type OfferInput = z.infer<typeof offerSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
