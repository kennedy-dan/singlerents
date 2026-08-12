// Shared authenticated real-time event hub used by the WebSocket server.
const hub = globalThis.__singlerentsEventHub || new Map();
if (!globalThis.__singlerentsEventHub) globalThis.__singlerentsEventHub = hub;

export function subscribe(userId, listener) {
  const set = hub.get(userId) || new Set();
  set.add(listener);
  hub.set(userId, set);
  return () => {
    set.delete(listener);
    if (!set.size) hub.delete(userId);
  };
}

export function publish(userId, event, payload) {
  for (const listener of hub.get(userId) || []) {
    try { listener(event, payload); } catch { /* connection closed */ }
  }
}
