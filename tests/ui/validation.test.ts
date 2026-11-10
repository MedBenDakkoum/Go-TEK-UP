import { describe, expect, it } from 'vitest';
import { schemas, validate } from '@/ui/validation';

describe('validation côté client', () => {
  it('inscription : signale chaque champ invalide', () => {
    const e = validate(schemas.register, { name: 'x', email: 'pas-un-mail', password: 'court', confirm: 'autre', speciality: '', level: 'ZZ', skills: '' });
    for (const f of ['name', 'email', 'password', 'confirm', 'speciality', 'level']) expect(e[f], f).toBeTruthy();
  });
  it('inscription : accepte des données valides', () => {
    expect(validate(schemas.register, { name: 'Alice T', email: 'a@t.tn', password: 'Passw0rdX', confirm: 'Passw0rdX', speciality: 'Info', level: 'ING2', skills: 'React, SQL' })).toEqual({});
  });
  it('mot de passe : lettre et chiffre obligatoires', () => {
    expect(validate(schemas.reset, { password: 'abcdefgh', confirm: 'abcdefgh' }).password).toMatch(/chiffre/);
    expect(validate(schemas.reset, { password: '12345678', confirm: '12345678' }).password).toMatch(/lettre/);
  });
  it('séance : la date doit être dans le futur', () => {
    expect(validate(schemas.plan, { startsAt: '2020-01-01T10:00', location: 'Salle 3' }).startsAt).toMatch(/futur/);
    expect(validate(schemas.plan, { startsAt: '', location: 'Salle 3' }).startsAt).toBeTruthy();
    const future = new Date(Date.now() + 3 * 86400e3).toISOString().slice(0, 16);
    expect(validate(schemas.plan, { startsAt: future, location: 'Salle 3' })).toEqual({});
  });
  it('séance collective : capacité entre 2 et 50', () => {
    const base = { title: 'Titre valide', description: 'Description assez longue pour passer.', subject: 'Anglais', level: 'ING1', startsAt: new Date(Date.now() + 86400e3 * 2).toISOString().slice(0, 16), location: 'B12' };
    expect(validate(schemas.group, { ...base, capacity: '1' }).capacity).toBeTruthy();
    expect(validate(schemas.group, { ...base, capacity: '51' }).capacity).toBeTruthy();
    expect(validate(schemas.group, { ...base, capacity: '6' })).toEqual({});
  });
});
