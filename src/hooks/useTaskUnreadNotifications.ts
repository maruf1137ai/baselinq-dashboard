/**
 * Groups this project's unread notifications by the task card they belong
 * to, so the Tasks board can badge individual cards instead of only the
 * sidebar's single aggregate count.
 *
 * Resolution mirrors the backend's own OR-of-keys approach in
 * mark_context_read (notification/views.py) — the payload that identifies
 * "which task" varies by which code path created the row:
 *
 *   data.taskId              — set on task_updated/task_assigned, VO/SI/RFI/
 *                              DC/CPI creation, and APPROVAL_* (see
 *                              tasks/views.py, approvals/engine.py)
 *   link                     — falls back to parsing "/tasks/{id}"
 *   data.entity_label/       — falls back to matching the task's own code
 *   parent_label               (e.g. "VO-060") against tasksByCode; covers
 *                              rows written before a Task lookup succeeded
 *
 * Notifications matching none of these (e.g. IC/broker notices, which link
 * to /tasks/intention-to-claim/{id} — a different id space entirely) are
 * dropped from the grouping. They still count toward the Tasks sidebar
 * badge and the bell via notification/surfaces.py; they just don't attach
 * to one card.
 */
import { useCallback, useMemo } from "react";
import type { Notification, NotificationType } from "@/types/notification";
import { useGroupedUnreadNotifications } from "./useGroupedUnreadNotifications";

const TASK_LINK_RE = /^\/tasks\/(\d+)$/;

// Mirrors backend/notification/surfaces.py's "tasks" list exactly — the
// types that count toward the sidebar's Tasks badge. Used to separate
// "unresolved but genuinely task-related" (shown in the board's "Other
// updates" panel) from unresolved notifications belonging to a different
// surface entirely (Finance, Documents, ...), which aren't this page's
// concern even though useGroupedUnreadNotifications fetches all of them.
const TASK_SURFACE_TYPES = new Set<NotificationType>([
  "task_updated", "task_assigned", "vo_created", "si_created", "rfi_created",
  "dc_created", "cpi_created", "gi_created", "ic_created", "claim_created",
  "ic_risk_high", "vo_auto_created", "vo_signoff_required",
  "escalation_overdue", "approval_requested", "approval_held",
  "approval_complete", "approval_rejected", "approval_info_requested",
]);

export function useTaskUnreadNotifications(
  projectId?: string | null,
  tasksByCode: Record<string, string> = {},
) {
  const resolveTaskId = useCallback(
    (n: Notification): string | null => {
      if (n.data?.taskId != null && n.data.taskId !== "") return String(n.data.taskId);
      const m = TASK_LINK_RE.exec(n.link || "");
      if (m) return m[1];
      const label = n.data?.entity_label ?? n.data?.parent_label;
      if (label && tasksByCode[label]) return tasksByCode[label];
      return null;
    },
    [tasksByCode],
  );

  const { unreadByKey, unmatched, isLoading } = useGroupedUnreadNotifications(projectId, resolveTaskId);

  // Unread, task-surface-typed, but couldn't attach to any card — e.g. IC
  // notices, which link to /tasks/intention-to-claim/{id}, a different id
  // space than resolveTaskId understands. Previously invisible: counted
  // toward the sidebar badge, absent from the board entirely.
  const otherUpdates = useMemo(
    () => unmatched.filter((n) => TASK_SURFACE_TYPES.has(n.type)),
    [unmatched],
  );

  return { unreadByTaskId: unreadByKey, otherUpdates, isLoading };
}
