/**
 * Construction vs Professional: cost vs progress, one card each.
 *
 * ── What each card answers ────────────────────────────────────────────────
 *
 * Not "how much has been spent" and not "% complete" alone — both of those
 * exist elsewhere. This is "which one is ahead of the other, in this
 * discipline group": cumulative recorded cost against cumulative
 * cost-weighted physical progress, both read as a share of the same fixed
 * total. See the header of `src/lib/homeProgress.ts` for the arithmetic.
 *
 * ── Same grammar as `StatusBand.tsx`'s CertifiedCurve, deliberately ──────
 *
 * Hand-drawn SVG, not `recharts` — see that file's header for the three
 * reasons recharts was measured and rejected; nothing here changes that
 * measurement. The money line is solid with a 16%-opacity fill beneath it,
 * on the same `--viz-brand` token as the certified curve, because it is the
 * page's other cumulative-money series. The progress line is dashed with no
 * fill, on `--viz-ink`, the same "solid+fill vs dashed+empty" shape channel
 * `StatusBand.tsx` documents at length for exactly this brand-vs-ink pairing
 * (1.14:1 against each other — hue alone does not separate them).
 *
 * ── Gaps are real, and are drawn as breaks, not held flat ─────────────────
 *
 * A milestone with a hidden or unrecorded cost, or with no physical progress
 * entered, is a genuine gap in that line — `buildCostProgressCurve` never
 * carries a value across one. The path is built per unbroken run of known
 * points (a fresh `M` after a gap, never an `L` bridging it), and a short
 * tick on the baseline marks where a gap fell. Neither line is assumed to
 * start at the left edge, either: unlike the certified curve, "zero before
 * the first phase" is not a fact this data can support.
 *
 * ── Six ways there can be nothing to draw, and none of them render a blank
 *    card ──────────────────────────────────────────────────────────────────
 *
 * Zero phases, no permission to see the other disciplines at all, exactly
 * one phase (a curve needs two), every known cost hidden or nil, no phase
 * with progress recorded, and every phase landing on the same date — each is
 * a fact about the data and each is stated as one, the same discipline
 * `certifiedCurveNote` documents for the money zone above.
 */
import { useMemo } from "react";

import { formatZAR } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/dateUtils";
import {
  buildCostProgressCurve,
  type CostProgressCurve,
  type CostProgressPoint,
  type DisciplineGroup,
} from "@/lib/homeProgress";
import { useDisciplineCostProgress } from "@/hooks/useMilestones";

const CARD =
  "bg-card border border-border rounded-xl overflow-hidden px-4 py-3 flex flex-col gap-2 min-w-0";

const CAVEAT =
  "Both lines are a share of known cost only. An unrecorded phase is treated as unknown, not zero, and can hold the progress line back below its true position until its % complete is entered.";

// ── The chart itself ────────────────────────────────────────────────────

/** One unbroken run of known values, stepped and gap-aware. */
function buildSteppedSeries(pts: { x: number; v: number | null }[], H: number) {
  let linePath = "";
  let areaPath = "";
  let run: { x: number; y: number }[] = [];

  const flush = () => {
    if (run.length === 0) return;
    let seg = `M ${run[0].x.toFixed(2)} ${run[0].y.toFixed(2)}`;
    for (let i = 1; i < run.length; i++) {
      // Step: hold flat at the previous known value, then jump — the same
      // "the corners ARE the certificates" grammar as CertifiedCurve. Values
      // between two known phases are not invented by interpolation.
      seg += ` L ${run[i].x.toFixed(2)} ${run[i - 1].y.toFixed(2)} L ${run[i].x.toFixed(2)} ${run[i].y.toFixed(2)}`;
    }
    linePath += (linePath ? " " : "") + seg;
    const startX = run[0].x.toFixed(2);
    const endX = run[run.length - 1].x.toFixed(2);
    areaPath += (areaPath ? " " : "") + `${seg} L ${endX} ${H.toFixed(2)} L ${startX} ${H.toFixed(2)} Z`;
    run = [];
  };

  for (const p of pts) {
    if (p.v === null) {
      flush();
      continue;
    }
    run.push({ x: p.x, y: H - (p.v / 100) * H });
  }
  flush();

  return { linePath, areaPath };
}

