/**
 * Groups this project's unread notifications by the payment certificate
 * they belong to, for the per-row badge on the Finance page.
 *
 * Frozen (see useGroupedUnreadNotifications' `freeze` option): Finance
 * already marks its entire "finance" surface read the instant the page
 * mounts (markSurfaceNotificationsRead in finance.tsx, no user-interaction
 * gate). Without freezing, a badge built from a live query would race that
 * clear and flicker to zero almost immediately. The first successful fetch
 * is pinned for this page visit instead — badges show what was unread on
 * arrival; the next visit they're already read.
 */
import { useCallback } from "react";
import type { Notification } from "@/types/notification";
import { useGroupedUnreadNotifications } from "./useGroupedUnreadNotifications";

const PC_LINK_RE = /[?&]pc=(\d+)/;

export function useFinanceUnreadNotifications(projectId?: string | null) {
  const resolvePcId = useCallback((n: Notification): string | null => {
    if (n.data?.paymentCertificateId != null && n.data.paymentCertificateId !== "") {
      return String(n.data.paymentCertificateId);
    }
    const m = PC_LINK_RE.exec(n.link || "");
    return m ? m[1] : null;
  }, []);

  const { unreadByKey, isLoading } = useGroupedUnreadNotifications(projectId, resolvePcId, { freeze: true });
  return { unreadByPcId: unreadByKey, isLoading };
}
