import { describe, expect, it } from 'vitest';
import { computeReputation, isFuture, isValidLocal, localToMs, monthRange, nowLocal, normalizeSkills, planReminder, rank, recommend, requestPermissions } from '@/domain';

describe('temps', () => {
  it('heure locale UTC+1 et validation', () => {
    expect(nowLocal(new Date('2026-03-01T10:00:00Z'))).toBe('2026-03-01 11:00');
    expect(isValidLocal('2026-02-30 10:00')).toBe(false);
    expect(isValidLocal('2026-02-28T10:00')).toBe(true);
    expect(isFuture('2026-03-01 11:30', new Date('2026-03-01T10:00:00Z'))).toBe(true);
    expect(localToMs('2026-03-01 11:00')).toBe(Date.parse('2026-03-01T10:00:00Z'));
  });
});

describe('profil et réputation', () => {
  it('compétences dédoublonnées et limitées', () => {
    expect(normalizeSkills('React, react, SQL ,')).toBe('React, SQL');
    expect(normalizeSkills(Array.from({ length: 15 }, (_, i) => 's' + i).join(',')).split(', ')).toHaveLength(10);
  });
  it('badges', () => {
    expect(computeReputation({ helps: 0, reviewsCount: 0, ratingSum: 0, reviewsGiven: 0 }).badge).toBe('Nouveau');
    expect(computeReputation({ helps: 1, reviewsCount: 1, ratingSum: 3, reviewsGiven: 0 }).badge).toBe('Contributeur');
    const m = computeReputation({ helps: 3, reviewsCount: 3, ratingSum: 14, reviewsGiven: 5 });
    expect(m).toMatchObject({ badge: 'Mentor', points: 44, avg: 4.7, extras: ['Super évaluateur'] });
  });
});

describe('recommandation, classement, rappels, permissions', () => {
  const user = { id: 1, name: 'A', email: 'a@x', role: 'student' as const, speciality: 'Informatique', level: 'ING2', skills: 'SQL, React' };
  it('recommande selon les compétences, bonus de niveau', () => {
    const items = [
      { subject: 'Autre', title: 'Aide SQL', description: 'jointures', level: 'ING3' },
      { subject: 'Autre', title: 'Aide SQL', description: 'jointures', level: 'ING1' },
      { subject: 'Anglais', title: 'Oral', description: 'x', level: 'ING1' },
    ];
    const r = recommend(user, items);
    expect(r).toHaveLength(2);
    expect(r[0].level).toBe('ING1');
    expect(recommend({ ...user, role: 'admin' }, items)).toEqual([]);
  });
  it('classement : points puis aides puis nom', () => {
    const e = (id: number, name: string, helps: number, stars: number) => ({ id, name, speciality: '', level: 'ING1', helps, stars, reviews: 0, badge: '' });
    expect(rank([e(1, 'B', 1, 5), e(2, 'A', 1, 5), e(3, 'C', 2, 0)]).map((x) => [x.name, x.rank])).toEqual([['C', 1], ['A', 2], ['B', 3]]);
    expect(monthRange('2026-12').to.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
  it('rappels', () => {
    const now = new Date('2026-03-01T10:00:00Z'); // 11:00 locale
    expect(planReminder('2026-03-01 11:30', now)).toEqual({ kind: 'hour', time: '11:30' });
    expect(planReminder('2026-03-01 18:00', now)).toEqual({ kind: 'day', today: true, time: '18:00' });
    expect(planReminder('2026-03-02 09:00', now)).toEqual({ kind: 'day', today: false, time: '09:00' });
    expect(planReminder('2026-03-05 09:00', now)).toEqual({ kind: 'none' });
    expect(planReminder('2026-03-01 10:00', now)).toEqual({ kind: 'none' });
  });
  it('permissions sur une demande', () => {
    const base = { status: 'open' as const, hidden: false, isAuthor: false, isAdmin: false, isHelper: false, hasOffered: false, hasReviewed: false, plan: null, userId: 1 };
    expect(requestPermissions(base)).toMatchObject({ canOffer: true, canReport: true, canEdit: false });
    expect(requestPermissions({ ...base, isAdmin: true })).toMatchObject({ canOffer: false, canReport: false });
    expect(requestPermissions({ ...base, isAuthor: true, status: 'accepted' })).toMatchObject({ canComplete: true, canMessage: true, canPlan: true });
    expect(requestPermissions({ ...base, isHelper: true, status: 'accepted', plan: { status: 'proposed', proposedBy: 2 } }).canConfirmPlan).toBe(true);
  });
});
