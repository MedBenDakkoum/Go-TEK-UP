'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react';
import type { SpaceGroupView, SpaceOfferView, SpaceRequestView, SpaceSessionView, SpaceView } from '@/application/read-models';
import { fmtDate, fmtSession } from '../components/format';
import { Empty, ErrorState, Loading, OfferBadge, RequestCard, StatusBadge } from '../components/parts';
import { useFetch, useLiveReload } from '../hooks';
import { subjectClass } from '../labels';

const TABS = [['requests', 'Mes demandes'], ['offers', 'Mes aides'], ['sessions', 'Mes séances']] as const;
type Tab = (typeof TABS)[number][0];

function Requests({ items }: { items: SpaceRequestView[] }) {
  if (!items.length) return <Empty title="Vous n’avez rien publié.">Besoin d’un coup de main ? <Link href="/requests/new">Publiez votre première demande</Link>.</Empty>;
  return (
    <div className="grid">
      {items.map((r) => (
        <RequestCard key={r.id} r={{ ...r, authorName: 'Vous' }} note={r.pendingCount > 0 ? <p className="why">{r.pendingCount} proposition{r.pendingCount > 1 ? 's' : ''} à examiner</p> : null} />
      ))}
    </div>
  );
}

function Offers({ items }: { items: SpaceOfferView[] }) {
  if (!items.length) return <Empty title="Vous n’avez encore proposé aucune aide.">Parcourez <Link href="/requests">les demandes des autres étudiants</Link>.</Empty>;
  return (
    <ul className="plain">
      {items.map((o) => (
        <li key={o.id} className={`card row request-card ${subjectClass(o.subject)}`}>
          <div><Link href={`/requests/${o.requestId}`}>{o.title}</Link><p className="muted small">Demande de {o.authorName} · proposée le {fmtDate(o.createdAt)}</p></div>
          <div className="badges"><OfferBadge status={o.status} /> <StatusBadge status={o.requestStatus} /></div>
        </li>
      ))}
    </ul>
  );
}

function Sessions({ individual, groups, now }: { individual: SpaceSessionView[]; groups: SpaceGroupView[]; now: string }) {
  const upcoming = (g: SpaceGroupView) => g.status === 'open' && g.startsAt >= now;
  const ups = groups.filter(upcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = groups.filter((g) => !upcoming(g));
  return (
    <>
      <h2>Séances individuelles</h2>
      {individual.length === 0 ? <Empty title="Aucune séance individuelle.">Elles apparaissent dès qu’une aide est acceptée sur l’une de vos demandes, ou que la vôtre est retenue.</Empty> : (
        <ul className="plain">
          {individual.map((s) => (
            <li key={s.id} className={`card row request-card ${subjectClass(s.subject)}`}>
              <div>
                <Link href={`/requests/${s.id}`}>{s.title}</Link>
                <p className="muted small">Vous êtes <strong>{s.role}</strong> · avec {s.otherName}</p>
                {s.startsAt && s.status === 'accepted'
                  ? <p className="meta small"><CalendarDays size={14} aria-hidden="true" /> {fmtSession(s.startsAt)} · <MapPin size={14} aria-hidden="true" /> {s.location} · {s.planStatus === 'confirmed' ? 'confirmée' : 'à confirmer'}</p>
                  : s.status === 'accepted' && <p className="muted small">Aucune date fixée.</p>}
              </div>
              <div className="badges">
                <StatusBadge status={s.status} />
                {s.status === 'done' && !s.reviewed && <Link className="btn" href={`/requests/${s.id}`}>Évaluer</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Séances collectives</h2>
      <p><Link className="btn" href="/sessions/new"><Plus size={16} aria-hidden="true" /> Organiser une séance</Link> <Link href="/sessions" className="small">Voir les séances des autres</Link></p>
      {groups.length === 0 ? <Empty title="Aucune séance collective.">Organisez-en une ou rejoignez-en une depuis <Link href="/sessions">la liste des séances</Link>.</Empty> : (
        <>
          <GroupList title="À venir" items={ups} />
          <GroupList title="Passées ou annulées" items={past} />
        </>
      )}
    </>
  );
}

function GroupList({ title, items }: { title: string; items: SpaceGroupView[] }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      <ul className="plain">
        {items.map((g) => (
          <li key={g.id} className={`card row request-card ${subjectClass(g.subject)}`}>
            <div>
              <Link href={`/sessions/${g.id}`}>{g.title}</Link>
              <p className="meta small"><CalendarDays size={14} aria-hidden="true" /> {fmtSession(g.startsAt)} · <MapPin size={14} aria-hidden="true" /> {g.location} · <Users size={14} aria-hidden="true" /> {g.membersCount}/{g.capacity}</p>
            </div>
            <div className="badges">
              <span className="chip">{g.role === 'organisateur' ? 'Vous organisez' : 'Inscrit(e)'}</span>
              {g.status === 'cancelled' && <span className="badge badge-cancelled">Annulée</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** « Mon espace » : uniquement mes demandes, mes aides et mes séances, séparées de la liste commune. */
export default function Mine() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TABS.find(([k]) => k === requested)?.[0] ?? 'requests';
  const { data, error, loading, reload } = useFetch<SpaceView>('/users/me/space');
  useLiveReload(reload);
  const counts = data && { requests: data.requests.length, offers: data.offers.length, sessions: data.sessions.length + data.groups.length };
  return (
    <>
      <div className="page-head">
        <div><h1>Mon espace</h1><p className="muted">Vos demandes, vos aides et vos séances — uniquement les vôtres.</p></div>
        <Link className="btn btn-primary" href="/requests/new"><Plus size={18} aria-hidden="true" /> Publier une demande</Link>
      </div>
      <div className="tabs" role="group" aria-label="Sections de mon espace">
        {TABS.map(([k, label]) => (
          <button key={k} className={`tab${tab === k ? ' active' : ''}`} aria-pressed={tab === k} onClick={() => router.push(`${pathname}?tab=${k}`)}>
            {label}{counts ? ` (${counts[k]})` : ''}
          </button>
        ))}
      </div>
      {loading ? <Loading rows={3} /> : error || !data ? <ErrorState error={error} onRetry={reload} /> : (
        tab === 'requests' ? <Requests items={data.requests} />
          : tab === 'offers' ? <Offers items={data.offers} />
          : <Sessions individual={data.sessions} groups={data.groups} now={data.now} />
      )}
    </>
  );
}
