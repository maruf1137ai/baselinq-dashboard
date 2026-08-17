/**
 * The action queue's ranking rule.
 *
 * This file decides what a user sees first on the homepage. Baselinq's premise
 * is that a missed contractual deadline forfeits a claim outright — under JBCC
 * a notice served late is worth nothing regardless of merit — so the order of
 * this list has legal consequence. It is therefore a pure function over plain
 * data, tested without a DOM, and the reasoning is written down here rather
 * than living in someone's head.
 *
 * ── The rule, in one sentence ─────────────────────────────────────────────
 *
 *   Rank by WHAT IS LOST if you do nothing, then by HOW LITTLE TIME is left
 *   to prevent it.
 *
 * Those are two different axes and conflating them is the mistake the previous
 * ranking made. It sorted `overdue` first, then by a fixed order of item kind.
 * That put an overdue internal task above a notice deadline three working days
 * out — which is exactly backwards. The task is late. The notice is about to
 * become worthless. Lateness is recoverable; forfeiture is not.
 *
 * ── Axis 1: consequence ───────────────────────────────────────────────────
 *
 * Five classes, ordered by whether the loss can be undone by acting later:
 *
 *   forfeiture  The right itself is extinguished by the passage of time. A
 *               JBCC notice served on day 21 of a 20-working-day window buys
 *               nothing. Nothing else on this page is irreversible.
 *   money       Payment does not flow. A certificate sitting unsigned, or
 *               rejected back to its author, stops cash. Recoverable by acting
 *               later, but every day of delay is a day of the contractor's
 *               money held.
 *   breach      A contractual obligation is being, or is about to be,
 *               breached — a contractual risk signal, or an obligation
 *               extracted from the contract itself. It creates exposure rather
 *               than destroying a right.
 *   blocking    Someone else cannot proceed until you decide. Meeting actions
 *               awaiting your approval; an invitation you have not answered.
 *               The cost falls on other people's time.
 *   advisory    A commercial guide. Baselinq's own non-contractual risk
 *               signals: worth knowing, never worth interrupting a deadline
 *               for.
 *   own-work    Your own assigned work. Late is late; nothing is forfeited and
 *               nobody else is blocked.
 *
 * ── Axis 2: pressure ──────────────────────────────────────────────────────
 *
 * How close the clock is. Deliberately coarse — five buckets, not a continuous
 * scale — because the ordering must be explainable to a quantity surveyor, and
 * because the difference between 9 and 11 working days is not a difference in
 * what you should do this morning.
 *
 *   expired · critical · soon · later · none
 *
 * `none` means NO CLOCK EXISTS IN THE PAYLOAD, not "no rush". A certificate
 * awaiting certification carries no due date anywhere in
 * `tasks/payment-certificates/`, and treating that absence as "least urgent"
 * would bury the single most valuable thing a principal agent does. This is
 * why the matrix below places `money`/`none` at band 3 and `own-work`/`expired`
 * at band 5: an item with no due date is not automatically last.
 *
 * ── Working days are not calendar days ────────────────────────────────────
 *
 * `days_remaining` on a time bar is computed by the backend on the South
 * African working-day calendar, including public holidays and the builders'
 * break. It is NEVER recomputed here. Everything else in the queue counts
 * calendar days. Each item therefore records which calendar its number is on
 * (`clock`), and the tiebreakers below are arranged so that two numbers are
 * only ever compared when they are on the same calendar — see
 * `CONSEQUENCE_ORDER` and the test that asserts it.
 */

// ── Axes ──────────────────────────────────────────────────────────────────

export type Consequence =
  | "forfeiture"
  | "money"
  | "breach"
  | "blocking"
  | "advisory"
  | "own-work";

export type Pressure = "expired" | "critical" | "soon" | "later" | "none";

/** Which calendar an item's `daysRemaining` is counted on. */
export type Clock = "working" | "calendar" | null;

/**
 * Secondary ordering *within* one band, after consequence.
 *
 * Every consequence class draws its clock from exactly one calendar:
 * `forfeiture` is the only class fed by `days_remaining` (working days), and
 * every other class is fed by a calendar date. Because consequence is compared
 * before `daysRemaining`, two day-counts on different calendars can never meet
 * in a comparison. `homeQueueRank.test.ts` asserts this property directly.
 */
const CONSEQUENCE_ORDER: Record<Consequence, number> = {
  forfeiture: 0,
  money: 1,
  breach: 2,
  blocking: 3,
  advisory: 4,
  "own-work": 5,
};

