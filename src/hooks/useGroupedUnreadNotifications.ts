/**
 * Shared skeleton behind every per-item unread-notification badge (Tasks,
 * Documents, Project Health, Finance, Meetings): fetch this project's
 * unread notifications once, group them by a caller-supplied resolver, and
 * keep that grouping live via the same two invalidation signals
 * useUnreadSummary already listens to.
 *
 * `opts.freeze` exists for surfaces that bulk-clear themselves the instant
 * their page mounts (Finance, Meetings — see markSurfaceNotificationsRead /
 * mark_type_read fired from a page-level effect with no user-interaction
 * gate). Without it, the badge would flicker to zero almost immediately as
 * the clear resolves. With it, the first successful fetch is pinned for the
 * page's whole mount — the user sees what was unread when they arrived; the
 * next visit it's already read, same as today.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications } from "@/lib/notificationApi";
import type { Notification } from "@/types/notification";
import { NOTIFICATIONS_CHANGED_EVENT } from "./useUserEventSocket";

export function useGroupedUnreadNotifications(
  projectId: string | null | undefined,
  resolveKey: (n: Notification) => string | null,
  opts: { freeze?: boolean } = {},
) {
  const { freeze = false } = opts;
  const queryClient = useQueryClient();
  const queryKey = ["grouped-unread-notifications", projectId ?? "none"];

  const query = useQuery<Notification[]>({
    queryKey,
    queryFn: () => getNotifications({ unreadOnly: true, projectId: projectId ?? undefined }),
    enabled: !!projectId,
    placeholderData: (prev) => prev,
    ...(freeze ? { staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false } : {}),
  });

  useEffect(() => {
    if (freeze) return;
    const onChanged = () => queryClient.invalidateQueries({ queryKey });
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    window.addEventListener("notifications-marked-read", onChanged);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
      window.removeEventListener("notifications-marked-read", onChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, projectId, freeze]);

  // Pin the first successful fetch's data for frozen surfaces, so a
  // bulk-clear that resolves moments later doesn't erase the badges the
  // user is currently looking at.
  const [frozenData, setFrozenData] = useState<Notification[] | null>(null);
  useEffect(() => {
    if (freeze && frozenData === null && query.data) setFrozenData(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeze, query.data]);
  const effectiveData = freeze ? (frozenData ?? query.data) : query.data;

  const unreadByKey = useMemo(() => {
    const grouped: Record<string, Notification[]> = {};
    for (const n of effectiveData ?? []) {
      const key = resolveKey(n);
      if (!key) continue;
      (grouped[key] ??= []).push(n);
    }
    return grouped;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveData, resolveKey]);

  return { unreadByKey, isLoading: query.isLoading };
}
