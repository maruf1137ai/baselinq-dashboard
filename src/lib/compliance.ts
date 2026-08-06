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
  /** Null in practice on a bar the backend could not date. */
  deadline_date: string | null;
  days_remaining: number | null;
  status: string;
}

/**
 * A leading `YYYY-MM-DD`, optionally followed by a time part.
 *
 * The backend is not consistent about this: obligations are written as bare
 * dates, but anything that has been through a DRF `DateTimeField` arrives as
 * `2026-07-01T00:00:00Z`. We take the DATE PART of a datetime rather than
 * parsing the whole thing, because parsing it would apply the timezone offset
 * and could shift a deadline onto the previous or following day — on a page
 * where a day either side of a notice period is the whole point.
 */
const LEADING_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;

/**
 * The calendar date a due value refers to, at local midnight, or null when the
 * value is absent or is not something we recognise as a date. Null means
 * "unknown" — never "today", and never "fine".
 */
export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = LEADING_ISO_DATE.exec(value.trim());
  if (!match) return null;

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(year, month - 1, day);
  // Rejects 2026-13-01 and 2026-02-30, which Date happily rolls over.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Whole days from `today` to `value`, negative once the date has passed.
 * Null when the value cannot be read as a date — the caller must handle that
 * as unknown. It deliberately never returns NaN: NaN compares false against
 * everything, which is how an overdue date used to come out green.
 */
export function daysUntil(value: string | null | undefined, today: Date): number | null {
  const due = parseDueDate(value);
  if (!due) return null;
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
  // An unreadable date is an unknown date. It must not fall through to
  // on-track, which renders green and reads as "nothing to do here".
  if (days === null) return { urgency: "no-date", daysFromDue: null };
  if (days < 0) return { urgency: "overdue", daysFromDue: days };
  if (days <= DUE_SOON_DAYS) return { urgency: "due-soon", daysFromDue: days };
  return { urgency: "on-track", daysFromDue: days };
}

/**
 * Closure vocabularies.
 *
 * Both sides are compared trimmed and case-insensitively, and ONLY a
 * recognised closed status closes a row. An unrecognised status — a backend
 * rename, an empty string, a new workflow state — leaves the row open and
 * still counting down. That is the safe direction: a live deadline shown as
 * closed is a forfeited claim; a closed one shown as live is a phone call.
 */
const OBLIGATION_CLOSED_STATUSES = new Set([
  "completed",
  "complete",
  "closed",
  "done",
  "satisfied",
  "waived",
]);

/**
 * Time bars close when the notice has been dealt with. "expired" is
 * deliberately NOT here: a lapsed notice period is not a resolved one, and
 * greying it out would drop it out of the overdue count at exactly the moment
 * it matters most. It stays open and reports as overdue.
 */
const TIME_BAR_CLOSED_STATUSES = new Set([
  "served",
  "closed",
  "met",
  "satisfied",
  "waived",
  "cancelled",
  "canceled",
  "withdrawn",
]);

function normaliseStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

export function isObligationClosed(status: string | null | undefined): boolean {
  return OBLIGATION_CLOSED_STATUSES.has(normaliseStatus(status));
}

export function isTimeBarClosed(status: string | null | undefined): boolean {
  return TIME_BAR_CLOSED_STATUSES.has(normaliseStatus(status));
}

