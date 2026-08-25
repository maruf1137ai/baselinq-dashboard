import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useWebPush } from "./useWebPush";
import { getWsBase } from "@/lib/ws";

const POLL_INTERVAL = 30_000; // 30 seconds

const getProjectId = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("selectedProjectId") || undefined
    : undefined;

const getUserId = () => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.id ? String(parsed.id) : undefined;
  } catch {
    return undefined;
  }
};

export function useNotifications() {
  const store = useNotificationStore();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const projectRef = useRef<string | undefined>(getProjectId());
  const userRef = useRef<string | undefined>(getUserId());

  // Initialize web push registration
  useWebPush();

  // Initial fetch + polling for unread count (project-scoped)
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    // Initial load — scoped to current project
    store.refresh(projectRef.current);

    // Poll every 30s; always read the latest projectId so polling follows
    // project switches without remounting this hook.
    intervalRef.current = setInterval(() => {
      store.fetchUnreadCount(getProjectId());
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time accelerant on top of the 30s poll above (never replaces it —
  // see backend/notification/consumers.py + signals.py). The socket only
  // ever carries a bare "something changed" ping, so on message we just
  // re-trigger the same refresh paths this hook already has: the
  // "notifications-marked-read" event (reused generically for "any
  // push-worthy notification", not literal mark-as-read — renaming it would
  // touch every existing listener for no functional gain) covers the bell,
  // and invalidating the channels list query covers the nav badge and the
  // Communications per-channel unread counts, since both key off the same
  // `channels/?projectId=...` cache entry (see useFetch.tsx's queryKey).
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let stopped = false;

    const connectWs = () => {
      if (stopped) return;
      const currentToken = localStorage.getItem("access");
      if (!currentToken) return;

      ws = new WebSocket(
        `${getWsBase()}/ws/notifications/?token=${encodeURIComponent(currentToken)}`
      );

      ws.onopen = () => {
        reconnectAttempt = 0;
      };
      ws.onmessage = () => {
        window.dispatchEvent(new Event("notifications-marked-read"));
        const pid = getProjectId();
        if (pid) {
          queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${pid}`] });
        }
      };
      ws.onclose = () => {
        if (stopped) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt, 30000);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connectWs, delay);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };
    connectWs();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh on window focus — also project-scoped
  useEffect(() => {
    const onFocus = () => {
      const token = localStorage.getItem("access");
      if (token) store.fetchUnreadCount(getProjectId());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when anything elsewhere marks notifications as read
  useEffect(() => {
    const handler = () => useNotificationStore.getState().refresh(getProjectId());
    window.addEventListener("notifications-marked-read", handler);
    return () => window.removeEventListener("notifications-marked-read", handler);
  }, []);

  // React to project changes — DashboardSidebar dispatches "project-change"
  // when the user switches projects via the dropdown.
  useEffect(() => {
    const handler = () => {
      const next = getProjectId();
      if (next === projectRef.current) return;
      projectRef.current = next;
      useNotificationStore.getState().refresh(next);
    };
    window.addEventListener("project-change", handler);
    return () => window.removeEventListener("project-change", handler);
  }, []);

  // React to user changes — login / logout / account switch should clear
  // and re-fetch. We watch localStorage via the storage event (fires across
  // tabs) plus a same-tab "user-change" custom event.
  useEffect(() => {
    const handler = () => {
      const next = getUserId();
      if (next === userRef.current) return;
      userRef.current = next;
      // Clear the existing list immediately so a stale tray doesn't flash
      useNotificationStore.setState({ notifications: [], unreadCount: 0 });
      if (next) useNotificationStore.getState().refresh(getProjectId());
    };
    window.addEventListener("storage", handler);
    window.addEventListener("user-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("user-change", handler);
    };
  }, []);

  // Listen for service worker messages (push events + notification clicks)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        store.refresh(getProjectId());
      }
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data.link) {
        window.location.href = event.data.link;
      }
    };

    navigator.serviceWorker?.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
