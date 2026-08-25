/**
 * Groups this project's unread notifications by the document they belong
 * to, for the per-document badge on the Documents page.
 *
 * document_created/document_version_created/document_version_superseded/
 * document_analysis_complete all carry data.documentId, but writers
 * disagree on type — documents/views.py writes it as a str, while
 * documents/ai_analysis.py writes it as an int — so it must be
 * String()-normalized before comparing. link falls back to parsing
 * "/documents/{id}" for older rows.
 *
 * Known gap: a bulk document upload (documents/views.py) sets no
 * documentId and its link only points at the first of possibly many
 * uploaded files, so that notification attributes to just that one
 * document — same class of gap as the Tasks board's IC/broker notices.
 */
import { useCallback } from "react";
import type { Notification } from "@/types/notification";
import { useGroupedUnreadNotifications } from "./useGroupedUnreadNotifications";

const DOCUMENT_LINK_RE = /^\/documents\/(\d+)$/;

export function useDocumentUnreadNotifications(projectId?: string | null) {
  const resolveDocumentId = useCallback((n: Notification): string | null => {
    if (n.data?.documentId != null && n.data.documentId !== "") return String(n.data.documentId);
    const m = DOCUMENT_LINK_RE.exec(n.link || "");
    return m ? m[1] : null;
  }, []);

  const { unreadByKey, isLoading } = useGroupedUnreadNotifications(projectId, resolveDocumentId);
  return { unreadByDocId: unreadByKey, isLoading };
}
