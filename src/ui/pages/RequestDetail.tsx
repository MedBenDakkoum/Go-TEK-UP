'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Ban, CalendarDays, Check, Flag, MapPin, MessageSquare, Pencil, Send } from 'lucide-react';
import type { MessageView, OfferView, RequestDetailView, RequestPermissionsView } from '@/application/read-models';
import { api } from '../api';
import { fmtDate, fmtSession } from '../components/format';
import { Field, Form, RatingField } from '../components/forms';
import { Avatar, ErrorState, Loading, OfferBadge, Person, Stars, StatusBadge, UserBadge } from '../components/parts';
import { useAction, useFetch, useForm, useLiveReload } from '../hooks';
import { subjectClass } from '../labels';
import { useAuth } from '../providers/auth';
import { schemas } from '../validation';

const STEPS = [['open', 'Ouverte'], ['accepted', 'Aide acceptée'], ['done', 'Terminée']] as const;
type Reload = () => Promise<void>;

function OfferForm({ id, reload }: { id: number; reload: Reload }) {
  const form = useForm({
    initial: { message: '' }, schema: schemas.offer,
    onSubmit: async (v) => { await api(`/requests/${id}/offers`, { method: 'POST', body: v }); await reload(); return 'Votre proposition a été envoyée.'; },
  });
  return (
    <div className="card">
      <h3>Proposer mon aide</h3>
      <Form form={form} submit="Envoyer ma proposition" pending="Envoi…">
        <Field form={form} name="message" label="Votre message" as="textarea" rows={4} required maxLength={500}
          hint="Présentez ce que vous pouvez apporter (10 caractères minimum)." />
      </Form>
    </div>
  );
}

function ReviewForm({ id, reload }: { id: number; reload: Reload }) {
  const form = useForm({
    initial: { rating: '', comment: '' }, schema: schemas.review,
    onSubmit: async (v) => { await api(`/requests/${id}/reviews`, { method: 'POST', body: { rating: Number(v.rating), comment: v.comment } }); await reload(); return 'Merci, votre évaluation est enregistrée.'; },
  });
  return (
    <div className="card">
      <h3>Évaluer la séance</h3>
      <Form form={form} submit="Envoyer l’évaluation" pending="Envoi…">
        <RatingField form={form} />
        <Field form={form} name="comment" label="Commentaire (facultatif)" as="textarea" rows={3} maxLength={300} />
      </Form>
    </div>
  );
}

function ReportForm({ id }: { id: number }) {
  const form = useForm({
    initial: { reason: '' }, schema: schemas.report, resetOnSuccess: true,
    onSubmit: async (v) => { await api(`/requests/${id}/reports`, { method: 'POST', body: v }); return 'Signalement transmis aux administrateurs.'; },
  });
  return (
    <details className="report">
      <summary><Flag size={16} aria-hidden="true" /> Signaler cette demande</summary>
      <Form form={form} submit="Envoyer le signalement" pending="Envoi…" submitClass="btn">
        <Field form={form} name="reason" label="Motif" required maxLength={300} />
      </Form>
    </details>
  );
}

function OfferActions({ offer, reload }: { offer: OfferView; reload: Reload }) {
  const accept = useAction(async () => { await api(`/offers/${offer.id}/respond`, { method: 'POST', body: { decision: 'accept' } }); await reload(); }, 'Aide acceptée.');
  const reject = useAction(async () => { await api(`/offers/${offer.id}/respond`, { method: 'POST', body: { decision: 'reject' } }); await reload(); }, 'Proposition refusée.');
  const err = accept.error || reject.error;
  return (
    <>
      {err && <p role="alert" className="alert alert-error">{err}</p>}
      <div className="actions">
        <button className="btn btn-primary" disabled={accept.pending || reject.pending} onClick={() => accept.run()}>
          <Check size={18} aria-hidden="true" /> {accept.pending ? '…' : 'Accepter'}{' '}<span className="sr">la proposition de {offer.helperName}</span>
        </button>
        <button className="btn" disabled={accept.pending || reject.pending} onClick={() => reject.run()}>
          {reject.pending ? '…' : 'Refuser'}{' '}<span className="sr">la proposition de {offer.helperName}</span>
        </button>
      </div>
    </>
  );
}

