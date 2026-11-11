import { describe, expect, it } from 'vitest';
import { normalizeSubject, searchSubjects, SUBJECTS } from '@/domain/subjects';

describe('catalogue des matières TEK-UP', () => {
  it('couvre les cinq spécialités et le tronc commun', () => {
    for (const subject of [
      'Algorithmique et structure de données',
      'Programmation Python',
      'Framework Django',
      'Cryptographie',
      'Data Mining',
      'Développement Android',
      'Robotique',
      'React',
      'DevOps',
    ]) {
      expect(SUBJECTS, subject).toContain(subject);
    }
  });

  it('retire la physique générique et ne contient pas de doublon exact', () => {
    expect(SUBJECTS).not.toContain('Physique');
    const normalized = SUBJECTS.map(normalizeSubject);
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it('recherche sans tenir compte de la casse ni des accents', () => {
    expect(searchSubjects('algo')[0]).toBe('Algorithmique');
    expect(searchSubjects('DEVELOPPEMENT')).toContain('Développement Android');
    expect(searchSubjects('developpement')).toContain('Développement web JS/PHP');
    expect(searchSubjects('python')).toContain('Programmation Python');
    expect(searchSubjects('cybersecurite')).toContain('Python pour la cybersécurité');
  });

  it('trouve les matières dont le mot est à l’intérieur de l’intitulé', () => {
    expect(searchSubjects('dev')).toEqual(expect.arrayContaining([
      'Développement Android',
      'Développement web JS/PHP',
      'DevOps',
    ]));
  });
});
