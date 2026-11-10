// Validation CÔTÉ CLIENT (retour immédiat). Les mêmes règles sont ré-appliquées par le serveur (schémas zod de application/validation).
import { LEVELS, SUBJECTS } from '@/domain/constants';

type Rule = (v: any, all: Record<string, any>) => string | undefined;
export type Schema = Record<string, Rule>;

const len = (label: string, min: number, max: number): Rule => (v) => {
  const s = (v ?? '').trim();
  if (!s) return `${label} : champ requis`;
  if (s.length < min) return `${label} : ${min} caractères minimum`;
  if (s.length > max) return `${label} : ${max} caractères maximum`;
};
const oneOf = (label: string, list: readonly string[]): Rule => (v) => (list.includes(v) ? undefined : `${label} invalide`);
const email: Rule = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v ?? '').trim()) ? undefined : 'Adresse e-mail invalide');
const optionalMax = (label: string, max: number): Rule => (v) => ((v ?? '').length > max ? `${label} : ${max} caractères maximum` : undefined);
const password: Rule = (v = '') => {
  if (v.length < 8) return '8 caractères minimum';
  if (v.length > 72) return '72 caractères maximum';
  if (!/[A-Za-z]/.test(v)) return 'Doit contenir au moins une lettre';
  if (!/\d/.test(v)) return 'Doit contenir au moins un chiffre';
};
const confirm: Rule = (v, all) => (v !== all.password ? 'Les mots de passe ne correspondent pas' : undefined);

/** Date/heure locale « AAAA-MM-JJTHH:MM » (champ datetime-local), à venir. Tunisie = UTC+1. */
const futureDate: Rule = (v) => {
  if (!v) return 'Date et heure requises';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return 'Date et heure invalides';
  const now = new Date(Date.now() + 3600e3).toISOString().slice(0, 16);
  return v > now ? undefined : 'La date doit être dans le futur';
};

const profile: Schema = {
  name: len('Nom', 2, 60),
  speciality: len('Spécialité', 2, 60),
  level: oneOf('Niveau', LEVELS),
  skills: optionalMax('Compétences', 200),
};

export const schemas = {
  register: { ...profile, email, password, confirm } as Schema,
  login: { email, password: (v) => (v ? undefined : 'Mot de passe requis') } as Schema,
  forgot: { email } as Schema,
  reset: { password, confirm } as Schema,
  profile,
  request: {
    title: len('Titre', 5, 100),
    description: len('Description', 20, 1000),
    subject: oneOf('Matière', SUBJECTS),
    level: oneOf('Niveau', LEVELS),
    availability: len('Disponibilités', 3, 200),
  } as Schema,
  offer: { message: len('Message', 10, 500) } as Schema,
  review: {
    rating: (v) => (['1', '2', '3', '4', '5'].includes(String(v)) ? undefined : 'Note requise (1 à 5)'),
    comment: optionalMax('Commentaire', 300),
  } as Schema,
  report: { reason: len('Motif', 5, 300) } as Schema,
  plan: { startsAt: futureDate, location: len('Lieu', 2, 100) } as Schema,
  message: { body: len('Message', 1, 500) } as Schema,
  group: {
    title: len('Titre', 5, 100),
    description: len('Description', 20, 1000),
    subject: oneOf('Matière', SUBJECTS),
    level: oneOf('Niveau', LEVELS),
    startsAt: futureDate,
    location: len('Lieu', 2, 100),
    capacity: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n)) return 'Capacité invalide';
      if (n < 2) return 'Capacité : 2 places minimum';
      if (n > 50) return 'Capacité : 50 places maximum';
    },
  } as Schema,
};

export function validate(schema: Schema, values: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, rule] of Object.entries(schema)) {
    const msg = rule(values[field], values);
    if (msg) errors[field] = msg;
  }
  return errors;
}
