/**
 * One session-wide WebSocket that says "your unread counts changed".
 *
 * The existing chat socket (see chatWindow.tsx) is per-CHANNEL and only
 * exists while a conversation is open, so unread badges were never pushed:
 * on any page other than Communications there was no socket at all, and
 * even there you were subscribed to the single channel on screen. A message
 * arriving anywhere else moved no badge until the 30s poll, which is why a
 * new message looked like it needed a manual refresh.
 *
 * This connects once for the whole session to `ws/user/`, which the backend
 * pings whenever a Notification is created for this user — every surface,
 * not just chat (see notification/signals.py). The ping carries no data;
 * we just invalidate the shared unread summary and let the normal REST path
 * produce the numbers, so counting and permissions stay in one place.
 *
 * Mount this EXACTLY ONCE (it lives in useNotifications, which
 * DashboardHeader mounts once). Falls back silently to polling if the
 * socket can't be established.
 */
import { useEffect, useRef } from "react";
import { getWsBase } from "@/lib/ws";

/** Fired on every server push. useUnreadSummary listens for this. */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications-changed";

const MAX_BACKOFF_MS = 30_000;

// ── Socket health, published so polling can adapt ─────────────────────────
//
// Consumers back their fallback poll right off while this is true and speed
// it back up when the socket drops. Kept as a tiny external store rather
// than another window event so a subscriber can read the CURRENT value on
// mount — an event-only design leaves a component that mounts mid-session
// guessing until the next transition.
let socketHealthy = false;
const healthSubscribers = new Set<() => void>();

function setSocketHealthy(next: boolean) {
  if (socketHealthy === next) return;
  socketHealthy = next;
  healthSubscribers.forEach((notify) => notify());
}

/** useSyncExternalStore subscribe fn. */
export function subscribeSocketHealth(onChange: () => void) {
  healthSubscribers.add(onChange);
  return () => {
    healthSubscribers.delete(onChange);
  };
}

/** useSyncExternalStore snapshot fn — true while the push socket is open. */
export function getSocketHealthy() {
  return socketHealthy;
}

export function useUserEventSocket(onPing?: () => void) {
  // Held in a ref so reconnects always call the latest handler without
  // tearing down and re-establishing the socket on every render.
  const onPingRef = useRef(onPing);
  onPingRef.current = onPing;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      const token = localStorage.getItem("access");
      // Not signed in yet — a later "user-change" remount will connect.
      if (!token) return;

      try {
        ws = new WebSocket(`${getWsBase()}/ws/user/?token=${encodeURIComponent(token)}`);
      } catch {
        return;
      }

      ws.onopen = () => {
        attempt = 0;
        setSocketHealthy(true);
      };
      ws.onmessage = () => {
        // Payload is deliberately empty — refetch rather than trust a push.
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
        onPingRef.current?.();
      };
      ws.onclose = () => {
        setSocketHealthy(false);
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    // A token change (login / logout / account switch) needs a new socket:
    // the old one is authenticated as the previous user.
    const reconnectForNewUser = () => {
      attempt = 0;
      ws?.close();
      ws = null;
      connect();
    };
    window.addEventListener("user-change", reconnectForNewUser);

    return () => {
      stopped = true;
      setSocketHealthy(false);
      window.removeEventListener("user-change", reconnectForNewUser);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);
}
