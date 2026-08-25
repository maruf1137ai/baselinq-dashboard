/**
 * The risk feed — the core of Project Health, and the thing an insurer or a
 * diagnosing principal agent actually reads.
 *
 * ── One card per CONDITION, not per signal ────────────────────────────────
 *
 * The feed used to render one card per risk signal at near-identical weight.
 * Because `risk/engine.py` writes one signal per source object, a project with
 * four late milestones got four cards, and the wall of repeated red is what
 * destroyed the colour's meaning. `groupConditions` in `./conditions.ts`
 * collapses them to one card per rule; every instance is still here, still
 * individually expandable and still individually acknowledgeable, one level
 * in. Nothing is hidden — the count is on the card and the list is one click
 * away.
 *
 * ── Where colour is spent ─────────────────────────────────────────────────
 *
 * The severity model is documented in full at the head of `./conditions.ts`.
 * In this file it lands as ONE treatment, applied in ONE place:
 *
 *   The evidence sentence of the conditions in the single tier that
 *   `chromaticTier` allows, in `text-red-700`. Everything else on the surface
 *   is grey.
 *
 * Everything that used to be coloured is not: the icon tile carries CATEGORY
 * and is always neutral, the card border is always `--border`, the severity
 * badge is gone because the tier is named once in the heading above the rows,
 * and there is no amber anywhere — amber meant "warning", and a warning is a
 * threshold that has not been passed.
 *
 * The evidence line is what keeps the colour because it is the sentence that
 * STATES the breach — "Cumulative variations at 13.8% of budget (tolerance
 * 10%)". Painting the container instead put the colour on the box and left the
 * finding in grey.
 *
 * ── Palette ───────────────────────────────────────────────────────────────
 *
 * red-50/200/700 and the `--muted` / `--border` / `--card` / `--foreground`
 * tokens — the same 50/700/200 severity ramp as `statusColors.ts`. No colour,
 * radius, type size or spacing in this file is new, and there is no arbitrary
 * hex value in it.
 */
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Banknote, ChevronDown, ChevronRight, Clock, FileWarning, Info, ShieldAlert,
} from "lucide-react";
import {
  buildFigures, getCalculation, getCaveat, getMilestoneBreakdown,
} from "@/lib/riskFormat";
import { UnreadNotificationBadge } from "@/components/commons/UnreadNotificationBadge";
import type { Notification } from "@/types/notification";
import {
  type Condition, type RiskTier, TIER_LABEL, TIER_NOTE, TIER_ORDER,
  chromaticTier, groupConditions,
} from "./conditions";

// ── Types (mirror the backend serializer) ─────────────────────────────────

export interface RiskSignal {
  id: number;
  code: string;
  category: "delay" | "financial" | "compliance" | "claim";
  severity: "green" | "orange" | "red";
  status: "open" | "acknowledged" | "resolved" | "muted";
  title: string;
  detail: Record<string, any>;
  evidence: string;
  source_type: string | null;
  source_id: number | null;
  first_detected_at: string;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  acknowledgement_note: string;
  is_contractual: boolean;
}

const CATEGORY_ICON: Record<string, typeof Clock> = {
  delay: Clock,
  financial: Banknote,
  compliance: FileWarning,
  claim: ShieldAlert,
};

const CATEGORY_LABEL: Record<string, string> = {
  delay: "Programme",
  financial: "Financial",
  compliance: "Compliance",
  claim: "Claim",
};

/**
 * The evidence sentence's colour, and the only colour in the feed.
 *
 * `drawn` is true for the rows of the ONE tier `chromaticTier` allows — see
 * its comment. Everything else is grey, including tiers that the backend
 * graded red. There is no amber anywhere in this file: amber meant "warning",
 * and a warning is a threshold that has NOT been passed.
 */
const evidenceTone = (drawn: boolean) =>
  drawn ? "text-red-700" : "text-muted-foreground";

