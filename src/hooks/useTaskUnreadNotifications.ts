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
import { useCallback } from "react";
import type { Notification } from "@/types/notification";
import { useGroupedUnreadNotifications } from "./useGroupedUnreadNotifications";

const TASK_LINK_RE = /^\/tasks\/(\d+)$/;

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

  const { unreadByKey, isLoading } = useGroupedUnreadNotifications(projectId, resolveTaskId);
  return { unreadByTaskId: unreadByKey, isLoading };
}
