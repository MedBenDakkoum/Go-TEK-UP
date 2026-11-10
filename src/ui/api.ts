export class ApiError extends Error {
  errors: Record<string, string>;
  constructor(message: string, public status: number, errors?: Record<string, string>, public code?: string) {
    super(message);
    this.errors = errors || {};
  }
}

/** Appel JSON vers l'API Next.js (/api). Lève ApiError (message, erreurs par champ, code) si la réponse n'est pas OK. */
export async function api<T = any>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez que l’application est démarrée.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.message === 'string' ? data.message : 'Une erreur est survenue.';
    // Session expirée ou compte suspendu : l'application repasse en mode « déconnecté ».
    if ((res.status === 401 && !path.startsWith('/auth/')) || data?.code === 'ACCOUNT_SUSPENDED') {
      window.dispatchEvent(new CustomEvent('cc:auth-lost', { detail: data?.code ?? 'SESSION_EXPIRED' }));
    }
    throw new ApiError(msg, res.status, data?.errors, data?.code);
  }
  return data as T;
}
