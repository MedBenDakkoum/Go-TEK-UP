'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'auto' | 'light' | 'dark';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'auto', toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

const read = (): Theme => {
  try { return (localStorage.getItem('cc_theme') as Theme) || 'auto'; } catch { return 'auto'; }
};
const prefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Thème : automatique (système) tant que l'utilisateur n'a pas choisi ; son choix est mémorisé. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('auto');
  useEffect(() => { setTheme(read()); }, []);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggle = () => {
    const current = theme === 'auto' ? (prefersDark() ? 'dark' : 'light') : theme;
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('cc_theme', next); } catch { /* stockage indisponible */ }
  };
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark' || (theme === 'auto' && prefersDark());
  return (
    <button className="btn btn-icon btn-ghost" onClick={toggle} aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}>
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
