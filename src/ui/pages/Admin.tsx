'use client';
import Link from 'next/link';
import type { AdminOverviewView, AdminReportView, RequestCardView } from '@/application/read-models';
import { api } from '../api';
import { fmtDate } from '../components/format';
import { Empty, ErrorState, Loading } from '../components/parts';
import { useAction, useFetch } from '../hooks';

type Reload = () => Promise<void>;

function ReportItem({ p, reload }: { p: AdminReportView; reload: Reload }) {
  const hide = useAction(async () => { await api(`/admin/reports/${p.id}/resolve`, { method: 'POST', body: { decision: 'hide' } }); await reload(); });
  const dismiss = useAction(async () => { await api(`/admin/reports/${p.id}/resolve`, { method: 'POST', body: { decision: 'dismiss' } }); await reload(); });
  const busy = hide.pending || dismiss.pending;
  return (
    <li className="card">
      <p><Link href={`/requests/${p.requestId}`}><strong>{p.title}</strong></Link> <span className="muted small">par {p.authorName}</span></p>
      <p className="prewrap">{p.description.slice(0, 200)}</p>
      <p className="muted small">Signalé par {p.reporterName} le {fmtDate(p.createdAt)} — motif : {p.reason}</p>
      {(hide.error || dismiss.error) && <p role="alert" className="alert alert-error">{hide.error || dismiss.error}</p>}
      <div className="actions">
        <button className="btn btn-danger" disabled={busy} onClick={() => hide.run()}>Masquer la demande</button>
        <button className="btn" disabled={busy} onClick={() => dismiss.run()}>Classer sans suite</button>
      </div>
    </li>
  );
}

function HiddenItem({ r, reload }: { r: RequestCardView; reload: Reload }) {
  const restore = useAction(async () => { await api(`/admin/requests/${r.id}/restore`, { method: 'POST' }); await reload(); });
  return (
    <li className="card row">
      <div><Link href={`/requests/${r.id}`}>{r.title}</Link><p className="muted small">par {r.authorName}</p></div>
      {restore.error && <span role="alert" className="field-error">{restore.error}</span>}
      <button className="btn" disabled={restore.pending} onClick={() => restore.run()}>Rétablir</button>
    </li>
  );
}

export default function Admin() {
  const { data, error, loading, reload } = useFetch<AdminOverviewView>('/admin/overview');
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  const { counts: c, reports, hidden, actions } = data;
  return (
    <>
      <div className="page-head"><h1>Espace administrateur</h1><Link className="btn btn-primary" href="/admin/users">Gérer les utilisateurs</Link></div>
      <ul className="counters" aria-label="Chiffres clés">
        <li><strong>{c.users}</strong> utilisateurs</li>
        <li><strong>{c.requests}</strong> demandes</li>
        <li><strong>{c.openReports}</strong> signalement{c.openReports > 1 ? 's' : ''} à traiter</li>
      </ul>
      <section aria-labelledby="rep-title">
        <h2 id="rep-title">Signalements à traiter</h2>
        {reports.length === 0 ? <Empty title="Aucun signalement en attente." /> : <ul className="plain">{reports.map((p) => <ReportItem key={p.id} p={p} reload={reload} />)}</ul>}
      </section>
      <section aria-labelledby="hid-title">
        <h2 id="hid-title">Demandes masquées</h2>
        {hidden.length === 0 ? <Empty title="Aucune demande masquée." /> : <ul className="plain">{hidden.map((r) => <HiddenItem key={r.id} r={r} reload={reload} />)}</ul>}
      </section>
      <section aria-labelledby="log-title">
        <h2 id="log-title">Journal des actions</h2>
        {actions.length === 0 ? <Empty title="Aucune action enregistrée." /> : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr">Dernières actions de modération</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Administrateur</th><th scope="col">Action</th><th scope="col">Détail</th></tr></thead>
              <tbody>{actions.map((a) => <tr key={a.id}><td>{fmtDate(a.createdAt)}</td><td>{a.adminName}</td><td>{a.action}</td><td className="muted small">{a.details}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
