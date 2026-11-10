'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RequestDetailView } from '@/application/read-models';
import { LEVELS, SUBJECTS } from '@/domain/constants';
import { api } from '../api';
import { Field, Form } from '../components/forms';
import { ErrorState, Loading } from '../components/parts';
import { useFetch, useForm, type FormApi } from '../hooks';
import { useAuth } from '../providers/auth';
import { schemas } from '../validation';

function RequestFields({ form }: { form: FormApi }) {
  return (
    <>
      <Field form={form} name="title" label="Titre" required maxLength={100} />
      <Field form={form} name="description" label="Description" as="textarea" required maxLength={1000}
        hint="Que cherchez-vous à comprendre ? Où êtes-vous bloqué ? (20 caractères minimum)" />
      <Field form={form} name="subject" label="Matière" as="select" options={SUBJECTS} required />
      <Field form={form} name="level" label="Niveau" as="select" options={LEVELS} required />
      <Field form={form} name="availability" label="Disponibilités" required maxLength={200} hint="Ex. : mardi et jeudi après 16h" />
    </>
  );
}

export function NewRequest() {
  const { user } = useAuth();
  const router = useRouter();
  const form = useForm({
    initial: { title: '', description: '', subject: SUBJECTS[0] as string, level: user!.level, availability: '' },
    schema: schemas.request,
    onSubmit: async (v) => { const { id } = await api('/requests', { method: 'POST', body: v }); router.push(`/requests/${id}`); },
  });
  return (
    <div className="narrow">
      <h1>Publier une demande d’aide</h1>
      <Form form={form} submit="Publier" pending="Publication…"><RequestFields form={form} /></Form>
    </div>
  );
}

function EditInner({ id, request }: { id: string; request: RequestDetailView['request'] }) {
  const router = useRouter();
  const form = useForm({
    initial: { title: request.title, description: request.description, subject: request.subject, level: request.level, availability: request.availability },
    schema: schemas.request,
    onSubmit: async (v) => { await api(`/requests/${id}`, { method: 'PATCH', body: v }); router.push(`/requests/${id}`); },
  });
  return (
    <div className="narrow">
      <h1>Modifier la demande</h1>
      <Form form={form} submit="Enregistrer" pending="Enregistrement…"><RequestFields form={form} /></Form>
      <p><Link href={`/requests/${id}`}>Annuler</Link></p>
    </div>
  );
}

export function EditRequest({ id }: { id: string }) {
  const { data, error, loading, reload } = useFetch<RequestDetailView>(`/requests/${id}`);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data.permissions.canEdit) {
    return (
      <div className="empty" role="alert">
        <h1>Modification impossible</h1>
        <p className="muted">{data.permissions.isAuthor ? 'Une demande terminée ne peut plus être modifiée.' : 'Seul l’auteur peut modifier sa demande.'}</p>
        <Link className="btn" href={`/requests/${id}`}>Retour à la demande</Link>
      </div>
    );
  }
  return <EditInner id={id} request={data.request} />;
}
