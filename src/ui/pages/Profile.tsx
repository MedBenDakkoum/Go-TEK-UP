'use client';
import { LEVELS } from '@/domain/constants';
import type { PublicUserView } from '@/application/read-models';
import { api } from '../api';
import { Field, Form } from '../components/forms';
import { UserBadge } from '../components/parts';
import { useForm } from '../hooks';
import { useAuth } from '../providers/auth';
import { schemas } from '../validation';

export default function Profile() {
  const { user, setUser } = useAuth();
  const form = useForm({
    initial: { name: user?.name ?? '', speciality: user?.speciality ?? '', level: user?.level ?? 'ING1', skills: user?.skillsText ?? '' },
    schema: schemas.profile,
    onSubmit: async (v) => { setUser((await api<{ user: PublicUserView }>('/users/me', { method: 'PATCH', body: v })).user); return 'Profil mis à jour.'; },
  });
  if (!user) return null;
  return (
    <div className="narrow">
      <h1>Mon profil</h1>
      <p className="muted">{user.email}</p>
      <section className="card accent" aria-labelledby="rep-title">
        <h2 id="rep-title">Reconnaissance des contributions</h2>
        <p><UserBadge stats={user.stats} /></p>
        <p className="muted small">{user.stats.helps} aide{user.stats.helps > 1 ? 's' : ''} terminée{user.stats.helps > 1 ? 's' : ''} · {user.stats.reviewsGiven} évaluation{user.stats.reviewsGiven > 1 ? 's' : ''} donnée{user.stats.reviewsGiven > 1 ? 's' : ''}</p>
        <p className="muted small">
          10 points par aide terminée + la somme des notes reçues. Contributeur dès la 1<sup>re</sup> aide,
          Mentor à partir de 3 aides avec une moyenne d’au moins 4/5. Le badge « Super évaluateur » récompense 5 évaluations données.
        </p>
      </section>
      <Form form={form} submit="Enregistrer" pending="Enregistrement…">
        <Field form={form} name="name" label="Nom complet" required maxLength={60} />
        <Field form={form} name="speciality" label="Spécialité" required maxLength={60} />
        <Field form={form} name="level" label="Niveau" as="select" options={LEVELS} required />
        <Field form={form} name="skills" label="Compétences" maxLength={200} hint="Séparées par des virgules. Utilisées pour recommander des demandes." />
      </Form>
    </div>
  );
}