/**
 * Band = the row you land in. Lower acts first.
 *
 * Reading the interesting cells:
 *
 *  - `forfeiture`/`expired` is band 0 and shares it with nothing. A notice
 *    whose deadline has passed, or passes today, is the only item on this page
 *    where the loss is happening as you read it.
 *
 *  - `forfeiture`/`critical` (band 1) sits above every non-forfeiture item,
 *    including anything overdue. Drafting a notice, having it signed and
 *    delivering it does not fit into five working days with any slack, and
 *    the thing being protected cannot be recovered.
 *
 *  - `forfeiture`/`later` drops to band 5. A notice thirty working days out
 *    does NOT outrank an unsigned certificate: there is nothing to do about it
 *    this morning, and a queue that never de-prioritises anything is a queue
 *    nobody reads. Forfeiture earns its precedence from the clock closing, not
 *    from the category alone.
 *
 *  - `forfeiture`/`none` is band 3, not band 5. An open time bar whose
 *    `days_remaining` the backend could not compute is an UNKNOWN forfeiture
 *    clock, and we must not present unknown as safe. It ranks with live money
 *    and the row says the deadline is undated.
 *
 *  - `money` never has a clock (no certificate endpoint carries a due date),
 *    so `money`/`none` is the live case and sits at band 3.
 *
 *  - `own-work`/`expired` is band 5. An overdue task is genuinely late, and it
 *    is still below every live forfeiture, every unsigned certificate and
 *    every contractual breach. That is the whole point of the rebuild.
 */
const BAND: Record<Consequence, Record<Pressure, number>> = {
  forfeiture: { expired: 0, critical: 1, soon: 2, later: 5, none: 3 },
  money: { expired: 3, critical: 3, soon: 3, later: 4, none: 3 },
  breach: { expired: 3, critical: 3, soon: 4, later: 6, none: 4 },
  blocking: { expired: 4, critical: 4, soon: 6, later: 7, none: 7 },
  advisory: { expired: 6, critical: 6, soon: 7, later: 8, none: 8 },
  "own-work": { expired: 5, critical: 6, soon: 7, later: 8, none: 8 },
};

/** The most urgent band that still counts as "this needs you today". */
export const ACT_TODAY_BAND = 3;

// ── Thresholds ────────────────────────────────────────────────────────────

/**
 * Forfeiture thresholds are in WORKING days and are anchored on JBCC's
 * twenty-working-day notice regime:
 *
 *   <= 0   gone, or going today
 *   <= 5   a quarter of the window left — one site week
 *   <= 10  half the window spent
 *
 * They are not tuned to look good; they are the quarters of the period the
 * contract itself sets.
 */
export const FORFEITURE_CRITICAL_DAYS = 5;
export const FORFEITURE_SOON_DAYS = 10;

/** Calendar thresholds for everything else: this week, next week, later. */
export const CALENDAR_CRITICAL_DAYS = 2;
export const CALENDAR_SOON_DAYS = 7;

/**
 * Pressure from a day count.
 *
 * `days` must come from the source that owns the clock — the backend's
 * `days_remaining` for a time bar, a due date for everything else. It is never
 * derived from a deadline date for a forfeiture clock, because that would
 * silently swap the working-day calendar for a calendar-day one and hand
 * someone four days they do not have over a long weekend.
 */
export function pressureFromDays(days: number | null | undefined, clock: Clock): Pressure {
  if (days === null || days === undefined || !Number.isFinite(days)) return "none";
  if (clock === "working") {
    if (days <= 0) return "expired";
    if (days <= FORFEITURE_CRITICAL_DAYS) return "critical";
    if (days <= FORFEITURE_SOON_DAYS) return "soon";
    return "later";
  }
  if (days < 0) return "expired";
  if (days <= CALENDAR_CRITICAL_DAYS) return "critical";
  if (days <= CALENDAR_SOON_DAYS) return "soon";
  return "later";
}

// ── The item ──────────────────────────────────────────────────────────────

/** A permission the viewer must hold before the row may be built or rendered. */
export type PermissionCode = "finance.view" | "compliance.view";

export type QueueKind =
  | "time-bar"
  | "certificate"
  | "rejected"
  | "risk"
  | "obligation"
  | "meeting-action"
  | "rsvp"
  | "task";

