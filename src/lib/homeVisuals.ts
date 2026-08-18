/**
 * The arithmetic behind the homepage's visual status band, and behind the
 * "What changed" feed beside it.
 *
 * Pure, tested, and out of the components for the same reason `homeSignals.ts`,
 * `homeQueueRank.ts` and `homeIndicators.ts` are: a shape that will be read as
 * a commercial or programme position should be checkable without mounting a
 * page.
 *
 * ── The one rule this file exists to enforce ──────────────────────────────
 *
 * **A series must declare its own incompleteness.** Every builder below
 * returns, beside its plotted points, a count of the records it could NOT
 * plot and why. A chart drawn from six of nine certificates is not wrong
 * because it shows six; it is wrong because it does not say "three are
 * undated". So:
 *
 *   `buildCertifiedCurve`      → `undated`, `inFlight`
 *   `summariseMilestoneDrift`  → `untracked`
 *   `summariseChangePosition`  → `undated`
 *   `buildChangeFeed`          → `undatedCount`
 *
 * Four files were deleted from `src/components/` in the same change that
 * added this one — `BudgetBreakdownCard`, `OverviewChart`,
 * `ProjectTimelineCard` and `ui/chart` — because between them they invented a
 * category split out of `FALLBACK_RATIOS`, plotted a hardcoded Jan–Jul array,
 * and printed elapsed calendar time as "% Complete". That is the failure mode
 * this file is written against.
 *
 * ── What is NOT here, and will not be ─────────────────────────────────────
 *
 * There is no function for any of these, because the backend holds nothing
 * they could be computed from. Each was checked against the schema, not
 * assumed:
 *
 *  - **Committed cost, and forecast / cost-to-complete / EAC.** There is no
 *    purchase-order model and no forecast field anywhere in the backend. Two
 *    of Procore's four budget bars are therefore unbuildable, and a plotted
 *    zero would read as "nothing committed" rather than "not recorded".
 *  - **Budget by category.** `CostLedgerEntry` carries eight categories, but
 *    it is an ACTUALS ledger. Budget is two scalar columns on `Project`
 *    (`total_budget`, `contract_value`) and nothing allocates either across
 *    categories. "Actual spend by category" would be honest; "budget by
 *    category" would be a lie with a legend on it.
 *  - **Planned-versus-actual progress, and any planned S-curve.** No
 *    valuation schedule exists. The certified curve below is therefore an
 *    ACTUAL only — it has no planned twin and must never be drawn as though
 *    the ceiling line were one.
 *  - **A project percent-complete.** `Milestone.percent_complete` is nullable,
 *    human-entered and expected to be null; the server's own `risk/gates.py`
 *    returns `None` rather than guess. `summariseMilestoneDrift` measures
 *    DATES against BASELINE DATES and never touches that field.
 */

import type { CertificateRun } from "./homeIndicators";
import { ROUTE, riskSignalHref, type TimePosition } from "./homeSignals";
import type { PermissionCode } from "./homeQueueRank";

// ── Shared helpers ────────────────────────────────────────────────────────

