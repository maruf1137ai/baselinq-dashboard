/**
 * The single source of every unread number the UI draws.
 *
 * Before this, four badges were fed by four independent requests against
 * two unrelated backends — notification.read_at for the bell / Meetings /
 * Documents, and ChannelLastRead for Communications. Nothing kept them in
 * agreement, so reading on one surface left the other stale, and each new
 * badge added another way for them to drift.
 *
 * Now there is one request, one cache entry, one invalidation. Two badges
 * cannot disagree because they are reading the same object. The
 * "notifications-marked-read" event is still honoured so existing callers
 * (Communications, Meetings, DocumentDetail, the notification store) keep
 * working unchanged — but it now invalidates exactly one key instead of
 * needing every listener to remember every query it should refetch.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchData } from "@/lib/Api";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  getSocketHealthy,
  subscribeSocketHealth,
} from "./useUserEventSocket";

export interface UnreadSummary {
  /** Unread notifications (all types) in scope. Drives the bell badge. */
  total: number;
  /** Unread notification counts keyed by notification type. */
  byType: Record<string, number>;
  /**
   * Unread counts pre-grouped per UI surface (meetings / documents /
   * finance), computed from notification/surfaces.py — the SAME table the
   * clear endpoints resolve. Read these rather than summing types here: a
   * frontend-side list is exactly how the sidebar previously ended up
   * counting a subset of what could be created, so a badge showed a number
   * the page it pointed at could never clear.
   */
  bySurface: Record<string, number>;
  /** Unread channel MESSAGES — message-based, not notification-based. */
  channels: number;
}

const EMPTY: UnreadSummary = { total: 0, byType: {}, bySurface: {}, channels: 0 };

// Two cadences, chosen by whether the push socket is actually up.
//
// While the socket is connected the server tells us the moment anything
// changes, so this poll is only a safety net and can be slow. It cannot be
// removed entirely — pings sent while a socket is momentarily disconnected
// are gone for good (the channel layer does not queue for absent clients),
// and a proxy that blocks WebSockets outright would otherwise leave badges
// frozen forever with no recovery path.
//
// Same shape as chatWindow.tsx's WS-aware backoff, deliberately.
const POLL_MS_WS_HEALTHY = 300_000; // 5 min — safety net only
const POLL_MS_NO_SOCKET = 30_000;   // 30 s — now the primary mechanism

export const unreadSummaryKey = (projectId?: string | null) => [
  "unread-summary",
  projectId ?? "none",
];

const getProjectId = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("selectedProjectId") || ""
    : "";

/**
 * Invalidate the summary from anywhere that changes read state.
 * Prefer this over dispatching the legacy event in new code.
 */
export function invalidateUnreadSummary(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["unread-summary"] });
}

export function useUnreadSummary() {
  const queryClient = useQueryClient();

  // Held in state, not read inline on every render: the badge in
  // DashboardHeader has no other reason to re-render when the project
  // changes, so an inline read would leave it keyed to — and displaying —
  // the previous project's counts until something unrelated re-rendered it.
  const [projectId, setProjectId] = useState(getProjectId);

  // Drives the poll cadence below. useSyncExternalStore (rather than an
  // event listener) so this reads the socket's CURRENT state on mount, not
  // whatever the next transition happens to be.
  const socketHealthy = useSyncExternalStore(
    subscribeSocketHealth,
    getSocketHealthy,
    () => false, // server snapshot: assume no socket
  );

  const query = useQuery<UnreadSummary>({
    queryKey: unreadSummaryKey(projectId),
    queryFn: async () => {
      const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
      const raw = await fetchData(`notifications/unread-summary/${qs}`);
      return {
        total: raw?.total ?? 0,
        byType: raw?.byType ?? {},
        bySurface: raw?.bySurface ?? {},
        channels: raw?.channels ?? 0,
      };
    },
    enabled: typeof window !== "undefined" && !!localStorage.getItem("access"),
    refetchInterval: socketHealthy ? POLL_MS_WS_HEALTHY : POLL_MS_NO_SOCKET,
    // A badge is ambient — showing the last known number for a moment beats
    // flashing an empty one on every remount.
    placeholderData: (prev) => prev,
  });

  // Bridge for the existing callers that announce a read via the window
  // event. One listener, one key — the old failure mode was a listener that
  // refetched two of the three queries it needed to.
  useEffect(() => {
    const onMarkedRead = () => {
      queryClient.invalidateQueries({ queryKey: ["unread-summary"] });
    };
    // Server push: a notification was just created for this user. Same
    // handling as a local read — refetch the one cache entry every badge
    // reads from. See useUserEventSocket.
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onMarkedRead);
    // A project switch re-keys the query rather than invalidating the old
    // one — the previous project's counts stay cached and correct.
    const onProjectChange = () => setProjectId(getProjectId());
    window.addEventListener("notifications-marked-read", onMarkedRead);
    window.addEventListener("project-change", onProjectChange);
    return () => {
      window.removeEventListener("notifications-marked-read", onMarkedRead);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onMarkedRead);
      window.removeEventListener("project-change", onProjectChange);
    };
  }, [queryClient]);

  const data = query.data ?? EMPTY;

  return {
    ...data,
    /** Unread count for a UI surface, e.g. surfaceCount("meetings"). */
    surfaceCount: (surface: string) => data.bySurface[surface] ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
