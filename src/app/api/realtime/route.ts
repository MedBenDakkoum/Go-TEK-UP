import type { NextRequest } from 'next/server';
import { getContainer, SESSION_COOKIE } from '@/infrastructure/container';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Flux temps réel (Server-Sent Events), authentifié par le cookie de session : chaque utilisateur ne reçoit que ses événements
 * (« notification », « unread », « message »). Une suspension ferme le flux immédiatement.
 */
export async function GET(req: NextRequest) {
  const c = getContainer();
  const { user } = await c.useCases.auth.authenticate(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return Response.json({ message: 'Connexion requise.' }, { status: 401 });

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => { if (!closed) controller.enqueue(enc.encode(chunk)); };
      const unsubscribe = c.hub.subscribe(user.id, {
        send: (event, payload) => write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        close: () => { cleanup(); try { controller.close(); } catch { /* déjà fermé */ } },
      });
      const ping = setInterval(() => write(': ping\n\n'), 25_000);
      cleanup = () => { closed = true; clearInterval(ping); unsubscribe(); };
      req.signal.addEventListener('abort', () => cleanup());
      write('retry: 3000\n: connecté\n\n');
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
