import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useWebPush } from "./useWebPush";
import { useUserEventSocket } from "./useUserEventSocket";

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
  const projectRef = useRef<string | undefined>(getProjectId());
  const userRef = useRef<string | undefined>(getUserId());

  // Initialize web push registration
  useWebPush();

  // Session-wide push for unread changes. Mounted here because this hook has
  // exactly one caller (DashboardHeader), so exactly one socket exists.
  // The socket dispatches "notifications-changed" for the badges; this
  // callback additionally refreshes the dropdown's own list so an open bell
  // shows the new row without waiting for the next poll.
  useUserEventSocket(() => {
    useNotificationStore.getState().refresh(getProjectId());
  });

  // Initial load of the dropdown's LIST, scoped to the current project.
  //
  // No unread-count polling here any more. The badge was moved to
  // useUnreadSummary (one request feeding the bell and all three sidebar
  // badges), so this hook's 30s `fetchUnreadCount` loop — and the focus
  // handler beside it — were fetching a number that is no longer rendered
  // anywhere: a wasted request per user every 30 seconds, plus one on every
  // window focus. The summary hook polls once as a WebSocket fallback and
  // refetches on focus through React Query's own default, so nothing is
  // lost by dropping both.
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;
    store.refresh(projectRef.current);
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
