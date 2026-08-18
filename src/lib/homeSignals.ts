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
        // The verb leads and the reference is the third word, so the row is
        // still "Certify PC-006" when it truncates. "— submitted and waiting
        // on you" went: "submitted" is the state the section heading and the
        // verb already imply, and "waiting" is time, which `detail` counts
        // exactly ("In this state for 11 days") rather than gesturing at.
        headline: awaitingCertification ? `Certify ${ref}` : `Post ${ref} to release payment`,
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
        href: ROUTE.certificate(c.id),
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
          // Was "PC-005 was rejected — it needs reworking before it can be
        // certified": sixty-six characters, of which the last forty restate
        // the section heading and the `action`. The verb leads now, which also
        // separates this row from the "Certify PC-005" one at a glance.
        headline: `Rework ${c.pcNumber || `PC-${c.id}`} — it was rejected`,
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
        href: ROUTE.certificate(c.id),
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
   * **A CALENDAR-day count, whatever `unit` says.** Both places the backend
   * writes it — `risk/models_evidence.py:267` and `risk/rules/time_bar.py:37`
   * — compute `(deadline_date - timezone.localdate()).days`, which is plain
   * date subtraction with no working-day calendar applied. See the
   * countdown note above `buildTimeBarQueue`.
   *
   * Null in practice on a bar the backend could not date (see compliance.ts).
   */
  days_remaining?: number | null;
  /**
   * The unit of the NOTICE PERIOD — "working" or "calendar" — not the unit of
   * `days_remaining`. A JBCC clock is a 20-working-day period, so this reads
   * "working", and `deadline_date` is correctly computed from it by
   * `risk/timebars.py::add_working_days`. It says nothing about how the
   * countdown above was counted, and must never be printed against it.
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
 *  1. **The countdown is not in working days, and this file no longer says it
 *     is.** The docblock that used to sit here asserted the opposite — that
 *     `days_remaining` was counted on the South African working-day calendar,
 *     holidays and the builders' break included, and that deriving it locally
 *     "would silently substitute calendar days and hand somebody four days
 *     they do not have over an Easter weekend". That is exactly what shipped.
 *     `risk/models_evidence.py:267` and `risk/rules/time_bar.py:37` both write
 *     `days_remaining = (deadline_date - timezone.localdate()).days`: plain
 *     date subtraction. The row then printed it with `unit`, which is
 *     `"working"` on every JBCC clock, so a deadline six calendar days out —
 *     four working days — rendered as "6 working days left". The overstatement
 *     is about a third in an ordinary week and far more across the
 *     mid-December builders' break, and a JBCC notice served late forfeits the
 *     claim outright.
 *
 *     The client cannot fix the count. South African public holidays, computed
 *     Easter and the per-project builders' break all live server-side in
 *     `risk/timebars.py`, and a browser-side working-day count would be a
 *     second wrong answer rather than a right one. So this file stops
 *     asserting a unit it cannot verify:
 *
 *       - `clock` is published as `null` on every time bar. Its only render
 *         consumer is the chip's unit word in `ActionQueue.tsx:110`, so the
 *         chip now reads "6 days left" — which is TRUE, because the number
 *         genuinely is a calendar-day countdown — instead of "6 working days
 *         left", which is not.
 *       - `deadline_date` is correct (`add_working_days` computes it properly)
 *         and is therefore promoted to the FRONT of the headline. It is the
 *         one temporal value on the row that can be relied on, and it is also
 *         what tells five delay clocks apart.
 *       - The notice PERIOD, which is genuinely in working days, is stated as
 *         such in `detail`: "20 working days from 4 Aug 2026".
 *
 *     Relabelling the unit is deliberately NOT the whole fix — it is the
 *     honest floor while the backend is corrected. `pressureFromDays` is still
 *     given the bar's declared unit, so the working-day thresholds still
 *     apply and the ranking is bit-for-bit what it was: treating a calendar
 *     count against working-day thresholds errs towards urgency, which is the
 *     safe direction to be wrong in while the count itself is wrong.
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
  /** The backend's countdown. Calendar days, whatever `unit` claims. */
  days: number | null;
  /**
   * The unit the notice PERIOD is expressed in — fed to `pressureFromDays` so
   * the thresholds are unchanged, and deliberately never published on the
   * item, because it is not the unit `days` was counted in.
   */
  thresholdClock: Clock;
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
    // Unchanged from the previous revision on purpose: the bar's declared unit
    // still chooses the thresholds, so no row moves band because of this fix.
    pressure: pressureFromDays(days, thresholdClock),
    clause:
      b.clause_verified && b.clause_ref ? `${b.contract_form ?? ""} ${b.clause_ref}`.trim() : null,
    due: due ? `Due ${due}` : null,
    period,
  };
}

/**
 * The headline for one clock: **the date it falls, then what it is.**
 *
 * The deadline date leads for two reasons at once. It is the only temporal
 * value on the row that is computed correctly (see rule 1), so it is the one
 * the reader should be acting on; and it is what tells five clocks of the same
 * kind apart, because they differ by nothing else a person can read. It does
 * not duplicate the chip — the chip counts down, the headline names a date.
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
  return r.due ? `${r.due} — ${r.bar.label}` : r.bar.label;
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
    // Never `r.thresholdClock`. The countdown is in calendar days and the
    // chip must not label it in working ones. See rule 1.
    clock: null,
    overdue: r.days !== null && r.days < 0,
    href: ROUTE.timeBars,
    action: "Open the deadline",
    requires: [] as PermissionCode[],
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
      clock: null,
      overdue: false,
      href: ROUTE.timeBars,
      action: "Open the deadlines",
      requires: [],
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
   * What is left to certify: revised contract sum, less what has been
   * certified, less what is being held back as retention.
   *
   * **This used to be `contractSum - certified`, and that was wrong.** It
   * ignored approved variations, so every approved variation understated the
   * balance by its own value; and it ignored retention, so it counted money
   * that is withheld against defects as though it were still available to
   * certify. On project 45 the two errors ran the same way and the figure was
   * R 970 000 light.
   *
   * Not a forecast and not cost-to-complete.
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

  // Original + approved variations. Null on a null original rather than
  // falling back to the variation total on its own, which would present
  // R 1 380 000 of variations as though it were the contract.
  const revisedContractSum = contractSum === null ? null : contractSum + variationsTotal;

  return {
    contractSum,
    variations: approvedVos.length > 0 ? variationsTotal : null,
    variationCount: approvedVos.length,
    revisedContractSum,
    certified: certifiedCerts.length > 0 ? certified : null,
    retentionHeld: certifiedCerts.length > 0 ? retentionHeld : null,
    // The QS balance: what remains of the revised sum once certified value and
    // retention held are taken off. See the field's comment for what this
    // replaced and by how much it was wrong.
    balance:
      revisedContractSum === null ? null : revisedContractSum - certified - retentionHeld,
    certifiedPct:
      revisedContractSum !== null && revisedContractSum > 0
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