/** Epoch ms for an ISO date, or null. Never throws, never guesses. */
const ms = (iso: string | null | undefined): number | null => {
  if (typeof iso !== "string" || iso.trim() === "") return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Both dates floored to their own local midnight, then differenced in days. */
const dayDiff = (fromIso: string, toIso: string): number | null => {
  const a = ms(fromIso);
  const b = ms(toIso);
  if (a === null || b === null) return null;
  const floor = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.round((floor(b) - floor(a)) / 86_400_000);
};

// ── 1. The contract timeline ──────────────────────────────────────────────

/**
 * A point on the contract axis.
 *
 * `at` is a fraction of the axis, 0 to 1. It is a POSITION IN CALENDAR TIME
 * and nothing else — see the warning on `ContractTimeline` below.
 */
export interface TimelineMark {
  key: "start" | "original" | "completion" | "today";
  label: string;
  date: string;
  at: number;
}

/** A stretch of the axis with a name — an extension granted, or an overrun. */
export interface TimelineSpan {
  key: "extension" | "overrun";
  from: number;
  to: number;
  days: number;
}

/**
 * The contract clock, as an axis rather than as four numbers.
 *
 * ── Why this is an AXIS and not a progress bar ────────────────────────────
 *
 * This is the single most dangerous shape on the page, and the distinction is
 * worth stating precisely because a deleted file got it wrong.
 * `ProjectTimelineCard.tsx` drew a FILLED bar from start to today and labelled
 * the fill as progress: on a project where nothing had been built, the bar
 * read half full at the halfway date. That is elapsed calendar time wearing
 * physical progress's clothes, and Baselinq records no measure of what has
 * been built.
 *
 * So there is no `fill` on this shape and the renderer draws none. What it
 * draws is a DATED AXIS with labelled marks on it — the same thing a wall
 * calendar with four pins in it draws. `todayAt` is where today falls between
 * the two dates, which is a fact about the calendar, not a claim about the
 * works.
 *
 * The two SPANS are different, and they may be filled, because each is a
 * quantity in its own right rather than a proportion of an unknown whole:
 *
 *   `extension`  the days a signed variation moved the completion date by.
 *                A recorded fact, not a breach — `contract_end_date` is
 *                mutated by the server when a VO granting an extension of
 *                time is signed. It carries no severity colour.
 *   `overrun`    today, past the live completion date. This one HAS already
 *                happened, so under the page's severity rule it is the one
 *                element here entitled to colour.
 *
 * ── The axis domain ───────────────────────────────────────────────────────
 *
 * `start` to `contractEnd`, extended to today when today is past completion —
 * otherwise the overrun would fall off the right-hand end and the one thing
 * worth seeing would be the one thing invisible.
 *
 * Fields: `Project.start_date`, `Project.end_date` (the date originally
 * agreed) and `Project.contract_end_date` (the live one), all nullable, all
 * read through `summariseTime`.
 */
export interface ContractTimeline {
  /** False when the project has no start, or no completion date to run to. */
  hasAxis: boolean;
  marks: TimelineMark[];
  extension: TimelineSpan | null;
  overrun: TimelineSpan | null;
  /** Today's position on the axis, 0 to 1. Null before the start date. */
  todayAt: number | null;
}

const NO_TIMELINE: ContractTimeline = {
  hasAxis: false,
  marks: [],
  extension: null,
  overrun: null,
  todayAt: null,
};

export function buildContractTimeline(
  time: TimePosition,
  now: Date = new Date(),
): ContractTimeline {
  const startMs = ms(time.start);
  const endMs = ms(time.contractEnd);
  // An axis needs both ends. One date alone is a figure, not a scale, and the
  // caller falls back to printing it as a figure.
  if (startMs === null || endMs === null || endMs <= startMs) return NO_TIMELINE;

  const todayMs = now.getTime();
  // Extend the domain past completion only when today is past it, so an
  // overrun is drawn inside the axis rather than clipped off its end.
  const domainEnd = Math.max(endMs, todayMs);
  const span = domainEnd - startMs;
  const at = (t: number) => Math.min(1, Math.max(0, (t - startMs) / span));

  const marks: TimelineMark[] = [
    { key: "start", label: "Start", date: time.start!, at: 0 },
  ];

  // The originally-agreed date is only worth a mark when it differs from the
  // live one. Where no extension has been granted the two are the same date
  // and two pins in one place is noise.
  const originalMs = ms(time.originalEnd);
  const extended =
    originalMs !== null && time.extensionDays !== null && time.extensionDays > 0 && originalMs < endMs;

  if (extended) {
    marks.push({
      key: "original",
      label: "Originally due",
      date: time.originalEnd!,
      at: at(originalMs!),
    });
  }

  marks.push({
    key: "completion",
    label: extended ? "Extended completion" : "Completion",
    date: time.contractEnd!,
    at: at(endMs),
  });

  // Before the start date there is no "today" on this axis to mark.
  const todayAt = todayMs < startMs ? null : at(todayMs);
  if (todayAt !== null) {
    marks.push({
      key: "today",
      label: "Today",
      date: new Date(todayMs).toISOString(),
      at: todayAt,
    });
  }

  const extension: TimelineSpan | null =
    extended && time.extensionDays !== null
      ? { key: "extension", from: at(originalMs!), to: at(endMs), days: time.extensionDays }
      : null;

  const overrun: TimelineSpan | null =
    todayMs > endMs
      ? {
          key: "overrun",
          from: at(endMs),
          to: 1,
          days: Math.abs(dayDiff(time.contractEnd!, new Date(todayMs).toISOString()) ?? 0),
        }
      : null;

  return { hasAxis: true, marks, extension, overrun, todayAt };
}

// ── 2. Milestone drift against baseline ───────────────────────────────────

/** The subset of `Milestone` this reads. Every field is on the serializer. */
export interface MilestoneLike {
  _id?: string | number;
  name?: string | null;
  /** `Milestone.end_date` — NOT NULL on the model. The live planned finish. */
  endDate?: string | null;
  /** `Milestone.baseline_end` — nullable. Null means "not tracked". */
  baselineEnd?: string | null;
  /** `Milestone.actual_end` — nullable. Set once the milestone finishes. */
  actualEnd?: string | null;
  status?: string | null;
}

export interface MilestoneDriftRow {
  id: string;
  name: string;
  baselineEnd: string;
  /** `actualEnd` where the milestone has finished, else the live `endDate`. */
  liveEnd: string;
  /** Positive = later than baseline. Negative = earlier. */
  slipDays: number;
  /** True when `liveEnd` is a recorded actual rather than a current plan. */
  isActual: boolean;
}

/**
 * How far the programme has moved from its baseline.
 *
 * **Dates only.** `Milestone.percent_complete` is nullable, human-entered and
 * expected to be null, and is not read here at all. What IS read is
 * `baseline_end` against `actual_end ?? end_date` — a date against a date,
 * which is a fact either way.
 *
 * `untracked` is the disclosure and the caller must print it: a milestone with
 * no `baseline_end` has never been baselined, so it cannot slip and cannot be
 * counted as on time either. Reporting "0 slipped" across a programme where
 * nine of ten milestones are unbaselined would be the same lie as plotting six
 * of nine certificates without saying so.
 */
export interface MilestoneDrift {
  /** Milestones carrying a `baselineEnd` — the only ones drift can be read on. */
  tracked: number;
  /** Milestones with no `baselineEnd`. Not slipped, not on time. Unknown. */
  untracked: number;
  /** Tracked milestones finishing (or now planned) later than baseline. */
  slipped: number;
  /** Tracked milestones at or ahead of baseline. */
  onOrAhead: number;
  /** The largest positive slip in days, or null when nothing has slipped. */
  worstSlipDays: number | null;
  /** Slipped first and worst-first, then the rest. Whole programme. */
  rows: MilestoneDriftRow[];
}

const NO_DRIFT: MilestoneDrift = {
  tracked: 0,
  untracked: 0,
  slipped: 0,
  onOrAhead: 0,
  worstSlipDays: null,
  rows: [],
};

export function summariseMilestoneDrift(milestones: MilestoneLike[]): MilestoneDrift {
  if (!Array.isArray(milestones) || milestones.length === 0) return NO_DRIFT;

  let untracked = 0;
  const rows: MilestoneDriftRow[] = [];

  milestones.forEach((m, i) => {
    const baselineEnd = typeof m.baselineEnd === "string" && m.baselineEnd.trim() !== "" ? m.baselineEnd : null;
    // `actual_end` is the truth once it exists; before that the live
    // `end_date` is the current plan and is the honest thing to compare.
    const isActual = typeof m.actualEnd === "string" && m.actualEnd.trim() !== "";
    const liveEnd = isActual ? m.actualEnd! : (typeof m.endDate === "string" && m.endDate.trim() !== "" ? m.endDate : null);

    if (baselineEnd === null || liveEnd === null) {
      untracked += 1;
      return;
    }
    const slipDays = dayDiff(baselineEnd, liveEnd);
    if (slipDays === null) {
      untracked += 1;
      return;
    }
    rows.push({
      id: String(m._id ?? i),
      name: (m.name ?? "").trim() || "Unnamed milestone",
      baselineEnd,
      liveEnd,
      slipDays,
      isActual,
    });
  });

  const slipped = rows.filter((r) => r.slipDays > 0);

  return {
    tracked: rows.length,
    untracked,
    slipped: slipped.length,
    onOrAhead: rows.length - slipped.length,
    worstSlipDays: slipped.length > 0 ? Math.max(...slipped.map((r) => r.slipDays)) : null,
    // Worst slip first — the reader's question is "what is late", and rank
    // inside the list is carried by position rather than by a chip per row.
    rows: [...rows].sort((a, b) => b.slipDays - a.slipDays),
  };
}

// ── 3. The certified curve ────────────────────────────────────────────────

export interface CurvePoint {
  /** `PaymentCertificate.certificate_date`. Never null — undated are excluded. */
  date: string;
  /** Running total of POSTED certificates at this date. */
  cumulative: number;
  ref: string;
}

/**
 * Certified value over time — the one genuine S-curve Baselinq can draw.
 *
 * Built on `buildCertificateRun`, which was written, tested and left without a
 * caller. Its guarantees are the ones that make this plottable at all:
 * ordering is by `certificate_date` rather than by id or certificate number,
 * and `cumulative` is null on anything not POSTED, so the running total never
 * includes value no principal agent has signed.
 *
 * ── The two disclosures, and why they are not optional ────────────────────
 *
 * `certificate_date` is NULLABLE on the model — in fact every date on a
 * payment certificate is nullable. An undated certificate cannot be placed on
 * a time axis, so it is excluded from `points` and counted in `undated`, and
 * the caller prints that count. `inFlight` is the same disclosure for value:
 * submitted and approved certificates are real money in motion that the curve
 * deliberately does not include, because it is not certified yet.
 *
 * ── The ceiling ───────────────────────────────────────────────────────────
 *
 * `ceiling` is the REVISED contract sum — original plus approved variations —
 * which is what the works are being carried out for and what the server's own
 * over-certification check uses. It is a reference line and nothing more.
 * **It is not a planned curve.** No valuation schedule exists in the backend,
 * so there is no planned S-curve to draw, and a flat line must never be
 * presented as one.
 */
export interface CertifiedCurve {
  points: CurvePoint[];
  /** Certificates with no `certificate_date`, so not placeable on the axis. */
  undated: number;
  /** Submitted or approved value — real, in motion, deliberately not plotted. */
  inFlight: number | null;
  /** Revised contract sum, or null when the original sum is unknown. */
  ceiling: number | null;
  /** The last cumulative value on the curve. */
  latest: number | null;
  /** Certified past the revised contract sum. A breach that has happened. */
  overCeiling: boolean;
}

const NO_CURVE: CertifiedCurve = {
  points: [],
  undated: 0,
  inFlight: null,
  ceiling: null,
  latest: null,
  overCeiling: false,
};

export function buildCertifiedCurve(
  run: CertificateRun | null | undefined,
  revisedContractSum: number | null,
): CertifiedCurve {
  if (!run || !Array.isArray(run.entries) || run.entries.length === 0) {
    return { ...NO_CURVE, ceiling: revisedContractSum };
  }

  const points: CurvePoint[] = run.entries
    .filter((e) => e.date !== null && e.cumulative !== null)
    .map((e) => ({ date: e.date as string, cumulative: e.cumulative as number, ref: e.ref }));

  const latest = points.length > 0 ? points[points.length - 1].cumulative : null;

  return {
    points,
    undated: run.undated,
    inFlight: run.inFlight,
    ceiling: revisedContractSum,
    latest,
    overCeiling:
      latest !== null && revisedContractSum !== null && revisedContractSum > 0 && latest > revisedContractSum,
  };
}

// ── 4. Change against the contract ────────────────────────────────────────

/** The subset of a variation record this reads. */
export interface ChangeVariationLike {
  status?: string | null;
  value?: number | null;
  /** `VariationOrder.date_instructed` — NULLABLE on the model. */
  dateInstructed?: string | null;
}

/**
 * Where change stands against the original contract sum.
 *
 * ── The tolerance, and the sentence that must go with it ──────────────────
 *
 * `tolerancePct` comes off the server's own `VO_TOLERANCE_BREACH` risk signal
 * (`risk/rules/vo_tolerance.py`), from `detail.tolerance_pct`. Two things
 * follow from where it comes from, and both are load-bearing:
 *
 *  1. **It is only known when the signal has FIRED.** The rule emits nothing
 *     below the threshold, so on a healthy project there is no
 *     `tolerance_pct` on any payload and `tolerancePct` is null. The caller
 *     must therefore draw the tolerance mark only when it has one, and must
 *     not substitute a default — the rule's own fallback of 10% is a policy
 *     default, not this project's policy.
 *
 *  2. **It is NOT a contract breach.** The rule sets `contractual: False`
 *     deliberately and says why: it is a commercial and underwriting
 *     heuristic, and no JBCC, NEC, FIDIC or GCC clause is breached at 10%.
 *     Under this page's severity rule — only a breach that has already
 *     happened may carry colour — `pastTolerance` therefore gets NO severity
 *     colour, and the caller words it as a tolerance, never as a breach. The
 *     genuinely contractual ceiling is the principal agent's mandate, which
 *     is a different signal (`VO_MANDATE_BREACH`, `contractual: True`).
 */
export interface ChangePosition {
  /** Approved variation value. `summariseMoney`'s figure, passed through. */
  approvedValue: number | null;
  /** Original contract sum — `Project.contract_value`, pre-variation. */
  originalSum: number | null;
  /** Approved value as a percentage of the original sum. */
  pctOfOriginal: number | null;
  /** From the server's fired VO_TOLERANCE_BREACH signal. Null when unfired. */
  tolerancePct: number | null;
  /** Past the underwriting tolerance. NOT a contract breach — see above. */
  pastTolerance: boolean;
  /** Variations with no `date_instructed`. The disclosure. */
  undated: number;
  total: number;
}

/** Statuses meaning value is committed. Matches the server's own set. */
const CHANGE_APPROVED = new Set(["approved", "closed"]);

export function summariseChangePosition(
  variations: ChangeVariationLike[],
  originalSum: number | null,
  approvedValue: number | null,
  tolerancePct: number | null,
): ChangePosition {
  const list = Array.isArray(variations) ? variations : [];

  const undated = list.filter(
    (v) => typeof v.dateInstructed !== "string" || v.dateInstructed.trim() === "",
  ).length;

  const pctOfOriginal =
    approvedValue !== null && originalSum !== null && originalSum > 0
      ? Math.round((approvedValue / originalSum) * 1000) / 10
      : null;

  return {
    approvedValue,
    originalSum,
    pctOfOriginal,
    tolerancePct,
    pastTolerance:
      pctOfOriginal !== null && tolerancePct !== null && tolerancePct > 0 && pctOfOriginal > tolerancePct,
    undated,
    total: list.length,
  };
}

/**
 * Variation VALUE by contractual status, with the count alongside.
 *
 * ── Why value and not count ───────────────────────────────────────────────
 *
 * This started as a count split and that made a R50 000 variation and a
 * R5 000 000 one the same width, which is precisely backwards for the
 * question the zone is asked: **how much change is still undecided.** Value
 * answers it; a count answers "how many pieces of paper".
 *
 * `count` is kept because it is the honest denominator for the value and
 * because a value can be null. `value` is null-safe: a variation whose
 * `grand_total` never arrived contributes to `count` and not to `value`, and
 * `valuedCount` says how many of the count the value actually covers, so the
 * caller can disclose the gap instead of drawing a short bar as a whole one.
 */
export interface ChangeStatusSlice {
  key: "approved" | "outstanding" | "draft" | "rejected";
  label: string;
  count: number;
  /** Summed `grand_total` for this status. Null when none carried one. */
  value: number | null;
  /** How many of `count` contributed a value. */
  valuedCount: number;
}

const CHANGE_DRAFT = new Set(["draft"]);
const CHANGE_REJECTED = new Set(["rejected", "declined", "cancelled"]);

export function splitChangeByStatus(variations: ChangeVariationLike[]): ChangeStatusSlice[] {
  const list = Array.isArray(variations) ? variations : [];
  const norm = (s: string | null | undefined) => (s ?? "").toString().trim().toLowerCase();

  const bucket = () => ({ count: 0, value: 0, valuedCount: 0 });
  const acc: Record<string, ReturnType<typeof bucket>> = {
    approved: bucket(),
    outstanding: bucket(),
    draft: bucket(),
    rejected: bucket(),
  };

  for (const v of list) {
    const st = norm(v.status);
    const key = CHANGE_APPROVED.has(st)
      ? "approved"
      : CHANGE_DRAFT.has(st)
        ? "draft"
        : CHANGE_REJECTED.has(st)
          ? "rejected"
          // Submitted / Under Review / Priced / Recommended, and the
          // assignment task's todo / in review. Somebody is waiting.
          : "outstanding";
    acc[key].count += 1;
    const n = typeof v.value === "number" ? v.value : Number(v.value);
    if (Number.isFinite(n) && n !== 0) {
      acc[key].value += n;
      acc[key].valuedCount += 1;
    }
  }

  const slice = (key: ChangeStatusSlice["key"], label: string): ChangeStatusSlice => ({
    key,
    label,
    count: acc[key].count,
    // Null rather than zero: "no variation in this status carried a value" and
    // "these variations are worth nothing" are different statements.
    value: acc[key].valuedCount > 0 ? acc[key].value : null,
    valuedCount: acc[key].valuedCount,
  });

  return [
    slice("approved", "Approved"),
    slice("outstanding", "Awaiting decision"),
    slice("draft", "Draft"),
    slice("rejected", "Rejected"),
  ];
}

// ── 5. What changed ───────────────────────────────────────────────────────

export type ChangeEventKind =
  | "certificate"
  | "variation"
  | "notice"
  | "milestone"
  | "meeting"
  | "task"
  | "obligation"
  | "risk";

/**
 * One thing that moved, recently, that this viewer is entitled to know about.
 *
 * ── Why this is built from what the page already fetched ──────────────────
 *
 * The obvious implementation is an activity endpoint, and there isn't one.
 * The backend has no `django-simple-history` and no generic audit model
 * spanning the app. The two append-only histories that WOULD serve this —
 * `PaymentCertificateAudit` and `MilestoneDateChange` — exist as models with
 * the right ordering indexes and have **no HTTP surface at all**; they would
 * need new views, which is a backend change and out of scope here.
 *
 * So the feed is assembled client-side from the payloads `useHomeData` has
 * already requested, each carrying its own `updated_at` or a workflow
 * timestamp. That has one property worth more than the convenience: **it
 * introduces no new fetch and therefore no new permission surface.** Every
 * event inherits the gate of the endpoint it came from, declared in `requires`
 * and enforced by `filterChangeFeed`, which is `filterQueueByPermission`'s
 * rule applied to a second list.
 *
 * ── Its limit, stated rather than hidden ──────────────────────────────────
 *
 * `updated_at` says a row moved; it does not say WHAT changed on it. So an
 * event here is worded as "PC-006 was certified" where a workflow timestamp
 * makes the transition explicit, and as "VO-014 was updated" where only
 * `updated_at` is available. It never invents the specific field that moved.
 */
export interface ChangeEvent {
  key: string;
  kind: ChangeEventKind;
  /** What moved. Names the object and the movement, never a bare status. */
  headline: string;
  /** Reference, value or clause behind it. Null when the payload gave none. */
  detail: string | null;
  /** ISO timestamp the event is ordered by. */
  at: string;
  /** Where the reader goes to see it. */
  href: string;
  requires: PermissionCode[];
}

const iso = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" && Number.isFinite(new Date(v).getTime()) ? v : null;

/**
 * The payload shapes the feed reads, one per source.
 *
 * Each is the narrowest thing that source must supply, and each accepts BOTH
 * casings, because this app's responses are not consistent about it: the
 * `project` and `tasks` apps serialise camelCase, while the `risk` app returns
 * hand-built dicts with raw field names (see the note on `ProgrammeBaseline`
 * in `useMilestones.ts`). Reading only one casing silently produced an empty
 * feed rather than a visible error.
 */
export interface CertificateChangeLike {
  id: number | string;
  pcNumber?: string | null;
  postedAt?: string | null;
  posted_at?: string | null;
  approvedAt?: string | null;
  approved_at?: string | null;
  submittedAt?: string | null;
  submitted_at?: string | null;
  rejectedAt?: string | null;
  rejected_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

export interface VariationChangeLike {
  id?: number | string;
  ref?: string | null;
  voNumber?: string | null;
  vo_number?: string | null;
  approvedAt?: string | null;
  approved_at?: string | null;
  dateInstructed?: string | null;
  date_instructed?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

export interface NoticeChangeLike {
  id: number | string;
  label?: string | null;
  status?: string | null;
  clause_ref?: string | null;
  served_at?: string | null;
  servedAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
}

export interface MilestoneChangeLike extends MilestoneLike {
  id?: number | string;
  baseline_end?: string | null;
  actual_end?: string | null;
  end_date?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

export interface MeetingChangeLike {
  id: number | string;
  title?: string | null;
  artefact_status?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

export interface TaskChangeLike {
  id: string | number;
  title?: string | null;
  type?: string | null;
  status?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

/**
 * The most recent timestamp on a certificate, and what it means.
 *
 * Workflow timestamps are preferred over `updated_at` because they name the
 * transition — `posted_at` means "was certified", where `updated_at` means
 * only "something on this row moved". All of them are nullable.
 */
function certificateEvent(c: CertificateChangeLike): ChangeEvent | null {
  const ref = c.pcNumber || `PC-${c.id}`;
  // POSTED ONLY, and this is the same rule the notices and tasks follow.
  //
  // Every other certificate state is a QUEUE ROW: `buildCertificateQueue`
  // asks the reader to certify a submitted one and to post an approved one,
  // and `buildRejectedCertificateQueue` asks them to deal with a rejected one.
  // Repeating those here made the feed a second copy of the queue sitting
  // beside it, which is how the panel stops being read at all. Posting is the
  // one certificate transition that closes the loop and is therefore news.
  const at = iso(c.postedAt ?? c.posted_at);
  if (!at) return null;

  return {
    key: `cert-${c.id}`,
    kind: "certificate",
    headline: `${ref} was certified`,
    detail: null,
    at,
    href: ROUTE.certificate(c.id),
    requires: ["finance.view"],
  };
}

export function buildCertificateChanges(certificates: CertificateChangeLike[]): ChangeEvent[] {
  return (Array.isArray(certificates) ? certificates : [])
    .map(certificateEvent)
    .filter(Boolean) as ChangeEvent[];
}

export function buildVariationChanges(variations: VariationChangeLike[]): ChangeEvent[] {
  return (Array.isArray(variations) ? variations : [])
    .map((v) => {
      const ref = v.ref || v.voNumber || v.vo_number || null;
      // `approved_at` names the transition; `date_instructed` names the
      // instruction. Both nullable, so `updated_at` is the fallback and is
      // worded as the weaker claim it is.
      const approvedAt = iso(v.approvedAt ?? v.approved_at);
      const instructed = iso(v.dateInstructed ?? v.date_instructed);
      const at = approvedAt ?? instructed ?? iso(v.updatedAt ?? v.updated_at);
      if (!at) return null;
      const verb = approvedAt ? "was approved" : instructed ? "was instructed" : "was updated";
      return {
        key: `vo-${v.id ?? ref ?? at}`,
        kind: "variation" as const,
        headline: `${ref ?? "A variation"} ${verb}`,
        detail: null,
        at,
        href: ref ? ROUTE.variation(ref) : ROUTE.variations,
        requires: ["finance.view"] as PermissionCode[],
      };
    })
    .filter(Boolean) as ChangeEvent[];
}

/**
 * Notice deadlines that have MOVED — served, lapsed or cancelled.
 *
 * An open time bar is not a change, it is a standing obligation, and it is
 * already the highest-ranked row of the action queue. Only a clock that has
 * stopped belongs in a feed of what changed.
 */
export function buildNoticeChanges(timeBars: NoticeChangeLike[]): ChangeEvent[] {
  return (Array.isArray(timeBars) ? timeBars : [])
    .map((t) => {
      const status = (t.status ?? "").toString().toLowerCase();
      if (status === "open") return null;
      const at = iso(t.served_at ?? t.servedAt) ?? iso(t.updated_at ?? t.updatedAt);
      if (!at) return null;
      const verb = status === "served" ? "was served" : status === "lapsed" ? "lapsed" : "was cancelled";
      return {
        key: `bar-${t.id}`,
        kind: "notice" as const,
        headline: `${t.label ?? "A notice deadline"} ${verb}`,
        detail: t.clause_ref || null,
        at,
        href: ROUTE.timeBars,
        requires: [] as PermissionCode[],
      };
    })
    .filter(Boolean) as ChangeEvent[];
}

/**
 * Milestones whose dates have moved away from baseline.
 *
 * `MilestoneDateChange` is the append-only record of exactly this and has no
 * endpoint, so the movement is inferred from the milestone's own
 * `baseline_end` against its live end and ordered by `updated_at`. That is
 * weaker — it says the row moved, not when the dates did — and it is worded
 * accordingly.
 */
export function buildMilestoneChanges(milestones: MilestoneChangeLike[]): ChangeEvent[] {
  return (Array.isArray(milestones) ? milestones : [])
    .map((m) => {
      const at = iso(m.updatedAt ?? m.updated_at);
      const baselineEnd = iso(m.baselineEnd ?? m.baseline_end);
      const liveEnd = iso(m.actualEnd ?? m.actual_end) ?? iso(m.endDate ?? m.end_date);
      if (!at || !baselineEnd || !liveEnd) return null;
      const slip = dayDiff(baselineEnd, liveEnd);
      if (slip === null || slip === 0) return null;
      return {
        key: `ms-${m._id ?? m.id}`,
        kind: "milestone" as const,
        headline: `${(m.name ?? "A milestone").toString().trim() || "A milestone"} is ${Math.abs(slip)} day${Math.abs(slip) === 1 ? "" : "s"} ${slip > 0 ? "later" : "earlier"} than baseline`,
        detail: null,
        at,
        href: ROUTE.milestone(m._id ?? m.id),
        requires: [] as PermissionCode[],
      };
    })
    .filter(Boolean) as ChangeEvent[];
}

/** Meetings whose notes have landed — the decisions are readable from now on. */
export function buildMeetingChanges(meetings: MeetingChangeLike[]): ChangeEvent[] {
  return (Array.isArray(meetings) ? meetings : [])
    .map((m) => {
      if ((m.artefact_status ?? "") !== "notes_ready") return null;
      const at = iso(m.updated_at ?? m.updatedAt);
      if (!at) return null;
      return {
        key: `meet-${m.id}`,
        kind: "meeting" as const,
        headline: `Notes are ready for ${m.title ?? "a meeting"}`,
        detail: null,
        at,
        href: ROUTE.meeting(m.id),
        requires: [] as PermissionCode[],
      };
    })
    .filter(Boolean) as ChangeEvent[];
}

/** Tasks and RFIs that were closed. An open task is queue work, not news. */
export function buildTaskChanges(tasks: TaskChangeLike[]): ChangeEvent[] {
  return (Array.isArray(tasks) ? tasks : [])
    .map((t) => {
      const status = (t.status ?? "").toString().toLowerCase();
      if (status !== "done" && status !== "closed") return null;
      const at = iso(t.updatedAt ?? t.updated_at);
      if (!at) return null;
      return {
        key: `task-${t.id}`,
        kind: "task" as const,
        headline: `${t.title || "A task"} was closed`,
        detail: t.type ?? null,
        at,
        href: ROUTE.task(String(t.id)),
        requires: [] as PermissionCode[],
      };
    })
    .filter(Boolean) as ChangeEvent[];
}

// ── Risk signals are NOT in this feed, deliberately ───────────────────────
//
// A `buildRiskChanges` was written and then deleted, because on the page it
// renders into, `RiskConditionBlock` sits DIRECTLY ABOVE this panel and lists
// exactly the same rules. Measured on the real layout, the feed repeated the
// risk panel almost line for line — "Envelope is past its baseline finish"
// from the register above, then "Envelope is 18 days later than baseline"
// from the milestone below, then "VO-003 particulars due in 4 working days",
// which is ALSO the first row of the queue in the left-hand column. One fact,
// three panels.
//
// So the rule that governs this feed is stated once and applied everywhere:
// **an item that is already somewhere else on this page does not appear
// here.** Risk signals are the register; open notices, open tasks and
// certificates awaiting the reader are the queue; what is left — and what
// this panel is for — is the record of things that have MOVED.

/**
 * The feed, newest first, with everything the viewer may not see removed.
 *
 * Identical rule to `filterQueueByPermission`, and identical failure mode
 * defended against: an absent flag is FALSE, never "assume yes", so a viewer
 * whose permission map is still in flight is served nothing rather than one
 * frame of the employer's certified values.
 */
export interface ChangeFeed {
  events: ChangeEvent[];
  /** Records dropped for having no usable timestamp. The disclosure. */
  undatedCount: number;
}

export function buildChangeFeed(
  groups: ChangeEvent[][],
  held: { canViewFinance?: boolean; canViewCompliance?: boolean },
  options: { limit?: number; undatedCount?: number } = {},
): ChangeFeed {
  const grant: Record<PermissionCode, boolean> = {
    "finance.view": held.canViewFinance === true,
    "compliance.view": held.canViewCompliance === true,
  };

  const events = groups
    .flat()
    .filter((e) => e.requires.every((code) => grant[code]))
    .sort((a, b) => (ms(b.at) ?? 0) - (ms(a.at) ?? 0))
    .slice(0, options.limit ?? 6);

  return { events, undatedCount: options.undatedCount ?? 0 };
}
