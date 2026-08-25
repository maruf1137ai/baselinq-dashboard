/**
 * Groups this project's unread notifications by the risk signal they
 * belong to, for the per-signal badge on the Project Health page.
 *
 * risk_signal_raised always carries data.signal_id (risk/engine.py's
 * _send_one sets it unconditionally, no fallback needed there), matching
 * RiskSignal.id directly — an exact int match, unlike Tasks/Documents
 * which need a link-parsing fallback. link is still checked as a fallback
 * ("/project-health?signal={id}") for defense in depth.
 */
import { useCallback } from "react";
import type { Notification } from "@/types/notification";
import { useGroupedUnreadNotifications } from "./useGroupedUnreadNotifications";

const SIGNAL_LINK_RE = /[?&]signal=(\d+)/;

export function useRiskSignalUnreadNotifications(projectId?: string | null) {
  const resolveSignalId = useCallback((n: Notification): string | null => {
    if (n.data?.signal_id != null && n.data.signal_id !== "") return String(n.data.signal_id);
    const m = SIGNAL_LINK_RE.exec(n.link || "");
    return m ? m[1] : null;
  }, []);

  const { unreadByKey, isLoading } = useGroupedUnreadNotifications(projectId, resolveSignalId);
  return { unreadBySignalId: unreadByKey, isLoading };
}
