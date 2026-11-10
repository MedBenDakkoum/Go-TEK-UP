'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Plus, Users } from 'lucide-react';
import type { GroupCardView, GroupDetailView } from '@/application/read-models';
import { LEVELS, SUBJECTS } from '@/domain/constants';
import { api } from '../api';
import { fmtSession } from '../components/format';
import { Field, Form } from '../components/forms';
import { Avatar, Empty, ErrorState, Loading, Person } from '../components/parts';
import { useAction, useFetch, useForm, useLiveReload } from '../hooks';
import { subjectClass } from '../labels';
import { useAuth } from '../providers/auth';
import { schemas } from '../validation';

function SessionCard({ g }: { g: GroupCardView }) {
  const full = g.membersCount >= g.capacity;
  return (
    <article className={`card request-card ${subjectClass(g.subject)}`}>
      <div className="card-top">
        <span className={`badge ${g.status === 'cancelled' ? 'badge-cancelled' : full ? 'badge-accepted' : 'badge-open'}`}>{g.status === 'cancelled' ? 'Annulée' : full ? 'Complète' : 'Places disponibles'}</span>
        <span className="subj"><span className="subj-dot" aria-hidden="true" />{g.subject} · {g.level}</span>
      </div>
      <h3><Link href={`/sessions/${g.id}`}>{g.title}</Link></h3>
      <p className="meta"><CalendarDays size={16} aria-hidden="true" /> {fmtSession(g.startsAt)}</p>
      <p className="meta"><MapPin size={16} aria-hidden="true" /> {g.location}</p>
      <p className="muted small meta"><Users size={16} aria-hidden="true" /> {g.membersCount}/{g.capacity} inscrits · organisée par {g.hostName}</p>
    </article>
  );
}

export function Sessions() {
  const { user } = useAuth();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const { data, error, loading, reload } = useFetch<{ items: GroupCardView[] }>(`/sessions?scope=${scope}`);
  return (
    <>
      <div className="page-head">
        <div><h1>Séances collectives</h1><p className="muted">Révisez à plusieurs : rejoignez une séance ou organisez la vôtre.</p></div>
        {user?.role !== 'admin' && <Link className="btn btn-primary" href="/sessions/new"><Plus size={18} aria-hidden="true" /> Organiser une séance</Link>}
      </div>
      {user?.role !== 'admin' && <p className="muted small">Les séances que vous organisez ou avez rejointes sont dans <Link href="/mine?tab=sessions">Mon espace</Link>.</p>}
      <div className="tabs" role="group" aria-label="Période">
        <button className={`tab${scope === 'upcoming' ? ' active' : ''}`} aria-pressed={scope === 'upcoming'} onClick={() => setScope('upcoming')}>À venir</button>
        <button className={`tab${scope === 'past' ? ' active' : ''}`} aria-pressed={scope === 'past'} onClick={() => setScope('past')}>Passées</button>
      </div>
      {loading ? <Loading rows={3} /> : error || !data ? <ErrorState error={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty title={scope === 'upcoming' ? 'Aucune séance à venir.' : 'Aucune séance passée.'}>{scope === 'upcoming' && 'Organisez la première : choisissez une matière, une date et un lieu.'}</Empty>
      ) : <div className="grid">{data.items.map((g) => <SessionCard key={g.id} g={g} />)}</div>}
    </>
  );
}