/** Calendrier de séance : un participant propose une date, l'autre confirme (ou en propose une autre). */
function PlanCard({ id, plan, permissions: p, reload, userId }: { id: number; plan: RequestDetailView['plan']; permissions: RequestPermissionsView; reload: Reload; userId: number }) {
  const [editing, setEditing] = useState(false);
  const form = useForm({
    initial: { startsAt: '', location: '' }, schema: schemas.plan,
    onSubmit: async (v) => { await api(`/requests/${id}/plan`, { method: 'POST', body: v }); setEditing(false); await reload(); return 'Date proposée : en attente de confirmation.'; },
  });
  const confirm = useAction(async () => { await api(`/requests/${id}/plan/confirm`, { method: 'POST' }); await reload(); }, 'Séance confirmée.');
  const min = new Date(Date.now() + 3600e3).toISOString().slice(0, 16);
  return (
    <section className="card plan" aria-labelledby="plan-title">
      <h2 id="plan-title"><CalendarDays size={22} aria-hidden="true" /> Séance</h2>
      {plan ? (
        <>
          <p className="plan-when"><strong>{fmtSession(plan.startsAt)}</strong> <span className={`badge ${plan.status === 'confirmed' ? 'badge-done-ok' : 'badge-accepted'}`}>{plan.status === 'confirmed' ? 'Confirmée' : 'À confirmer'}</span></p>
          <p className="muted"><MapPin size={16} aria-hidden="true" /> {plan.location}</p>
          {plan.status === 'proposed' && (plan.proposedBy === userId
            ? <p className="muted small">Proposée par vous : en attente de la réponse de votre interlocuteur.</p>
            : <p className="muted small">Proposée par {plan.proposedByName}.</p>)}
          {confirm.error && <p role="alert" className="alert alert-error">{confirm.error}</p>}
          <div className="actions">
            {p.canConfirmPlan && <button className="btn btn-primary" disabled={confirm.pending} onClick={() => confirm.run()}><Check size={18} aria-hidden="true" /> Confirmer cette date</button>}
            {p.canPlan && !editing && <button className="btn" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" /> Proposer une autre date</button>}
          </div>
        </>
      ) : <p className="muted">Aucune date fixée. Proposez un créneau à votre interlocuteur.</p>}
      {p.canPlan && (editing || !plan) && (
        <Form form={form} submit="Proposer cette date" pending="Envoi…" className="form plan-form">
          <Field form={form} name="startsAt" label="Date et heure" type="datetime-local" required min={min} />
          <Field form={form} name="location" label="Lieu ou lien visio" required maxLength={100} hint="Ex. : Bibliothèque, salle 2 — ou lien Teams/Meet" />
        </Form>
      )}
    </section>
  );
}

/** Messagerie entre l'auteur et l'aidant retenu (mise à jour en temps réel). */
function Chat({ id, userId }: { id: number; userId: number }) {
  const { data, error, reload } = useFetch<{ items: MessageView[] }>(`/requests/${id}/messages`, { interval: 10000 });
  const form = useForm({
    initial: { body: '' }, schema: schemas.message, resetOnSuccess: true,
    onSubmit: async (v) => { await api(`/requests/${id}/messages`, { method: 'POST', body: v }); await reload(); },
  });
  const time = (s: string) => new Date(s).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <section className="card chat" aria-labelledby="chat-title">
      <h2 id="chat-title"><MessageSquare size={22} aria-hidden="true" /> Messages</h2>
      {error && <p role="alert" className="alert alert-error">{error.message}</p>}
      <ul className="msgs" role="log" aria-live="polite" aria-label="Conversation">
        {data?.items.length === 0 && <li className="muted">Aucun message. Dites bonjour !</li>}
        {data?.items.map((m) => (
          <li key={m.id} className={`msg${m.senderId === userId ? ' mine' : ''}`}>
            <Avatar name={m.senderName} size={28} />
            <div><p className="msg-body prewrap">{m.body}</p><p className="muted small">{m.senderId === userId ? 'Vous' : m.senderName} · {time(m.createdAt)}</p></div>
          </li>
        ))}
      </ul>
      <Form form={form} className="chat-form">
        <div className="chat-row">
          <Field form={form} name="body" label="Votre message" maxLength={500} />
          <button type="submit" className="btn btn-primary" disabled={form.submitting}><Send size={18} aria-hidden="true" /> Envoyer</button>
        </div>
      </Form>
    </section>
  );
}

function CancelButton({ id, reload }: { id: number; reload: Reload }) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useAction(async () => { await api(`/requests/${id}/cancel`, { method: 'POST' }); setConfirming(false); await reload(); }, 'Demande annulée.');
  if (!confirming) return <button className="btn" onClick={() => setConfirming(true)}><Ban size={16} aria-hidden="true" /> Annuler la demande</button>;
  return (
    <span className="confirm-inline" role="group" aria-label="Confirmer l’annulation">
      {cancel.error && <span role="alert" className="field-error">{cancel.error}</span>}
      <button className="btn btn-danger" disabled={cancel.pending} onClick={() => cancel.run()}>{cancel.pending ? '…' : 'Oui, annuler'}</button>
      <button className="btn" onClick={() => setConfirming(false)}>Non, garder</button>
    </span>
  );
}

