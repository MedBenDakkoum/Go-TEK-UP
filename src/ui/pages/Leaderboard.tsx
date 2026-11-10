'use client';
import { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { LeaderboardView } from '@/application/read-models';
import { Avatar, Empty, ErrorState, Loading } from '../components/parts';
import { useFetch } from '../hooks';
import { useAuth } from '../providers/auth';

const monthLabel = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function Leaderboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState('');
  const { data, error, loading, reload } = useFetch<LeaderboardView>(`/leaderboard${month ? `?month=${month}` : ''}`);
  return (
    <>
      <div className="page-head">
        <div>
          <h1><Trophy aria-hidden="true" className="h-icon" /> Classement mensuel</h1>
          <p className="muted">10 points par aide terminée dans le mois + les notes reçues.</p>
        </div>
        <div className="field inline-field">
          <label htmlFor="month">Mois</label>
          <input id="month" type="month" value={month || data?.month || ''} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>
      {loading ? <Loading rows={2} /> : error || !data ? <ErrorState error={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty title={`Personne au classement en ${monthLabel(data.month)}.`}>Aidez un camarade et terminez la séance pour apparaître ici.</Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr">Classement des contributeurs, {monthLabel(data.month)}</caption>
              <thead><tr><th scope="col">Rang</th><th scope="col">Étudiant</th><th scope="col">Aides</th><th scope="col">Points</th><th scope="col">Badge</th></tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className={r.id === user?.id ? 'me' : ''}>
                    <td className="rank">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}<span className="sr"> {r.rank}</span></td>
                    <td><span className="person"><Avatar name={r.name} size={30} /><span><strong>{r.name}</strong>{r.id === user?.id && ' (vous)'}<br /><small className="muted">{r.speciality} · {r.level}</small></span></span></td>
                    <td>{r.helps}</td>
                    <td><strong>{r.points}</strong></td>
                    <td><span className="chip">{r.badge}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.me && data.me.rank > data.items.length && <p className="muted">Votre rang : {data.me.rank} ({data.me.points} points).</p>}
        </>
      )}
    </>
  );
}