export function buildObligationRows(
  documentId: string,
  documentName: string,
  obligations: ApiObligation[],
  today: Date,
): ComplianceRow[] {
  return obligations.map(o => {
    const { urgency, daysFromDue } = deriveUrgency(
      o.dueDate ?? null,
      isObligationClosed(o.status),
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
    const isClosed = isTimeBarClosed(b.status);
    // The backend already computes days_remaining against its own clock; trust
    // it over a browser-local recomputation, which can disagree by a day. But
    // only when it actually sent a number — a null or a string would otherwise
    // reach the screen as "nulld left".
    const serverDays = Number.isFinite(Number(b.days_remaining))
      && b.days_remaining !== null
      && b.days_remaining !== undefined
      ? Number(b.days_remaining)
      : null;
    const days = isClosed ? null : serverDays ?? daysUntil(b.deadline_date, today);

    const urgency: ComplianceUrgency = isClosed
      ? "closed"
      : days === null
        ? "no-date"
        : days < 0
          ? "overdue"
          : days <= DUE_SOON_DAYS
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
      daysFromDue: days,
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

/**
 * The badge text for a row.
 *
 * Lives here rather than in the page so the "can this ever print NaN or null?"
 * question has a test rather than an opinion. Every branch that mentions a
 * number first proves it has one.
 */
export function urgencyLabel(row: ComplianceRow): string {
  const days = Number.isFinite(row.daysFromDue as number) ? (row.daysFromDue as number) : null;
  switch (row.urgency) {
    case "overdue":
      return days === null ? "Overdue" : `${Math.abs(days)}d overdue`;
    case "due-soon":
    case "on-track":
      return days === null ? "No date recorded" : `${days}d left`;
    case "no-date":
      return "No date recorded";
    default:
      return row.status?.trim() || "Closed";
  }
}

/**
 * What the page failed to load.
 *
 * The counts on this page are derived from the rows that arrived. If a request
 * failed, the rows are short and the counts under-report — and "0 overdue" on
 * a compliance page is a statement a user will act on. So the page has to be
 * able to say which part it could not read.
 */
export interface ComplianceLoadState {
  /** The project's documents — without them, no obligations at all. */
  documentsFailed: boolean;
  /** The project's notice deadlines. */
  timeBarsFailed: boolean;
  /** Documents whose obligations request failed, out of those attempted. */
  failedObligationDocuments: number;
  totalObligationDocuments: number;
  /**
   * Documents the endpoint says exist but did not send — DRF paginates, and
   * only the first page's obligations can be gathered.
   */
  undeliveredDocuments: number;
}

export type ComplianceLoadIssue =
  | { level: "none" }
  | { level: "total" | "partial"; message: string };

const EMPTY_LOAD_STATE: ComplianceLoadState = {
  documentsFailed: false,
  timeBarsFailed: false,
  failedObligationDocuments: 0,
  totalObligationDocuments: 0,
  undeliveredDocuments: 0,
};

/** Plain sentences about what is missing. No alarm, no reassurance. */
export function summariseLoadIssues(
  partial: Partial<ComplianceLoadState>,
): ComplianceLoadIssue {
  const state = { ...EMPTY_LOAD_STATE, ...partial };

  // Nothing arrived from either source: the page has nothing to show and must
  // not fall through to the "no obligations tracked yet" empty state.
  if (state.documentsFailed && state.timeBarsFailed) {
    return {
      level: "total",
      message:
        "Neither this project's documents nor its notice deadlines could be loaded, so nothing on this page can be shown. This is not a statement that there is nothing outstanding.",
    };
  }

  const parts: string[] = [];
  if (state.documentsFailed) {
    parts.push("the project's documents, so no obligations are listed");
  }
  if (state.timeBarsFailed) {
    parts.push("the notice deadlines tracked against this project");
  }
  if (state.failedObligationDocuments > 0) {
    parts.push(
      `obligations for ${state.failedObligationDocuments} of ${state.totalObligationDocuments} document${state.totalObligationDocuments === 1 ? "" : "s"}`,
    );
  }
  if (state.undeliveredDocuments > 0) {
    parts.push(
      `obligations for a further ${state.undeliveredDocuments} document${state.undeliveredDocuments === 1 ? "" : "s"} the documents endpoint did not return on this page`,
    );
  }

  if (parts.length === 0) return { level: "none" };

  return {
    level: "partial",
    message: `Could not load ${joinClauses(parts)}. The list and the counts below are of what did load, and are incomplete.`,
  };
}

function joinClauses(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join("; ")}; and ${parts[parts.length - 1]}`;
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
