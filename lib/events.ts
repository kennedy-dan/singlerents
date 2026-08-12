import Redis from "ioredis";

type EventListener = (event: string, payload: unknown) => void;
type RealtimeEvent = { userId: string; event: string; payload: unknown };

const EVENT_CHANNEL = "singlerents:realtime";

// Next can evaluate route modules separately from the custom local server.
// In development, share this fallback through the one local Node.js process so
// an API route can notify a socket created by server.ts. Production never uses
// this registry for cross-instance delivery: it requires Redis instead.
const localListeners = process.env.NODE_ENV === "production"
  ? new Map<string, Set<EventListener>>()
  : (() => {
      const localProcess = globalThis as typeof globalThis & {
        __singlerentsLocalEventListeners?: Map<string, Set<EventListener>>;
      };
      return localProcess.__singlerentsLocalEventListeners ??=
        new Map<string, Set<EventListener>>();
    })();
let publisher: Redis | undefined;
let subscriber: Redis | undefined;
let subscriberReady: Promise<void> | undefined;

function redisUrl() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for realtime delivery.");
  return url;
}

function hasRedis() {
  return Boolean(process.env.REDIS_URL);
}

function getPublisher() {
  if (!publisher) {
    publisher = new Redis(redisUrl(), { maxRetriesPerRequest: null });
    publisher.on("error", (error) => console.error("Realtime Redis publisher error:", error));
  }
  return publisher;
}

function dispatch({ userId, event, payload }: RealtimeEvent) {
  for (const listener of localListeners.get(userId) || []) {
    try {
      listener(event, payload);
    } catch {
      // Individual sockets and streams clean themselves up on close/abort.
    }
  }
}

async function ensureSubscriber() {
  if (subscriberReady) return subscriberReady;
  subscriberReady = (async () => {
    subscriber = new Redis(redisUrl(), { maxRetriesPerRequest: null });
    subscriber.on("error", (error) => console.error("Realtime Redis subscriber error:", error));
    subscriber.on("message", (channel, body) => {
      if (channel !== EVENT_CHANNEL) return;
      try {
        dispatch(JSON.parse(body));
      } catch (error) {
        console.error("Invalid realtime event:", error);
      }
    });
    await subscriber.subscribe(EVENT_CHANNEL);
  })().catch((error) => {
    subscriberReady = undefined;
    subscriber?.disconnect();
    subscriber = undefined;
    throw error;
  });
  return subscriberReady;
}

export async function subscribe(userId: string, listener: EventListener) {
  // Keep the existing no-infrastructure local development workflow working.
  // Vercel deployments must set REDIS_URL so this is never used in production.
  const listeners = localListeners.get(userId) || new Set<EventListener>();
  listeners.add(listener);
  localListeners.set(userId, listeners);
  try {
    if (hasRedis()) await ensureSubscriber();
  } catch (error) {
    listeners.delete(listener);
    if (!listeners.size) localListeners.delete(userId);
    throw error;
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) localListeners.delete(userId);
  };
}

export async function publish(userId: string, event: string, payload: unknown) {
  if (!hasRedis()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("REDIS_URL is required for realtime delivery.");
    }
    dispatch({ userId, event, payload });
    return;
  }
  await getPublisher().publish(EVENT_CHANNEL, JSON.stringify({ userId, event, payload }));
}
