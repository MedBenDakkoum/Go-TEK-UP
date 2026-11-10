import Link from 'next/link';
import type { ReactNode } from 'react';
import { Ban, CheckCircle2, CircleDot, Clock, HandHeart, Inbox } from 'lucide-react';
import type { RequestCardView } from '@/application/read-models';
import type { Reputation } from '@/domain/user';
import type { ApiError } from '../api';
import { OFFER_STATUSES, STATUSES, subjectClass } from '../labels';
import { fmtDate } from './format';

const STATUS_ICON = { open: CircleDot, accepted: HandHeart, done: CheckCircle2, cancelled: Ban } as const;
export function StatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICON[status as keyof typeof STATUS_ICON] ?? CircleDot;
  return <span className={`badge badge-${status}`}><Icon size={14} aria-hidden="true" /> {STATUSES[status]}</span>;
}
export const OfferBadge = ({ status }: { status: string }) => (
  <span className={`badge badge-o-${status}`}>{status === 'pending' && <Clock size={14} aria-hidden="true" />} {OFFER_STATUSES[status]}</span>
);

export const Stars = ({ value }: { value: number }) => (
  <span className="stars" role="img" aria-label={`${value} sur 5`}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
);

/** Avatar avec initiales (décoratif : le nom est toujours écrit à côté). */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar" aria-hidden="true" style={{ '--h': h, width: size, height: size, fontSize: size * 0.4 } as React.CSSProperties}>{initials}</span>
  );
}

export const Person = ({ name, children }: { name: string; children?: ReactNode }) => (
  <span className="person"><Avatar name={name} size={28} /><strong>{name}</strong>{children}</span>
);

export const UserBadge = ({ stats }: { stats: Reputation }) => (
  <span className="rep">
    <strong>{stats.badge}</strong>
    {stats.extras?.map((e) => <span key={e} className="chip">{e}</span>)} · {stats.points} pts
    {stats.avg !== null && <> · {stats.avg}/5 ({stats.reviews} avis)</>}
  </span>
);

/** Petite illustration pour les listes vides. */
export function EmptyArt() {
  return (
    <svg className="empty-art" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <rect x="14" y="22" width="68" height="48" rx="8" fill="var(--sky)" stroke="var(--primary)" strokeWidth="2" />
      <rect x="26" y="36" width="34" height="5" rx="2.5" fill="var(--primary)" opacity=".5" />
      <rect x="26" y="48" width="22" height="5" rx="2.5" fill="var(--primary)" opacity=".3" />
      <circle cx="90" cy="30" r="16" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
      <path d="M83 30l5 5 9-10" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <EmptyArt />
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

/** Écran de chargement : squelettes de cartes (annoncé « Chargement… » aux lecteurs d'écran). */
export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr">Chargement…</span>
      <div className="grid" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="card skeleton-card"><span className="sk sk-line w40" /><span className="sk sk-line w80 tall" /><span className="sk sk-line" /><span className="sk sk-line w60" /></div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: ApiError | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="empty">
      <Inbox size={40} aria-hidden="true" />
      <p className="empty-title">{error?.status === 404 ? 'Page introuvable' : 'Une erreur est survenue.'}</p>
      <p className="muted">{error?.message}</p>
      {error?.status === 404 ? <Link className="btn btn-primary" href="/requests">Voir les demandes</Link>
        : onRetry && <button className="btn btn-primary" onClick={onRetry}>Réessayer</button>}
    </div>
  );
}

export type CardData = Pick<RequestCardView, 'id' | 'title' | 'description' | 'subject' | 'level' | 'status' | 'createdAt' | 'authorName'> & { offersCount?: number };

export function RequestCard({ r, note }: { r: CardData; note?: ReactNode }) {
  return (
    <article className={`card request-card ${subjectClass(r.subject)}`}>
      <div className="card-top"><StatusBadge status={r.status} /><span className="subj"><span className="subj-dot" aria-hidden="true" />{r.subject} · {r.level}</span></div>
      <h3><Link href={`/requests/${r.id}`}>{r.title}</Link></h3>
      <p className="excerpt">{r.description.length > 140 ? r.description.slice(0, 140) + '…' : r.description}</p>
      {note}
      <p className="muted small meta"><Avatar name={r.authorName} size={22} /> {r.authorName} · {fmtDate(r.createdAt)}
        {r.offersCount !== undefined && <> · {r.offersCount} proposition{r.offersCount > 1 ? 's' : ''}</>}
      </p>
    </article>
  );
}

/** Histogramme SVG simple (aides terminées par mois). */
export function BarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 320, H = 130, pad = 22, bw = (W - pad * 2) / data.length;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {data.map((d, i) => {
          const h = Math.round(((H - 44) * d.value) / max);
          const x = pad + i * bw + bw * 0.18;
          return (
            <g key={d.label}>
              <rect x={x} y={H - 24 - h} width={bw * 0.64} height={Math.max(h, 2)} rx="4" className={d.value ? 'chart-bar' : 'chart-bar chart-bar-empty'} />
              {d.value > 0 && <text x={x + bw * 0.32} y={H - 28 - h} textAnchor="middle" className="bar-value">{d.value}</text>}
              <text x={x + bw * 0.32} y={H - 7} textAnchor="middle" className="bar-label">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr">{data.map((d) => `${d.label} : ${d.value}`).join(', ')}</figcaption>
    </figure>
  );
}
