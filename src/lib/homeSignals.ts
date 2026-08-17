/**
 * Homepage derivations.
 *
 * Everything the homepage shows is computed here, as pure functions over API
 * payloads, so it can be unit-tested without mounting the page — the same
 * split `src/lib/compliance.ts` uses for the Compliance page.
 *
 * Two rules govern this file:
 *
 *  1. **Nothing is invented.** Every field read below exists on a real
 *     response. Where a figure is not available (physical % complete,
 *     cash-flow forecast, payment received, earned value, cost-to-complete)
 *     there is no function for it, deliberately.
 *
 *  2. **Elapsed calendar time is not progress.** The previous homepage drew a
 *     ring from `(now - start) / (end - start)` and labelled it as the
 *     project's completion — a project where nothing had been built read 50%
 *     at its halfway date. The only "percent" this file computes is
 *     `certifiedPct`: certified value against contract sum, which is a real
 *     commercial measure and is labelled as one at the call site.
 */

/**
 * The queue's item shape and its ranking rule live in `homeQueueRank.ts` —
 * that file is the one with legal consequence and is tested on its own. This
 * file turns API payloads into items; that file decides their order.
 */
export {
  ACT_TODAY_BAND,
  bandOf,
  filterQueueByPermission,
  pressureFromDays,
  rankQueue,
  summariseQueue,
} from "./homeQueueRank";
export type {
  Clock,
  Consequence,
  PermissionCode,
  Pressure,
  QueueItem,
  QueueKind,
  QueueSummary,
} from "./homeQueueRank";

import {
  pressureFromDays,
  type Clock,
  type PermissionCode,
  type QueueItem,
} from "./homeQueueRank";

/** Every route below is one that exists in App.tsx. `/approvals` does not. */
const ROUTE = {
  finance: "/finance",
  /** Notice deadlines are the "Notice deadlines" tab of Project health. */
  timeBars: "/project-health?tab=notice-deadlines",
  riskSignals: "/project-health?tab=risk-signals",
  compliance: "/compliance",
  meeting: (id: number | string) => `/meetings/${id}`,
  task: (id: string) => `/tasks/${id}`,
} as const;

