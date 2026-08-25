/**
 * Groups this project's unread notifications by the meeting they belong
 * to, for the per-card badge on the Meetings page.
 *
 * data.meeting_id is snake_case — meetings/views.py's _fan_out_notifications
 * writes it that way, distinct from the meetingId spelling mark_context_read
 * also accepts. link falls back to parsing "/meetings/{id}".
 *
 * Frozen (see useGroupedUnreadNotifications' `freeze` option) for the same
 * reason as Finance: meetings.tsx marks the whole "meetings" surface read
 * unconditionally on mount, so a live query would race that clear.
 */
import { useCallback } from "react";
import type { Notification } from "@/types/notification";
import { useGroupedUnreadNotifications } from "./useGroupedUnreadNotifications";

const MEETING_LINK_RE = /^\/meetings\/(\d+)$/;

export function useMeetingUnreadNotifications(projectId?: string | null) {
  const resolveMeetingId = useCallback((n: Notification): string | null => {
    if (n.data?.meeting_id != null && n.data.meeting_id !== "") return String(n.data.meeting_id);
    const m = MEETING_LINK_RE.exec(n.link || "");
    return m ? m[1] : null;
  }, []);

  const { unreadByKey, isLoading } = useGroupedUnreadNotifications(projectId, resolveMeetingId, { freeze: true });
  return { unreadByMeetingId: unreadByKey, isLoading };
}
