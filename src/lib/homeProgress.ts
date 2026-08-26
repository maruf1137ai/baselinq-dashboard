/**
 * Cost-vs-progress curves for the two discipline groups on the homepage —
 * Construction, and Professional (architectural + engineering + quantity
 * surveying + other, pooled).
 *
 * ── Why this is not in `homeVisuals.ts` ───────────────────────────────────
 *
 * `homeVisuals.ts` is built entirely on `GET tasks/payment-certificates/`
 * and `GET projects/{id}/milestones/` (dates only — see its own header on why
 * `Milestone.percent_complete` is never read there). This file reads a THIRD
 * source, `GET projects/{id}/milestones/phase-costs/` (`useMilestonePhaseCosts`),
 * which is the one place `percentComplete` and a per-phase `contractCost` are
 * read together, and it sits behind a FOURTH permission axis —
 * `canViewOtherDisciplines` — that nothing in `homeVisuals.ts` checks. Three
 * different endpoints, three different gates: a separate file.
 *
 * ── The one rule this file inherits from `homeVisuals.ts` ────────────────
 *
 * A series must declare its own incompleteness. Nothing here is held flat or
 * coerced to zero to paper over a gap: a milestone whose cost is hidden, or
 * unrecorded, or whose progress was never entered, is a genuine break in the
 * line — not an assumption. See the four counters on `CostProgressCurve`.
 *
 * ── Why cost weights progress, rather than progress standing alone ───────
 *
 * "48% of milestones are complete" and "48% of the group's value is complete"
 * are different claims, and a group of phases is rarely even in value. Progress
 * here is COST-WEIGHTED — `contractCost * percentComplete / 100` — so a phase
 * worth ten times another counts ten times as much toward the line, the same
 * way the certified curve in `homeVisuals.ts` is a value, not a count.
 *
 * ── The denominator is fixed, like the certified curve's ceiling ─────────
 *
 * `totalKnownCost` is summed ONCE over every milestone handed in — dated or
 * not, complete or not — and both lines are read as a share of that fixed
 * total. It is not a running total and it does not grow as milestones are
 * plotted; see `buildCertifiedCurve`'s `ceiling` for the same shape of
 * decision.
 */

export type DisciplineGroup = "construction" | "professional";

/** The four disciplines pooled into the "Professional" group. */
export const PROFESSIONAL_DISCIPLINES = [
  "architectural",
  "engineering",
  "quantity_surveying",
  "other",
] as const;

/** The subset of `MilestoneWithCost` this reads. Every field is on the serializer. */
export interface PhaseCostMilestoneLike {
  _id?: string | number;
  name?: string | null;
  /** `Milestone.end_date` — the live planned finish. */
  endDate?: string | null;
  /** `Milestone.actual_end` — nullable. Set once the milestone finishes. */
  actualEnd?: string | null;
  /** `Milestone.percent_complete` — nullable, human-entered. */
  percentComplete?: number | null;
  /** From `phase-costs/`'s `MilestoneWithCost.contractCost`. */
  contractCost?: number | null;
  /** Whether the current viewer may see this milestone's cost at all. */
  feeVisible?: boolean;
}

export interface CostProgressPoint {
  id: string;
  name: string;
  /** `actualEnd ?? endDate` — the date this milestone lands on the axis. */
  date: string;
  /** True when `actualEnd` supplied the date, rather than the live `endDate`. */
  isActual: boolean;
  /**
   * This phase's own contract cost. Null both when it was never recorded and
   * when it was recorded but `feeVisible` is false — this field never
   * surfaces a cost the viewer is not permitted to see, even as a single
   * figure with no curve around it.
   */
  cost: number | null;
  /** Running share of `totalKnownCost` in money terms, 0-100. Null = a gap. */
  cumulativeMoneyPct: number | null;
  percentComplete: number | null;
  /** Running cost-weighted share of physical progress, 0-100. Null = a gap. */
  cumulativeProgressPct: number | null;
}

export interface CostProgressCurve {
  group: DisciplineGroup;
  /** Every milestone handed in, dated or not. */
  total: number;
  /** Only the milestones with a usable date, sorted ascending. */
  points: CostProgressPoint[];
  /**
   * Sum of `contractCost` across every milestone with a known cost, dated or
   * not — the fixed denominator both lines are read against. Zero both when
   * every recorded cost happens to sum to zero and when nothing was
   * recorded at all; the caller distinguishes the latter using `costHidden`
   * / `costUnrecorded` against `total`.
   */
  totalKnownCost: number;
  /** Dated milestones whose cost is hidden from this viewer (`feeVisible: false`). */
  costHidden: number;
  /** Dated, visible milestones with no `contractCost` recorded. */
  costUnrecorded: number;
  /** Dated milestones with a known cost but no `percentComplete` recorded. */
  progressUntracked: number;
  /** Milestones with no usable date. Excluded from `points` entirely. */
  undated: number;
  /** Dated milestones where BOTH `contractCost` and `percentComplete` were known. */
  progressWeighted: number;
  /** The last non-null `cumulativeMoneyPct` anywhere in `points`. */
  latestMoneyPct: number | null;
  /** The last non-null `cumulativeProgressPct` anywhere in `points`. Not necessarily the same point as `latestMoneyPct`. */
  latestProgressPct: number | null;
  /** `latestMoneyPct - latestProgressPct`. Null unless both are known. */
  driftPct: number | null;
}

