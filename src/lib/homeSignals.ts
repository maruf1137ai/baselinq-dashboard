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
  ActPermissionCode,
  Clock,
  Consequence,
  PermissionCode,
  QueueRequirement,
  Pressure,
  QueueItem,
  QueueKind,
  QueueSummary,
} from "./homeQueueRank";

import {
  ACT_TODAY_BAND,
  bandOf,
  pressureFromDays,
  type Clock,
  type PermissionCode,
  type QueueItem,
  type QueueRequirement,
} from "./homeQueueRank";
// The app's single currency formatter. A pure function with no DOM in it, so
// importing it here costs this file none of the testability it protects.
import { formatZAR } from "./formatCurrency";

/**
 * Finance tab labels, verbatim from `visibleTabs` in `src/pages/finance.tsx`.
 *
 * They are the labels themselves rather than slugs because `finance.tsx` keys
 * its `activeTab` state off these exact strings. Anything else would land on
 * the page's default tab and silently lose the deep link.
 */
export const FINANCE_TAB = {
  costLedger: "Cost Ledger",
  certificates: "Payment Certificates",
  variations: "Variation Orders",
} as const;

/** `/finance?tab=…` with the label encoded — the labels contain spaces. */
const financeTab = (tab: string) => `/finance?tab=${encodeURIComponent(tab)}`;

/**
 * Every route below is one that exists in App.tsx. `/approvals` does not.
 *
 * Exported as `ROUTE` so the "What changed" feed in `homeVisuals.ts` reaches
 * for the same URL shapes the queue does. A feed row and a queue row naming
 * the same certificate must land on the same screen, and two hand-written
 * copies of `?tab=…&pc=…` would drift the first time a tab label changed.
 */
// `finance: "/finance"` and `compliance: "/compliance"` used to live here and
// are deliberately gone. Every row that used them was holding the id of the
// thing it named and dropping it on the floor; a bare page is no longer a
// destination this file can reach for by accident.
export const ROUTE = {
  /** The certificate list, ready to certify/post. */
  certificates: financeTab(FINANCE_TAB.certificates),
  /** One certificate, named. */
  certificate: (id: number | string) =>
    `${financeTab(FINANCE_TAB.certificates)}&pc=${encodeURIComponent(String(id))}`,
  /** The variation list. */
  variations: financeTab(FINANCE_TAB.variations),
  /** One variation, named. */
  variation: (id: number | string) =>
    `${financeTab(FINANCE_TAB.variations)}&vo=${encodeURIComponent(String(id))}`,
  programme: "/programme",
  milestone: (id: number | string) => `/programme?milestone=${encodeURIComponent(String(id))}`,
  /** Notice deadlines are the "Notice deadlines" tab of Project health. */
  timeBars: "/project-health?tab=notice-deadlines",
  riskSignals: "/project-health?tab=risk-signals",
  obligation: (id: string) => `/compliance?obligation=${encodeURIComponent(id)}`,
  meeting: (id: number | string) => `/meetings/${id}`,
  task: (id: string) => `/tasks/${id}`,
} as const;

/**
 * `/documents` for a named project.
 *
 * The primary-contract alert already holds the project id and threw it away,
 * navigating to a bare `/documents`. Naming the project makes the destination
 * unambiguous when the alert is read from anywhere but the current selection.
 */
export const documentsHref = (projectId: string | number) =>
  `/documents?project=${encodeURIComponent(String(projectId))}`;

// ── Where a risk signal actually lives ────────────────────────────────────
//
// Every rule in `risk/rules/` attaches its signal to the object that caused
// it through a generic FK, and the serializer publishes that as `source_type`
// (the lowercased Django model name) and `source_id`. Confirmed against the
// backend, rule by rule, rather than guessed:
//
//   vo_tolerance.py / vo_rate_variance.py  source=vo         VariationOrder
//   payment_overdue.py / pc_certification  source=pc         PaymentCertificate
//   milestone_overdue.py / schedule_slip.   source=m|milestone Milestone
//   time_bar.py                            source=clock      TimeBarClock
//   claim_notified.py                      source=ic         IntentionToClaim
//
// `intentiontoclaim` has no object page of its own yet, so it takes the
// fallback with every unrecognised type. The fallback is `/project-health`,
// and it is the ONLY thing that may send a user there — that page diagnoses,
// it does not transact.

/** `source_type` values the frontend knows how to reach. */
const SOURCE_ROUTE: Record<string, (id: number | string) => string> = {
  variationorder: (id) => ROUTE.variation(id),
  paymentcertificate: (id) => ROUTE.certificate(id),
  milestone: (id) => ROUTE.milestone(id),
  /** A time bar legitimately IS a Project health row — the deadlines tab. */
  timebarclock: () => ROUTE.timeBars,
};

/** The destination for a source type with no id to name, or none at all. */
const SOURCE_LIST_ROUTE: Record<string, string> = {
  variationorder: ROUTE.variations,
  paymentcertificate: ROUTE.certificates,
  milestone: ROUTE.programme,
  timebarclock: ROUTE.timeBars,
};

/** What a signal carries about the object that caused it. */
export interface RiskSignalSource {
  /** Lowercased Django model name, or null when the rule attached nothing. */
  source_type?: string | null;
  source_id?: number | null;
}

/**
 * The object a risk signal is about — not the page that lists risk signals.
 *
 * A signal that says three variations exceed the mandate must reach those
 * variations. Landing on `/project-health` restates the sentence and offers
 * no way through to the thing it names, which is what made every homepage row
 * a dead end. So `/project-health?tab=risk-signals` is the LAST resort here,
 * taken only when the backend attached no source or attached a type this app
 * has no surface for.
 */
export function riskSignalHref(signal: RiskSignalSource | null | undefined): string {
  const type = signal?.source_type?.toLowerCase() ?? null;
  if (!type) return ROUTE.riskSignals;
  const id = signal?.source_id;
  const withId = SOURCE_ROUTE[type];
  if (withId && id !== null && id !== undefined) return withId(id);
  // Known type, but the id did not come through: the list still beats the
  // diagnostic page, because the list contains the object.
  const list = SOURCE_LIST_ROUTE[type];
  if (list) return list;
  return ROUTE.riskSignals;
}

/**
 * Where a GROUP of folded signals goes.
 *
 * A row that says "3 variations exceed the principal agent mandate" must not
 * open one of the three. No destination in this app can express "these three
 * ids", so a group of more than one goes to the LIST that contains them all —
 * the variations tab, the certificates tab, the programme — and the user
 * picks. Naming one of three would assert something untrue about which
 * variation is at issue.
 *
 * A group of one is a single signal and gets the single signal's destination.
 * A group whose signals disagree about their source type cannot name any one
 * list honestly, so it takes the risk-signals fallback.
 */
export function riskGroupHref(group: {
  count?: number;
  signals: RiskSignalSource[];
}): string {
  const signals = group.signals ?? [];
  if (signals.length === 0) return ROUTE.riskSignals;
  if (signals.length === 1) return riskSignalHref(signals[0]);

  const types = new Set(signals.map((s) => s.source_type?.toLowerCase() ?? ""));
  if (types.size !== 1) return ROUTE.riskSignals;
  const [type] = [...types];
  return SOURCE_LIST_ROUTE[type] ?? ROUTE.riskSignals;
}

/**
 * Parses a bare `YYYY-MM-DD` into a local `Date` at local midnight — the same
 * insight `shortDate` below acts on: `new Date("YYYY-MM-DD")` parses a bare
 * date as UTC midnight, and converting that back to a negative-offset local
 * timezone can roll it onto the previous day.
 *
 * This does NOT share `shortDate`'s own regex. `shortDate` is only ever
 * handed a bare date and deliberately ignores any trailing time it finds (see
 * its own tests). `daysUntil` is also handed real instants — `scheduled_utc`,
 * `escalatedAt` — which carry a genuine time and zone that must NOT be
 * discarded. So this only intercepts a string that is nothing but
 * `YYYY-MM-DD`; anything with a time component falls through to
 * `new Date(iso)`, which parses a real instant correctly.
 */
