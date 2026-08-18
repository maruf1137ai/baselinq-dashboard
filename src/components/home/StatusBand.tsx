/**
 * The status band — the visual layer across the top of Home.
 *
 * ── What it replaces, and why that is not a loss ──────────────────────────
 *
 * It replaces `PositionStripBlock`, which was six figures in a row. The figures
 * were right and are all still here; what was missing was any shape. A reader
 * asking "where are we" got six rand values and had to hold the contract dates
 * in their head to know whether any of them was good news.
 *
 * It also absorbs `ContractTimeBlock` from the right-hand column. That panel's
 * three figures — time remaining, build length, completion — are the axis
 * below, drawn once instead of stated three times, and the column space it
 * vacated is what pays for "What changed".
 *
 * So the band is not additional height. It is the same information with a
 * scale under it, and the page is shorter than it was.
 *
 * ── The zones, and what a viewer without finance.view gets ────────────────
 *
 * Three zones with `finance.view`:  TIME · MONEY · CHANGE
 * Two zones without it:             TIME · PROGRAMME
 *
 * A contractor does not get a band with two holes in it. The money and change
 * zones are not RENDERED EMPTY and not greyed out — they are absent, and the
 * programme zone expands to take the width, carrying the milestone
 * baseline-versus-actual detail that the three-zone layout compresses into one
 * line inside TIME. Dates are not money: `Milestone.baseline_end` and
 * `Project.start_date` carry no commercial information and are not gated.
 *
 * ── The colour budget ─────────────────────────────────────────────────────
 *
 * The page's severity rule is stated in full at the top of `blocks.tsx` and
 * governs this file. Two consequences worth naming here, because both are
 * cases where the obvious design would break it:
 *
 *  1. **An extension of time is not coloured.** It is a recorded fact — the
 *     server moves `contract_end_date` when a variation granting an extension
 *     is signed — and nobody has breached anything. It is drawn as a distinct
 *     but achromatic band.
 *
 *  2. **Past the VO tolerance is not coloured either.** `vo_tolerance.py` sets
 *     `contractual: False` deliberately and explains why: it is an
 *     underwriting heuristic, and no JBCC, NEC, FIDIC or GCC clause is
 *     breached at 10%. The mark is drawn, the figure is stated, and the word
 *     "breach" appears nowhere near it.
 *
 * That leaves exactly two things in this band that may carry `destructive`,
 * and both are breaches that have already happened: **today past the contract
 * completion date**, and **certified past the revised contract sum**.
 *
 * **Nothing here is encoded by colour alone.** Each of those two also states
 * itself in words — "32 days past completion", "Over" — because an earlier
 * audit of this page found severity carried by hue with no second channel.
 * The brand purple on the certified curve is a series colour, not a severity:
 * it is the one chromatic element on this page that does not mean "wrong".
 *
 * ── Provenance ───────────────────────────────────────────────────────────
 *
 * Every plotted value, with the endpoint and field behind it:
 *
 *   Contract axis      GET projects/?userId= → `start_date`, `end_date`,
 *                      `contract_end_date`, via `summariseTime`.
 *   Milestone drift    GET projects/{id}/milestones/ → `baseline_end` against
 *                      `actual_end ?? end_date`. Never `percent_complete`.
 *   Certified curve    GET tasks/payment-certificates/?projectId= →
 *                      `certificate_date`, `total_payable`, `workflow_state`,
 *                      via `buildCertificateRun` → `buildCertifiedCurve`.
 *   Ceiling line       `Project.contract_value` + approved variation value,
 *                      via `summariseMoney().revisedContractSum`.
 *   Change position    GET tasks/variation-orders/ and tasks/tasks/?taskType=VO
 *                      → `status`, `grand_total`, `date_instructed`.
 *   Tolerance mark     GET projects/{id}/risk-signals/ → the VO_TOLERANCE_BREACH
 *                      signal's `detail.tolerance_pct`. Absent when unfired.
 *
 * No endpoint is requested here that the page did not already request, and no
 * gate is loosened.
 */
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { formatZAR } from "@/lib/formatCurrency";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { FINANCE_TAB } from "@/lib/homeSignals";
import { cn } from "@/lib/utils";
import type { ContractTimeline, MilestoneDrift } from "@/lib/homeVisuals";
import type { HomeData } from "@/hooks/useHomeData";