export function NewSession() {
  const router = useRouter();
  const min = new Date(Date.now() + 3600e3).toISOString().slice(0, 16);
  const form = useForm({
    initial: { title: '', description: '', subject: SUBJECTS[0] as string, level: 'ING1', startsAt: '', location: '', capacity: '6' },
    schema: schemas.group,
    onSubmit: async (v) => {
      const { id } = await api('/sessions', { method: 'POST', body: { ...v, capacity: Number(v.capacity) } });
      router.push(`/sessions/${id}`);
      return 'Séance créée.';
    },
  });
  return (
    <div className="narrow">
      <h1>Organiser une séance collective</h1>
      <Form form={form} submit="Créer la séance" pending="Création…">
        <Field form={form} name="title" label="Titre" required maxLength={100} />
        <Field form={form} name="description" label="Programme" as="textarea" required maxLength={1000} hint="Ce que vous allez réviser et ce que les participants doivent apporter." />
        <Field form={form} name="subject" label="Matière" as="select" options={SUBJECTS} required />
        <Field form={form} name="level" label="Niveau" as="select" options={LEVELS} required />
        <Field form={form} name="startsAt" label="Date et heure" type="datetime-local" required min={min} />
        <Field form={form} name="location" label="Lieu ou lien visio" required maxLength={100} />
        <Field form={form} name="capacity" label="Nombre de places" type="number" min={2} max={50} required hint="Organisateur non compris dans le décompte : 2 à 50 places." />
      </Form>
    </div>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useFetch<GroupDetailView>(`/sessions/${id}`);
  useLiveReload(reload, `/sessions/${id}`);
  const post = (path: string) => async () => { await api(`/sessions/${id}/${path}`, { method: 'POST' }); await reload(); };
  const join = useAction(post('join'), 'Vous êtes inscrit(e).');
  const leave = useAction(post('leave'), 'Inscription annulée.');
  const cancel = useAction(post('cancel'), 'Séance annulée.');
  if (loading && !data) return <Loading rows={1} />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  const { session: g, members, permissions: p } = data;
  const err = join.error || leave.error || cancel.error;
  return (
    <article>
      <p><Link href="/sessions" className="back"><ArrowLeft size={16} aria-hidden="true" /> Toutes les séances</Link></p>
      <header className={`req-head ${subjectClass(g.subject)}`}>
        <div className="card-top">
          <span className={`badge ${g.status === 'cancelled' ? 'badge-cancelled' : 'badge-open'}`}>{g.status === 'cancelled' ? 'Annulée' : p.past ? 'Terminée' : p.full ? 'Complète' : 'Ouverte'}</span>
          <span className="subj"><span className="subj-dot" aria-hidden="true" />{g.subject} · {g.level}</span>
        </div>
        <h1>{g.title}</h1>
        <p className="muted by">Organisée par <Person name={g.hostName} /></p>
      </header>
      <section className="card">
        <p className="prewrap">{g.description}</p>
        <p className="meta"><CalendarDays size={18} aria-hidden="true" /> <strong>{fmtSession(g.startsAt)}</strong></p>
        <p className="meta"><MapPin size={18} aria-hidden="true" /> {g.location}</p>
        <p className="meta"><Users size={18} aria-hidden="true" /> {g.membersCount} / {g.capacity} places occupées</p>
        {err && <p role="alert" className="alert alert-error">{err}</p>}
        <div className="actions">
          {p.canJoin && <button className="btn btn-primary" disabled={join.pending} onClick={() => join.run()}>Rejoindre la séance</button>}
          {p.canLeave && <button className="btn" disabled={leave.pending} onClick={() => leave.run()}>Me désinscrire</button>}
          {p.canCancel && <button className="btn btn-danger" disabled={cancel.pending} onClick={() => cancel.run()}>Annuler la séance</button>}
          {!p.canJoin && !p.isHost && !p.joined && <p className="muted">{g.status === 'cancelled' ? 'Cette séance a été annulée.' : p.past ? 'Cette séance est passée.' : p.full ? 'Cette séance est complète.' : ''}</p>}
        </div>
      </section>
      {(p.isHost || p.joined || p.isAdmin) && (
        <section aria-labelledby="mem-title">
          <h2 id="mem-title">Inscrits ({members.length})</h2>
          {members.length === 0 ? <p className="muted">Personne pour l’instant.</p> : (
            <ul className="plain members">
              {members.map((m) => <li key={m.id} className="card row"><span className="person"><Avatar name={m.name} size={32} /><span><strong>{m.name}</strong><br /><small className="muted">{m.speciality} · {m.level}</small></span></span></li>)}
            </ul>
          )}
        </section>
      )}
    </article>
  );
}