/** Epoch ms for an ISO date, or null. Never throws, never guesses. */
const ms = (iso: string | null | undefined): number | null => {
  if (typeof iso !== "string" || iso.trim() === "") return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

export function buildCostProgressCurve(
  milestones: PhaseCostMilestoneLike[],
  group: DisciplineGroup,
): CostProgressCurve {
  const list = Array.isArray(milestones) ? milestones : [];

  // ── The fixed denominator ────────────────────────────────────────────
  // Summed once over the WHOLE set — dated or not — never a running total.
  const knownCosts = list
    .map((m) => m.contractCost)
    .filter((c): c is number => typeof c === "number");
  const totalKnownCost = knownCosts.reduce((sum, c) => sum + c, 0);

  // ── Split into dated / undated ───────────────────────────────────────
  let undated = 0;
  const dated: { m: PhaseCostMilestoneLike; date: string; dateMs: number; isActual: boolean }[] = [];

  list.forEach((m) => {
    const isActual = typeof m.actualEnd === "string" && m.actualEnd.trim() !== "";
    const date = isActual
      ? (m.actualEnd as string)
      : typeof m.endDate === "string" && m.endDate.trim() !== ""
        ? m.endDate
        : null;
    const dateMs = date === null ? null : ms(date);
    if (date === null || dateMs === null) {
      undated += 1;
      return;
    }
    dated.push({ m, date, dateMs, isActual });
  });

  // Stable ascending sort — ties keep their original relative order.
  dated.sort((a, b) => a.dateMs - b.dateMs);

  // ── Walk chronologically, maintaining two independent running totals ──
  let moneyRunning = 0;
  let progressRunning = 0;
  let costHidden = 0;
  let costUnrecorded = 0;
  let progressUntracked = 0;
  let progressWeighted = 0;

  const points: CostProgressPoint[] = dated.map(({ m, date, isActual }, i) => {
    const feeVisible = m.feeVisible !== false;
    const contractCost = typeof m.contractCost === "number" ? m.contractCost : null;
    const percentComplete = typeof m.percentComplete === "number" ? m.percentComplete : null;

    // Money: a gap is genuine — hidden or unrecorded cost carries nothing
    // forward, and is never coerced to zero.
    let cumulativeMoneyPct: number | null;
    if (!feeVisible) {
      costHidden += 1;
      cumulativeMoneyPct = null;
    } else if (contractCost === null) {
      costUnrecorded += 1;
      cumulativeMoneyPct = null;
    } else {
      moneyRunning += contractCost;
      cumulativeMoneyPct = totalKnownCost ? (moneyRunning / totalKnownCost) * 100 : null;
    }

    // Progress: independent of `feeVisible` — it is cost-WEIGHTED, not
    // cost-gated, so it only needs both figures to be known, not visible.
    let cumulativeProgressPct: number | null;
    if (contractCost !== null && percentComplete !== null) {
      progressRunning += (contractCost * percentComplete) / 100;
      cumulativeProgressPct = totalKnownCost ? (progressRunning / totalKnownCost) * 100 : null;
      progressWeighted += 1;
    } else {
      progressUntracked += 1;
      cumulativeProgressPct = null;
    }

    return {
      id: String(m._id ?? i),
      name: (m.name ?? "").trim() || "Unnamed phase",
      date,
      isActual,
      cost: feeVisible ? contractCost : null,
      cumulativeMoneyPct,
      percentComplete,
      cumulativeProgressPct,
    };
  });

  const lastNonNull = (key: "cumulativeMoneyPct" | "cumulativeProgressPct"): number | null => {
    for (let i = points.length - 1; i >= 0; i--) {
      const v = points[i][key];
      if (v !== null) return v;
    }
    return null;
  };

  const latestMoneyPct = lastNonNull("cumulativeMoneyPct");
  const latestProgressPct = lastNonNull("cumulativeProgressPct");
  const driftPct =
    latestMoneyPct !== null && latestProgressPct !== null ? latestMoneyPct - latestProgressPct : null;

  return {
    group,
    total: list.length,
    points,
    totalKnownCost,
    costHidden,
    costUnrecorded,
    progressUntracked,
    undated,
    progressWeighted,
    latestMoneyPct,
    latestProgressPct,
    driftPct,
  };
}
