'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { NotificationView } from '@/application/read-models';
import { api } from '../api';
import { Empty, ErrorState, Loading } from '../components/parts';
import { useAction, useFetch, useLiveReload } from '../hooks';

const when = (s: string) => new Date(s).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Notifications() {
  const { data, error, loading, reload } = useFetch<{ items: NotificationView[]; unread: number }>('/notifications');
  useLiveReload(reload);
  const readAll = useAction(async () => { await api('/notifications/read-all', { method: 'POST' }); await reload(); }, 'Notifications marquées comme lues.');
  const readOne = async (id: number) => { try { await api(`/notifications/${id}/read`, { method: 'POST' }); } catch { /* sans gravité */ } };
  if (loading) return <Loading rows={2} />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        {data.unread > 0 && <button className="btn" disabled={readAll.pending} onClick={() => readAll.run()}>Tout marquer comme lu</button>}
      </div>
      {readAll.error && <p role="alert" className="alert alert-error">{readAll.error}</p>}
      {data.items.length === 0 ? <Empty title="Aucune notification pour le moment.">Vous serez prévenu(e) des propositions, acceptations, messages et séances.</Empty> : (
        <ul className="plain">
          {data.items.map((n) => (
            <li key={n.id} className={`card notif${n.read ? '' : ' unread'}`}>
              <Bell size={18} aria-hidden="true" />
              <div>
                {n.link ? <Link href={n.link} onClick={() => readOne(n.id)}>{n.message}</Link> : <span>{n.message}</span>}
                <p className="muted small">{when(n.createdAt)}{!n.read && <> · <strong>nouvelle</strong></>}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