/** Whole days from today to `iso`, or null when unparseable. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.round((startOfDay(then) - startOfDay(now.getTime())) / 86_400_000);
}

/** "in 3 days" / "today" / "6 days ago" — plain, British, no exclamation. */
export function relativeDays(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// ── Queue builders ────────────────────────────────────────────────────────
//
// Each builder takes one API payload and returns the items it justifies. They
// are separate so a failing source contributes nothing rather than collapsing
// the whole queue.

export interface CertificateLike {
  id: number;
  pcNumber?: string;
  /**
   * The VALUE OF WORK certified, exclusive of VAT — `claim_amount` on the
   * server. See `certifiedValueOf` for why this, and not `totalPayable`, is
   * what a contract sum is measured against.
   */
  claimAmount?: number;
  netAmount?: number;
  totalPayable?: number;
  retentionAmount?: number;
  workflowState?: string;
  /** The certificate's own date. Real and populated; not a deadline. */
  certificateDate?: string | null;
  updatedAt?: string;
}

/**
 * How long an item has been sitting, in whole days, or null.
 *
 * Used for wording and for the last tiebreak only — never to manufacture a
 * deadline. A certificate has no due date anywhere in the payload, so "waiting
 * eleven days" is a statement about elapsed time and is worded as one.
 */
export function daysWaiting(iso: string | null | undefined, now: Date = new Date()): number | null {
  const d = daysUntil(iso, now);
  return d === null ? null : -d;
}

/**
 * Certificates sitting in a state that needs a human.
 *
 * `workflowState` is the only field every transition stamps — `approvalStatus`
 * is written once at creation and lies (see paymentCertificateTable.tsx).
 *
 * **No certificate endpoint carries a due date.** There is no `dueDate`, no
 * `rejected_at`, no statutory clock on the row — only `createdAt` and
 * `updatedAt`. So these items have NO clock, and `pressure: "none"` on a
 * `money` consequence is what puts them at band 3 rather than at the bottom.
 * Absence of a date here is a gap in the payload, not evidence of slack: the
 * contract gives the principal agent a fixed period to certify, and Baselinq
 * cannot presently see it. Reported as missing.
 *
 * `subRank` orders the three money states against each other, because the axes
 * cannot: a rejected certificate is dead in the water and must be reworked by
 * a person; a submitted one is waiting on a signature; an approved one only
 * needs posting.
 *
 * Gated on `finance.view` — the row names a certificate, and the block it
 * links to carries the certified amount. Unchanged from the previous revision.
 */
export function buildCertificateQueue(
  certificates: CertificateLike[],
  now: Date = new Date(),
): QueueItem[] {
  return certificates
    .filter((c) => c.workflowState === "submitted" || c.workflowState === "approved")
    .map((c) => {
      const ref = c.pcNumber || `PC-${c.id}`;
      const awaitingCertification = c.workflowState === "submitted";
      const waited = daysWaiting(c.updatedAt, now);
      return {
        key: `certificate-${c.id}`,
        kind: "certificate" as const,
        headline: awaitingCertification
          ? `Certify ${ref} — submitted and waiting on you`
          : `Post ${ref} to release payment`,
        detail:
          waited === null
            ? null
            : waited <= 0
              ? "In this state since today"
              : `In this state for ${waited} day${waited === 1 ? "" : "s"}`,
        consequence: "money" as const,
        pressure: "none" as const,
        daysRemaining: null,
        clock: null,
        overdue: false,
        href: ROUTE.finance,
        action: awaitingCertification ? "Open to certify" : "Open to post",
        waitingSince: c.updatedAt ?? null,
        subRank: awaitingCertification ? 1 : 2,
        requires: ["finance.view"] as PermissionCode[],
      };
    });
}

/**
 * Certificates the payer sent back.
 *
 * Rejection currently reaches nobody: the reject transition POSTs a `{ reason }`
 * and **nothing reads it back** — there is no `rejectionReason` field on any
 * response — so this row can say a certificate was returned but cannot say
 * why. Reported as missing. It is still worth surfacing: money has stopped and
 * the only thing that restarts it is somebody reworking the certificate.
 *
 * `subRank: 0` puts it at the head of the money band for that reason.
 */
export function buildRejectedCertificateQueue(
  certificates: CertificateLike[],
  now: Date = new Date(),
): QueueItem[] {
  return certificates
    .filter((c) => c.workflowState === "rejected")
    .map((c) => {
      const waited = daysWaiting(c.updatedAt, now);
      return {
        key: `rejected-certificate-${c.id}`,
        kind: "rejected" as const,
        headline: `${c.pcNumber || `PC-${c.id}`} was rejected — it needs reworking before it can be certified`,
        // The reason is not returned by the API, so none is shown.
        detail:
          waited === null || waited <= 0
            ? "Payment on it has stopped until it is reworked"
            : `Payment on it has stopped for ${waited} day${waited === 1 ? "" : "s"}`,
        consequence: "money" as const,
        pressure: "none" as const,
        daysRemaining: null,
        clock: null,
        overdue: false,
        href: ROUTE.finance,
        action: "Open to rework",
        waitingSince: c.updatedAt ?? null,
        subRank: 0,
        requires: ["finance.view"] as PermissionCode[],
      };
    });
}

export interface TimeBarLike {
  id: number;
  label: string;
  clause_ref?: string;
  clause_verified?: boolean;
  contract_form?: string;
  deadline_date?: string | null;
  /** Null in practice on a bar the backend could not date (see compliance.ts). */
  days_remaining?: number | null;
  /** "working" or "calendar" — the calendar the backend counted on. */
  unit?: string;
  status: string;
}

/**
 * Contractual notice deadlines still open. **The highest-stakes rows here.**
 *
 * Three rules, all of which matter legally:
 *
 *  1. **`days_remaining` is never recomputed.** The backend counts it on the
 *     South African working-day calendar — public holidays and the builders'
 *     break included. Deriving it here from `deadline_date` would silently
 *     substitute calendar days and hand somebody four days they do not have
 *     over an Easter weekend. When the backend could not compute it, the row
 *     says the deadline is undated and `pressureFromDays` returns "none",
 *     which the band matrix treats as live-and-unknown rather than as safe.
 *
 *  2. **The clause reference is shown only when verified** against the
 *     contract corpus. An invented clause number on a legally consequential
 *     deadline is worse than none — the rule TimeBarsTab already follows.
 *
 *  3. **The unit is named.** "7 days left" reads as a week; on the working-day
 *     calendar it is nine or ten. The row says "working days" when the backend
 *     says the count is in working days.
 *
 * Not gated: a notice deadline is not commercial information and every party
 * to the contract is prejudiced by it lapsing. `/project-health` is behind
 * `compliance.view`, which is a real dead end for a viewer without it — see
 * the report; the fix belongs on the route, not in a hidden row.
 */
export function buildTimeBarQueue(bars: TimeBarLike[]): QueueItem[] {
  return bars
    .filter((b) => b.status === "open")
    .map((b) => {
      const raw = b.days_remaining;
      const days = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      const unit = (b.unit ?? "working").toLowerCase() === "calendar" ? "calendar" : "working";
      const clock: Clock = days === null ? null : (unit as Clock);
      const clause =
        b.clause_verified && b.clause_ref
          ? `${b.contract_form ?? ""} ${b.clause_ref}`.trim()
          : null;
      const undatedNote = "Deadline could not be dated — treat it as live, not as clear";

      return {
        key: `time-bar-${b.id}`,
        kind: "time-bar" as const,
        headline:
          days === null
            ? `Serve notice on ${b.label} — its deadline is not dated`
            : days < 0
              ? `Notice on ${b.label} passed its deadline ${Math.abs(days)} ${unit} days ago`
              : days === 0
                ? `Notice on ${b.label} must be served today`
                : `${days} ${unit} days left to serve notice on ${b.label}`,
        detail: days === null ? [clause, undatedNote].filter(Boolean).join(" · ") : clause,
        consequence: "forfeiture" as const,
        pressure: pressureFromDays(days, clock),
        daysRemaining: days,
        clock,
        overdue: days !== null && days < 0,
        href: ROUTE.timeBars,
        action: "Open the deadline",
        requires: [] as PermissionCode[],
      };
    });
}

export interface RiskSignalLike {
  id: number;
  code: string;
  category: "delay" | "financial" | "compliance" | "claim";
  severity: "green" | "orange" | "red";
  status: string;
  title: string;
  /** The backend's own human-readable one-liner. Not always populated. */
  evidence?: string;
  is_contractual?: boolean;
  first_detected_at?: string;
}

/**
 * Open risk signals, as queue rows rather than only as a strip.
 *
 * A risk signal has NO date of any kind beyond `first_detected_at` — no due
 * date, no deadline — so its pressure comes from `severity`, which is the only
 * thing the risk engine grades. Red is treated as "critical", amber as "soon",
 * green as "later". That is a severity-to-urgency mapping and it is stated
 * here rather than implied.
 *
 * `is_contractual` decides the consequence, and the split is real: a
 * contractual signal says a term of the contract is being breached, whereas a
 * non-contractual one is Baselinq's own commercial guide. A red guide should
 * not outrank an amber breach, and under this mapping it does not.
 *
 * **Permission gating is unchanged.** The strip is `compliance.view`, because
 * that is what `/project-health` is gated on and a row nobody can open is a
 * dead end. `financial` signals additionally require `finance.view`, because
 * their titles carry certified values and contract-sum overruns.
 */
export function buildRiskQueue(signals: RiskSignalLike[]): QueueItem[] {
  return signals
    .filter((s) => s.status === "open")
    .map((s) => {
      const contractual = s.is_contractual === true;
      return {
        key: `risk-${s.id}`,
        kind: "risk" as const,
        headline: s.title,
        detail:
          s.evidence?.trim() ||
          `${contractual ? "Contractual breach" : "Commercial guide"} · rule ${s.code}`,
        consequence: contractual ? ("breach" as const) : ("advisory" as const),
        pressure:
          s.severity === "red" ? ("critical" as const)
          : s.severity === "orange" ? ("soon" as const)
          : ("later" as const),
        // No signal carries a due date, so there is no clock to state.
        daysRemaining: null,
        clock: null,
        overdue: false,
        href: ROUTE.riskSignals,
        action: "Open the signal",
        waitingSince: s.first_detected_at ?? null,
        requires:
          s.category === "financial"
            ? (["compliance.view", "finance.view"] as PermissionCode[])
            : (["compliance.view"] as PermissionCode[]),
      };
    });
}

export interface ObligationLike {
  _id: string;
  title: string;
  documentName?: string;
  documentReference?: string;
  documentId?: string;
  dueDate?: string | null;
  responsibleRole?: string;
  status?: string;
  isOverdue?: boolean;
  daysOverdue?: number;
  daysUntilDue?: number | null;
}

const OBLIGATION_CLOSED = new Set(["completed", "complete", "closed", "done", "satisfied", "waived"]);

/**
 * Only obligations near or past their date reach the queue.
 *
 * A contract yields dozens of obligations, most of them months out. The queue
 * answers "what will cost me money if I do not act today", so an obligation
 * two months away is Compliance's job, not the homepage's.
 */
export const OBLIGATION_HORIZON_DAYS = 14;

/**
 * Obligations extracted from the project's documents, from
 * `documents/obligations/?project_id=`.
 *
 * The day count is the SERVER's — `daysOverdue` when it says the obligation is
 * overdue, otherwise `daysUntilDue`. Only if the server supplied neither do we
 * fall back to counting calendar days to `dueDate`, and that fallback is
 * calendar-only by nature: obligations are stored as bare `YYYY-MM-DD` and
 * carry no working-day treatment, unlike a time bar.
 *
 * **`responsibleRole` is a ROLE, not a user.** There is no assignee id on the
 * payload, so these rows cannot be narrowed to "mine" and the row names the
 * role instead of implying ownership. Reported as missing.
 *
 * Gated on `compliance.view`, matching `/compliance`.
 */
export function buildObligationQueue(
  obligations: ObligationLike[],
  now: Date = new Date(),
): QueueItem[] {
  const out: QueueItem[] = [];
  for (const o of obligations) {
    if (OBLIGATION_CLOSED.has((o.status ?? "").trim().toLowerCase())) continue;

    const serverDays =
      o.isOverdue && typeof o.daysOverdue === "number" && Number.isFinite(o.daysOverdue)
        ? -Math.abs(o.daysOverdue)
        : typeof o.daysUntilDue === "number" && Number.isFinite(o.daysUntilDue)
          ? o.daysUntilDue
          : null;
    const days = serverDays ?? daysUntil(o.dueDate, now);

    // No date at all: Compliance already lists it, and a queue that cannot say
    // when something is due cannot claim it is due today.
    if (days === null) continue;
    if (days > OBLIGATION_HORIZON_DAYS) continue;

    const source = o.documentReference || o.documentName;
    out.push({
      key: `obligation-${o._id}`,
      kind: "obligation",
      headline:
        days < 0
          ? `${o.title} — ${Math.abs(days)} days past its date`
          : `${o.title} — due ${relativeDays(days)}`,
      detail: [source, o.responsibleRole ? `responsible: ${o.responsibleRole}` : null]
        .filter(Boolean)
        .join(" · ") || null,
      consequence: "breach",
      pressure: pressureFromDays(days, "calendar"),
      daysRemaining: days,
      clock: "calendar",
      overdue: days < 0,
      href: ROUTE.compliance,
      action: "Open the obligation",
      requires: ["compliance.view"],
    });
  }
  return out;
}

export interface MeetingLike {
  id: number;
  title: string;
  status: string;
  artefact_status?: string;
  date?: string;
  time?: string;
  date_time?: string;
  scheduled_utc?: string;
  location?: string;
  attendees?: string[];
  extra_attendees?: number;
  my_rsvp?: string | null;
}

/**
 * Meetings the current user has been invited to but not answered.
 *
 * `my_rsvp` is resolved per-requesting-user by the server, so this is already
 * "mine" — there is no attendee array to match against.
 *
 * Note: no organiser or inviter name exists on any meeting payload, so this
 * headline names the meeting rather than a person. Inventing "Werner is
 * waiting on your RSVP" would mean rendering a name the API never gave us.
 */
export function buildRsvpQueue(meetings: MeetingLike[], now: Date = new Date()): QueueItem[] {
  return meetings
    .filter(
      (m) =>
        m.my_rsvp === "invited" &&
        (m.status === "scheduled" || m.status === "starting_soon" || m.status === "live"),
    )
    .map((m) => {
      const days = daysUntil(m.scheduled_utc || m.date, now);
      const when = relativeDays(days);
      return {
        key: `rsvp-${m.id}`,
        kind: "rsvp" as const,
        headline: `Reply to the invitation for ${m.title}`,
        detail: when ? `Meets ${when}` : "No date recorded",
        // Blocking, not own-work: the organiser is holding a room and an
        // agenda on an answer only this person can give.
        consequence: "blocking" as const,
        pressure: pressureFromDays(days, "calendar"),
        daysRemaining: days,
        clock: days === null ? null : ("calendar" as const),
        overdue: days !== null && days < 0,
        href: ROUTE.meeting(m.id),
        action: "Open to reply",
        requires: [] as PermissionCode[],
      };
    });
}

export interface MeetingActionItemLike {
  id: number;
  text: string;
  state?: string | null;
  approved_at?: string | null;
  declined_at?: string | null;
  linked_task_id?: number | null;
  linked_task_type?: string | null;
  can_approve?: boolean;
}

/** Decided means decided — server state wins over the absent `state` field. */
export function actionItemIsPending(item: MeetingActionItemLike): boolean {
  if (item.approved_at || item.declined_at) return false;
  if (item.state === "approved" || item.state === "declined") return false;
  return true;
}

/**
 * Proposed actions from a meeting's notes that the current user may approve.
 *
 * `can_approve` is the backend's own rule (assignee, organiser, or PM/CPM/
 * CLIENT). When it is explicitly false the user would be 403'd, so the item is
 * not their job and is left out of their queue.
 */
export function buildMeetingActionQueue(
  meetings: { id: number; title: string; action_items?: MeetingActionItemLike[] }[],
): QueueItem[] {
  const out: QueueItem[] = [];
  for (const meeting of meetings) {
    const pending = (meeting.action_items ?? []).filter(
      (i) => actionItemIsPending(i) && i.can_approve !== false,
    );
    if (pending.length === 0) continue;
    out.push({
      key: `meeting-actions-${meeting.id}`,
      kind: "meeting-action",
      headline:
        pending.length === 1
          ? `Approve one action proposed in ${meeting.title}`
          : `Approve ${pending.length} actions proposed in ${meeting.title}`,
      detail:
        pending.length === 1
          ? pending[0].text
          : `Approving one raises it as a numbered instruction`,
      // Blocking: until it is approved or declined, the action does not exist
      // as an instruction and nobody can be held to it.
      consequence: "blocking",
      pressure: "none",
      daysRemaining: null,
      clock: null,
      overdue: false,
      href: ROUTE.meeting(meeting.id),
      action: "Open to decide",
      requires: [],
    });
  }
  return out;
}

export interface TaskLike {
  id: string;
  title: string;
  type?: string;
  due_date?: string | null;
  needsAction: boolean;
}

/**
 * Tasks where the ball is in the current user's court.
 *
 * `needsAction` is the one piece of the old homepage that was right and it is
 * kept verbatim: `assignedTo` is "To" — the ball is in your court — while
 * `responseBy` is "CC'd, watching only".
 *
 * `own-work` is the lowest consequence class deliberately. An overdue task is
 * late; nothing is forfeited and nobody else is blocked by it. It therefore
 * sits below every live notice deadline, every unsigned certificate and every
 * contractual breach — which is the single biggest change in this ranking.
 */
export function buildTaskQueue(tasks: TaskLike[], now: Date = new Date()): QueueItem[] {
  return tasks
    .filter((t) => t.needsAction)
    .map((t) => {
      const days = daysUntil(t.due_date, now);
      const overdue = days !== null && days < 0;
      const label = t.type ? `${t.type}: ${t.title}` : t.title;
      return {
        key: `task-${t.id}`,
        kind: "task" as const,
        headline: overdue
          ? `${label} — ${Math.abs(days as number)} days past its due date`
          : label,
        detail: days === null ? "No due date recorded" : `Due ${relativeDays(days)}`,
        consequence: "own-work" as const,
        pressure: pressureFromDays(days, "calendar"),
        daysRemaining: days,
        clock: days === null ? null : ("calendar" as const),
        overdue,
        href: ROUTE.task(t.id),
        action: "Open the task",
        requires: [] as PermissionCode[],
      };
    });
}

/**
 * Resolve finance access for RENDERING, which is not the same question a route
 * gate asks.
 *
 * `usePermissions` deliberately returns `true` for every flag while the
 * effective-permission map is still in flight, so a page reload does not
 * bounce a legitimate user off a route they hold. That is the right default
 * for a redirect and the wrong one for a money block: it fails OPEN, so a
 * contractor without `finance.view` would get a flash of the contract sum and
 * the certified total before the map lands.
 *
 * Rendering fails CLOSED. A PM waits an extra moment for figures they are
 * entitled to; a contractor never sees figures they are not.
 *
 * Note these permissions are resolved per PROJECT (`permissions/effective/
 * ?project_id=`), off `ProjectTeamMember.role` — the same person can be a
 * Contractor on one job and a Client on another, so this must never be
 * inferred from the account role.
 */
export function resolveFinanceAccess(perms: {
  canViewFinance: boolean;
  canApprovePayment: boolean;
  isLoading: boolean;
}): { canViewFinance: boolean; canApprovePayment: boolean } {
  if (perms.isLoading) return { canViewFinance: false, canApprovePayment: false };
  return {
    canViewFinance: perms.canViewFinance,
    canApprovePayment: perms.canApprovePayment,
  };
}

/** The minimum a signal must carry for the gate below to judge it. */
export interface RiskGateLike {
  category: "delay" | "financial" | "compliance" | "claim";
  status: string;
}

/**
 * Risk signals the viewer may see.
 *
 * Two separate gates apply:
 *
 *  - The strip as a whole is `compliance.view`, because that is what the
 *    `/project-health` route it links to is gated on (App.tsx). Showing a
 *    signal to someone who cannot open the page behind it is a dead end.
 *
 *  - `financial` signals additionally require `finance.view`: their titles and
 *    details carry certified values and contract-sum overruns, which is
 *    exactly the data a contractor is not entitled to. Note ProjectHealth
 *    itself is more permissive — it shows every category to anyone holding
 *    compliance.view. That divergence is real and should be settled on the
 *    page, not just worked around here.
 */
export function visibleRiskSignals<T extends RiskGateLike>(
  signals: T[],
  held: { canViewCompliance: boolean; canViewFinance: boolean },
): T[] {
  if (!held.canViewCompliance) return [];
  return signals.filter(
    (s) => s.status === "open" && (s.category !== "financial" || held.canViewFinance),
  );
}

// ── Contract time ─────────────────────────────────────────────────────────
//
// The old homepage drew a ring from `(now - start) / (end - start)` and called
// it the project's completion, so a job where nothing had been built read 50%
// at its halfway date. Nothing below is a percentage and nothing below is
// progress. Every figure here is a count of CALENDAR DAYS, which Baselinq
// genuinely knows, and each is labelled as such at the call site.
//
// Three real fields back this:
//   Project.start_date         when the works were to begin
//   Project.end_date           the ORIGINAL completion date
//   Project.contract_end_date  the LIVE one — moved by a signed variation that
//                              granted an extension of time (the backend does
//                              this in tasks/views_signing.py::_apply_vo_to_project)
// The gap between the last two is the extension of time granted so far, and
// that movement is the one thing on this block that carries consequence.

export interface TimePosition {
  /** ISO start, or null when the project has no timeline set. */
  start: string | null;
  /** The completion date as originally agreed. */
  originalEnd: string | null;
  /** The live completion date, after any extension of time. */
  contractEnd: string | null;
  /** Calendar days from start to the LIVE completion date, inclusive. */
  buildDays: number | null;
  /** Calendar days from start to today. Null before the start date. */
  elapsedDays: number | null;
  /** Days from today to the live completion date. Negative once it is past. */
  remainingDays: number | null;
  /**
   * Days the completion date has moved from the one originally agreed.
   * Positive = extended. Null when there is nothing to compare, or no move.
   */
  extensionDays: number | null;
  /** True once today is past the live completion date. */
  overrun: boolean;
  /** True before the start date — nothing has elapsed yet. */
  notStarted: boolean;
  /** False when the project has neither a start nor any completion date. */
  hasDates: boolean;
}

const EMPTY_TIME: TimePosition = {
  start: null,
  originalEnd: null,
  contractEnd: null,
  buildDays: null,
  elapsedDays: null,
  remainingDays: null,
  extensionDays: null,
  overrun: false,
  notStarted: false,
  hasDates: false,
};

/** Whole days between two ISO dates, both floored to their own local midnight. */
function daysBetween(fromIso: string, toIso: string): number | null {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const floor = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.round((floor(b) - floor(a)) / 86_400_000);
}

const iso = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" && Number.isFinite(new Date(v).getTime()) ? v : null;

/**
 * Where the contract stands in TIME. Reads camelCase and snake_case, as
 * `summariseProjectSetup` does, because several call sites still hand back the
 * raw snake payload.
 */
export function summariseTime(project: any, now: Date = new Date()): TimePosition {
  if (!project) return EMPTY_TIME;

  const start = iso(project.startDate ?? project.start_date);
  const originalEnd = iso(project.endDate ?? project.end_date);
  // The live date is the one that governs. Where a project predates the
  // contract_end_date field it is unset, and the original end IS the live one.
  const contractEnd = iso(project.contractEndDate ?? project.contract_end_date) ?? originalEnd;

  if (!start && !contractEnd) return EMPTY_TIME;

  const today = now.toISOString();

  const buildDays =
    start && contractEnd
      ? (() => {
          const d = daysBetween(start, contractEnd);
          // Inclusive of both endpoints: a one-day contract is one day long.
          return d === null ? null : d + 1;
        })()
      : null;

  const elapsedRaw = start ? daysBetween(start, today) : null;
  const notStarted = elapsedRaw !== null && elapsedRaw < 0;

  const remainingDays = contractEnd ? daysBetween(today, contractEnd) : null;

  const movement =
    originalEnd && contractEnd && contractEnd !== originalEnd
      ? daysBetween(originalEnd, contractEnd)
      : null;

  return {
    start,
    originalEnd,
    contractEnd,
    buildDays,
    elapsedDays: elapsedRaw === null || notStarted ? (notStarted ? 0 : null) : elapsedRaw,
    remainingDays,
    extensionDays: movement === 0 ? null : movement,
    overrun: remainingDays !== null && remainingDays < 0,
    notStarted,
    hasDates: true,
  };
}

// ── Money ─────────────────────────────────────────────────────────────────

export interface MoneyPosition {
  /** Live contract value, kept in step by signed variations on the backend. */
  contractSum: number | null;
  /** Approved variations by value. */
  variations: number | null;
  variationCount: number;
  /** Value certified to date — posted certificates only. */
  certified: number | null;
  retentionHeld: number | null;
  /** Contract sum less certified. Not a forecast; not cost-to-complete. */
  balance: number | null;
  /**
   * Certified value as a share of contract sum. A COMMERCIAL measure —
   * it is not physical progress and must never be labelled as such.
   */
  certifiedPct: number | null;
}

export interface VariationLike {
  status?: string;
  /**
   * `tasks/variation-orders/` carries the value on the variation itself;
   * `tasks/tasks/?taskType=VO` nests it under the assignment task. Both shapes
   * are read so this function does not depend on which route supplied the row.
   */
  grandTotal?: number | null;
  task?: { grandTotal?: number } | null;
}

const APPROVED_VO = new Set(["done", "approved", "completed"]);

/** The value on a variation, whichever route it arrived by. */
export function variationValue(v: VariationLike): number {
  return v.task?.grandTotal ?? v.grandTotal ?? 0;
}

/** A certificate counts as certified once it is posted. */
export function certificateIsCertified(c: CertificateLike): boolean {
  return c.workflowState === "posted";
}

/**
 * The value a certificate contributes to "certified against the contract sum".
 *
 * **`claimAmount`, not `totalPayable`.** They answer different questions and
 * mixing them inflates the proportion:
 *
 *   claim_amount   the value of WORK certified, exclusive of VAT
 *   net_amount     "the VAT-INCLUSIVE amount due" (tasks/pc_integrity.py:370)
 *   total_payable  subtotal + VAT − advance recovery (same file, line 357)
 *
 * `Project.contract_value` is a contract sum and carries no VAT, so measuring a
 * VAT-inclusive payable against it reads roughly 15% high — on project 45 that
 * is 90% certified where the true figure is 82%. The server settles the
 * question itself: `pc_integrity.py:703` builds its own over-certification
 * ceiling from cumulative **claim_amount** against `contract_value` plus
 * approved variations. This follows that basis.
 *
 * The fallback exists only for rows that predate server-side recomputation and
 * carry no `claimAmount` at all. It is a different basis, so it is a last
 * resort rather than an equal alternative.
 */
export function certifiedValueOf(c: CertificateLike): number {
  return c.claimAmount ?? c.totalPayable ?? c.netAmount ?? 0;
}

export function summariseMoney(
  project: any,
  certificates: CertificateLike[],
  variations: VariationLike[],
): MoneyPosition {
  const rawSum = project?.contractValue ?? project?.contract_value;
  const parsedSum = rawSum === null || rawSum === undefined || rawSum === "" ? NaN : Number(rawSum);
  const contractSum = Number.isFinite(parsedSum) && parsedSum > 0 ? parsedSum : null;

  const approvedVos = variations.filter((v) =>
    APPROVED_VO.has((v.status || "").toLowerCase()),
  );
  const variationsTotal = approvedVos.reduce((s, v) => s + variationValue(v), 0);

  const certifiedCerts = certificates.filter(certificateIsCertified);
  const certified = certifiedCerts.reduce((s, c) => s + certifiedValueOf(c), 0);
  const retentionHeld = certifiedCerts.reduce((s, c) => s + (c.retentionAmount ?? 0), 0);

  return {
    contractSum,
    variations: approvedVos.length > 0 ? variationsTotal : null,
    variationCount: approvedVos.length,
    certified: certifiedCerts.length > 0 ? certified : null,
    retentionHeld: certifiedCerts.length > 0 ? retentionHeld : null,
    balance: contractSum !== null ? contractSum - certified : null,
    certifiedPct:
      contractSum !== null && contractSum > 0
        ? Math.round((certified / contractSum) * 100)
        : null,
  };
}

// ── Load-state machine ────────────────────────────────────────────────────
//
// Copied in spirit from `summariseLoadIssues` in src/lib/compliance.ts. An API
// failure must never render as "nothing needs you" — on a homepage whose whole
// job is telling someone what is outstanding, that is the single most
// expensive thing we could say.

export interface HomeLoadState {
  tasksFailed: boolean;
  meetingsFailed: boolean;
  certificatesFailed: boolean;
  variationsFailed: boolean;
  timeBarsFailed: boolean;
  riskFailed: boolean;
  obligationsFailed: boolean;
}

export interface HomeLoadIssue {
  level: "none" | "partial" | "total";
  message?: string;
}

const EMPTY_LOAD_STATE: HomeLoadState = {
  tasksFailed: false,
  meetingsFailed: false,
  certificatesFailed: false,
  variationsFailed: false,
  timeBarsFailed: false,
  riskFailed: false,
  obligationsFailed: false,
};

const SOURCE_LABEL: Record<keyof HomeLoadState, string> = {
  tasksFailed: "your tasks",
  meetingsFailed: "your meetings",
  certificatesFailed: "payment certificates",
  variationsFailed: "variation orders",
  timeBarsFailed: "notice deadlines",
  riskFailed: "risk signals",
  obligationsFailed: "contract obligations",
};

/**
 * `visible` names the sources this viewer is actually permitted to read, so a
 * contractor without finance.view is not told the certificates endpoint failed
 * — that source was never going to be shown to them.
 */
export function summariseHomeLoad(
  partial: Partial<HomeLoadState>,
  visible: (keyof HomeLoadState)[] = Object.keys(EMPTY_LOAD_STATE) as (keyof HomeLoadState)[],
): HomeLoadIssue {
  const state = { ...EMPTY_LOAD_STATE, ...partial };
  const relevant = visible.filter((k) => state[k]);

  if (relevant.length === 0) return { level: "none" };

  if (relevant.length === visible.length) {
    return {
      level: "total",
      message:
        "None of this project's data could be loaded, so nothing on this page can be shown. This is not a statement that nothing is outstanding.",
    };
  }

  const names = relevant.map((k) => SOURCE_LABEL[k]);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  return {
    level: "partial",
    message: `Could not load ${list}. Anything outstanding there is missing from the queue below.`,
  };
}
