import { requireUser } from '../../../lib/auth';
import { subscribe } from '../../../lib/events';

export const dynamic = 'force-dynamic';
export async function GET(req) {
  let user;
  try { user = await requireUser(); } catch { return new Response('Unauthorized', { status: 401 }); }
  let unsubscribe;
  const stream = new ReadableStream({
    start(controller) {
      subscribe(user.sub, (event, payload) => controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)))
        .then((off) => {
          unsubscribe = off;
          controller.enqueue(new TextEncoder().encode('event: connected\ndata: {}\n\n'));
        })
        .catch((error) => controller.error(error));
    },
    cancel() { unsubscribe?.(); },
  });
  req.signal.addEventListener('abort', () => unsubscribe?.());
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
