'use client';
import Link from 'next/link';
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react';
import type { DashboardView } from '@/application/read-models';
import { fmtSession } from '../components/format';
import { BarChart, Empty, ErrorState, Loading, RequestCard, UserBadge } from '../components/parts';
import { useFetch, useLiveReload } from '../hooks';
import { useAuth } from '../providers/auth';

const monthShort = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '');

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch<DashboardView>('/users/me/dashboard');
  useLiveReload(reload);
  if (loading) return <Loading rows={3} />;
  if (error || !data || !user) return <ErrorState error={error} onRetry={reload} />;
  const { published, offered, sessions, recommendations, stats, upcoming, monthly } = data;
  const s = (n: number) => (n > 1 ? 's' : '');
  const totalHelps = monthly.reduce((a, m) => a + m.helps, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour {user.name.split(' ')[0]}</h1>
          <p className="muted"><UserBadge stats={stats} /></p>
        </div>
        <Link className="btn btn-primary" href="/requests/new"><Plus size={18} aria-hidden="true" /> Publier une demande</Link>
      </div>

      <ul className="counters" aria-label="Résumé">
        <li><strong>{published.length}</strong> demande{s(published.length)} publiée{s(published.length)}</li>
        <li><strong>{offered.length}</strong> aide{s(offered.length)} proposée{s(offered.length)}</li>
        <li><strong>{sessions.length}</strong> séance{s(sessions.length)} réalisée{s(sessions.length)}</li>
        <li><strong>{stats.avg ?? '–'}</strong> note moyenne{stats.reviews ? ` (${stats.reviews} avis)` : ''}</li>
      </ul>

      <div className="two-col">
        <section aria-labelledby="up-title" className="card">
          <h2 id="up-title" className="tight">Prochaines séances</h2>
          {upcoming.length === 0 ? <p className="muted">Aucune séance prévue. <Link href="/sessions">Voir les séances collectives</Link>.</p> : (
            <ul className="plain upcoming">
              {upcoming.map((u) => (
                <li key={`${u.kind}-${u.id}`}>
                  <Link href={u.link}>{u.title}</Link>
                  <p className="muted small meta"><CalendarDays size={14} aria-hidden="true" /> {fmtSession(u.startsAt)} · <MapPin size={14} aria-hidden="true" /> {u.location}</p>
                  <p className="small meta">
                    {u.kind === 'group' ? <><Users size={14} aria-hidden="true" /> Séance collective{u.status === 'host' ? ' · vous organisez' : ''}</> : u.status === 'confirmed' ? 'Séance confirmée' : 'Date à confirmer'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="chart-title" className="card">
          <h2 id="chart-title" className="tight">Aides apportées</h2>
          <p className="muted small">Séances terminées en tant qu’aidant, 6 derniers mois ({totalHelps} au total).</p>
          <BarChart label="Aides apportées par mois" data={monthly.map((m) => ({ label: monthShort(m.month), value: m.helps }))} />
        </section>
      </div>

      <section aria-labelledby="reco-title">
        <h2 id="reco-title">Recommandées pour vous</h2>
        {recommendations.length === 0 ? (
          <Empty title="Aucune recommandation pour le moment.">
            Renseignez vos compétences dans <Link href="/profile">votre profil</Link> : nous vous proposons les demandes ouvertes qui correspondent.
          </Empty>
        ) : (
          <div className="grid">
            {recommendations.map((r) => <RequestCard key={r.id} r={r} note={<p className="why">Correspond à : {r.matched.join(', ')}</p>} />)}
          </div>
        )}
      </section>

      <section className="card accent" aria-labelledby="space-title">
        <h2 id="space-title" className="tight">Mon espace</h2>
        <p className="muted">Vos demandes, vos aides proposées et vos séances sont réunies dans une section personnelle, séparée de celles des autres étudiants.</p>
        <div className="actions"><Link className="btn btn-primary" href="/mine">Ouvrir mon espace</Link></div>
      </section>
    </>
  );
}
