/**
 * The page masthead — the verdict and the position, directly under the tab
 * strip and shared by every tab.
 *
 * ── Why it is not inside a tab ────────────────────────────────────────────
 *
 * It used to be the first thing INSIDE the "Risk signals" tab, which had two
 * consequences. A reader who followed a homepage link to `?tab=commercial` or
 * `?tab=insurer` was never told whether the project was in trouble at all. And
 * the page had no shared element, so five tabs on one route read as five
 * unrelated screens that happened to share a heading.
 *
 * Lifting it out of the tab is the move that makes this one surface rather
 * than blocks bolted together, and it is also the one thing Project Health's two readers
 * agree on. An insurer asks "is this project being competently administered";
 * a principal agent asks "where do I stand". Posture, the engine's own
 * sentence, and four indicators answer both. The tab BODY is where the two
 * diverge, which is exactly what tabs are for.
 *
 * ── Why it is below the strip and not above it ────────────────────────────
 *
 * It sat between the page title and the tabs, and it is ~200px tall, so
 * Project Health's tab strip began 210px lower than Finance's and
 * Programme's. The page-top rule (documented on `PageHeader`) is that nothing
 * comes between the title and the tab strip, so the strip lands on the same
 * line on every tabbed page. Sitting under the strip costs this block
 * nothing: it is still on screen on all five tabs, still the first thing
 * read after the lens is chosen.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 *
 * The posture tile is the page's single verdict and is the one object on this
 * surface that carries a fill — and only in the "At risk" state, where
 * something has actually happened. Everything below it obeys the same rules
 * the feed does: a tier is named once in words, only the worst tier present is
 * drawn, and only a breach that has already happened may be drawn at all.
 */
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import KeyIndicators from "@/components/risk/KeyIndicators";
import type { Indicator } from "@/lib/projectPosition";

export interface SignalCounts {
  red: number;
  orange: number;
  green: number;
  total: number;
}

/**
 * Only the red tile is drawn.
 *
 * "Watch" is a threshold that has NOT been passed and "Nothing detected" is
 * the absence of a finding; neither is a breach that has already happened, so
 * neither carries colour. The amber and emerald tiles are gone, and the three
 * states are told apart by their word and their icon — which is the text
 * channel severity should have had all along, rather than three fills that
 * differed only in hue.
 */
const POSTURE_STYLES: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-muted text-muted-foreground border-border",
  green: "bg-muted text-muted-foreground border-border",
};

/**
 * Overall posture derived from the worst live signal.
 *
 * The clear state used to read "Healthy". It does not any more, because that
 * is a claim about the WORKS and all this page can see is what the rules
 * found. A project with no milestones loaded, no certificates posted and no
 * variations raised produces exactly the same zero as a project being run
 * immaculately, and calling both healthy tells the second reader something
 * true and the first reader something dangerous. "Nothing detected" is the
 * statement the data supports — the distinction between "we found nothing"
 * and "there is nothing" is one this codebase keeps scrupulously everywhere
 * else.
 */
export function posture(counts: SignalCounts) {
  if (counts.red > 0) return { label: "At risk", tone: "red", icon: AlertTriangle };
  if (counts.orange > 0) return { label: "Watch", tone: "orange", icon: TrendingUp };
  return { label: "Nothing detected", tone: "green", icon: CheckCircle2 };
}

export default function HealthMasthead({
  counts,
  summary,
  indicators,
}: {
  counts: SignalCounts;
  /** The risk-forecast engine's own sentence. Never composed here. */
  summary?: string;
  indicators: Indicator[];
}) {
  const state = posture(counts);
  const StateIcon = state.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className={cn("p-2.5 rounded-lg border", POSTURE_STYLES[state.tone])}>
          <StateIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-medium text-foreground">{state.label}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {counts.total} live signal{counts.total === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {summary ||
              (counts.total === 0
                ? "No rule fired against this project's milestones, certificates or variations. That is not a statement that the works are sound — a rule with nothing to read fires nothing either."
                : "Review the signals below.")}
          </p>
        </div>
      </div>

      {/*
        The client's Key Indicators, in the slot three severity count chips —
        "8 critical / 2 warning / 0 clear" — used to occupy. A count is not a
        condition, and painting "2" amber said nothing about what the two WERE.
        Rendered only when there is at least one: a project with no variations,
        nothing overdue and no risk data gets no row of zeroes, it gets no row.
      */}
      {indicators.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <KeyIndicators indicators={indicators} />
        </div>
      )}
    </div>
  );
}
