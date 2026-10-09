// AI chat citations (backend rag_engine/citations.py, Part 5). Every chip carries an honest status.
//   verified        the reply cites it and it is in the user's own contract text
//   reference_only  only in the standard-form reference library, not this project's contract
//   related         (old messages only) the reply cited nothing; no longer shown, see shownSources
//   not_found       the reply cites it, but no document the user can read contains it
// Older messages have no `verification` and are shown as before.

export type CitationVerification = "verified" | "reference_only" | "related" | "not_found";

export interface ChatSource {
  clause_number: string;
  clause_title: string;
  page_number: string | number;
  similarity: number;
  excerpt: string;
  document_name?: string;
  doc_name?: string;
  verification?: CitationVerification;
  /** The document the clause is in (Part 15): the chip opens it at the clause's page. */
  document_id?: number | null;
  is_reference?: boolean;
}

/**
 * The chips to show: only clauses the reply itself cites, and each clause number only once.
 *
 * Older "related" context chips are hidden (Part 5G). A clause retrieved as several chunks, or
 * found in several documents, used to render one identical chip per hit — a real project had the
 * same contract indexed under ten document keys, so three cited clauses produced nine chips
 * reading "Clause 11.5.2, Clause 25.8, Clause 29.17.7" three times over. The chip shows only the
 * clause number, so duplicates carry no information. The first occurrence wins, keeping the
 * best-ranked chunk's excerpt and document for the hover card.
 */
export function shownSources(sources: ChatSource[] | undefined): ChatSource[] {
  const seen = new Set<string>();
  return (sources || []).filter((s) => {
    if (s.verification === "related") return false;
    const key = String(s.clause_number);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Where a citation chip leads: the cited document at the clause's page. None for a clause that isn't in the
 * user's documents, for the standard-form reference library, or for an older source without a document id.
 */
export function citationHref(source: Pick<ChatSource, "document_id" | "verification" | "page_number" | "clause_number" | "is_reference">): string | null {
  if (!source.document_id || source.verification === "not_found" || source.is_reference) return null;
  const params = new URLSearchParams();
  const page = Number(source.page_number);
  if (Number.isFinite(page) && page > 0) params.set("page", String(page));
  if (source.clause_number) params.set("clause", String(source.clause_number));
  const query = params.toString();
  return `/documents/${source.document_id}${query ? `?${query}` : ""}`;
}

export interface UnverifiedCitation {
  clause: string;
  reason: string;
}
