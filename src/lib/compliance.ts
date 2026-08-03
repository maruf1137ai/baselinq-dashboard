/**
 * Compliance row model — the shared shape behind the Compliance page.
 *
 * Two real, populated sources feed this page and nothing else does:
 *   • DocumentObligation — per-document, `documents/{id}/obligations/`
 *   • TimeBarClock       — per-project, `projects/{id}/time-bars/`
 *
 * They are normalised here rather than in the page so the urgency arithmetic
 * (the only part with legal consequence) can be tested without a DOM.
 *
 * A note on `no-date`: obligations extracted by AI are currently written with
 * a NULL due date, and the backend's only overdue metric filters on
 * `due_date__lt=today` — so those rows can never be counted as overdue. We do
 * not invent a date to paper over that. An obligation with no date is its own
 * state, reported honestly, and the user is offered the chance to record one.
 */

/** Amber threshold. Matches the notice-deadline colouring on Project Health. */
export const DUE_SOON_DAYS = 14;

export type ComplianceUrgency =
  | "overdue"
  | "due-soon"
  | "no-date"
  | "on-track"
  | "closed";

export interface ComplianceRow {
  /** Stable across refetches — source + backend id. */
  key: string;
  source: "obligation" | "time-bar";
  title: string;
  /** Where the row came from: the document name, or the contract form. */
  context: string;
  /** ISO date, or null when nothing has been recorded. */
  dueDate: string | null;
  /** Raw backend status, shown verbatim on closed rows. */
  status: string;
  urgency: ComplianceUrgency;
  /** Negative when past due. Null when there is no date to count from. */
  daysFromDue: number | null;
  responsibleRole?: string;
  /** Obligation rows only — lets the row link back to its document. */
  documentId?: string;
  obligationId?: string;
  /** Time-bar rows only. */
  clauseRef?: string;
  clauseVerified?: boolean;
}

export interface ComplianceCounts {
  overdue: number;
  dueSoon: number;
  noDate: number;
  onTrack: number;
  closed: number;
  total: number;
}

/** Raw shapes as the API returns them (serialiser output, camelCased server-side). */
export interface ApiObligation {
  _id: string;
  title: string;
  dueDate: string | null;
  responsibleRole: string;
  status: string;
}

export interface ApiTimeBar {
  id: number;
  label: string;
  contract_form: string;
  clause_ref: string;
  clause_verified: boolean;
  deadline_date: string;
  days_remaining: number;
  status: string;
}

/** Whole days from `today` to `iso`, negative once the date has passed. */
export function daysUntil(iso: string, today: Date): number {
  const due = new Date(`${iso}T00:00:00`);
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - from.getTime()) / 86_400_000);
}

export function deriveUrgency(
  dueDate: string | null,
  isClosed: boolean,
  today: Date,
): { urgency: ComplianceUrgency; daysFromDue: number | null } {
  if (isClosed) return { urgency: "closed", daysFromDue: null };
  if (!dueDate) return { urgency: "no-date", daysFromDue: null };

  const days = daysUntil(dueDate, today);
  if (days < 0) return { urgency: "overdue", daysFromDue: days };
  if (days <= DUE_SOON_DAYS) return { urgency: "due-soon", daysFromDue: days };
  return { urgency: "on-track", daysFromDue: days };
}

const OBLIGATION_CLOSED_STATUSES = new Set(["Completed"]);

export function buildObligationRows(
  documentId: string,
  documentName: string,
  obligations: ApiObligation[],
  today: Date,
): ComplianceRow[] {
  return obligations.map(o => {
    const { urgency, daysFromDue } = deriveUrgency(
      o.dueDate ?? null,
      OBLIGATION_CLOSED_STATUSES.has(o.status),
      today,
    );
    return {
      key: `obligation-${o._id}`,
      source: "obligation" as const,
      title: o.title,
      context: documentName,
      dueDate: o.dueDate ?? null,
      status: o.status,
      urgency,
      daysFromDue,
      responsibleRole: o.responsibleRole || undefined,
      documentId,
      obligationId: o._id,
    };
  });
}

export function buildTimeBarRows(bars: ApiTimeBar[], today: Date): ComplianceRow[] {
  return bars.map(b => {
    // The backend already computes days_remaining against its own clock; trust
    // it over a browser-local recomputation, which can disagree by a day.
    const isClosed = b.status !== "open";
    const urgency: ComplianceUrgency = isClosed
      ? "closed"
      : b.days_remaining < 0
        ? "overdue"
        : b.days_remaining <= DUE_SOON_DAYS
          ? "due-soon"
          : "on-track";
    return {
      key: `time-bar-${b.id}`,
      source: "time-bar" as const,
      title: b.label,
      context: b.contract_form,
      dueDate: b.deadline_date ?? null,
      status: b.status,
      urgency,
      daysFromDue: isClosed ? null : b.days_remaining,
      clauseRef: b.clause_ref,
      clauseVerified: b.clause_verified,
    };
  });
}

export function summariseCompliance(rows: ComplianceRow[]): ComplianceCounts {
  return rows.reduce<ComplianceCounts>(
    (acc, r) => {
      if (r.urgency === "overdue") acc.overdue += 1;
      else if (r.urgency === "due-soon") acc.dueSoon += 1;
      else if (r.urgency === "no-date") acc.noDate += 1;
      else if (r.urgency === "on-track") acc.onTrack += 1;
      else acc.closed += 1;
      acc.total += 1;
      return acc;
    },
    { overdue: 0, dueSoon: 0, noDate: 0, onTrack: 0, closed: 0, total: 0 },
  );
}

const URGENCY_ORDER: Record<ComplianceUrgency, number> = {
  overdue: 0,
  "due-soon": 1,
  "no-date": 2,
  "on-track": 3,
  closed: 4,
};

/** Worst first, then soonest first. Undated rows sort by title so the order is stable. */
export function sortComplianceRows(rows: ComplianceRow[]): ComplianceRow[] {
  return [...rows].sort((a, b) => {
    const byUrgency = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    if (a.daysFromDue !== null && b.daysFromDue !== null && a.daysFromDue !== b.daysFromDue) {
      return a.daysFromDue - b.daysFromDue;
    }
    return a.title.localeCompare(b.title);
  });
}

export function filterComplianceRows(rows: ComplianceRow[], term: string): ComplianceRow[] {
  const q = term.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(r =>
    [r.title, r.context, r.clauseRef, r.responsibleRole]
      .filter(Boolean)
      .some(v => (v as string).toLowerCase().includes(q)),
  );
}