function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) {
    const [, y, mo, d] = m;
    const month = Number(mo);
    if (month < 1 || month > 12) return null;
    const date = new Date(Number(y), month - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days from today to `iso`, or null when unparseable. */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const then = parseLocalDate(iso);
  if (!then) return null;
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.round((startOfDay(then.getTime()) - startOfDay(now.getTime())) / 86_400_000);
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

/**
 * A bare `YYYY-MM-DD` (or the date part of a datetime) as `4 Aug 2026`.
 *
 * Parsed by pattern rather than by `new Date(...)` for the reason
 * `compliance.ts` gives: applying a timezone offset to a bare date can move it
 * onto the previous day, and on this page a day either side of a notice period
 * is the whole point. Null in, null out — a date we cannot read is never
 * guessed at.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  if (month < 1 || month > 12) return null;
  return `${Number(d)} ${MONTHS[month - 1]} ${y}`;
}

// ── Queue builders ────────────────────────────────────────────────────────
//
// Each builder takes one API payload and returns the items it justifies. They
// are separate so a failing source contributes nothing rather than collapsing
// the whole queue.
//
// ── The headline rule ─────────────────────────────────────────────────────
//
// Every headline below obeys one structure, and it exists because of a real
// defect: on project 45 the queue rendered fifteen notice rows reading
// "2 working days left to serve notice on Notice of delay / claim for revision
// of completion date", "16 working days left to serve notice on Notice of
// delay / claim for revision of completion date", and so on. Three things were
// wrong with that at once.
//
//  1. **The countdown was stated twice.** `QueueRow` already draws a chip from
//     `daysRemaining` and `clock` — "2 working days left", "4 working days
//     over", "Today", "Not dated". Repeating it in the headline spent the
//     row's most valuable characters on a fact already rendered eight pixels
//     to the right, in the same unit, from the same field.
//
//  2. **The countdown LED**, so the part that differed between rows was what
//     the row's `truncate` threw away. Fifteen rows read as one row.
//
//  3. **The kind was stated twice too.** `SECTIONS` in `ActionQueue.tsx` puts
//     "Notices to serve" above these rows and "Certificates awaiting you"
//     above those, so a headline beginning "Notice on …" or ending "— it needs
//     reworking before it can be certified" is re-typing its own heading.
//
// So:
//
//   **Whatever distinguishes this row from the one under it comes first, and
//   nothing temporal appears in a headline at all.**
//
// A headline must identify its row when cut at 60 characters, which is roughly
// where the row truncates at the narrowest column the homepage lays out. Time
// lives in the chip; state and provenance live in `detail`, which is the row's
// tooltip; the kind lives in the section heading; the verb lives in `action`,
// which is what the row announces to a screen reader.
//
// One consequence worth naming: a time bar's headline is now the SAME string
// whether it is four days out, due today or a week overdue. That is deliberate
// — the chip carries all three states and colours two of them — and it is why
// these rows can be compared to each other at a glance at last.

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
 * deadline. The certificate LIST carries no due date, so "waiting eleven days"
 * is a statement about elapsed time and is worded as one. The PAYMENT due date
 * is a different fact off a different endpoint — see `PaymentDueLike` below.
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
 * ── The clock, corrected ──────────────────────────────────────────────────
 *
 * This comment used to read "No certificate endpoint carries a due date" and
 * hard-coded `pressure: "none"` on every row. That is true of the certificate
 * LIST and false of the product: `GET projects/{id}/payments/` returns
 * `due.dueDate`, `isOverdue`, `daysPastDue` and `due.basisIsContractual` per
 * certificate, computed by `tasks/payment_terms.py` against the project's own
 * `ProjectPaymentTerms` and the South African working-day calendar.
 * `useProjectCommercials` has consumed it on Project Health all along.
 *
 * That endpoint answers for POSTED certificates only — a certificate that is
 * not posted is not yet an obligation to pay — so it does not date the two
 * states below, which genuinely have no deadline on the wire. Those rows keep
 * `pressure: "none"` and the reason stands: the contract gives the principal
 * agent a fixed period to CERTIFY, and Baselinq still cannot see it.
 *
 * What the endpoint does date is the row that matters most and was not on this
 * page at all: a posted certificate past its payment due date. See
 * `buildPaymentOverdueQueue`.
 *
 * ── Who each row is for ───────────────────────────────────────────────────
 *
 * Every row here used to require nothing but `finance.view`, so "Certify
 * PC-006", under a heading reading "Certificates awaiting you", rendered
 * identically for the principal agent, the contractor's QS and any finance
 * viewer on the project. The transitions are separately permissioned on the
 * server and always have been — `TRANSITION_PERMISSIONS` in
 * `tasks/pc_workflow.py` — so the row now declares the permission for the act
 * it names:
 *
 *   Certify  `finance.approve_certificate`  PRINCIPAL_PM alone: the project's
 *                                           Designated Principal Agent, the
 *                                           single certifying role.
 *
 * A viewer who cannot perform the act is not shown the row, which is what the
 * panel's title claims and what it could not previously support.
 *
 * There used to be a second row here — "Post PC-x to release payment", for
 * `workflowState === "approved"` — but approving a certificate now auto-posts
 * it atomically in the same request (`tasks/views_pc_workflow.py::_run_transition`
 * chains straight from `approve` into `post`; there is no separate manual
 * posting step any more). A certificate essentially never rests at
 * `"approved"`, and even if a stale pre-fix row somehow did, the permission it
 * was gated on (`finance.post_certificate`) was revoked from every role in
 * `user/migrations/0042_remove_pc_manual_post.py` with no later re-grant — so
 * that row was permanently unreachable for every viewer. Removed rather than
 * left as dead code that could mislead a future reader into reintroducing it.
 *
 * `subRank` orders the money states against each other, because the axes
 * cannot: a rejected certificate is dead in the water and must be reworked by
 * a person; a submitted one is waiting on a signature.
 */
export function buildCertificateQueue(
  certificates: CertificateLike[],
  now: Date = new Date(),
): QueueItem[] {
  return certificates
    .filter((c) => c.workflowState === "submitted")
    .map((c) => {
      const ref = c.pcNumber || `PC-${c.id}`;
      const waited = daysWaiting(c.updatedAt, now);
      return {
        key: `certificate-${c.id}`,
        kind: "certificate" as const,
        // The verb leads and the reference is the third word, so the row is
        // still "Certify PC-006" when it truncates.
        headline: `Certify ${ref}`,
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
        // The certificate LIST carries no date for this state, and a
        // certificate that is not posted is not yet an obligation to pay, so
        // `projects/{id}/payments/` does not date it either. The slot stays
        // empty rather than borrowing `updatedAt`, which is when somebody last
        // touched the row and is not a deadline. Reported as a payload gap.
        date: null,
        overdue: false,
        href: ROUTE.certificate(c.id),
        action: "Open to certify",
        waitingSince: c.updatedAt ?? null,
        subRank: 1,
        requires: ["finance.view", "finance.approve_certificate"] as QueueRequirement[],
      };
    });
}

/**
 * One posted certificate's payment position, as `tasks/payments.py` returns it.
 *
 * A deliberately narrow read of a wide payload: the four fields below and
 * nothing else. `src/lib/projectPosition.ts` declares the full shape for
 * Project Health, and `worstPaymentDelay` there is the derivation this file
 * does NOT duplicate — the queue needs one row per overdue certificate, that
 * page needs the worst one, and both read the same response.
 */
export interface PaymentDueLike {
  paymentCertificateId?: number;
  pcNumber?: string | null;
  isOverdue?: boolean;
  daysPastDue?: number;
  outstandingAmount?: string | number | null;
  due?: {
    dueDate?: string | null;
    basisIsContractual?: boolean;
  } | null;
}

export interface PaymentSummaryLike {
  certificates?: PaymentDueLike[];
}

/**
 * Certificates past their contractual payment date.
 *
 * ── Why this is on the homepage at all ────────────────────────────────────
 *
 * A JBCC payment certificate is a liquid document. Once it is overdue the
 * contractor may proceed by provisional sentence and interest runs from the
 * due date, so it is the single item a principal agent is personally exposed
 * on — and it was the one item on this project with a real, server-computed
 * clock that the homepage did not read. A certificate nineteen days past its
 * date sat in the queue with no chip at all, ranked beside one submitted this
 * morning, because `buildCertificateQueue` had no date to rank it by.
 *
 * ── Nothing is recomputed ─────────────────────────────────────────────────
 *
 * `daysPastDue` and `isOverdue` are the SERVER's. `tasks/payment_terms.py`
 * resolves the payment period from `ProjectPaymentTerms` — 14 calendar days
 * from the date for issue on a private JBCC contract, 21 for an Organ of
 * State, 28 for GCC, and no default at all for NEC4 or FIDIC because there is
 * no defensible one — and applies the working-day calendar where the period is
 * counted in working days. Re-deriving any of that in a browser would be a
 * second implementation of the rule that decides whether a contractor may
 * claim interest.
 *
 * `clock: "calendar"` is therefore what the chip says even where the period
 * was counted in working days: `daysPastDue` is a plain difference of two
 * dates, and labelling it "working days" would overstate it by a weekend.
 *
 * ── The permission, and why it is `finance.edit` ──────────────────────────
 *
 * The move this row names is recording the payment, which
 * `tasks/views_payments.py` gates on `finance.edit` (line 252). Not
 * `finance.approve_payment` — that code reverses a recorded payment and is a
 * different act entirely.
 *
 * ── The basis disclosure ──────────────────────────────────────────────────
 *
 * `basisIsContractual: false` means the due date was counted from the
 * certificate or posting date rather than the contractual date FOR issue. That
 * fallback can only ever move a due date LATER, i.e. in the employer's favour,
 * so it is stated in `detail` rather than left in the payload.
 */
export function buildPaymentOverdueQueue(
  summary: PaymentSummaryLike | null | undefined,
): QueueItem[] {
  const rows = summary?.certificates ?? [];
  return rows
    .filter((r) => r.isOverdue === true && (r.daysPastDue ?? 0) > 0)
    .map((r) => {
      const ref = r.pcNumber || `PC-${r.paymentCertificateId ?? "?"}`;
      const days = r.daysPastDue as number;
      const outstanding = Number(r.outstandingAmount);
      return {
        key: `payment-overdue-${r.paymentCertificateId ?? ref}`,
        // The same kind as the rows above, so it sorts and sections with them
        // — a reader looking for certificates should find all of them in one
        // place. `homeQueueRank` is untouched; this row simply carries a real
        // clock, which is what the ranking has always wanted and never had.
        kind: "certificate" as const,
        headline: `Chase payment on ${ref}`,
        detail:
          [
            Number.isFinite(outstanding) && outstanding > 0
              ? `${formatZAR(outstanding)} outstanding`
              : null,
            r.due?.dueDate ? `due ${shortDate(r.due.dueDate) ?? r.due.dueDate}` : null,
            r.due?.basisIsContractual === false
              ? "counted from a fallback date, not the contractual date for issue"
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        consequence: "money" as const,
        // Through the shared threshold function rather than hard-coded, so
        // this row is placed by exactly the rule every other dated row is.
        // A negative day count is `expired`.
        pressure: pressureFromDays(-days, "calendar"),
        daysRemaining: -days,
        clock: "calendar" as const,
        // The server's own due date, off `tasks/payment_terms.py`.
        date: r.due?.dueDate ?? null,
        overdue: true,
        href: ROUTE.certificate(r.paymentCertificateId ?? 0),
        action: "Open to record payment",
        waitingSince: r.due?.dueDate ?? null,
        // Ahead of certify and post: this is money already lost, and interest
        // is running on it.
        subRank: -1,
        requires: ["finance.view", "finance.edit"] as QueueRequirement[],
        // The outstanding figure as a NUMBER as well as inside `detail`'s
        // sentence, so that several of these can be folded to one line with a
        // real total. Null where the payload's figure is not usable — a fold
        // that meets a null states no total rather than a short one.
        amount: Number.isFinite(outstanding) ? outstanding : null,
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
 *
 * REJECTED is terminal in `pc_workflow.TRANSITIONS` — there is no way out of
 * it, on purpose: editing a rejected certificate in place would destroy the
 * record of what was rejected (see that module's docstring). So "Rework
 * PC-005" promised an in-place fix that does not exist — the certificate
 * table itself already renders zero action buttons on a rejected row for the
 * same reason (`availableTransitions` arrives empty). The only real move is
 * raising a fresh certificate; the row says that instead, and `href` still
 * points at the certificate's own (now view-only) page — the closest thing
 * to "read why it was bounced", since there is no separate "raise a new
 * certificate" route to deep-link to.
 *
 * Preparing that fresh certificate is the PREPARER's act, not a
 * certifier's — `TRANSITION_PERMISSIONS` maps submit and cancel to
 * `finance.create_certificate` — so that is the permission the row declares.
 * It used to declare `finance.view` alone and show the contractor's QS a job
 * that belongs to whoever raises certificates on this project.
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
        headline: `${c.pcNumber || `PC-${c.id}`} was rejected — raise a new certificate`,
        // The reason is not returned by the API, so none is shown.
        detail:
          waited === null || waited <= 0
            ? "Payment on it has stopped until a new certificate is raised"
            : `Payment on it has stopped for ${waited} day${waited === 1 ? "" : "s"}`,
        consequence: "money" as const,
        pressure: "none" as const,
        daysRemaining: null,
        clock: null,
        // No rejection date is returned by any endpoint — see above.
        date: null,
        overdue: false,
        href: ROUTE.certificate(c.id),
        action: "View rejection details",
        waitingSince: c.updatedAt ?? null,
        subRank: 0,
        requires: ["finance.view", "finance.create_certificate"] as QueueRequirement[],
      };
    });
}

export interface TimeBarLike {
  id: number;
  label: string;
  clause_ref?: string;
  clause_verified?: boolean;
  contract_form?: string;
  /**
   * The date the event the clock runs from became known — JBCC's "became aware
   * of" date, which is what the period is measured from. Already on the wire:
   * `TimeBarsTab.tsx` reads and renders it off the same
   * `projects/{id}/time-bars/` response. It was simply never typed here, which
   * is why the queue had nothing to tell one delay notice from another.
   *
   * **This is the only thing on the payload that distinguishes two clocks of
   * the same kind.** See the note above `buildTimeBarQueue`.
   */
  awareness_date?: string | null;
  /** Free text a person typed against the clock. Usually empty. */
  notes?: string | null;
  deadline_date?: string | null;
  /**
   * **The countdown, counted in this clock's OWN unit.**
   *
   * ── DO NOT RESTORE THE OLD COMMENT ─────────────────────────────────────
   *
   * This field was documented here, at length and correctly for its time, as
   * "a CALENDAR-day count, whatever `unit` says", because both places that
   * wrote it computed `(deadline_date - timezone.localdate()).days`. On that
   * basis this file suppressed the unit everywhere — `clock: null` on every
   * bar — so the chip read "6 days left" rather than the false "6 working
   * days left".
   *
   * **That is no longer true and the suppression is no longer honest.**
   * `risk/models_evidence.py::days_remaining` now counts in `unit`, on the
   * South African working-day calendar, including the project's own shutdown
   * dates, using the same `count_days_in_unit` the deadline itself was
   * computed with. Suppressing the unit today understates a JBCC clock in the
   * opposite direction: "6 days left" against six WORKING days is nine or ten
   * calendar days, and a reader planning around the wrong one still serves
   * late. Late service forfeits the claim outright.
   *
   * So the countdown is published again — but it is published as the SERVER'S
   * OWN SENTENCE and never re-assembled here. See `days_remaining_label`.
   *
   * Null in practice on a bar the backend could not date (see compliance.ts).
   */
  days_remaining?: number | null;
  /**
   * The unit `days_remaining` was counted in. Travels with it, always.
   *
   * Absent on a server that predates the correction, which is exactly when
   * `days_remaining` IS still a calendar subtraction — so its absence is the
   * signal to suppress the unit, and `resolveBar` uses it that way.
   */
  days_remaining_unit?: string | null;
  /**
   * **The countdown as a finished, self-describing phrase** — "12 working days
   * remaining", "2 working days overdue", "due today".
   *
   * `risk/models_evidence.py` states plainly why it exists: so that a client
   * can render the countdown "without ever combining a number with a unit
   * itself — the exact operation that produced the original defect". This file
   * therefore READS it and does not parse it, reformat it, or rebuild it from
   * `days_remaining` and `days_remaining_unit`. The server owns the pairing.
   *
   * Served on `projects/{id}/time-bars/` beside `days_remaining` and
   * `days_remaining_unit` (`risk/views_evidence.py`).
   */
  days_remaining_label?: string | null;
  /**
   * The unit of the NOTICE PERIOD — "working" or "calendar". A JBCC clock is a
   * 20-working-day period, so this reads "working", and `deadline_date` is
   * computed from it by `risk/timebars.py::add_working_days`.
   *
   * It is now the same value as `days_remaining_unit` (the backend asserts
   * `row["unit"] == row["days_remaining_unit"]` in its own tests), but the two
   * are still read separately: this one describes the PERIOD, that one
   * describes the COUNTDOWN, and only the second of them is evidence that the
   * countdown was counted correctly.
   */
  unit?: string;
  /** The length of the notice period, in `unit`s. */
  duration?: number | null;
  status: string;
}

/**
 * Contractual notice deadlines still open. **The highest-stakes rows here.**
 *
 * Three rules, all of which matter legally:
 *
 *  1. **The countdown is the server's sentence, printed verbatim.**
 *
 *     ── THE HISTORY, SO NOBODY RESTORES THE SUPPRESSION ────────────────────
 *
 *     `days_remaining` used to be `(deadline_date - timezone.localdate()).days`
 *     — plain date subtraction — while `unit` read "working" on every JBCC
 *     clock. The row printed one with the other, so a deadline four WORKING
 *     days away rendered as "6 working days left": an overstatement of about a
 *     third in an ordinary week and far more across the mid-December builders'
 *     break, on the one figure in this product where being wrong forfeits the
 *     claim.
 *
 *     The revision before this one could not fix the count — the SA holiday
 *     calendar, computed Easter and the per-project shutdown all live in
 *     `risk/timebars.py` — so it did the only honest thing available and
 *     SUPPRESSED the unit: `clock: null` on every bar, chip reading "6 days
 *     left", which was true of a calendar count.
 *
 *     **The backend has since been corrected, and the suppression is now the
 *     defect.** `risk/models_evidence.py::days_remaining` counts in the clock's
 *     own unit via `count_days_in_unit`, on the same calendar and the same
 *     project shutdown dates the deadline was computed on. It publishes
 *     `days_remaining_unit` alongside it, and `days_remaining_label` — a
 *     finished phrase — with the model's own reason attached: so that "no
 *     client can ever pair the two incorrectly again". `risk/views_evidence.py`
 *     serves all three. Against a corrected six-WORKING-day count, "6 days
 *     left" now understates by four calendar days, which is the same class of
 *     error pointing the other way.
 *
 *     So:
 *
 *       - `countdownLabel` carries `days_remaining_label` UNPARSED and
 *         UNREFORMATTED, and the chip prints it. Nothing in the client
 *         concatenates a number with a unit; that concatenation is what broke
 *         this figure the first time and the server now owns it.
 *       - `clock` is published from `days_remaining_unit` — the countdown's own
 *         unit, never `unit`, which describes the notice PERIOD. It is a
 *         FALLBACK for consumers with no label to print, and it stays `null`
 *         when `days_remaining_unit` is absent, because an absent
 *         `days_remaining_unit` means an uncorrected server whose count really
 *         is calendar days.
 *       - `deadline_date` is still correct and still leads the row as a date
 *         object, and the notice PERIOD is still stated in `detail` as "20
 *         working days from 4 Aug 2026".
 *
 *     `pressureFromDays` is still given the bar's declared unit, so no row
 *     moves band as a result of this change — and it is now right for the
 *     better reason: a working-day count is being measured against
 *     working-day thresholds.
 *
 *     When the backend could not date the bar at all, the chip reads "Not
 *     dated" and `pressureFromDays` returns "none", which the band matrix
 *     treats as live-and-unknown rather than as safe.
 *
 *  2. **The clause reference is shown only when verified** against the
 *     contract corpus. An invented clause number on a legally consequential
 *     deadline is worse than none — the rule TimeBarsTab already follows.
 *
 *  3. **No row calls a clock a notice.** The old headline read "40 working
 *     days left to serve notice on Claim for expense and loss" — but the
 *     expense-and-loss clock is a single 40-working-day period in
 *     `risk/timebars.py`, and if that entitlement is in fact two-stage (a
 *     20-working-day notice then 40 working days of particulars, as the delay
 *     claim is) then that sentence put a notice deadline a month later than it
 *     truly falls. The row now says only what `label` says, and `action` is
 *     "Open the deadline" rather than "serve the notice". Whether a given
 *     clock is a notice stage is a backend definition, not a frontend
 *     inference. Reported.
 *
 *  4. **`consequence` is `forfeiture` on every bar, and that is an assertion
 *     this file cannot presently justify per clock.** The backend hedges —
 *     late notice *may* forfeit the entitlement — and not every JBCC period is
 *     a condition precedent; `delay_particulars` very likely is not. Nothing
 *     on `projects/{id}/time-bars/` distinguishes them, so the uniform, more
 *     urgent classification is kept rather than a guessed-at softer one, and
 *     the gap is reported. See the note on what the payload would need.
 *
 * ── Telling one notice from another ───────────────────────────────────────
 *
 * Project 45 carries fifteen open clocks: five delay claims × three JBCC
 * clock types (notice of delay, delay particulars, claim for expense and
 * loss). Five of those rows therefore share a `label`, a `clause_ref`, a
 * `contract_form`, a `unit` and a `clock_type`, and the ONLY fields that
 * differ are `id`, `awareness_date`, `deadline_date` and `days_remaining`.
 *
 * Of those, `awareness_date` is the only one that names the underlying event
 * to a human: it is the date the delay became known, so "Aware 4 Aug 2026" and
 * "Aware 20 Aug 2026" are two different delay events on the same contract.
 * `deadline_date` is derived from it and is temporal (the chip's territory),
 * and `id` is a database number. So the awareness date LEADS the headline.
 *
 * It is not a perfect key and this is worth knowing: two delay claims raised
 * on the same day produce two rows that read identically. The clock's FK to
 * the claim it was raised from is not published on
 * `projects/{id}/time-bars/` — nothing on that response names the delay event,
 * its reference or its description — so there is no better string available
 * and none is invented here. Reported as a payload gap.
 *
 * Not gated: a notice deadline is not commercial information and every party
 * to the contract is prejudiced by it lapsing. `/project-health` is behind
 * `compliance.view`, which is a real dead end for a viewer without it — see
 * the report; the fix belongs on the route, not in a hidden row.
 */

/** One open bar, resolved against its own clock, before grouping. */
interface ResolvedBar {
  bar: TimeBarLike;
  /** The backend's countdown, counted in `countdownClock`. */
  days: number | null;
  /**
   * The unit the notice PERIOD is expressed in. Feeds `pressureFromDays` so the
   * thresholds are unchanged from every previous revision.
   */
  thresholdClock: Clock;
  /**
   * The unit the COUNTDOWN was counted in, off `days_remaining_unit` — the
   * server's own statement about its own number, and the only field entitled
   * to describe it. Null when the payload does not carry one, which means an
   * uncorrected server whose count is a bare calendar subtraction; the row then
   * publishes no unit at all rather than guessing one.
   */
  countdownClock: Clock;
  /** `days_remaining_label`, verbatim. Never rebuilt here. */
  countdownLabel: string | null;
  pressure: ReturnType<typeof pressureFromDays>;
  clause: string | null;
  /** "Due 24 Aug 2026", or null when the backend could not date the bar. */
  due: string | null;
  /** "20 working days from 4 Aug 2026", as much of it as the payload supports. */
  period: string | null;
}

const UNDATED_NOTE = "Deadline could not be dated — treat it as live, not as clear";

function resolveBar(b: TimeBarLike): ResolvedBar {
  const raw = b.days_remaining;
  const days = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const unit = (b.unit ?? "working").toLowerCase() === "calendar" ? "calendar" : "working";
  const thresholdClock: Clock = days === null ? null : (unit as Clock);
  // The countdown's OWN unit, and only where the server states it. Its absence
  // is evidence, not an omission: a payload with no `days_remaining_unit` comes
  // from a server whose `days_remaining` is still a calendar subtraction, and
  // labelling that "working" is the original defect. See rule 1.
  const rawCountdownUnit =
    typeof b.days_remaining_unit === "string" ? b.days_remaining_unit.toLowerCase() : null;
  const countdownClock: Clock =
    days === null || rawCountdownUnit === null
      ? null
      : rawCountdownUnit === "calendar"
        ? "calendar"
        : rawCountdownUnit === "working"
          ? "working"
          : null;
  // Read, never parsed and never reassembled. The whole point of the field is
  // that the server owns the pairing of the number with its unit.
  const countdownLabel =
    typeof b.days_remaining_label === "string" && b.days_remaining_label.trim() !== ""
      ? b.days_remaining_label.trim()
      : null;
  const due = shortDate(b.deadline_date);
  const aware = shortDate(b.awareness_date);
  const duration =
    typeof b.duration === "number" && Number.isFinite(b.duration) && b.duration > 0
      ? b.duration
      : null;
  // "20 working days from 4 Aug 2026" — the period IS in working days and the
  // backend applies the calendar to it correctly. This is the one place the
  // word "working" may still appear on a row.
  const span = duration === null ? null : `${duration} ${unit} day${duration === 1 ? "" : "s"}`;
  const period =
    span && aware ? `${span} from ${aware}` : span ? span : aware ? `Aware ${aware}` : null;

  return {
    bar: b,
    days,
    thresholdClock,
    countdownClock,
    countdownLabel,
    // Unchanged from every previous revision on purpose: the bar's declared
    // unit still chooses the thresholds, so no row moves band because of this
    // fix. It is now right for the better reason as well — a working-day count
    // measured against working-day thresholds.
    pressure: pressureFromDays(days, thresholdClock),
    clause:
      b.clause_verified && b.clause_ref ? `${b.contract_form ?? ""} ${b.clause_ref}`.trim() : null,
    // The formatted date, WITHOUT a "Due " prefix. The prefix existed only to
    // make the headline read as a sentence, and the headline no longer carries
    // the date. What still uses this is the folded group's `detail`, which
    // lists its members' dates — "20 Aug 2026, 27 Aug 2026" reads as a list of
    // dates, where "Due 20 Aug 2026, Due 27 Aug 2026" read as a stutter.
    due,
    period,
  };
}

/**
 * The headline for one clock: **what it is, and nothing else.**
 *
 * It used to be "Due 5 Aug 2026 — Notice of delay / claim for revision of
 * completion date". The date was right to be on the row and wrong to be in
 * this string: rendered as a text prefix in the same weight and colour as the
 * label behind it, it read as more sentence, and six stacked rows became six
 * near-identical sentences with the distinguishing half at the far end.
 *
 * The date has NOT been removed — `QueueItem.date` carries it and the row
 * draws it as a date object in a slot of its own, where a column of them can
 * be scanned without being read. What is removed is the duplication of
 * register: an absolute date in the prose and a relative countdown in the chip,
 * two feet apart, saying the same thing twice.
 *
 * `label` is the backend's own wording and is reproduced verbatim: it is the
 * contractual name of the thing and is not ours to paraphrase, nor to
 * embellish with "serve notice on", which is a claim about the clock's stage
 * that this file cannot make (rule 3). Note the row no longer prepends
 * "Notice on" either — every JBCC delay label already begins with "Notice", so
 * the old template produced "Notice on Notice of delay / claim for revision of
 * completion date", and the section heading says "Notices to serve" above the
 * lot of them anyway.
 */
function timeBarHeadline(r: ResolvedBar): string {
  return r.bar.label;
}

function timeBarDetail(r: ResolvedBar): string | null {
  const note =
    typeof r.bar.notes === "string" && r.bar.notes.trim() !== "" ? r.bar.notes.trim() : null;
  return (
    [r.clause, r.period, note, r.days === null ? UNDATED_NOTE : null]
      .filter(Boolean)
      .join(" · ") || null
  );
}

/**
 * How many clocks of one kind must be sitting out beyond their pressure window
 * before they are folded into a single row. Two is the smallest number where
 * folding removes anything.
 */
const TIME_BAR_GROUP_MIN = 2;

/** Stable, human-free key for a group: the label, flattened. */
const groupKey = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unlabelled";

/**
 * Contractual notice deadlines still open, one row each — except for the ones
 * with nothing to do about them this morning, which are folded.
 *
 * ── Why these are grouped, and why only these ─────────────────────────────
 *
 * Fifteen clocks on one project is not a rendering problem, it is a queue
 * problem: `ActionQueue` caps at twelve rows, so a project with fifteen open
 * notices could push every certificate, obligation and task off the homepage
 * entirely — while eleven of those fifteen were a month out and needed nothing
 * doing today.
 *
 * `groupRiskSignals` is the precedent, but it does not transfer wholesale. A
 * risk signal is a standing condition; a time bar is a forfeiture clock, and
 * folding five of them into "5 notices due" hides the one with two days left
 * behind four with sixteen. That is the worst outcome this page can produce.
 *
 * So the fold is bounded by the ranking model rather than by a row count:
 *
 *  - A clock at `expired`, `critical` or `soon` pressure — anything inside ten
 *    working days, plus everything already overdue — **always keeps its own
 *    row**. Those are bands 0–2, the ones `summariseQueue` counts as needing
 *    you today. Nothing urgent is ever folded, by construction rather than by
 *    care.
 *  - A clock with NO computed deadline keeps its own row too. An unknown
 *    forfeiture clock must not be tidied away; that is exactly the case where
 *    the number that would justify folding it is missing.
 *  - Only clocks at `later` pressure fold, and only with others of the same
 *    label. Those are the rows `homeQueueRank` has already placed at band 5,
 *    below unsigned certificates, on the stated grounds that "there is nothing
 *    to do about it this morning".
 *
 * A folded row still carries a clock, and it is the SOONEST clock in the group
 * — chip, `daysRemaining`, `clock` and `pressure` all come from the worst
 * member — so the group can only ever overstate its own urgency, never
 * understate it. And because every member is `later`, the group's own pressure
 * is `later` too: folding cannot move a row between bands.
 *
 * The group's destination is `/project-health?tab=notice-deadlines`, which is
 * where each of its members went individually — a group loses no navigation
 * here, unlike `riskGroupHref`, which has to fall back to a list page.
 */
export function buildTimeBarQueue(bars: TimeBarLike[]): QueueItem[] {
  const resolved = bars.filter((b) => b.status === "open").map(resolveBar);

  const single = (r: ResolvedBar): QueueItem => ({
    key: `time-bar-${r.bar.id}`,
    kind: "time-bar" as const,
    headline: timeBarHeadline(r),
    detail: timeBarDetail(r),
    // Uniform, and knowingly so — see rule 4. Nothing on the payload says
    // which clocks are conditions precedent, and the more urgent class is the
    // safe one to be wrong in.
    consequence: "forfeiture" as const,
    pressure: r.pressure,
    daysRemaining: r.days,
    // Never `r.thresholdClock` — that describes the notice PERIOD. This is the
    // countdown's own unit, as the server states it, and null where it does
    // not state one. See rule 1.
    clock: r.countdownClock,
    // The server's finished phrase. The chip prints it; nothing here builds it.
    countdownLabel: r.countdownLabel,
    // The deadline date, raw. It used to be formatted and glued to the front
    // of the headline; the row draws it as a date object now.
    date: r.bar.deadline_date ?? null,
    overdue: r.days !== null && r.days < 0,
    href: ROUTE.timeBars,
    action: "Open the deadline",
    requires: ["risk.timebar.manage"] as QueueRequirement[],
  });

  const out: QueueItem[] = [];
  const foldable = new Map<string, ResolvedBar[]>();

  for (const r of resolved) {
    if (r.pressure !== "later") {
      out.push(single(r));
      continue;
    }
    const bucket = foldable.get(r.bar.label);
    if (bucket) bucket.push(r);
    else foldable.set(r.bar.label, [r]);
  }

  for (const [label, group] of [...foldable.entries()].sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
  )) {
    if (group.length < TIME_BAR_GROUP_MIN) {
      out.push(single(group[0]));
      continue;
    }
    // Worst first. Every member has a finite `days` — `later` cannot be
    // reached without one — so the soonest is well defined.
    const ordered = [...group].sort((a, b) => (a.days as number) - (b.days as number));
    const worst = ordered[0];
    const dues = ordered.map((r) => r.due).filter((d): d is string => d !== null);
    const shown = dues.slice(0, 3).join(", ");
    const more = dues.length > 3 ? ` +${dues.length - 3} more` : "";

    out.push({
      key: `time-bar-group-${groupKey(label)}`,
      kind: "time-bar",
      // The count leads because it is what separates a folded row from a
      // single one; the label follows because it is what separates one folded
      // row from the next.
      headline: `${ordered.length} deadlines — ${label}`,
      detail:
        [worst.clause, dues.length > 0 ? `${shown}${more}` : null].filter(Boolean).join(" · ") ||
        null,
      consequence: "forfeiture",
      // The worst clock in the group, in full: the chip a folded row draws is
      // the chip its most urgent member would have drawn on its own.
      pressure: worst.pressure,
      daysRemaining: worst.days,
      clock: worst.countdownClock,
      // The soonest member's own countdown sentence — the same member the chip,
      // the date and the pressure all come from, so the row states one clock.
      countdownLabel: worst.countdownLabel,
      // THE SOONEST MEMBER'S DATE, which is the same member the chip and the
      // pressure already come from — `ordered` is sorted by `days` ascending
      // and `worst` is `ordered[0]`. A group therefore shows one date and one
      // countdown belonging to one deadline, rather than a date from one
      // member beside a countdown from another. Like the chip, it can only
      // ever overstate the group's urgency, never understate it, and the
      // remaining dates are listed in `detail` where the tooltip shows them.
      date: worst.bar.deadline_date ?? null,
      overdue: false,
      href: ROUTE.timeBars,
      action: "Open the deadlines",
      requires: ["risk.timebar.manage"] as QueueRequirement[],
    });
  }

  return out;
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
  /**
   * The object that caused the signal — lowercased Django model name from the
   * serializer's generic FK, e.g. `variationorder`. These two fields have been
   * arriving on every response all along and were simply never typed, so the
   * homepage could not see where a signal pointed and sent everybody to
   * `/project-health` instead. See `riskSignalHref`.
   */
  source_type?: string | null;
  source_id?: number | null;
}

/**
 * ── Why risk signals are NOT queue items ──────────────────────────────────
 *
 * They used to be. `buildRiskQueue` put every open signal into "What needs
 * you" alongside certificates and notice deadlines, and on project 45 that
 * made twelve of the thirteen rows risk signals — three of them the same
 * sentence about three variations that had *already been approved*.
 *
 * A queue row answers *what must I do today*. Nothing can be done about an
 * approved variation from that row: its only action was "Open the signal",
 * which navigates to `/project-health`, where the row already appears with
 * its evidence and an Acknowledge control. So the queue was carrying twelve
 * rows that were neither actionable nor unique, and they buried the one row
 * that was — certify PC-006.
 *
 * A signal is a **standing condition**, not a task. It is grouped by rule
 * below and shown as the project's condition, and `/project-health` remains
 * the place it is worked. The ranking in `homeQueueRank.ts` was never the
 * problem and is unchanged; this is a decision about what belongs in an
 * actionable list at all.
 */

/** One rule's worth of open signals. */
export interface RiskGroup {
  /** The rule that fired. Groups are one-per-code. */
  code: string;
  /** How many open signals this rule produced. */
  count: number;
  /** The worst severity in the group — the group is drawn at this level. */
  severity: "red" | "orange" | "green";
  /** True when every signal in the group is a contractual breach. */
  contractual: boolean;
  /** One line for the whole group. A single signal keeps its own title. */
  title: string;
  /** The signals behind it, worst first. Never lost, only folded. */
  signals: RiskSignalLike[];
}

/**
 * Collective wording for a rule that fired more than once.
 *
 * Only reached when `count > 1`; a lone signal always keeps the backend's own
 * title verbatim. Each string is a true summary of the group it replaces —
 * `VO_MANDATE_BREACH` fires once per variation, so three of them *are* three
 * variations over mandate. Any rule not listed here falls back to the first
 * signal's own title plus an honest "+N more", which asserts nothing.
 */
const RISK_GROUP_TITLE: Record<string, (n: number) => string> = {
  VO_MANDATE_BREACH: (n) => `${n} variations exceed the principal agent mandate`,
  VO_TOLERANCE_BREACH: (n) => `${n} variation tolerance breaches`,
  PAYMENT_OVERDUE: (n) => `${n} certificates unpaid after certification`,
  SCHEDULE_SLIPPAGE: (n) => `${n} milestones slipped beyond plan`,
  MILESTONE_OVERDUE: (n) => `${n} milestones overdue`,
};

const SEVERITY_RANK = { red: 0, orange: 1, green: 2 } as const;

/**
 * Open signals folded to one line per rule, worst first.
 *
 * **No filtering happens here.** Callers pass the output of
 * `visibleRiskSignals`, which applies exactly the gates `buildRiskQueue` used
 * to declare — `compliance.view` for every signal, plus `finance.view` for a
 * `financial` one — so nothing becomes visible to anyone who could not
 * already see it. Grouping is presentation; the gate is upstream and unmoved.
 */
export function groupRiskSignals(signals: RiskSignalLike[]): RiskGroup[] {
  const byCode = new Map<string, RiskSignalLike[]>();
  for (const s of signals) {
    const bucket = byCode.get(s.code);
    if (bucket) bucket.push(s);
    else byCode.set(s.code, [s]);
  }

  return [...byCode.entries()]
    .map(([code, group]) => {
      const ordered = [...group].sort(
        (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
      );
      const n = ordered.length;
      const collective = RISK_GROUP_TITLE[code];
      return {
        code,
        count: n,
        severity: ordered[0].severity,
        contractual: ordered.every((s) => s.is_contractual === true),
        title:
          n === 1
            ? ordered[0].title
            : collective
              ? collective(n)
              : `${ordered[0].title} · +${n - 1} more`,
        signals: ordered,
      };
    })
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.count - a.count ||
        (a.code < b.code ? -1 : a.code > b.code ? 1 : 0),
    );
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
      // The obligation's own title is the whole of the headline. Both tails it
      // used to carry — "— 9 days past its date", "— due in 3 days" — are the
      // chip, in the chip's own words, and they were pushing the title out of
      // the row on the long extracted obligations that need it most.
      headline: o.title,
      detail:
        [
          source,
          o.responsibleRole ? `responsible: ${o.responsibleRole}` : null,
          days < 0 ? `${Math.abs(days)} days past its date` : `due ${relativeDays(days)}`,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      consequence: "breach",
      pressure: pressureFromDays(days, "calendar"),
      daysRemaining: days,
      clock: "calendar",
      date: o.dueDate ?? null,
      overdue: days < 0,
      href: ROUTE.obligation(o._id),
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
        // The meeting's name is the distinguishing part and it used to start
        // at character 28, so two invitations truncated to the same sentence.
        headline: `${m.title} — reply to the invitation`,
        detail: when ? `Meets ${when}` : "No date recorded",
        // Blocking, not own-work: the organiser is holding a room and an
        // agenda on an answer only this person can give.
        consequence: "blocking" as const,
        pressure: pressureFromDays(days, "calendar"),
        daysRemaining: days,
        clock: days === null ? null : ("calendar" as const),
        // When the meeting sits, which is the date the answer is needed by.
        date: m.scheduled_utc || m.date || null,
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
      // Meeting first, for the same reason as the RSVP row above: with two
      // meetings open, "Approve 2 actions proposed in …" is two rows that read
      // alike until the part that truncates.
      headline:
        pending.length === 1
          ? `${meeting.title} — approve 1 proposed action`
          : `${meeting.title} — approve ${pending.length} proposed actions`,
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
      // A proposed action carries no date of its own on the meeting detail
      // payload. Not borrowed from the meeting: the meeting has happened, and
      // its date is not a deadline for deciding.
      date: null,
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
  /**
   * True when this task went more than three days past its due date and the
   * backend escalated it TO the current viewer. It is a separate flag from
   * `needsAction` on purpose: escalation does not reassign the task, so an
   * instruction sitting with a late contractor is escalated to the PM while
   * `assignedTo` still names the contractor. Folding it into `needsAction`
   * would have claimed the PM was the one who owed the work.
   */
  escalatedToMe?: boolean;
  /** When the escalation was raised. Drives "escalated N days ago". */
  escalatedAt?: string | null;
  /** Who is actually late — the person to chase. Omitted when unnamed. */
  awaiting?: string | null;
}

/**
 * The row for a task that was escalated to you because somebody else let it
 * run late.
 *
 * WORDING. This row must not read as "your task". Nobody has asked the PM to
 * do the work; the work is still the contractor's. What has landed on the PM
 * is the chase. So the headline names the person who owes the response, and
 * the verb is "chase", not "open" — an escalation that reads like an
 * assignment invites the reader to do somebody else's job, or to dismiss it as
 * a duplicate of a task they know is not theirs.
 *
 * RANK. `blocking`, not `own-work`. The reasoning `buildTaskQueue` gives for
 * putting ordinary tasks in `own-work` — "nothing is forfeited and nobody else
 * is blocked by it" — is exactly what stops being true here. This row exists
 * only because a party has gone silent past the SLA, which is the definition
 * of the works waiting on somebody. It stays below `forfeiture`, `money` and
 * `breach`: no deadline has lapsed and no contractual term is broken yet, and
 * the escalation is precisely the mechanism for stopping it becoming one.
 * Against `own-work` it wins, and it should — a stranger's silence is worse
 * than your own late paperwork, because you cannot simply sit down and clear
 * it. In the existing band matrix that is band 4 versus band 5, one step up.
 *
 * The ordering model is untouched: this classifies a row within the existing
 * consequence axis and adds no term to it.
 */
function escalatedTaskRow(t: TaskLike, now: Date): QueueItem {
  const days = daysUntil(t.due_date, now);
  const overdue = days !== null && days < 0;
  const label = t.type ? `${t.type}: ${t.title}` : t.title;
  const since = daysUntil(t.escalatedAt ?? null, now);

  return {
    key: `task-escalated-${t.id}`,
    kind: "task-escalated" as const,
    // Names who is late, so the reader knows who to call. The count of days
    // stays in the chip, as on every other row.
    headline: t.awaiting ? `${label} — awaiting ${t.awaiting}` : label,
    detail: [
      t.awaiting ? `No response from ${t.awaiting}` : "No response from the assignee",
      days === null ? null : `${Math.abs(days)} days past the due date`,
      since === null ? null : `escalated to you ${relativeDays(since)}`,
    ]
      .filter(Boolean)
      .join(" · "),
    consequence: "blocking" as const,
    pressure: pressureFromDays(days, "calendar"),
    daysRemaining: days,
    clock: days === null ? null : ("calendar" as const),
    date: t.due_date ?? null,
    overdue,
    href: ROUTE.task(t.id),
    // Not "Open the task". The move is to chase the person who owes it.
    action: "Chase the response",
    requires: [] as PermissionCode[],
  };
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
    .filter((t) => t.needsAction || t.escalatedToMe)
    .map((t) => {
      // An escalation is a different row with a different claim, so it is
      // built separately rather than by decorating the assigned row. A task
      // that is both assigned to you AND escalated to you resolves to the
      // escalation: it is the more urgent reading of the same fact.
      if (t.escalatedToMe) return escalatedTaskRow(t, now);
      const days = daysUntil(t.due_date, now);
      const overdue = days !== null && days < 0;
      const label = t.type ? `${t.type}: ${t.title}` : t.title;
      return {
        key: `task-${t.id}`,
        kind: "task" as const,
        // The task's own label, and nothing else. An overdue task used to
        // append "— 12 days past its due date" while the chip beside it read
        // "12 days over"; the count is the chip's job and the title is the
        // row's.
        headline: label,
        detail:
          days === null
            ? "No due date recorded"
            : overdue
              ? `${Math.abs(days)} days past its due date`
              : `Due ${relativeDays(days)}`,
        consequence: "own-work" as const,
        pressure: pressureFromDays(days, "calendar"),
        daysRemaining: days,
        clock: days === null ? null : ("calendar" as const),
        // `dueDate ?? finishDate` as the hook resolves it. Null on a task with
        // neither, and null is drawn as an empty slot and disclosed by the
        // chip — see `buildTaskQueue`'s note on the undated-task hole.
        date: t.due_date ?? null,
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
  /**
   * The four ACT flags. Optional so that `useProjectCommercials`, which asks
   * only "may this person see money", keeps its existing call unchanged.
   */
  canEditFinance?: boolean;
  canCertifyCertificate?: boolean;
  canPostCertificate?: boolean;
  canPrepareCertificate?: boolean;
}): FinanceAccess {
  if (perms.isLoading) {
    return {
      canViewFinance: false,
      canApprovePayment: false,
      canEditFinance: false,
      canCertifyCertificate: false,
      canPostCertificate: false,
      canPrepareCertificate: false,
    };
  }
  return {
    canViewFinance: perms.canViewFinance,
    canApprovePayment: perms.canApprovePayment,
    canEditFinance: perms.canEditFinance === true,
    canCertifyCertificate: perms.canCertifyCertificate === true,
    canPostCertificate: perms.canPostCertificate === true,
    canPrepareCertificate: perms.canPrepareCertificate === true,
  };
}

/**
 * What a viewer may DO with money on this project, as against what they may
 * see.
 *
 * `canApprovePayment` is kept and is deliberately NOT used to gate the
 * certificate rows. It resolves `finance.approve_payment`, which
 * `tasks/views_payments.py` documents as "reverse a recorded payment" — an
 * entirely different act from certifying. Gating "Certify PC-006" on it would
 * have been a scoping rule invented in the browser, which is exactly what this
 * change exists to remove.
 */
export interface FinanceAccess {
  canViewFinance: boolean;
  /** `finance.approve_payment` — reverse a recorded payment. */
  canApprovePayment: boolean;
  /** `finance.edit` — record a payment, edit finance data. */
  canEditFinance: boolean;
  /** `finance.approve_certificate` — certify or reject. PRINCIPAL_PM alone. */
  canCertifyCertificate: boolean;
  /** `finance.post_certificate` — post a certified certificate. */
  canPostCertificate: boolean;
  /** `finance.create_certificate` — raise, submit, rework, withdraw. */
  canPrepareCertificate: boolean;
}

/** The minimum a signal must carry for the gate below to judge it. */
export interface RiskGateLike {
  category: "delay" | "financial" | "compliance" | "claim";
  status: string;
}

/**
 * Risk signals the viewer may see.
 *
 * Three separate gates apply:
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
 *
 *  - `delay` signals (SCHEDULE_SLIPPAGE, MILESTONE_OVERDUE) additionally
 *    require `programme.view`, for the same reason as the `financial` gate
 *    above: `riskGroupHref` (`blocks.tsx`) resolves a delay-category group to
 *    `/programme?milestone=<id>` — a route gated on `programme.view`
 *    (App.tsx) — and a link into a page the viewer will bounce out of is
 *    worse than no link.
 *
 * `status`: both `open` and `acknowledged` count as visible, matching the
 * backend's own `RiskSignal.objects.active()` (`risk/models.py`) and
 * `/project-health`'s `AcknowledgedList` — an acknowledged-but-unresolved
 * signal is still a real, open risk, and Home's stricter `"open"`-only
 * filter was silently under-counting it with no comment explaining why.
 */
export function visibleRiskSignals<T extends RiskGateLike>(
  signals: T[],
  held: { canViewCompliance: boolean; canViewFinance: boolean; canViewProgramme: boolean },
): T[] {
  if (!held.canViewCompliance) return [];
  return signals.filter(
    (s) =>
      (s.status === "open" || s.status === "acknowledged") &&
      (s.category !== "financial" || held.canViewFinance) &&
      (s.category !== "delay" || held.canViewProgramme),
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
  /**
   * `Project.contract_value` — the ORIGINAL contract sum.
   *
   * The server treats it as the original and adds approved variations on top:
   * `pc_integrity.check` builds its over-certification ceiling as
   * `contract_value + Σ approved variations` (tasks/pc_integrity.py:700), and
   * the VO_TOLERANCE_BREACH rule measures cumulative variations AGAINST it as
   * a budget. Both readings only make sense if it is the pre-variation figure.
   *
   * ONE CAVEAT, AND IT IS THE SERVER'S, NOT OURS. `_apply_vo_to_project`
   * (tasks/views_signing.py:344) ADDS a variation's approved amount to
   * `contract_value` when a VO is signed through the sign-and-issue endpoint,
   * and sets its status to APPROVED in the same transaction. A variation that
   * took that path is therefore inside `contract_value` AND inside the
   * approved-variation total, and any `original + approved` sum counts it
   * twice — including the server's own ceiling. Nothing on the payload
   * distinguishes the two populations. See `revisedContractSum`.
   */
  contractSum: number | null;
  /** Approved variations by value. */
  variations: number | null;
  variationCount: number;
  /**
   * How many of `variationCount` carried no `grand_total`.
   *
   * Each of those contributes R0 to `variations`, hence to
   * `revisedContractSum`, hence to `balance`, `certifiedPct` and the certified
   * curve's ceiling. The zero is unavoidable — nothing on the payload prices
   * them — but it must not be silent, so the count is published and the Money
   * zone prints it. Same discipline as `buildCertificateRun`'s `undated`.
   */
  variationsUnpriced: number;
  /**
   * Original contract sum plus approved variations — the sum the works are
   * actually being carried out for, and the figure a QS means by "the contract
   * sum" once variations have been approved.
   *
   * Null whenever the original is null: a revised sum built on an unknown
   * original would be a guess wearing a total's clothes.
   */
  revisedContractSum: number | null;
  /** Value certified to date — posted certificates only. */
  certified: number | null;
  retentionHeld: number | null;
  /**
   * **Balance still to certify** — revised contract sum, less what has been
   * certified. Nothing else comes off it.
   *
   * ── Retention is NOT deducted, and used to be ─────────────────────────
   *
   * This returned `revised − certified − retentionHeld`, which deducts
   * retention twice. Per `tasks/pc_integrity.py::recompute`, `claim_amount`
   * is the valuation less penalties and advance recovery — it is GROSS of
   * retention, and retention is taken out further down the certificate, at
   * line 4.0, on its way to what is paid. So retention is a SUBSET of the
   * certified total, not a quantity standing beside it, and taking it off
   * again removes the same rand a second time. On project 45 that read
   * R 1 590 000 where the true balance is R 2 000 000, and Project Health —
   * one click away, off the same payload — printed the right one.
   *
   * `financialOverview` in `src/lib/projectPosition.ts` had already rebuilt
   * the correct figure locally and declined to change this shared one. It no
   * longer needs to: the derivation and the LABEL now agree across the two
   * screens, because two names for one figure is its own defect. Both call it
   * "Balance still to certify".
   *
   * ── The figure this is NOT ────────────────────────────────────────────
   *
   * Cash still to flow — `revised − paid + retention due for release` —
   * cannot be computed from this payload: nothing on the certificate list
   * distinguishes PAID from POSTED (`tasks/payment_terms.py` is explicit that
   * posting certifies, it does not pay) and no release schedule exists. It is
   * therefore not stated at all rather than approximated.
   *
   * Null when the revised sum is unknown, and null when the certificate list
   * could not be READ — see the `certificates` parameter of `summariseMoney`.
   * A failed request must not be spent as a zero.
   */
  balance: number | null;
  /**
   * Certified value as a share of the REVISED contract sum. A COMMERCIAL
   * measure — it is not physical progress and must never be labelled as such.
   *
   * Against the revised sum and not the original, for the same reason the
   * balance is: `pc_integrity.check` sets its over-certification ceiling at
   * `contract_value + approved variations`, so measuring against the original
   * reports a certificate as over 100% while the server considers it well
   * inside its ceiling. That is a false alarm on the one judgement this figure
   * is used to make.
   *
   * Null when the certificate list could not be read: `certified / revised`
   * over an empty list that only LOOKS empty because the request failed is a
   * confident 0%, printed beside "100% remaining", on a job that is 82%
   * certified.
   */
  certifiedPct: number | null;
}

/**
 * The one name for `MoneyPosition.balance`, on every screen that shows it.
 *
 * "Balance remaining" and "Balance still to certify" were the same number
 * under two names on two screens one click apart. The second is the true one
 * — it says WHICH of the two possible balances the figure answers — so it is
 * the one that survives, and it lives here so it cannot drift again.
 */
export const BALANCE_LABEL = "Balance still to certify";

export interface VariationLike {
  status?: string;
  /**
   * `tasks/variation-orders/` carries the value on the variation itself;
   * `tasks/tasks/?taskType=VO` nests it under the assignment task. Both shapes
   * are read so this function does not depend on which route supplied the row.
   */
  grandTotal?: number | null;
  task?: { grandTotal?: number } | null;
  /**
   * `VariationOrder.signed_at` — set only by sign-and-issue
   * (`tasks/views_signing.py`), never by a generic status PATCH. A VO whose
   * `status` was set to Approved without ever being signed is not a real
   * approval; the backend's own ledger (`cost_ledger/signals.py`,
   * `billing/accrual.py::is_vo_approved`) already requires this before it
   * will count a VO as approved, so this figure must match or it silently
   * disagrees with the Cost Ledger showing the same project.
   */
  signedAt?: string | null;
}

const APPROVED_VO = new Set(["done", "approved", "completed"]);

/** The value on a variation, whichever route it arrived by. */
export function variationValue(v: VariationLike): number {
  return v.task?.grandTotal ?? v.grandTotal ?? 0;
}

/**
 * Whether a variation carried a value at all.
 *
 * `variationValue` above coalesces a missing `grand_total` to zero, which is
 * the right shape for a sum and the wrong claim about a variation: an approved
 * VO with no price contributes R0 to the revised contract sum, to the certified
 * percentage and to the certified curve's ceiling, and does it silently. The
 * zero is kept — there is no honest number to substitute — but it is COUNTED,
 * and the count is printed, the way `buildCertificateRun` already prints the
 * certificates it could not date.
 */
export function variationIsPriced(v: VariationLike): boolean {
  const raw = v.task?.grandTotal ?? v.grandTotal;
  return typeof raw === "number" && Number.isFinite(raw);
}

/**
 * **The revised contract sum can count a variation twice, and both screens
 * that print it must say so.**
 *
 * `tasks/views_signing.py::_apply_vo_to_project` adds an approved variation's
 * amount into `project.contract_value` AND leaves the variation's status
 * APPROVED, in one transaction. So a variation signed through that flow is
 * inside both operands of `contractSum + variationsTotal`, and nothing on
 * either payload distinguishes the signed population from the rest — it cannot
 * be corrected client-side, only disclosed.
 *
 * This string lives here, beside the figure, because it was previously stated
 * on Project Health (`projectPosition.ts`) and NOT on Home, which printed the
 * same number — as "certified — N% of R X" and as the certified curve's
 * dashed ceiling — in silence. One caveat, one wording, both screens.
 */
export const REVISED_SUM_DOUBLE_COUNT =
  "May double-count any variation signed through the sign-and-issue flow — the server adds those to the original sum as well.";

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

/**
 * The project's commercial position, from the payloads the page already holds.
 *
 * ── `null` MEANS "COULD NOT BE READ", AND IT IS NOT THE SAME AS `[]` ──────
 *
 * Both list parameters are nullable, and the two states mean different things:
 *
 *   `[]`    the request answered and the project genuinely has none. A project
 *           with no posted certificate has certified NOTHING, and the whole
 *           revised sum is still to certify. That is a real zero.
 *   `null`  the request FAILED, or was never made. Nothing is known. Every
 *           figure that depends on the list is null and the page prints an
 *           em dash.
 *
 * This distinction is the whole of the fix for the strip that fabricated. The
 * hook used to hand this function `[]` on a failed certificate read, so
 * `certified` and `retentionHeld` came back null — correctly — while `balance`
 * quietly computed `revised − 0 − 0` and `certifiedPct` computed 0. The page
 * then rendered "R 10 000 000,00 remaining · 0% certified" on a job that is
 * 82% certified, with nothing but a muted outage line three panels above it to
 * say otherwise. An absent figure is absent, not zero — and a DERIVED figure
 * is only as present as the least present of its inputs.
 *
 * A null variation list nulls the revised contract sum too, and everything
 * built on it. An unknown variation total means an unknown contract sum; the
 * original on its own is a DIFFERENT number, not a safe approximation of it.
 */
export function summariseMoney(
  project: any,
  certificates: CertificateLike[] | null | undefined,
  variations: VariationLike[] | null | undefined,
  /**
   * Manual Cost Ledger credit entries not already represented by a real
   * posted certificate (`linked_pc`/`linked_vo` both null on the ledger row —
   * see `backend/cost_ledger/views.py`'s `summary` action). Added to
   * `certified` so a manual credit counts without double-counting a PC that
   * already has its own auto-generated ledger mirror under a different basis
   * (net_amount, not claim_amount). `null`/`undefined` — the ledger summary
   * couldn't be read, or wasn't asked for — adds nothing, same "absent is not
   * zero" rule as every other input here.
   */
  manualCreditsTotal?: number | null,
  /**
   * Manual Cost Ledger debit entries not already represented by a real
   * approved Variation Order (`linked_pc`/`linked_vo` both null — same source
   * as `manualCreditsTotal`, see `backend/cost_ledger/views.py`'s `summary`
   * action). A cost recorded with no VO/PC link still eats into what's left
   * of the contract, so it comes off `balance` — but NOT off `certified`: a
   * debit is a cost, not a certification. `null`/`undefined` subtracts
   * nothing, same "absent is not zero" rule as every other input here.
   */
  manualDebitsTotal?: number | null,
): MoneyPosition {
  const rawSum = project?.contractValue ?? project?.contract_value;
  const parsedSum = rawSum === null || rawSum === undefined || rawSum === "" ? NaN : Number(rawSum);
  const contractSum = Number.isFinite(parsedSum) && parsedSum > 0 ? parsedSum : null;

  /** True when the list answered. `[]` answered; `null`/`undefined` did not. */
  const certificatesKnown = Array.isArray(certificates);
  const variationsKnown = Array.isArray(variations);

  const approvedVos = (variations ?? []).filter(
    (v) => APPROVED_VO.has((v.status || "").toLowerCase()) && !!v.signedAt,
  );
  const variationsTotal = approvedVos.reduce((s, v) => s + variationValue(v), 0);

  const certifiedCerts = (certificates ?? []).filter(certificateIsCertified);
  const certifiedFromCertificates = certifiedCerts.reduce((s, c) => s + certifiedValueOf(c), 0);
  const certified = certifiedFromCertificates + (manualCreditsTotal ?? 0);
  const retentionHeld = certifiedCerts.reduce((s, c) => s + (c.retentionAmount ?? 0), 0);

  // Original + approved variations. Null on a null original rather than
  // falling back to the variation total on its own, which would present
  // R 1 380 000 of variations as though it were the contract — and null when
  // the variations could not be read at all, because an unknown addend makes
  // an unknown sum.
  const revisedContractSum =
    contractSum === null || !variationsKnown ? null : contractSum + variationsTotal;

  // Every figure below is guarded on the inputs it is built from, not on the
  // shape of the arithmetic. `revisedContractSum !== null` alone is NOT enough
  // for the balance: it says the contract sum is known, and says nothing about
  // whether anything has been certified against it.
  const balance =
    revisedContractSum === null || !certificatesKnown
      ? null
      : revisedContractSum - certified - (manualDebitsTotal ?? 0);

  return {
    contractSum,
    variations: variationsKnown && approvedVos.length > 0 ? variationsTotal : null,
    variationCount: approvedVos.length,
    // Zero when the list did not answer at all: an unread list has no unpriced
    // rows to report, and reporting one would be a fact about nothing.
    variationsUnpriced: variationsKnown
      ? approvedVos.filter((v) => !variationIsPriced(v)).length
      : 0,
    revisedContractSum,
    certified: certificatesKnown && certifiedCerts.length > 0 ? certified : null,
    retentionHeld: certificatesKnown && certifiedCerts.length > 0 ? retentionHeld : null,
    // Revised sum LESS CERTIFIED, and nothing else. Retention is inside the
    // certified figure already — see the field's comment for the server chain
    // that settles it and for the R 410 000 this used to remove twice.
    balance,
    certifiedPct:
      revisedContractSum !== null && revisedContractSum > 0 && certificatesKnown
        ? Math.round((certified / revisedContractSum) * 100)
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
  /** `projects/{id}/payments/` — the only source of a certificate's due date. */
  paymentsFailed: boolean;
  /**
   * `projects/?userId=` — the read the whole page's PROJECT comes from.
   *
   * It was absent from this state, and that absence had teeth. The hook read
   * `projectList.rows` only; a failed or truncated walk yielded an empty list,
   * `project` came back undefined, and `summariseTime(undefined)` reported
   * `hasDates: false` — which the band prints as "No project timeline
   * recorded". A failed read was rendered as a statement about the project,
   * with no banner over it and no source for "Try again" to retry. It is the
   * same class of defect as the fabricated money strip, moved from money to
   * dates.
   */
  projectFailed: boolean;
  /**
   * `projects/{id}/milestones/`, and the same defect: read as `.data` only, so
   * a failure rendered as "No milestones recorded" and as a programme with no
   * drift, rather than as an outage.
   */
  milestonesFailed: boolean;
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
  paymentsFailed: false,
  projectFailed: false,
  milestonesFailed: false,
};

const SOURCE_LABEL: Record<keyof HomeLoadState, string> = {
  tasksFailed: "your tasks",
  meetingsFailed: "your meetings",
  certificatesFailed: "payment certificates",
  variationsFailed: "variation orders",
  timeBarsFailed: "notice deadlines",
  riskFailed: "risk signals",
  obligationsFailed: "contract obligations",
  paymentsFailed: "certificate due dates",
  projectFailed: "this project's own record",
  milestonesFailed: "the programme milestones",
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

// ── The verdict ───────────────────────────────────────────────────────────
//
// The owner's actual complaint about this page was "nothing that tells you
// where we are". Every fix above makes a figure TRUE; none of them makes the
// page say anything. Five figures at equal weight is a report, not an answer,
// and on a healthy project the page draws no coloured element at all — so a
// reader cannot tell "this project is fine" from "I have not been told
// anything".
//
// So the page states one thing outright, at the top, before any panel: the
// single worst fact that is TRUE right now, or the plain statement that there
// is not one.
//
// ── The rules this obeys ─────────────────────────────────────────────────
//
//  1. **One line.** Not a summary, not a list, not a score. If two things are
//     bad, the worse one is named and the other is in the queue below where it
//     already was.
//
//  2. **Nothing is invented.** Every candidate below is a fact already derived
//     elsewhere on this page from a real response — a server-computed days-past-
//     due, a queue item's own clock. There is no severity model here and no
//     weighting: the order of the candidates IS the judgement, and it is the
//     same order `homeQueueRank` already ranks by. This function does not
//     reorder anything and does not call the ranker; it reads the top of a
//     list the ranker has already sorted.
//
//  3. **Silence is never asserted over an outage.** "Nothing is past a
//     contractual date" is a claim about every source. If one of them did not
//     answer, the line says so instead. This is the same discipline the empty
//     queue state already keeps, applied to the one statement on the page that
//     covers the whole of it.
//
//  4. **Colour only for a breach that has already happened** — severity rule 1
//     from `blocks.tsx`. A verdict that names something already past a date is
//     `breach`; a verdict about a deadline still ahead is `pressing` and is
//     achromatic; "nothing is late" and "we cannot tell" are `clear` and
//     `unknown`. The call site decides the ink; this function decides the fact.

export type VerdictTone = "breach" | "pressing" | "clear" | "unknown";

export interface HomeVerdict {
  /** The whole line. One sentence or one clause; never two. */
  text: string;
  /**
   * `text` without its trailing "· N others past a date" clause.
   *
   * The verdict is the page's TITLE now, set at 24px, and the two halves are
   * not the same kind of statement: the lead names one object and is what the
   * reader must read, the tail is a count of things already listed in the
   * queue below. Splitting them lets the title carry the fact at title size
   * and the count ride beside it as small print, instead of putting a
   * subordinate clause into an h1.
   */
  lead: string;
  /** The "· N others…" clause on its own, or null when there is not one. */
  tail: string | null;
  tone: VerdictTone;
  /** Where the fact lives, when it has a page of its own. */
  href?: string;
}

/**
 * The single worst true fact about this project, or the statement that there
 * is not one.
 *
 * `queue` must already be ranked and permission-filtered — it is the very list
 * the panel below renders, so the verdict can never name something the reader
 * is not shown. `worstOverdueDays` and the rest are read off it rather than
 * recomputed.
 */
export function homeVerdict(input: {
  /** Ranked and filtered, exactly as rendered. */
  queue: QueueItem[];
  /** Whether every source this viewer was to be shown actually answered. */
  loadLevel: HomeLoadIssue["level"];
}): HomeVerdict {
  const { queue, loadLevel } = input;

  // ── 1. Something is already past a date ────────────────────────────────
  //
  // `rankQueue` has already put the worst consequence first, so the first
  // overdue row in the list IS the worst overdue row. Forfeiture outranks
  // money, money outranks breach; that ordering is `homeQueueRank`'s and is
  // not restated here.
  const overdue = queue.filter((i) => i.overdue);
  if (overdue.length > 0) {
    const worst = overdue[0];
    const days = worst.daysRemaining === null ? null : Math.abs(worst.daysRemaining);
    const unit = worst.clock === "working" ? " working days" : " days";
    const rest =
      overdue.length > 1
        ? `${overdue.length - 1} other${overdue.length === 2 ? "" : "s"} past a date`
        : null;
    // The server's own phrase where there is one — see `countdownLabel`. It
    // already reads "2 working days overdue", so it replaces the whole clause
    // rather than being spliced into one.
    const lead = worst.countdownLabel
      ? `${worst.headline} — ${worst.countdownLabel}`
      : days === null
        ? `${worst.headline} is past its date`
        : `${worst.headline} — ${days}${unit} past its date`;
    return {
      text: rest === null ? lead : `${lead} · ${rest}`,
      lead,
      tail: rest,
      tone: "breach",
      href: worst.href,
    };
  }

  // ── 2. Nothing has been missed, but something closes imminently ────────
  //
  // `ACT_TODAY_BAND` is the ranker's own threshold for "this needs you today"
  // and is not a second opinion about urgency.
  const acting = queue.filter((i) => bandOf(i) <= ACT_TODAY_BAND);
  if (acting.length > 0) {
    const worst = acting[0];
    const days = worst.daysRemaining;
    const unit = worst.clock === "working" ? " working days" : " days";
    // A row with no clock is in the act-today band on consequence alone, so
    // the line states the consequence and does not invent a countdown.
    //
    // `countdownLabel` again takes precedence, and again is not spliced: it is
    // a complete phrase ("4 working days remaining"), so it follows an em dash
    // rather than being poured into "closes in …".
    const lead = worst.countdownLabel
      ? `${worst.headline} — ${worst.countdownLabel}`
      : `${worst.headline} ${
          days === null
            ? "is waiting on you"
            : days === 0
              ? "closes today"
              : `closes in ${days}${unit}`
        }`;
    const rest = acting.length > 1 ? `${acting.length - 1} more need you today` : null;
    return {
      text: rest === null ? lead : `${lead} · ${rest}`,
      lead,
      tail: rest,
      tone: "pressing",
      href: worst.href,
    };
  }

  // ── 3. Nothing is late, and we are only entitled to say so if we know ──
  if (loadLevel !== "none") {
    const lead = "Some of this project's data could not be read — nothing here says it is on time.";
    return { text: lead, lead, tail: null, tone: "unknown" };
  }

  const clear = "Nothing is past a contractual date.";
  return { text: clear, lead: clear, tail: null, tone: "clear" };
}
