/**
 * Mark the notifications for whatever the user just opened as read.
 *
 * Opening the thing a notification points at is the clearest signal that
 * it has been read, but only Meetings, Documents and Communications ever
 * acted on it. Task pages marked nothing — and task_* notifications are
 * over half of everything in the system — so the badge could only be
 * cleared by clicking each row in the bell one at a time. Finance was the
 * same.
 *
 * Pass whatever identifies the thing on screen; the backend ORs together
 * the keys it recognises (payload conventions differ by which code path
 * emitted the notification, so more context = more rows matched).
 *
 * Fire-and-forget by design: a page must never fail to render, or block,
 * because a badge could not be updated.
 */
import { postData } from "@/lib/Api";

export interface NotificationContext {
  /** Task wrapper PK — the /tasks/:taskId route param. */
  taskId?: string | number | null;
  /** Human label, e.g. "VO-060". Catches rows that predate taskId payloads. */
  entityLabel?: string | null;
  channelId?: string | number | null;
  documentId?: string | number | null;
  meetingId?: string | number | null;
  paymentCertificateId?: string | number | null;
  /** Risk signal PK — see risk/engine.py's data.signal_id. */
  signalId?: string | number | null;
  /** Exact notification link, e.g. "/tasks/215". */
  link?: string | null;
}

/**
 * Clear a whole UI surface's notifications — for pages that genuinely show
 * the user everything the notifications refer to (the Meetings list, the
 * Payment Certificates table).
 *
 * The surface name resolves server-side against notification/surfaces.py,
 * the same table the sidebar badge is counted from, so a page clears
 * exactly what its badge counted. Surfaces made of items you open one at a
 * time — documents, channels — are refused by the backend on purpose; use
 * markNotificationsRead() with the item's id for those.
 */
export async function markSurfaceNotificationsRead(
  surface: "meetings" | "finance",
  projectId: string | number,
): Promise<void> {
  try {
    const res: any = await postData({
      url: "notifications/mark_type_read/",
      data: { surface, project_id: Number(projectId) },
    });
    if (res?.marked > 0) {
      window.dispatchEvent(new Event("notifications-marked-read"));
    }
  } catch {
    // Non-fatal — the badge stays until the next read or poll.
  }
}

export async function markNotificationsRead(context: NotificationContext): Promise<void> {
  const payload: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value !== null && value !== undefined && value !== "") {
      payload[key] = value as string | number;
    }
  }
  // Nothing to match on — don't spend a request to be told so.
  if (Object.keys(payload).length === 0) return;

  try {
    const res: any = await postData({
      url: "notifications/mark_context_read/",
      data: payload,
    });
    // Only disturb the badges when something actually changed. The summary
    // is polled anyway; a no-op refetch on every page visit is just noise.
    if (res?.marked > 0) {
      window.dispatchEvent(new Event("notifications-marked-read"));
    }
  } catch {
    // Non-fatal: the badge simply stays until the next read or poll.
  }
}
