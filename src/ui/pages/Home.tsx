'use client';
import Link from 'next/link';
import { CalendarDays, HandHeart, Trophy } from 'lucide-react';
import type { Page, PublicStatsView, RequestCardView } from '@/application/read-models';
import { RequestCard } from '../components/parts';
import { useFetch } from '../hooks';
import { useAuth } from '../providers/auth';

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 360 280" role="img" aria-label="Deux étudiants qui s’entraident">
      <rect x="10" y="20" width="340" height="240" rx="28" fill="var(--sky)" />
      <circle cx="105" cy="105" r="30" fill="var(--navy)" />
      <path d="M55 215c0-30 22-50 50-50s50 20 50 50z" fill="var(--navy)" />
      <circle cx="255" cy="115" r="28" fill="var(--primary)" />
      <path d="M207 215c0-28 21-48 48-48s48 20 48 48z" fill="var(--primary)" />
      <rect x="120" y="42" width="120" height="46" rx="14" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
      <path d="M150 88l-6 16 22-16z" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" />
      <rect x="136" y="56" width="70" height="7" rx="3.5" fill="var(--primary)" opacity=".7" />
      <rect x="136" y="70" width="46" height="7" rx="3.5" fill="var(--primary)" opacity=".4" />
      <path d="M268 60l16 16-16 16" fill="none" stroke="var(--navy)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 276 76)" />
      <path d="M248 78l16-16 16 16" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stats() {
  const { data } = useFetch<PublicStatsView>('/stats');
  if (!data) return null;
  const items: [number, string][] = [[data.students, 'étudiants inscrits'], [data.openRequests, 'demandes ouvertes'], [data.sessionsDone, 'séances réalisées']];
  return (
    <ul className="live-stats" aria-label="CampusConnect en chiffres">
      {items.map(([n, l]) => <li key={l}><strong>{n}</strong> {l}</li>)}
    </ul>
  );
}

function Board() {
  const { data, error, loading } = useFetch<Page<RequestCardView>>('/requests?status=open');
  if (loading) return <p role="status" className="loading">Chargement…</p>;
  if (error || !data) return <p className="muted">Impossible de charger les demandes.</p>;
  const latest = data.items.slice(0, 3);
  return latest.length === 0 ? <p className="muted">Aucune demande ouverte pour le moment.</p>
    : <div className="grid">{latest.map((r) => <RequestCard key={r.id} r={r} />)}</div>;
}

export default function Home() {
  const { user } = useAuth();
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Entraide entre étudiants de Tek-Up</p>
          <h1>Un exercice vous bloque ? Quelqu’un du campus l’a déjà résolu.</h1>
          <p className="lead">
            Publiez votre demande en trois minutes, recevez des propositions d’étudiants qui maîtrisent le sujet,
            choisissez la bonne personne et fixez une séance. Puis rendez la pareille.
          </p>
          <div className="actions">
            {user ? (
              <><Link className="btn btn-primary" href="/requests/new">Publier une demande</Link><Link className="btn" href="/requests">Aider quelqu’un</Link></>
            ) : (
              <><Link className="btn btn-primary" href="/register">Créer mon compte</Link><Link className="btn" href="/login">Se connecter</Link></>
            )}
          </div>
          <Stats />
        </div>
        <HeroArt />
      </section>

      {user && (
        <section aria-labelledby="board-title">
          <h2 id="board-title">Au tableau d’affichage</h2>
          <Board />
        </section>
      )}

      <section aria-labelledby="how-title">
        <h2 id="how-title">Comment ça marche</h2>
        <ol className="how">
          <li><HandHeart aria-hidden="true" /><strong>Demande et aide</strong><span>Vous décrivez votre problème ; des étudiants proposent leur aide. Seul l’auteur choisit.</span></li>
          <li><CalendarDays aria-hidden="true" /><strong>Séance planifiée</strong><span>Vous fixez la date et le lieu avec l’aidant, échangez par messages, ou rejoignez une séance collective.</span></li>
          <li><Trophy aria-hidden="true" /><strong>Reconnaissance</strong><span>Chacun évalue l’autre ; vos aides rapportent des points et des badges au classement mensuel.</span></li>
        </ol>
      </section>
    </>
  );
}
