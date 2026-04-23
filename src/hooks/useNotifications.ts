import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useWebPush } from "./useWebPush";

const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotifications() {
  const store = useNotificationStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Initialize web push registration
  useWebPush();

  // Initial fetch + polling for unread count
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    // Initial load
    store.refresh();

    // Poll unread count every 30s
    intervalRef.current = setInterval(() => {
      store.fetchUnreadCount();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => {
      const token = localStorage.getItem("access");
      if (token) store.fetchUnreadCount();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when anything elsewhere marks notifications as read
  useEffect(() => {
    const handler = () => useNotificationStore.getState().refresh();
    window.addEventListener("notifications-marked-read", handler);
    return () => window.removeEventListener("notifications-marked-read", handler);
  }, []);

  // Listen for service worker messages (push events + notification clicks)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        store.refresh();
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
