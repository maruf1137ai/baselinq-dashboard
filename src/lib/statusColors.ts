/**
 * Centralised status badge colour map.
 * Returns Tailwind classes for background, text, and border.
 * Used by TaskSidebar, teamMembersTable, and any other status indicator.
 */
export function getStatusBadgeClasses(status: string): string {
  const s = (status || "").toLowerCase().replace(/_/g, " ").trim();

  // ── Green — done / positive ───────────────────────────────────────────────
  if (
    [
      "done", "approved", "completed", "verified", "closed",
      "eot awarded", "acknowledged", "active",
    ].includes(s)
  )
    return "bg-green-50 text-green-700 border border-green-200";

  // ── Blue / indigo — in progress / awaiting action ─────────────────────────
  if (
    [
      "in progress", "in review", "review", "issued", "submitted",
      "actioned", "under review", "priced", "sent for review",
      "notice issued", "under assessment", "distributed",
      "further info required", "response provided",
      "determination made", "on track / at risk", "scheduled",
      "recommended",
    ].includes(s)
  )
    return "bg-primary/10 text-primary border border-primary/30";

  // ── Amber — pending / waiting ─────────────────────────────────────────────
  if (["pending", "draft", "todo"].includes(s))
    return "bg-amber-50 text-amber-700 border border-amber-200";

  // ── Red — rejected / failed ───────────────────────────────────────────────
  if (["rejected", "declined", "inactive", "overdue"].includes(s))
    return "bg-red-50 text-red-700 border border-red-200";

  // ── Default ───────────────────────────────────────────────────────────────
  return "bg-muted text-muted-foreground border border-border";
}
