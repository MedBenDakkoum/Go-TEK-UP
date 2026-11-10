'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Page, RequestCardView } from '@/application/read-models';
import { LEVELS, SUBJECTS } from '@/domain/constants';
import { Empty, ErrorState, Loading, RequestCard } from '../components/parts';
import { useFetch } from '../hooks';
import { SORTS, STATUSES } from '../labels';
import { useAuth } from '../providers/auth';

const KEYS = ['q', 'subject', 'level', 'status', 'sort'] as const;

export default function Requests() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const applied = Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof KEYS)[number], string>;
  const page = Math.max(1, parseInt(params.get('page') ?? '', 10) || 1);
  const [draft, setDraft] = useState(applied);
  const paramsKey = params.toString();
  useEffect(() => { setDraft(applied); }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setParams = (next: URLSearchParams | Record<string, string>) => {
    const qs = new URLSearchParams(next).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const qs = new URLSearchParams(Object.entries({ ...applied, page: page > 1 ? String(page) : '' }).filter(([, v]) => v)).toString();
  const { data, error, loading, reload } = useFetch<Page<RequestCardView>>(`/requests${qs ? `?${qs}` : ''}`);
  const filtered = ['q', 'subject', 'level', 'status'].some((k) => applied[k as (typeof KEYS)[number]]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim())));
  };
  const goTo = (p: number) => {
    const next = new URLSearchParams(params.toString());
    if (p > 1) next.set('page', String(p)); else next.delete('page');
    setParams(next);
  };

  return (
    <>
      <div className="page-head">
        <h1>Demandes d’aide</h1>
        {user?.role !== 'admin' && <Link className="btn btn-primary" href="/requests/new"><Plus size={18} aria-hidden="true" /> Publier une demande</Link>}
      </div>
      <p className="muted small">
        {user?.role === 'admin' ? 'Consultation pour la modération : un compte administrateur ne publie pas de demande.'
          : <>Demandes des autres étudiants. Les vôtres sont dans <Link href="/mine">Mon espace</Link>.</>}
      </p>

      <form onSubmit={submit} className="filters" role="search" aria-label="Filtrer les demandes">
        <div className="field"><label htmlFor="q">Mot-clé</label><input id="q" value={draft.q} onChange={set('q')} maxLength={80} /></div>
        <div className="field"><label htmlFor="subject">Matière</label>
          <select id="subject" value={draft.subject} onChange={set('subject')}><option value="">Toutes</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor="level">Niveau</label>
          <select id="level" value={draft.level} onChange={set('level')}><option value="">Tous</option>{LEVELS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="field"><label htmlFor="status">Statut</label>
          <select id="status" value={draft.status} onChange={set('status')}><option value="">Tous</option>{Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="sort">Trier par</label>
          <select id="sort" value={draft.sort} onChange={set('sort')}><option value="">{SORTS.recent}</option>{Object.entries(SORTS).filter(([k]) => k !== 'recent').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">Appliquer</button>
          {(filtered || applied.sort) && <button className="btn" type="button" onClick={() => setParams({})}>Réinitialiser</button>}
        </div>
      </form>

      {loading ? <Loading rows={6} /> : error || !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <p className="muted" role="status">
            {data.total} demande{data.total > 1 ? 's' : ''}{filtered ? ' correspondant aux filtres' : ''}
            {data.pages > 1 && <> · page {data.page} sur {data.pages}</>}
          </p>
          {data.items.length === 0 ? (
            <Empty title={filtered ? 'Aucune demande ne correspond à ces filtres.' : 'Aucune demande pour le moment.'}>
              {filtered ? 'Essayez d’élargir votre recherche.' : 'Soyez le premier à publier une demande.'}
            </Empty>
          ) : <div className="grid">{data.items.map((r) => <RequestCard key={r.id} r={r} />)}</div>}
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