// ── The expandable "Why this fired" panel ─────────────────────────────────

/**
 * The numbers behind one finding.
 *
 * Unchanged in substance from the previous build — it was the one part of the
 * feed that was already doing its job. A recessed well rather than a second
 * bordered card, because a bordered box inside a bordered card double-lines
 * the edge.
 */
function WhyThisFired({ signal }: { signal: RiskSignal }) {
  const figures = buildFigures(signal.detail);
  const caveat = getCaveat(signal.detail);
  const calculation = getCalculation(signal.detail);
  const milestoneRows = getMilestoneBreakdown(signal.detail);

  return (
    <div className="mt-3 rounded-lg bg-muted/50 overflow-hidden">
      {figures.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-4 p-4">
          {figures.map((f) => (
            <div key={f.key}>
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p
                className={cn(
                  "text-sm mt-0.5 tabular-nums text-foreground",
                  f.emphasis && "font-semibold",
                )}
              >
                {f.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {calculation && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{calculation}</p>
        </div>
      )}

      {milestoneRows && (
        <div className="px-4 pb-4 -mt-1 space-y-1">
          {milestoneRows.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.milestone}</span>
              <span className="text-foreground tabular-nums">
                {m.percent_complete !== null && m.percent_complete !== undefined
                  ? `${m.percent_complete}% complete`
                  : "progress not tracked"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The legal caveat, given real weight: several rules report things that
          look contractual and are not, and that distinction has to survive all
          the way to the screen. */}
      {caveat && (
        /* Not amber. This callout most often says "commercial guide — NOT a
           contract breach", and painting a de-escalation in a warning colour
           says the opposite of what it reads. It is a note, drawn as one. */
        <div className="flex gap-2.5 px-4 py-3 bg-muted border-t border-border">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">
              {signal.is_contractual
                ? "Contractual breach"
                : "Commercial guide — not a contract breach"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{caveat}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-t border-border">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Rule {signal.code}
        </p>
      </div>

      {signal.acknowledgement_note && (
        <p className="text-xs text-foreground px-4 py-3 border-t border-border">
          <span className="text-muted-foreground">
            Note from {signal.acknowledged_by_name || "team"}:{" "}
          </span>
          {signal.acknowledgement_note}
        </p>
      )}
    </div>
  );
}

// ── One instance ──────────────────────────────────────────────────────────

/**
 * `showTitle` is false for a condition with a single instance: the card header
 * has already said the same sentence, and repeating it is the kind of doubled
 * ink that made the old feed feel like a dump.
 */
function InstanceRow({
  signal,
  drawn,
  showTitle,
  onAcknowledge,
  unreadNotifications,
}: {
  signal: RiskSignal;
  /** True only for rows in the one tier that may carry colour. */
  drawn: boolean;
  showTitle: boolean;
  onAcknowledge: (s: RiskSignal) => void;
  unreadNotifications?: Notification[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isAcknowledged = signal.status === "acknowledged";

  return (
    /*
      NO `opacity-60` ON AN ACKNOWLEDGED ROW.

      It used to carry one, which took muted text to 2.50:1 and the amber
      evidence line to 2.49:1 — roughly half the 4.5:1 minimum, across the
      whole Acknowledged section. An acknowledged risk is not a spent one: it
      is a live legal record, and the acknowledgement note and the name on it
      are exactly what an insurer reads this section for. Recession is carried
      by ORDER instead — acknowledged signals sit below the live feed — and by
      the row saying, in full-contrast text, who acknowledged it.
    */
    <div className="px-4 py-3">
      {showTitle && (
        <>
          <p className="text-sm text-foreground">{signal.title}</p>
          {signal.evidence && (
            <p className={cn("text-xs mt-0.5", evidenceTone(drawn))}>{signal.evidence}</p>
          )}
        </>
      )}

      <div className={cn("flex items-center gap-3", showTitle && "mt-2")}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Why this fired
        </button>

        {/*
          ACKNOWLEDGE HAS NO PERMISSION CHECK, AND THIS IS NOT AN OVERSIGHT
          THAT SHOULD BE FIXED HERE.

          Anyone who passes the route gate (`compliance.view`) can acknowledge,
          and the server agrees: `risk/views.py::RiskSignalActionView` is
          `permission_classes = [IsAuthenticated]` plus a project-membership
          check, with no permission code at all — for acknowledge, resolve AND
          mute. So a read-only viewer can write their name and a note into the
          contemporaneous record that the Evidence and Insurer tabs then
          disclose, and can mute a signal out of the feed entirely.

          Which code should gate it — `compliance.edit`, a new
          `risk.acknowledge`, or a role rule — is a permission-matrix decision
          with a server half, not a UI one, and inventing a client-side gate
          here would give the appearance of a control that the API does not
          have. Reported, not silently patched.
        */}
        {!isAcknowledged ? (
          <button
            type="button"
            onClick={() => onAcknowledge(signal)}
            className="text-xs text-primary hover:underline"
          >
            Acknowledge
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Acknowledged{signal.acknowledged_by_name ? ` by ${signal.acknowledged_by_name}` : ""}
          </span>
        )}

        <UnreadNotificationBadge notifications={unreadNotifications} />
      </div>

      {expanded && <WhyThisFired signal={signal} />}
    </div>
  );
}

// ── One condition ─────────────────────────────────────────────────────────

function ConditionCard({
  condition,
  drawn,
  onAcknowledge,
  unreadBySignalId,
}: {
  condition: Condition<RiskSignal>;
  /** True only for the one tier `chromaticTier` allows to be drawn. */
  drawn: boolean;
  onAcknowledge: (s: RiskSignal) => void;
  unreadBySignalId?: Record<string, Notification[]>;
}) {
  const grouped = condition.count > 1;
  // A grouped condition opens closed: the header already states the condition
  // and its worst instance, which is what the page is for. The list is one
  // click away for the reader who is about to act on a specific one.
  const [open, setOpen] = useState(false);
  const Icon = CATEGORY_ICON[condition.category] ?? FileWarning;
  const lead = condition.lead;
  // One rule can fire against several source objects (e.g. four overdue
  // milestones), each its own signal id and its own notification — sum
  // across every instance so a grouped-but-closed card still shows the
  // total, not just the lead instance's count.
  const unreadInCondition = condition.instances.flatMap(
    (s) => unreadBySignalId?.[String(s.id)] ?? [],
  );

  return (
    /*
      ONE COLOURED ELEMENT PER STATEMENT, AND IT IS THE ONE THAT NAMES THE
      BREACH.

      An earlier build of this card carried four marks on a breach — a filled
      icon tile, a red card border, a "Contractual" badge and a red evidence
      line — which is four ways of saying one thing and three of them said it
      about the box rather than about the finding. The card border and the tile
      are now always neutral, the badge is gone (the tier is named once, in the
      heading above these rows, so repeating it here is the chip row this page
      already removed once), and the colour sits on the evidence sentence: the
      one line that actually states what was breached and by how much.
    */
    <article className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Category, never severity. The icon says what KIND of thing this is
            — programme, financial, compliance, claim — and it said that while
            wearing a severity colour, which is why the colour read as noise. */}
        <div className="mt-0.5 p-1.5 rounded-md border bg-muted text-muted-foreground border-border">
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {condition.label}
                {grouped && (
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums font-normal">
                    {condition.count}
                  </span>
                )}
              </p>
              {/* The condition's evidence is its LONGEST-OPEN instance's
                  evidence, verbatim. Never a synthesised sentence, and never
                  called "worst": nothing on the payload ranks four overdue
                  milestones against each other. See `groupConditions`. */}
              {lead.evidence && (
                <p className={cn("text-xs mt-0.5", evidenceTone(drawn))}>
                  {grouped ? `Longest open: ${lead.evidence}` : lead.evidence}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <UnreadNotificationBadge notifications={unreadInCondition} />
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABEL[condition.category] ?? condition.category}
              </Badge>
            </div>
          </div>

          {grouped && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2"
            >
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {open ? "Hide" : "Show"} all {condition.count}
            </button>
          )}
        </div>
      </div>

      {/* Ungrouped: the single instance's actions sit straight under the
          header, with no repeated title. Grouped: the full list, on request. */}
      {(!grouped || open) && (
        <div className="border-t border-border divide-y divide-border">
          {condition.instances.map((s) => (
            <InstanceRow
              key={s.id}
              signal={s}
              drawn={drawn}
              showTitle={grouped}
              onAcknowledge={onAcknowledge}
              unreadNotifications={unreadBySignalId?.[String(s.id)]}
            />
          ))}
        </div>
      )}
    </article>
  );
}

// ── The feed ──────────────────────────────────────────────────────────────

/**
 * Live signals, grouped into conditions and sectioned by tier.
 *
 * The tier heading is where severity is SAID — once, above the rows it
 * governs, in words, with its count. That is what takes severity off the hue
 * channel entirely: a reader who cannot distinguish red from grey still reads
 * "Critical — contract breached 1" and then five more under "Critical —
 * tolerance exceeded", and rank inside each list is carried by position. The
 * colour, where there is any, is confirmation rather than the only signal.
 */
export function SignalFeed({
  signals,
  onAcknowledge,
  unreadBySignalId,
}: {
  signals: RiskSignal[];
  onAcknowledge: (s: RiskSignal) => void;
  unreadBySignalId?: Record<string, Notification[]>;
}) {
  const conditions = groupConditions(signals);
  if (conditions.length === 0) return null;

  // Exactly one tier may be drawn, and only if something in it has already
  // happened. On project 45 that is the single contractual breach, so the five
  // tolerance conditions below it render grey — which is the whole correction:
  // twelve red cards became one red sentence, and nothing was hidden to do it.
  const drawnTier = chromaticTier(conditions);

  return (
    <div className="space-y-6">
      {TIER_ORDER.map((tier) => {
        const inTier = conditions.filter((c) => c.tier === tier);
        if (inTier.length === 0) return null;

        return (
          <section key={tier} className="space-y-3">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                {TIER_LABEL[tier]}
                <span className="ml-2 text-xs text-muted-foreground tabular-nums font-normal">
                  {inTier.length}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{TIER_NOTE[tier]}</p>
            </div>
            <div className="space-y-3">
              {inTier.map((c) => (
                <ConditionCard
                  key={c.key}
                  condition={c}
                  drawn={tier === drawnTier}
                  onAcknowledge={onAcknowledge}
                  unreadBySignalId={unreadBySignalId}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Signals the team has already answered.
 *
 * Kept as a flat list rather than grouped: this is the administration record,
 * and each acknowledgement is a separate act by a named person with its own
 * note. Collapsing four acknowledgements into "4" would erase exactly the
 * thing an insurer is reading this section for.
 */
export function AcknowledgedList({
  signals,
  onAcknowledge,
  unreadBySignalId,
}: {
  signals: RiskSignal[];
  onAcknowledge: (s: RiskSignal) => void;
  unreadBySignalId?: Record<string, Notification[]>;
}) {
  if (signals.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">
          Acknowledged
          <span className="ml-2 text-xs text-muted-foreground tabular-nums font-normal">
            {signals.length}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Seen and answered. The note and the name are part of the contemporaneous record.
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {signals.map((s) => (
          <InstanceRow
            key={s.id}
            signal={s}
            drawn={false}
            showTitle
            onAcknowledge={onAcknowledge}
            unreadNotifications={unreadBySignalId?.[String(s.id)]}
          />
        ))}
      </div>
    </section>
  );
}
