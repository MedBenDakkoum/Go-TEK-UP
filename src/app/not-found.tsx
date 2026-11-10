import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty">
      <p className="empty-title">Page introuvable</p>
      <p className="muted">Cette adresse n’existe pas ou a été déplacée.</p>
      <Link className="btn btn-primary" href="/">Retour à l’accueil</Link>
    </div>
  );
}