/** "30 days" / "1 day" — never a bare number, never a percentage. */
const days = (n: number) => `${n} day${Math.abs(n) === 1 ? "" : "s"}`;

const CERTIFICATES = `/finance?tab=${encodeURIComponent(FINANCE_TAB.certificates)}`;
const VARIATIONS = `/finance?tab=${encodeURIComponent(FINANCE_TAB.variations)}`;

// ── Zone chrome ───────────────────────────────────────────────────────────

/**
 * One zone of the band: a name, a headline figure, a shape, and a footnote.
 *
 * The footnote is not decoration and is not optional where a series is
 * incomplete — it is where every zone declares what it could not plot. See
 * the header of `homeVisuals.ts`.
 */
function Zone({
  name,
  to,
  linkLabel,
  value,
  compare,
  badge,
  caveat,
  children,
  footnote,
}: {
  name: string;
  to?: string;
  linkLabel?: string;
  value: string | null;
  compare?: string | null;
  badge?: React.ReactNode;
  caveat?: string;
  children?: React.ReactNode;
  /** What this series could not show. Printed, never swallowed. */
  footnote?: string | null;
}) {
  return (
    <div className="px-4 py-3 min-w-0 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">{name}</p>
        {to && (
          <Link
            to={to}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {linkLabel}
          </Link>
        )}
      </div>

      <div className="min-w-0" title={caveat}>
        <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
          <p className="text-lg tabular-nums text-foreground break-words">{value ?? "—"}</p>
          {badge}
        </div>
        {compare && (
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5 break-words">{compare}</p>
        )}
      </div>

      {children}

      {footnote && <p className="text-xs text-muted-foreground mt-auto">{footnote}</p>}
    </div>
  );
}

/** A list joined into one footnote sentence, or null when nothing to declare. */
const footnoteOf = (parts: (string | null)[]) => {
  const kept = parts.filter(Boolean) as string[];
  return kept.length > 0 ? kept.join(" · ") : null;
};

// ── The contract axis ─────────────────────────────────────────────────────

/**
 * The contract dates, drawn as a dated axis.
 *
 * **This is not a progress bar and there is no fill.** `ContractTimeline`
 * exposes no proportion of the works and could not be rendered as one — see
 * the long note on that type. What is drawn is a rule with pins on it: where
 * the contract starts, where it is due to end, and where today falls between
 * them. That is a calendar, and a calendar is a fact.
 *
 * The two bands ARE filled, because each is a quantity in its own right: the
 * days an extension of time moved the completion date by (achromatic — a
 * recorded fact), and the days today is past completion (destructive — a
 * breach that has already happened).
 *
 * `aria-hidden` on the graphic: every value in it is stated in text by the
 * zone's headline figure and its two date labels, so a screen reader is given
 * the figures rather than a shape it cannot see.
 */
function ContractAxis({ timeline }: { timeline: ContractTimeline }) {
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const start = timeline.marks.find((m) => m.key === "start");
  const completion = timeline.marks.find((m) => m.key === "completion");

  return (
    <div className="mt-1">
      <div className="relative h-2" aria-hidden="true">
        {/* The rule itself. */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-muted" />

        {/* Days a signed extension of time moved completion by. No colour —
            but `bg-muted-foreground` rather than a tint of it, because a tint
            measured 1.9:1 against the card and this band is a data element,
            not a ground. At full strength it is 5.47:1 on the card and 4.99:1
            on the row hover, and it stays distinct from the track beneath it
            (1.21:1), the overrun beside it and the today marker over it. */}
        {timeline.extension && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-muted-foreground"
            style={{
              left: pct(timeline.extension.from),
              width: pct(timeline.extension.to - timeline.extension.from),
            }}
          />
        )}

        {/* Today, past completion. A breach that has already happened. */}
        {timeline.overrun && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-r-full bg-destructive"
            style={{
              left: pct(timeline.overrun.from),
              width: pct(timeline.overrun.to - timeline.overrun.from),
            }}
          />
        )}

        {/* The originally-agreed date, where an extension moved it. */}
        {timeline.marks
          .filter((m) => m.key === "original")
          .map((m) => (
            <div
              key={m.key}
              className="absolute top-0 h-2 w-px bg-muted-foreground"
              style={{ left: pct(m.at) }}
            />
          ))}

        {/* Today. The one mark a reader looks for. */}
        {timeline.todayAt !== null && (
          <div
            className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: pct(timeline.todayAt) }}
          />
        )}
      </div>

      {/* The axis labels itself at both ends rather than floating labels over
          the marks, which collide at every width once a project is short. */}
      <div className="flex items-baseline justify-between gap-2 mt-1.5">
        <p className="text-xs text-muted-foreground tabular-nums truncate">
          {start ? formatDateUk(start.date, "short", "—") : "—"}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums truncate">
          {completion ? formatDateUk(completion.date, "short", "—") : "—"}
        </p>
      </div>
    </div>
  );
}

