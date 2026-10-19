import type { ClientEvent, ClientEventType } from "./schema";

const queue: ClientEvent[] = [];
let started = false;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 100);
  fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(batch),
    keepalive: true,
  }).catch(() => undefined);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(flush, 5000);
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function track(
  type: ClientEventType,
  data: { sessionId?: string | null; skillId?: string | null; payload?: Record<string, string | number | boolean | null> } = {},
) {
  queue.push({ type, ...data, at: new Date().toISOString() });
  start();
}