export default function RequestDetail({ id: idParam }: { id: string }) {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch<RequestDetailView>(`/requests/${idParam}`);
  useLiveReload(reload, `/requests/${idParam}`);
  const complete = useAction(async () => { await api(`/requests/${idParam}/complete`, { method: 'POST' }); await reload(); }, 'Demande clôturée : pensez à évaluer la séance.');

  if (loading && !data) return <Loading rows={1} />;
  if (error || !data || !user) return <ErrorState error={error} onRetry={reload} />;

  const { request: r, offers, accepted, reviews, permissions: p, authorStats, plan } = data;
  const stepIdx = STEPS.findIndex(([k]) => k === r.status);

  return (
    <article>
      <p><Link href="/requests" className="back"><ArrowLeft size={16} aria-hidden="true" /> Toutes les demandes</Link></p>
      {r.hidden ? <p role="alert" className="alert alert-error">Cette demande a été masquée par un administrateur.</p> : null}

      <header className={`req-head ${subjectClass(r.subject)}`}>
        <div className="card-top"><StatusBadge status={r.status} /><span className="subj"><span className="subj-dot" aria-hidden="true" />{r.subject} · {r.level}</span></div>
        <h1>{r.title}</h1>
        <p className="muted by"><Person name={r.authorName}>{' '}({r.authorLevel})</Person> · {fmtDate(r.createdAt)} · <UserBadge stats={authorStats} /></p>
      </header>

      {r.status === 'cancelled' ? (
        <p className="alert" role="status"><Ban size={16} aria-hidden="true" /> Cette demande a été annulée par son auteur.</p>
      ) : (
        <ol className="stepper" aria-label="Avancement de la demande">
          {STEPS.map(([k, label], i) => <li key={k} aria-current={i === stepIdx ? 'step' : undefined} className={i <= stepIdx ? 'done' : ''}><span className="dot" aria-hidden="true">{i < stepIdx ? <Check size={14} /> : i + 1}</span>{label}</li>)}
        </ol>
      )}

      <section className="card">
        <p className="prewrap">{r.description}</p>
        <p><strong>Disponibilités :</strong> {r.availability}</p>
        {complete.error && <p role="alert" className="alert alert-error">{complete.error}</p>}
        {(p.canEdit || p.canComplete || p.canCancel) && (
          <div className="actions">
            {p.canEdit && <Link className="btn" href={`/requests/${r.id}/edit`}><Pencil size={16} aria-hidden="true" /> Modifier</Link>}
            {p.canComplete && <button className="btn btn-primary" disabled={complete.pending} onClick={() => complete.run()}><Check size={18} aria-hidden="true" /> {complete.pending ? 'Clôture…' : 'Marquer comme terminée'}</button>}
            {p.canCancel && <CancelButton id={r.id} reload={reload} />}
          </div>
        )}
      </section>

      {accepted && (
        <section className="card accent" aria-labelledby="accepted-title">
          <h2 id="accepted-title">Aide acceptée</h2>
          <p><Person name={accepted.helperName} /> aide {r.authorName} sur cette demande.</p>
          {accepted.contact && <p className="muted">Contact : <a href={`mailto:${accepted.contact}`}>{accepted.contact}</a></p>}
        </section>
      )}

      {(p.canPlan || plan) && <PlanCard id={r.id} plan={plan} permissions={p} reload={reload} userId={user.id} />}
      {p.canMessage && <Chat id={r.id} userId={user.id} />}

      <section aria-labelledby="offers-title">
        <h2 id="offers-title">{p.isAuthor || p.isAdmin ? `Propositions reçues (${offers.length})` : 'Votre proposition'}</h2>
        {offers.length === 0 && (p.isAuthor || p.isAdmin) && <p className="muted">Aucune proposition pour l’instant.</p>}
        <ul className="plain">
          {offers.map((o) => (
            <li key={o.id} className="card offer">
              <div className="card-top"><Person name={o.helperName} /> <OfferBadge status={o.status} /><span className="muted small">{fmtDate(o.createdAt)}</span></div>
              <p className="muted small">{o.speciality} · {o.helperLevel} · <UserBadge stats={o.stats} /></p>
              {o.skills.length > 0 && <p className="tags">{o.skills.map((s) => <span key={s} className="tag">{s}</span>)}</p>}
              <p className="prewrap">{o.message}</p>
              {p.canRespond && o.status === 'pending' && <OfferActions offer={o} reload={reload} />}
            </li>
          ))}
        </ul>
        {p.canOffer && <OfferForm id={r.id} reload={reload} />}
        {!p.isAuthor && !p.isAdmin && !p.canOffer && !p.hasOffered && <p className="alert">Cette demande n’accepte plus de propositions.</p>}
      </section>

      {r.status === 'done' && (
        <section aria-labelledby="rev-title">
          <h2 id="rev-title">Évaluations</h2>
          {reviews.length === 0 && <p className="muted">Aucune évaluation pour le moment.</p>}
          <ul className="plain">
            {reviews.map((v) => (
              <li key={v.id} className="card">
                <p><Stars value={v.rating} /> <span className="muted small">{v.reviewerName} → {v.revieweeName}</span></p>
                {v.comment && <p className="prewrap">{v.comment}</p>}
              </li>
            ))}
          </ul>
          {p.canReview && <ReviewForm id={r.id} reload={reload} />}
        </section>
      )}

      {p.canReport && <ReportForm id={r.id} />}
    </article>
  );
}
