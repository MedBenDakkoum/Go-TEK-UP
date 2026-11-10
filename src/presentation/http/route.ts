import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType, z } from 'zod';
import type { AuthUser } from '@/domain';
import { BadInputError, ForbiddenError, isDomainError, UnauthorizedError, type ValidationError } from '@/domain/errors';
import { getContainer, SESSION_COOKIE, type Container } from '@/infrastructure/container';

/**
 * Adaptateur HTTP : transforme une requête Next.js en appel d'un cas d'usage (authentification, rôle, validation du corps,
 * traduction des erreurs métier en codes HTTP). Les routes de `src/app/api` restent des déclarations d'une ligne.
 */
type Auth = 'public' | 'user' | 'admin';
type Params = Record<string, string>;

export interface RouteContext<S extends ZodType | undefined> {
  user: AuthUser;
  body: S extends ZodType ? z.infer<S> : undefined;
  params: Params;
  query: URLSearchParams;
  ip: string;
  c: Container;
  /** Entier tiré des paramètres d'URL (400 s'il est invalide). */
  id: (name?: string) => number;
  setSession(token: string): void;
  clearSession(): void;
}
interface Options<S extends ZodType | undefined> { auth?: Auth; body?: S; status?: number }

const fail = (status: number, message: string, extra: Record<string, unknown> = {}) => NextResponse.json({ message, ...extra }, { status });

const STATUS = { bad_input: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409, too_many_attempts: 429, domain: 400 } as const;

/** Erreur de validation zod (reconnue par sa forme : voir `isDomainError` pour la raison). */
const zodIssues = (e: unknown) => (e instanceof Error && e.name === 'ZodError' ? (e as unknown as { issues: { code: string; keys?: string[]; path: PropertyKey[]; message: string }[] }).issues : null);

export function toErrorResponse(e: unknown): NextResponse {
  const issues = zodIssues(e);
  if (issues) {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
      if (issue.code === 'unrecognized_keys') for (const k of issue.keys ?? []) errors[k] ??= 'Champ non autorisé';
      else if (issue.path.length) errors[String(issue.path[0])] ??= issue.message;
    }
    return fail(400, 'Données invalides', { errors });
  }
  if (isDomainError(e)) {
    if (e.kind === 'validation') return fail(400, e.message, { errors: (e as ValidationError).errors });
    return fail(STATUS[e.kind as keyof typeof STATUS] ?? 400, e.message, e.code ? { code: e.code } : {});
  }
  console.error('[API]', e);
  return fail(500, 'Erreur interne du serveur.');
}

const clientIp = (req: NextRequest) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

export function handler<S extends ZodType | undefined = undefined>(
  options: Options<S>,
  fn: (ctx: RouteContext<S>) => Promise<unknown> | unknown,
) {
  const { auth = 'user', body: schema, status = 200 } = options;
  return async (req: NextRequest, route: { params: Promise<Params> }): Promise<NextResponse> => {
    try {
      const c = getContainer();
      const { user, suspended } = await c.useCases.auth.authenticate(req.cookies.get(SESSION_COOKIE)?.value);
      if (auth !== 'public') {
        if (suspended) throw new ForbiddenError('Votre compte est suspendu.', 'ACCOUNT_SUSPENDED');
        if (!user) throw new UnauthorizedError('Connexion requise.');
        if (auth === 'admin' && user.role !== 'admin') throw new ForbiddenError('Accès réservé aux administrateurs.');
      }
      const params = (await route.params) ?? {};
      let body: unknown;
      if (schema) body = schema.parse(await req.json().catch(() => undefined));
      const cookieOps: ((res: NextResponse) => void)[] = [];
      const result = await fn({
        user: user as AuthUser, body: body as RouteContext<S>['body'], params, query: req.nextUrl.searchParams, ip: clientIp(req), c,
        id: (name = 'id') => {
          if (!/^\d{1,9}$/.test(params[name] ?? '')) throw new BadInputError('Identifiant invalide.');
          return Number(params[name]);
        },
        setSession: (token) => cookieOps.push((res) => res.cookies.set(SESSION_COOKIE, token, c.sessionCookie())),
        clearSession: () => cookieOps.push((res) => res.cookies.set(SESSION_COOKIE, '', { ...c.sessionCookie(), maxAge: 0 })),
      });
      const res = NextResponse.json(result ?? { ok: true }, { status });
      cookieOps.forEach((op) => op(res));
      return res;
    } catch (e) {
      return toErrorResponse(e);
    }
  };
}
