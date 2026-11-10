'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../providers/auth';
import { useRealtime } from '../providers/realtime';
import { ThemeToggle } from '../providers/theme';

/** Logo CampusConnect (symbole original : chevrons « up ») ; le logo officiel de l'école s'affiche s'il est fourni. */
export function BrandMark() {
  return (
    <svg className="brand-svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--navy)" />
      <path d="M8 19l8-8 8 8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 25l8-8 8 8" fill="none" stroke="var(--sky-strong)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo officiel de l'école : s'affiche seulement si le fichier public/tek-up-logo.png existe. */
function SchoolLogo() {
  const [ok, setOk] = useState(false);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/tek-up-logo.png" alt="Tek-Up University" className="school-logo" hidden={!ok} onLoad={() => setOk(true)} onError={() => setOk(false)} />;
}

const isActive = (path: string, to: string, exact = false) => (exact ? path === to : path === to || path.startsWith(to + '/'));

function NavItem({ to, exact, className, children, ...rest }: { to: string; exact?: boolean; className: string; children: ReactNode; 'aria-label'?: string }) {
  const path = usePathname();
  return <Link href={to} className={`${className}${isActive(path, to, exact) ? ' active' : ''}`} aria-current={isActive(path, to, exact) ? 'page' : undefined} {...rest}>{children}</Link>;
}

function Bell_({ unread }: { unread: number }) {
  return (
    <NavItem to="/notifications" className="navlink navlink-icon"
      aria-label={unread ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}>
      <Bell size={18} aria-hidden="true" />
      {unread > 0 && <span className="bell-count" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </NavItem>
  );
}

function UserNav() {
  const { unread } = useRealtime();
  return <Bell_ unread={unread} />;
}

export default function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const main = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  // Accessibilité : à chaque changement de page, le focus revient au contenu principal ; le menu mobile se referme.
  useEffect(() => { setOpen(false); main.current?.focus({ preventScroll: false }); window.scrollTo?.(0, 0); }, [path]);

  // Un administrateur modère : il consulte les demandes et séances mais n'a ni « Mon espace » ni tableau de bord.
  const links: [string, string][] = !user
    ? [['/login', 'Connexion'], ['/register', 'Inscription']]
    : user.role === 'admin'
      ? [['/requests', 'Demandes'], ['/sessions', 'Séances'], ['/admin', 'Administration'], ['/admin/users', 'Utilisateurs']]
      : [['/requests', 'Demandes'], ['/sessions', 'Séances'], ['/mine', 'Mon espace'], ['/dashboard', 'Tableau de bord'], ['/leaderboard', 'Classement'], ['/profile', 'Profil']];

  return (
    <>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>Aller au contenu</a>
      <header className="site-header">
        <div className="container bar">
          <Link href="/" className="brand" aria-label="CampusConnect, accueil">
            <BrandMark />
            <span className="brand-text">CampusConnect<small>Tek-Up University</small></span>
          </Link>
          <SchoolLogo />
          <div className="bar-tools">
            {user && <UserNav />}
            <ThemeToggle />
            <button className="btn btn-icon btn-ghost menu-btn" aria-expanded={open} aria-controls="main-nav"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
          <nav id="main-nav" aria-label="Navigation principale" className={`nav${open ? ' open' : ''}`}>
            {links.map(([to, label]) => <NavItem key={to} to={to} exact={to === '/admin'} className="navlink">{label}</NavItem>)}
            {user && (
              <button className="btn btn-ghost" onClick={async () => { await logout(); router.push('/'); router.refresh(); }}>
                <LogOut size={16} aria-hidden="true" /> Déconnexion ({user.name.split(' ')[0]})
              </button>
            )}
          </nav>
        </div>
      </header>
      <main id="main" ref={main} className="container main" tabIndex={-1}>{children}</main>
      <footer className="site-footer"><div className="container">CampusConnect · Tek-Up University</div></footer>
    </>
  );
}
