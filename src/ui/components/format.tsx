/** Date « 12 oct. 2026 » à partir d'une date ISO 8601 (createdAt, updatedAt…). */
export const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Date de séance « AAAA-MM-JJ HH:MM » (heure locale, stockée telle quelle) → « mer. 14 oct., 15:00 ». */
export const fmtSession = (s: string) => {
  const [d, t] = s.split(/[ T]/);
  const date = new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${date}, ${t}`;
};