function CostProgressChart({
  points,
  showMoney,
  showProgress,
}: {
  points: CostProgressPoint[];
  showMoney: boolean;
  showProgress: boolean;
}) {
  const W = 100;
  const H = 40;

  const t = (d: string) => new Date(d).getTime();
  const first = t(points[0].date);
  const last = t(points[points.length - 1].date);
  const x = (d: string) => ((t(d) - first) / (last - first)) * W;

  const moneySeries = showMoney
    ? buildSteppedSeries(points.map((p) => ({ x: x(p.date), v: p.cumulativeMoneyPct })), H)
    : null;
  const progressSeries = showProgress
    ? buildSteppedSeries(points.map((p) => ({ x: x(p.date), v: p.cumulativeProgressPct })), H)
    : null;

  // Every point where either drawn line has a genuine gap, deduped — both
  // series share the same x-positions, so a Set of x is enough.
  const gapXs = new Set<number>();
  if (showMoney) {
    points.forEach((p) => {
      if (p.cumulativeMoneyPct === null) gapXs.add(x(p.date));
    });
  }
  if (showProgress) {
    points.forEach((p) => {
      if (p.cumulativeProgressPct === null) gapXs.add(x(p.date));
    });
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-16 mt-1 overflow-visible"
        // Every value here is stated in words by the headline and the
        // footnotes below, so a screen reader is given the figures rather
        // than a shape it cannot see.
        aria-hidden="true"
        focusable="false"
      >
        {moneySeries && moneySeries.areaPath && (
          <path d={moneySeries.areaPath} style={{ fill: "hsl(var(--viz-brand))", fillOpacity: 0.16 }} />
        )}
        {moneySeries && moneySeries.linePath && (
          <path
            d={moneySeries.linePath}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ fill: "none", stroke: "hsl(var(--viz-brand))", strokeWidth: 1.5 }}
          />
        )}
        {progressSeries && progressSeries.linePath && (
          <path
            d={progressSeries.linePath}
            strokeLinejoin="round"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
            style={{ fill: "none", stroke: "hsl(var(--viz-ink))", strokeWidth: 1.5 }}
          />
        )}
        {Array.from(gapXs).map((gx, i) => (
          <line
            key={i}
            x1={gx}
            x2={gx}
            y1={H - 1}
            y2={H + 1}
            vectorEffect="non-scaling-stroke"
            style={{ stroke: "hsl(var(--viz-rule))", strokeWidth: 1 }}
          />
        ))}
      </svg>
      <div className="flex items-baseline justify-between gap-2 mt-1">
        <p className="text-xs text-muted-foreground tabular-nums truncate">
          {formatDate(points[0].date, "short", "—")}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums truncate">
          {formatDate(points[points.length - 1].date, "short", "—")}
        </p>
      </div>
    </>
  );
}

// ── One card ───────────────────────────────────────────────────────────