// ── Milestone drift ───────────────────────────────────────────────────────

/**
 * Baseline against actual, one row per milestone, worst slip first.
 *
 * Shown in full only in the two-zone layout, where a viewer without
 * `finance.view` has the width for it. In the three-zone layout the same
 * numbers are the TIME zone's footnote.
 *
 * Each row is a bar whose length is its slip against the worst slip in the
 * programme — a comparison between milestones, which is what the reader is
 * making. It is deliberately NOT scaled against the milestone's own duration,
 * which would read as a proportion of the work done.
 */
function MilestoneDrift({ drift }: { drift: MilestoneDrift }) {
  const slipped = drift.rows.filter((r) => r.slipDays > 0).slice(0, 4);
  if (slipped.length === 0) return null;
  const worst = drift.worstSlipDays ?? 1;

  return (
    <div className="space-y-1.5 mt-1">
      {slipped.map((r) => (
        <div key={r.id} className="flex items-center gap-2 min-w-0">
          <p className="text-xs text-foreground truncate w-1/3 shrink-0" title={r.name}>
            {r.name}
          </p>
          <div className="relative h-1.5 flex-1 rounded-full bg-muted" aria-hidden="true">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground"
              style={{ width: `${Math.max(4, (r.slipDays / worst) * 100).toFixed(2)}%` }}
            />
          </div>
          {/* The figure beside the bar, so nothing is carried by length alone. */}
          <p className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">
            +{days(r.slipDays)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── The certified curve ───────────────────────────────────────────────────

/**
 * Cumulative certified value against the revised contract sum.
 *
 * ── Why this is a STEP and not a curve ────────────────────────────────────
 *
 * Certification is a series of discrete events. Nothing is certified between
 * PC-003 on 19 May and PC-004 on 18 June; the cumulative total is flat across
 * that month and then jumps. A smoothed line through those two points asserts
 * a certified value on every day in between that no principal agent signed —
 * which is inventing data, on the page whose whole rule is that nothing is
 * invented. So the path is a step: flat, then vertical, then flat. The corners
 * ARE the certificates.
 *
 * ── Why this is hand-drawn rather than a chart library ────────────────────
 *
 * `recharts` is a dependency of this repo and was the obvious tool. It was
 * measured and rejected on two counts:
 *
 *  1. Its `type="monotone"` and `type="linear"` both draw the interpolation
 *     described above. `type="step"` avoids that, but then the library is
 *     contributing nothing but a path string.
 *  2. It is 111 kB gzipped, and it was previously imported by NOTHING, so
 *     using it here would have moved the whole library into the app's main
 *     chunk — measured at 1,051 kB gzip before and 1,163 kB after — to draw
 *     one 64px sparkline on the landing page.
 *
 * The five `--chart-*` tokens have no Tailwind mapping (there is no
 * `bg-chart-1`, and adding one would be a new token), so `--chart-1` is
 * consumed the way SVG takes colour anyway: `hsl(var(--chart-1))` on the
 * attribute. The dark ramp redefines the same variable and keeps working.
 *
 * ── Why the y-domain runs to the ceiling ──────────────────────────────────
 *
 * A sparkline scaled to its own maximum always ends at the top of its box,
 * which reads as "finished" whatever the figures are. The domain here is
 * `[0, max(ceiling, latest)]`, so the path's HEIGHT IN THE BOX is the
 * proportion certified — the comparison the reader is actually making — and
 * the dashed line is where the contract sum sits.
 *
 * ── What the dashed line is NOT ──────────────────────────────────────────
 *
 * It is not a planned curve. No valuation schedule exists in the backend, so
 * there is no planned S-curve to draw against this one, and a flat line must
 * never be read as a plan. It is a ceiling.
 */
function CertifiedCurve({
  points,
  ceiling,
  overCeiling,
}: {
  points: { date: string; cumulative: number }[];
  ceiling: number | null;
  overCeiling: boolean;
}) {
  // One point is not a series. A single certificate is stated as a figure by
  // the zone above and drawing a one-pixel mark adds nothing to it.
  if (points.length < 2) return null;

  const W = 100;
  const H = 40;

  const t = (d: string) => new Date(d).getTime();
  const first = t(points[0].date);
  const last = t(points[points.length - 1].date);
  // Every certificate on one date: there is no time axis to spread them over.
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return null;

  const latest = points[points.length - 1].cumulative;
  const top = ceiling !== null && ceiling > 0 ? Math.max(ceiling, latest) : latest;
  if (!(top > 0)) return null;

  const x = (d: string) => ((t(d) - first) / (last - first)) * W;
  const y = (v: number) => H - (v / top) * H;

  // The step. Before the first certificate the certified total is zero, so
  // the path starts on the floor and jumps — which is the fact, not a flourish.
  let d = `M 0 ${H.toFixed(2)}`;
  let prevY = H;
  for (const p of points) {
    const px = x(p.date);
    const py = y(p.cumulative);
    d += ` L ${px.toFixed(2)} ${prevY.toFixed(2)} L ${px.toFixed(2)} ${py.toFixed(2)}`;
    prevY = py;
  }

  const area = `${d} L ${W.toFixed(2)} ${prevY.toFixed(2)} L ${W.toFixed(2)} ${H.toFixed(2)} Z`;
  // The certified total holds until the next certificate, so the line runs
  // flat to the right-hand edge rather than stopping in mid-air.
  const line = `${d} L ${W.toFixed(2)} ${prevY.toFixed(2)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-16 mt-1 overflow-visible"
      // Every value in here is stated in words by the zone's headline figure
      // and its footnote, so a screen reader is given the figures rather than
      // a shape it cannot see.
      aria-hidden="true"
      focusable="false"
    >
      <path d={area} fill="hsl(var(--chart-1))" fillOpacity={0.14} />
      <path
        d={line}
        fill="none"
        stroke="hsl(var(--chart-1))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        // Without this the horizontal scale squashes the stroke to a hairline
        // and the verticals render three times thicker than the flats.
        vectorEffect="non-scaling-stroke"
      />
      {ceiling !== null && ceiling > 0 && (
        <line
          x1={0}
          x2={W}
          y1={y(ceiling)}
          y2={y(ceiling)}
          // Severity rule 1: the line turns destructive ONLY once it has
          // actually been crossed. Below the ceiling it is a neutral
          // reference, and drawing it red would colour a fact, not a breach.
          stroke={overCeiling ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

// ── The change bar ────────────────────────────────────────────────────────

/**
 * Where change stands, as one proportional bar with all four counts beneath.
 *
 * ── Why only TWO of the four statuses are DRAWN ───────────────────────────
 *
 * The bar was four segments and is now two, for a contrast reason and a
 * meaning reason, and they happen to agree.
 *
 * The contrast reason: four achromatic segments need four fills that each
 * clear 3:1 against the card AND remain distinguishable from one another.
 * Measured in the browser, the four-step ramp put the lightest two at 1.37:1
 * and 1.9:1 — invisible on white, and encoding a real quantity in something a
 * reader cannot see. Squeezing four steps into the band above 3:1 makes them
 * indistinguishable from each other instead, which is the same failure.
 *
 * The meaning reason: the two dropped segments are not part of where change
 * stands. A DRAFT is the raiser's own unfinished work and is not sitting with
 * anybody — the same reasoning `summariseVariations` already uses to hold
 * drafts out of "outstanding". A REJECTED variation is settled and carries no
 * value forward. Neither belongs in a bar about committed-versus-awaited.
 *
 * Both are still COUNTED, in the legend below, which is also why the bar is
 * never the only channel: every segment's figure is printed beside it in
 * words, so nothing here is carried by fill alone.
 *
 * The two fills that remain measure 16.5:1 and 5.47:1 on the card, and 4.99:1
 * for the lighter one on the row hover.
 */
function ChangeBar({ slices }: { slices: { key: string; label: string; count: number }[] }) {
  // The two that are drawn, in the order they are drawn.
  const DRAWN = ["approved", "outstanding"];
  const FILL: Record<string, string> = {
    approved: "bg-foreground",
    outstanding: "bg-muted-foreground",
  };

  const drawn = slices.filter((s) => DRAWN.includes(s.key) && s.count > 0);
  const drawnTotal = drawn.reduce((n, s) => n + s.count, 0);
  const counted = slices.filter((s) => s.count > 0);
  if (counted.length === 0) return null;

  return (
    <div className="mt-1">
      {drawnTotal > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted" aria-hidden="true">
          {drawn.map((s) => (
            <div
              key={s.key}
              className={FILL[s.key]}
              style={{ width: `${((s.count / drawnTotal) * 100).toFixed(2)}%` }}
            />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {counted.map((s) => (
          <p key={s.key} className="text-xs text-muted-foreground tabular-nums">
            {/* A swatch only where there is a segment to point at. A dot for a
                status the bar does not draw would say the bar has a part the
                reader cannot find. */}
            {FILL[s.key] && (
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1", FILL[s.key])} />
            )}
            {s.count} {s.label.toLowerCase()}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── The band ──────────────────────────────────────────────────────────────

export function StatusBandBlock({ data }: { data: HomeData }) {
  const {
    canViewFinance,
    time,
    timeline,
    milestoneDrift,
    certifiedCurve,
    changePosition,
    changeSplit,
    money,
    retention,
    variationPosition: vos,
    variationsTruncated,
  } = data;

  const zones: React.ReactNode[] = [];

  // ── TIME ────────────────────────────────────────────────────────────────
  // Ungated. A contractor who may not see the contract sum still has to know
  // when the works are due.
  const overrun = time.overrun && time.remainingDays !== null;
  const driftLine =
    milestoneDrift.tracked === 0 && milestoneDrift.untracked === 0
      ? null
      : footnoteOf([
          milestoneDrift.tracked > 0
            ? `${milestoneDrift.slipped} of ${milestoneDrift.tracked} milestones past baseline`
            : null,
          milestoneDrift.untracked > 0 ? `${milestoneDrift.untracked} unbaselined` : null,
        ]);

  zones.push(
    <Zone
      key="time"
      name="Time"
      to="/programme"
      linkLabel="Programme"
      value={
        !time.hasDates || time.remainingDays === null
          ? null
          : days(Math.abs(time.remainingDays))
      }
      compare={
        !time.hasDates
          ? "No project timeline recorded"
          : overrun
            ? "past the contract completion date"
            : time.notStarted
              ? "until completion — not started"
              : "until contract completion"
      }
      badge={
        // ── There is deliberately NO "Overrun" badge here ──────────────────
        //
        // An earlier revision drew one in `danger` beside the red overrun band
        // on the axis, which put TWO coloured elements on one statement and
        // broke severity rule 4. The rule's tie-break gives the colour to the
        // element that NAMES the breach, and the fix takes that literally: the
        // naming moved into TEXT. The label reads "Past completion", the
        // comparison line reads "past the contract completion date", and both
        // are achromatic. That leaves exactly one coloured element for this
        // statement — the band on the axis — which is also the only one of the
        // candidates that carries information the words do not: where the
        // overrun begins and how long it runs.
        //
        // Nothing is encoded by colour alone: the figure and both lines of
        // text state the overrun outright.
        time.extensionDays !== null && time.extensionDays > 0 ? (
          // A recorded fact, not a warning: a signed variation moved the
          // completion date. Neutral, per severity rule 1.
          <Badge variant="neutral">{`+${days(time.extensionDays)} EOT`}</Badge>
        ) : undefined
      }
      caveat="Calendar days against the contract dates. Not a measure of what has been built — Baselinq records none."
      footnote={canViewFinance ? driftLine : null}
    >
      {timeline.hasAxis ? <ContractAxis timeline={timeline} /> : null}
    </Zone>,
  );

  if (canViewFinance) {
    // ── MONEY ─────────────────────────────────────────────────────────────
    const curve = certifiedCurve;
    zones.push(
      <Zone
        key="money"
        name="Money"
        to={CERTIFICATES}
        linkLabel="Certificates"
        value={money.certified === null ? null : formatZAR(money.certified)}
        compare={
          money.certifiedPct === null || money.revisedContractSum === null
            ? "certified to date"
            : `certified — ${money.certifiedPct}% of ${formatZAR(money.revisedContractSum)}`
        }
        badge={
          // Certified past the revised contract sum. A breach that has already
          // happened, and the word carries it so the red line is not alone.
          curve.overCeiling ? <Badge variant="danger">Over</Badge> : undefined
        }
        caveat="Cumulative certified value against the contract sum as revised by approved variations. A commercial measure, not physical progress — Baselinq records no measure of what has been built."
        footnote={footnoteOf([
          // Every disclosure this curve owes the reader.
          curve.undated > 0 ? `${curve.undated} undated, not plotted` : null,
          curve.inFlight !== null ? `${formatZAR(curve.inFlight)} in flight` : null,
          money.balance === null ? null : `${formatZAR(money.balance)} remaining`,
          retention.held === null
            ? null
            : `${formatZAR(retention.held)} retention${retention.ratePct === null ? "" : ` at ${retention.ratePct}%`}`,
        ])}
      >
        <CertifiedCurve
          points={curve.points}
          ceiling={curve.ceiling}
          overCeiling={curve.overCeiling}
        />
      </Zone>,
    );

    // ── CHANGE ────────────────────────────────────────────────────────────
    const c = changePosition;
    zones.push(
      <Zone
        key="change"
        name="Change"
        to={VARIATIONS}
        linkLabel="Variations"
        value={vos.total === 0 ? "—" : String(vos.outstanding)}
        compare={
          vos.total === 0
            ? "no variations raised"
            : `awaiting decision, of ${vos.total} raised`
        }
        badge={
          variationsTruncated ? <Badge variant="neutral">May be short</Badge> : undefined
        }
        caveat={
          c.tolerancePct === null
            ? "Approved variation value against the original contract sum."
            : "Approved variation value against the original contract sum. The tolerance is a commercial and underwriting heuristic set on this project's risk policy — no JBCC, NEC, FIDIC or GCC clause is breached at it. The contractual ceiling is the principal agent's mandate."
        }
        footnote={footnoteOf([
          c.pctOfOriginal === null
            ? null
            : c.tolerancePct === null
              ? `Approved change ${c.pctOfOriginal}% of the original sum`
              : // Worded as a tolerance, never as a breach. `contractual: False`.
                `Approved change ${c.pctOfOriginal}% of the original sum, ${
                  c.pastTolerance ? "past" : "within"
                } the ${c.tolerancePct}% tolerance`,
          c.undated > 0 ? `${c.undated} with no instruction date` : null,
        ])}
      >
        <ChangeBar slices={changeSplit} />
      </Zone>,
    );
  } else {
    // ── PROGRAMME ─────────────────────────────────────────────────────────
    // The second zone for a viewer without finance.view. Not a placeholder and
    // not a hole: the same milestone data the three-zone layout compresses
    // into one line of TIME, drawn in full because there is width for it.
    zones.push(
      <Zone
        key="programme"
        name="Programme"
        to="/programme"
        linkLabel="Milestones"
        value={
          milestoneDrift.tracked === 0
            ? milestoneDrift.untracked === 0
              ? null
              : "Not baselined"
            : String(milestoneDrift.slipped)
        }
        compare={
          milestoneDrift.tracked === 0
            ? milestoneDrift.untracked === 0
              ? "No milestones recorded"
              : `${milestoneDrift.untracked} milestones, none with a baseline to measure against`
            : `of ${milestoneDrift.tracked} baselined milestones past baseline`
        }
        caveat="Baseline finish against actual finish, or against the current planned finish where a milestone has not finished. Dates only — Baselinq holds no measure of physical progress."
        footnote={footnoteOf([
          milestoneDrift.untracked > 0
            ? `${milestoneDrift.untracked} unbaselined — neither slipped nor on time`
            : null,
          milestoneDrift.worstSlipDays === null
            ? null
            : `worst ${days(milestoneDrift.worstSlipDays)}`,
        ])}
      >
        <MilestoneDrift drift={milestoneDrift} />
      </Zone>,
    );
  }

  return (
    <section
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden",
        // Hairline-divided zones, the same grammar the precondition stack and
        // every list on this page use. `divide-x` from `md` only: stacked
        // below that, a vertical rule would divide nothing.
        "grid divide-y divide-border md:divide-y-0 md:divide-x",
        zones.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      {zones}
    </section>
  );
}