export interface QueueItem {
  key: string;
  kind: QueueKind;
  /** Names the next move, never the state. */
  headline: string;
  /** Clause, date, value or role behind the headline. Null when the API gave none. */
  detail: string | null;
  /** What is lost by doing nothing. Primary ranking axis. */
  consequence: Consequence;
  /** How close the clock is. Secondary ranking axis. */
  pressure: Pressure;
  /** Days left on this item's own clock. Null when the source carries none. */
  daysRemaining: number | null;
  /** Which calendar `daysRemaining` is counted on. Null when there is none. */
  clock: Clock;
  overdue: boolean;
  /** Where the one action goes. Must be a route that exists (see App.tsx). */
  href: string;
  /** The label on that action. One per row, always.  */
  action: string;
  /**
   * When this item started waiting, ISO. Used only as a tiebreaker so the
   * oldest untouched item of an otherwise identical pair surfaces first.
   */
  waitingSince?: string | null;
  /**
   * Intra-band ordering the builder knows and the axes cannot express — e.g.
   * a rejected certificate before an unsigned one, both of which are
   * `money`/`none`. Lower first. Never crosses a band.
   */
  subRank?: number;
  /** Every permission the viewer must hold. Empty means everyone. */
  requires: PermissionCode[];
}

/** The band an item lands in. Exported so a row can explain its own position. */
export function bandOf(item: Pick<QueueItem, "consequence" | "pressure">): number {
  return BAND[item.consequence][item.pressure];
}

/**
 * One ranked list, worst first.
 *
 * Sort key, in order:
 *
 *   1. band              — consequence × pressure, the rule above
 *   2. consequence       — irreversible before recoverable within a band, and
 *                          the guard that keeps working days and calendar days
 *                          out of the same comparison
 *   3. daysRemaining     — nearest clock first; no clock sorts after a clock,
 *                          having already been placed by its band
 *   4. subRank           — builder-declared order inside one class
 *   5. waitingSince      — oldest first; something ignored for a fortnight
 *                          beats something raised this morning
 *   6. key               — stable, so a refetch never reshuffles the list
 */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const band = bandOf(a) - bandOf(b);
    if (band !== 0) return band;

    const consequence = CONSEQUENCE_ORDER[a.consequence] - CONSEQUENCE_ORDER[b.consequence];
    if (consequence !== 0) return consequence;

    const da = a.daysRemaining ?? Number.POSITIVE_INFINITY;
    const db = b.daysRemaining ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;

    const sub = (a.subRank ?? 0) - (b.subRank ?? 0);
    if (sub !== 0) return sub;

    const wa = a.waitingSince ? Date.parse(a.waitingSince) : Number.POSITIVE_INFINITY;
    const wb = b.waitingSince ? Date.parse(b.waitingSince) : Number.POSITIVE_INFINITY;
    if (Number.isFinite(wa) && Number.isFinite(wb) && wa !== wb) return wa - wb;

    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

// ── Reading the queue ─────────────────────────────────────────────────────

export interface QueueSummary {
  total: number;
  /** Items in bands 0–3: things that cost money or rights if today passes. */
  actToday: number;
  /** Items whose own clock has already run out. */
  expired: number;
  /** Open forfeiture clocks, at any distance. The headline number. */
  forfeiture: number;
  /** True when there is work, but none of it is urgent. */
  calm: boolean;
}

/**
 * Empty and calm are different states and the page must be able to tell them
 * apart.
 *
 * A brand-new project has no certificates, no variations and no meetings —
 * that is the COMMON case, and an empty queue there means "nothing is being
 * tracked yet", not "you are clear". A mature project with eleven items none
 * of which is inside a deadline window is genuinely clear, and should read
 * that way rather than as eleven alarms.
 */
export function summariseQueue(items: QueueItem[]): QueueSummary {
  const actToday = items.filter((i) => bandOf(i) <= ACT_TODAY_BAND).length;
  return {
    total: items.length,
    actToday,
    expired: items.filter((i) => i.pressure === "expired").length,
    forfeiture: items.filter((i) => i.consequence === "forfeiture").length,
    calm: items.length > 0 && actToday === 0,
  };
}

/** Drop everything the viewer is not permitted to see. Fails closed. */
export function filterQueueByPermission(
  items: QueueItem[],
  held: { canViewFinance?: boolean; canViewCompliance?: boolean },
): QueueItem[] {
  // Absent flags are FALSE, not "assume yes". `resolveFinanceAccess` already
  // fails closed while the permission map is in flight and this must not undo
  // that: a contractor flashing the employer's certified values for one frame
  // is the bug this defends against.
  const grant: Record<PermissionCode, boolean> = {
    "finance.view": held.canViewFinance === true,
    "compliance.view": held.canViewCompliance === true,
  };
  return items.filter((i) => i.requires.every((code) => grant[code]));
}