function PhaseCostProgressCard({
  projectId,
  group,
  title,
}: {
  projectId: string | undefined;
  group: DisciplineGroup;
  title: string;
}) {
  const { milestones, isLoading, gated } = useDisciplineCostProgress(projectId ?? null, group);
  const curve: CostProgressCurve = useMemo(
    () => buildCostProgressCurve(milestones, group),
    [milestones, group],
  );

  const Header = <p className="text-xs text-muted-foreground">{title}</p>;

  if (isLoading) {
    return (
      <div className={CARD}>
        {Header}
        <p className="text-sm text-muted-foreground">Reading phase costs…</p>
      </div>
    );
  }

  // Determinable before any of the four Professional requests fire — see
  // `useDisciplineCostProgress` — not inferred from an empty response.
  if (gated) {
    return (
      <div className={CARD}>
        {Header}
        <p className="text-sm text-muted-foreground">
          You do not have visibility into other disciplines' phases
        </p>
      </div>
    );
  }

  if (curve.total === 0) {
    return (
      <div className={CARD}>
        {Header}
        <p className="text-sm text-muted-foreground">No {title} phases recorded</p>
      </div>
    );
  }

  if (curve.points.length === 0) {
    return (
      <div className={CARD}>
        {Header}
        <p className="text-sm text-muted-foreground">
          {curve.undated} phase{curve.undated === 1 ? "" : "s"} with no usable date — nothing to plot
        </p>
      </div>
    );
  }

  // A single phase is a figure, not a curve — the same rule CertifiedCurve
  // applies to one certificate.
  if (curve.points.length === 1) {
    const p = curve.points[0];
    const costText =
      p.cost !== null
        ? formatZAR(p.cost)
        : curve.costHidden > 0
          ? "cost not visible to you"
          : "no cost recorded";
    const progressText =
      p.percentComplete !== null
        ? `${Math.round(p.percentComplete)}% complete`
        : "no physical progress recorded";
    return (
      <div className={CARD}>
        {Header}
        <p className="text-sm text-foreground">
          {p.name} — {costText}, {progressText}
        </p>
        <p className="text-xs text-muted-foreground">one phase — no curve to draw yet</p>
        <p className="text-xs text-muted-foreground">{CAVEAT}</p>
      </div>
    );
  }

  const first = new Date(curve.points[0].date).getTime();
  const last = new Date(curve.points[curve.points.length - 1].date).getTime();
  const hasRange = Number.isFinite(first) && Number.isFinite(last) && last > first;

  const showMoney = !(curve.totalKnownCost === 0 || curve.costHidden === curve.total);
  const showProgress = curve.progressWeighted > 0;

  const rounded = curve.driftPct === null ? null : Math.round(curve.driftPct);
  const headline =
    rounded === null
      ? "Cost and progress cannot be compared for this group"
      : rounded === 0
        ? "in step"
        : rounded > 0
          ? `+${rounded} pts — cost ahead of progress`
          : `${rounded} pts — progress ahead of cost`;

  const moneyPctText =
    curve.latestMoneyPct === null
      ? "cost share unknown"
      : `${Math.round(curve.latestMoneyPct)}% of known cost recorded`;
  const progressPctText =
    curve.latestProgressPct === null
      ? "progress share unknown"
      : `${Math.round(curve.latestProgressPct)}% weighted progress recorded`;

  const footnotes: string[] = [];
  if (curve.costHidden > 0) {
    footnotes.push(`Cost not visible to you for ${curve.costHidden} phase(s)`);
  }
  if (curve.costUnrecorded > 0) {
    footnotes.push(`${curve.costUnrecorded} phase(s) with no fee/cost recorded yet`);
  }
  if (curve.progressUntracked > 0) {
    footnotes.push(`${curve.progressUntracked} phase(s) with no physical progress recorded`);
  }
  if (curve.undated > 0) {
    footnotes.push(`${curve.undated} phase(s) with no usable date`);
  }
  if (!showMoney) {
    footnotes.push("Cost is not visible to you for any phase in this group");
  }
  if (!showProgress) {
    footnotes.push("Physical progress is not recorded for any phase in this group");
  }

  return (
    <div className={CARD}>
      {Header}

      <div>
        <p className="text-lg tabular-nums text-foreground">{headline}</p>
        <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
          {moneyPctText} · {progressPctText}
        </p>
      </div>

      {!hasRange ? (
        <p className="text-sm text-muted-foreground">
          Every phase ends on the same date — no time axis to draw
        </p>
      ) : showMoney || showProgress ? (
        <CostProgressChart points={curve.points} showMoney={showMoney} showProgress={showProgress} />
      ) : null}

      {footnotes.length > 0 && (
        <div className="space-y-0.5">
          {footnotes.map((f) => (
            <p key={f} className="text-xs text-muted-foreground">
              {f}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{CAVEAT}</p>
    </div>
  );
}

// ── The pair ───────────────────────────────────────────────────────────

export function PhaseCostProgressBlock({ projectId }: { projectId: string | undefined }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <PhaseCostProgressCard projectId={projectId} group="construction" title="Construction" />
      <PhaseCostProgressCard projectId={projectId} group="professional" title="Professional" />
    </div>
  );
}
