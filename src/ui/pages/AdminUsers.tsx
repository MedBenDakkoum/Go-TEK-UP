'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { AdminUserView, Page } from '@/application/read-models';
import { api } from '../api';
import { fmtDate } from '../components/format';
import { Field, Form } from '../components/forms';
import { Avatar, Empty, ErrorState, Loading } from '../components/parts';
import { useAction, useFetch, useForm } from '../hooks';
import { schemas } from '../validation';

function UserRow({ u, reload }: { u: AdminUserView; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    initial: { reason: '' }, schema: schemas.report,
    onSubmit: async (v) => { await api(`/admin/users/${u.id}/suspend`, { method: 'POST', body: v }); setOpen(false); await reload(); return `Compte de ${u.name} suspendu.`; },
  });
  const reactivate = useAction(async () => { await api(`/admin/users/${u.id}/reactivate`, { method: 'POST' }); await reload(); }, `Compte de ${u.name} réactivé.`);
  const status = u.suspended ? ['badge-cancelled', 'Suspendu'] : !u.emailVerified ? ['badge-accepted', 'E-mail non vérifié'] : ['badge-open', 'Actif'];
  return (
    <li className="card user-row">
      <div className="row">
        <span className="person"><Avatar name={u.name} size={36} />
          <span><strong>{u.name}</strong> {u.role === 'admin' && <span className="chip">Admin</span>}<br /><small className="muted">{u.email} · {u.speciality} · {u.level}</small></span>
        </span>
        <div className="badges">
          <span className={`badge ${status[0]}`}>{status[1]}</span>
          <span className="muted small">{u.requestsCount} demande{u.requestsCount > 1 ? 's' : ''} · {u.offersCount} aide{u.offersCount > 1 ? 's' : ''}{u.reportsCount > 0 && <> · <strong>{u.reportsCount} signalement{u.reportsCount > 1 ? 's' : ''}</strong></>}</span>
        </div>
      </div>
      <p className="muted small">Inscrit le {fmtDate(u.createdAt)}{u.suspended && u.suspendedAt && <> · suspendu le {fmtDate(u.suspendedAt)} — motif : {u.suspendedReason}</>}</p>
      {reactivate.error && <p role="alert" className="alert alert-error">{reactivate.error}</p>}
      {u.role !== 'admin' && (
        <div className="actions">
          {u.suspended
            ? <button className="btn" disabled={reactivate.pending} onClick={() => reactivate.run()}><ShieldCheck size={16} aria-hidden="true" /> Réactiver le compte</button>
            : !open && <button className="btn" onClick={() => setOpen(true)} aria-label={`Suspendre le compte de ${u.name}`}><ShieldAlert size={16} aria-hidden="true" /> Suspendre</button>}
        </div>
      )}
      {open && !u.suspended && (
        <Form form={form} submit="Confirmer la suspension" pending="Suspension…" submitClass="btn btn-danger" className="form plan-form">
          <Field form={form} name="reason" label={`Motif de la suspension de ${u.name}`} required maxLength={300} hint="Le motif est enregistré dans le journal et montré à l’étudiant à sa prochaine connexion." />
          <button type="button" className="btn" onClick={() => setOpen(false)}>Annuler</button>
        </Form>
      )}
    </li>
  );
}

/** Gestion des utilisateurs : recherche, filtres, suspension / réactivation (action journalisée). */
export default function AdminUsers() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const applied = { q: params.get('q') ?? '', status: params.get('status') ?? '', role: params.get('role') ?? '' };
  const page = Math.max(1, parseInt(params.get('page') ?? '', 10) || 1);
  const [draft, setDraft] = useState(applied);
  const paramsKey = params.toString();
  useEffect(() => { setDraft(applied); }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const setParams = (next: URLSearchParams | Record<string, string>) => {
    const qs = new URLSearchParams(next).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const qs = new URLSearchParams(Object.entries({ ...applied, page: page > 1 ? String(page) : '' }).filter(([, v]) => v)).toString();
  const { data, error, loading, reload } = useFetch<Page<AdminUserView>>(`/admin/users${qs ? `?${qs}` : ''}`);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const goTo = (p: number) => { const n = new URLSearchParams(params.toString()); if (p > 1) n.set('page', String(p)); else n.delete('page'); setParams(n); };

  return (
    <>
      <div className="page-head">
        <div><h1>Utilisateurs</h1><p className="muted">Recherche, suspension et réactivation des comptes. <Link href="/admin">Retour à l’administration</Link></p></div>
      </div>
      <form className="filters" role="search" aria-label="Filtrer les utilisateurs"
        onSubmit={(e) => { e.preventDefault(); setParams(Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim()))); }}>
        <div className="field"><label htmlFor="uq">Nom ou e-mail</label><input id="uq" value={draft.q} onChange={set('q')} maxLength={80} /></div>
        <div className="field"><label htmlFor="ustatus">Statut</label>
          <select id="ustatus" value={draft.status} onChange={set('status')}>
            <option value="">Tous</option><option value="active">Actifs</option><option value="suspended">Suspendus</option><option value="unverified">E-mail non vérifié</option>
          </select></div>
        <div className="field"><label htmlFor="urole">Rôle</label>
          <select id="urole" value={draft.role} onChange={set('role')}><option value="">Tous</option><option value="student">Étudiants</option><option value="admin">Administrateurs</option></select></div>
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">Appliquer</button>
          {Object.values(applied).some(Boolean) && <button className="btn" type="button" onClick={() => setParams({})}>Réinitialiser</button>}
        </div>
      </form>
      {loading ? <Loading rows={3} /> : error || !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <p className="muted" role="status">{data.total} utilisateur{data.total > 1 ? 's' : ''}{data.pages > 1 && <> · page {data.page} sur {data.pages}</>}</p>
          {data.items.length === 0 ? <Empty title="Aucun utilisateur ne correspond." /> : <ul className="plain">{data.items.map((u) => <UserRow key={u.id} u={u} reload={reload} />)}</ul>}
          {data.pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button className="btn" disabled={data.page <= 1} onClick={() => goTo(data.page - 1)}><ChevronLeft size={18} aria-hidden="true" /> Précédent</button>
              <span aria-current="page">Page {data.page} / {data.pages}</span>
              <button className="btn" disabled={data.page >= data.pages} onClick={() => goTo(data.page + 1)}>Suivant <ChevronRight size={18} aria-hidden="true" /></button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
