import { describe, expect, it } from 'vitest';
import { requestSchema } from '@/application/validation/schemas';
import { SUBJECTS, SUBJECT_MAX_LENGTH } from '@/domain/constants';
import { schemas, validate } from '@/ui/validation';

const base = {
  title: 'Titre valide',
  description: 'Description suffisamment longue pour être valide.',
  subject: 'Algorithmique',
  level: 'ING2',
  availability: 'Lundi après 16h',
};

const clientErrors = (patch: Record<string, unknown>) => validate(schemas.request, { ...base, ...patch });

const serverSubjectError = (patch: Record<string, unknown>) => {
  const result = requestSchema.safeParse({ ...base, ...patch });
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === 'subject')?.message;
};

const expectAccepted = (subject: string) => {
  expect(clientErrors({ subject })).toEqual({});
  expect(serverSubjectError({ subject })).toBeUndefined();
};

const expectRejected = (subject: string) => {
  expect(clientErrors({ subject }).subject).toBeTruthy();
  expect(serverSubjectError({ subject })).toBeTruthy();
};

describe('validation de la matière des demandes', () => {
  it.each(SUBJECTS)('accepte la matière du catalogue « %s »', (subject) => {
    expectAccepted(subject);
  });

  it('accepte une matière personnalisée non vide', () => {
    expectAccepted('Physique quantique');
    expectAccepted('Développement mobile');
    expectAccepted('X');
  });

  it('refuse une matière vide ou composée uniquement d’espaces', () => {
    expectRejected('');
    expectRejected('   ');
  });

  it('applique la même limite de longueur côté client et serveur', () => {
    expectAccepted('a'.repeat(SUBJECT_MAX_LENGTH));
    expectRejected('a'.repeat(SUBJECT_MAX_LENGTH + 1));
  });
});
