/**
 * Part 8a: a document whose AI analysis failed, or that has no readable text, says so in the document lists
 * (folders, unfiled, search). Every other status shows nothing here.
 */
export function AIStatusBadge({ status, reason }: { status?: string | null; reason?: string | null }) {
  if (status === "failed") {
    return (
      <span data-testid="ai-failed-badge" title={reason || "AI analysis failed"}
        className="inline-flex items-center bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-normal leading-5 shrink-0">
        AI failed
      </span>
    );
  }
  if (status === "no_text") {
    return (
      <span data-testid="ai-no-text-badge" title={reason || "No readable text — the file looks scanned"}
        className="inline-flex items-center bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-normal leading-5 shrink-0">
        No text
      </span>
    );
  }
  return null;
}
