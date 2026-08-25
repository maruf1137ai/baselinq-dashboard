/**
 * The severity model for the risk feed, and the grouping that makes it mean
 * something.
 *
 * ── The problem this exists to fix ────────────────────────────────────────
 *
 * The feed rendered one card per risk signal, and painted that card by
 * `severity`. On project 45 that produced twelve red cards out of fifteen. A
 * page where four fifths of the objects are the loudest colour has no
 * hierarchy at all: the reader cannot tell the variation issued above the
 * delegated mandate — an actual breach of a contract term — from the fifth
 * milestone that slipped past a date on a programme.
 *
 * The correction is NOT to desaturate. An earlier revision was rejected for
 * being "too bland, all same colour", and it deserved to be: a risk page that
 * will not raise its voice for anything is as useless as one that shouts at
 * everything. The correction is to make the loud mark RARE, by fixing two
 * things that were both inflating it.
 *
 * ── One: a red count was counting instances, not conditions ───────────────
 *
 * `risk/engine.py` upserts one signal per SOURCE OBJECT — one per milestone,
 * one per certificate, one per variation — deduped on `source_object_id`. So
 * "twelve critical" is not twelve crises. On project 45 it is four milestones
 * past their dates, three certificates past the date for payment, two packages
 * over the variation tolerance, one baseline slip, one certification
 * divergence and one mandate breach: SIX conditions, of which one is a breach
 * of contract.
 *
 * `groupConditions` reports the six. Every instance is still on the page and
 * still individually acknowledgeable — nothing is hidden — but the reader
 * counts conditions, which is what a diagnosing principal agent actually
 * wants to know, and the page stops spending its loudest mark twelve times on
 * one repeated finding.
 *
 * ── Two: `severity` is a threshold verdict, not a rank ────────────────────
 *
 * The backend's red/orange/green is each rule deciding, on its own, whether
 * its own threshold was passed. Most of those thresholds are POLICY — they
 * live on `ProjectRiskPolicy` (`vo_tolerance_pct`, `slippage_days`,
 * `payment_terms_days`) and a user can change them in settings. A figure past
 * a number somebody typed into a settings page is a real and useful warning,
 * but it is not the same kind of statement as "clause 17.1 was broken".
 *
 * The backend already draws that distinction and the UI was throwing it away.
 * `detail.contractual` is set by the rules that assert an actual contractual
 * position and surfaced as `is_contractual` by
 * `risk/serializers.py::get_is_contractual`, which exists, in its own words,
 * so the UI can avoid implying a contract has been breached when it has not.
 *
 * ── The scale ─────────────────────────────────────────────────────────────
 *
 *   breach     `is_contractual`      A contract term has been broken.
 *                                    THE ONLY FILLED RED OBJECT IN THE FEED.
 *   tolerance  severity red          A configured threshold has been passed.
 *                                    Red TEXT on the evidence line. No fill.
 *   watch      severity orange       Approaching one. Amber text. No fill.
 *   noted      severity green        On the record. Grey.
 *
 * Four treatments, one of which is loud — so the loud one still reads as loud.
 * The tiers are also the page's sort order and are named in the feed's
 * headings, so the scale is stated rather than left for the reader to infer
 * from how red something looks.
 *
 * Nothing here invents a severity. Every tier is a function of two fields the
 * serializer already sends.
 */

/** Worst first. The order is the feed's reading order. */
export type RiskTier = "breach" | "tolerance" | "watch" | "noted";

export const TIER_ORDER: readonly RiskTier[] = ["breach", "tolerance", "watch", "noted"] as const;

/**
 * Section headings for the feed.
 *
 * ── Why these words and not others ────────────────────────────────────────
 *
 * The homepage names the backend's three severities Critical / Warning /
 * Advisory. Project Health is the canonical risk surface and must not label
 * the same signals differently — a reader who sees "12 critical" on the
 * homepage has to find twelve criticals here, or one of the two screens is
 * lying.
 *
 * So the homepage's words are kept exactly, and the one distinction this page
 * has the room to draw is added INSIDE the top word rather than beside it:
 * "Critical" splits into the criticals that broke a term of the contract and
 * the criticals that passed a threshold somebody configured. The two together
 * are the homepage's critical count, so the figures still reconcile, and the
 * finer grain lives on the surface that is read rather than scanned.
 */
export const TIER_LABEL: Record<RiskTier, string> = {
  breach: "Critical — contract breached",
  tolerance: "Critical — tolerance exceeded",
  watch: "Warning",
  noted: "Advisory",
};

/** One line under each heading, so the scale explains itself to a first reader. */
export const TIER_NOTE: Record<RiskTier, string> = {
  breach: "A term of the contract has been breached.",
  tolerance: "A threshold configured on this project has been passed. Serious, and not on its own a breach of contract.",
  watch: "Approaching a threshold. Nothing has been passed.",
  noted: "On the record. Nothing has been passed.",
};

const TIER_RANK: Record<RiskTier, number> = {
  breach: 0,
  tolerance: 1,
  watch: 2,
  noted: 3,
};

/** The subset of the risk-signal serializer this module reads. */
export interface SignalLike {
  id: number;
  code: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  evidence?: string;
  is_contractual?: boolean;
  /** ISO timestamp. The only magnitude comparable across every rule. */
  first_detected_at?: string;
}

/**
 * The tier of one signal.
 *
 * `is_contractual` outranks `severity` because it is a different KIND of
 * statement, not a higher degree of the same one. Every rule that sets it
 * today also emits red, so this is a refinement of the top of the scale
 * rather than a promotion of anything.
 */
export function tierOf(signal: SignalLike): RiskTier {
  if (signal.is_contractual) return "breach";
  if (signal.severity === "red") return "tolerance";
  if (signal.severity === "orange") return "watch";
  return "noted";
}

/**
 * Rule names, for the case where one rule has fired on several objects.
 *
 * A group headline has to name the CONDITION, and the backend only writes
 * per-instance titles ("Milestone overdue — Ground floor slab"). These are the
 * plural forms of the eight rules in `risk/rules/`, and they are the only
 * strings in this module that are not read off the payload — so a rule that is
 * not in this map falls back to the code itself rather than to a guess, and a
 * condition with exactly ONE instance never uses this map at all: it keeps the
 * backend's own title verbatim.
 */
const CONDITION_LABEL: Record<string, string> = {
  MILESTONE_OVERDUE: "Milestones past their dates",
  SCHEDULE_SLIPPAGE: "Programme slipped against the baseline",
  PAYMENT_OVERDUE: "Certificates past the date for payment",
  PC_CERTIFICATION_DIVERGENCE: "Certified value diverges from measured progress",
  VO_TOLERANCE_BREACH: "Variations above the project tolerance",
  VO_MANDATE_BREACH: "Variations issued above the delegated mandate",
  VO_RATE_VARIANCE: "Variation rates above the schedule",
  TIME_BAR_APPROACHING: "Notice periods closing",
  CLAIM_NOTIFIED: "Claims notified",
  IC_RISK_HIGH: "Intentions to claim assessed high risk",
};

/** `MILESTONE_OVERDUE` → `Milestone overdue`. Only ever a fallback. */
function fromCode(code: string): string {
  const words = code.replace(/_/g, " ").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface Condition<T extends SignalLike = SignalLike> {
  /** The rule code. Stable across refreshes, so it is a safe React key. */
  key: string;
  code: string;
  /** The instance's own title where there is one instance; the rule's name where there are several. */
  label: string;
  category: string;
  tier: RiskTier;
  /**
   * The instance whose evidence line heads the card: the most severe, and
   * among equals the one that has been open longest. NOT "the worst" — see
   * `groupConditions` for why that cannot be said.
   */
  lead: T;
  /** Every instance, in the order described at `lead`. `lead` is `instances[0]`. */
  instances: T[];
  count: number;
}

const SEVERITY_RANK: Record<string, number> = { red: 0, orange: 1, green: 2 };

/**
 * Group signals into conditions, worst first.
 *
 * Grouping key is `code` — the rule — because that is the unit a reader acts
 * on. Four overdue milestones are one problem with the programme, not four
 * problems; the four are still listed, inside the one card.
 *
 * Order within a tier is by instance count descending, so the condition that
 * has recurred most is read first, then by label for stability.
 *
 * ── Order WITHIN a condition, and what it deliberately does not claim ─────
 *
 * Severity first, then FIRST DETECTED, oldest first.
 *
 * The obvious ordering would be "worst instance first", and it cannot be
 * done. Comparing four overdue milestones by how overdue they are means
 * reading `days_overdue`; comparing three late certificates means reading
 * `days_overrun` and an amount; comparing two tolerance breaches means a
 * percentage over a configured percentage. `detail` is a free-shaped payload
 * whose keys differ per rule, there is no magnitude field common to all of
 * them, and inventing a cross-rule badness score to rank a slipped milestone
 * against a late payment is exactly the kind of fabricated calibration this
 * page exists to avoid.
 *
 * `first_detected_at` is real, is on every signal, and means something a
 * reader can act on: this is the instance that has been sitting longest. So
 * that is what leads, and the card says "Longest open", which is true, rather
 * than "Worst", which would not be.
 */
export function groupConditions<T extends SignalLike>(signals: T[]): Condition<T>[] {
  const byCode = new Map<string, T[]>();
  for (const s of signals) {
    const list = byCode.get(s.code);
    if (list) list.push(s);
    else byCode.set(s.code, [s]);
  }

  const conditions: Condition<T>[] = [];

  for (const [code, group] of byCode) {
    const instances = [...group].sort((a, b) => {
      const ra = TIER_RANK[tierOf(a)] - TIER_RANK[tierOf(b)];
      if (ra !== 0) return ra;
      const sa = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
      if (sa !== 0) return sa;
      // Oldest first. An absent timestamp sorts last rather than first: a row
      // we cannot date must not be presented as the longest-standing one.
      const ta = Date.parse(a.first_detected_at ?? "") || Number.POSITIVE_INFINITY;
      const tb = Date.parse(b.first_detected_at ?? "") || Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.title.localeCompare(b.title);
    });

    const lead = instances[0];

    conditions.push({
      key: code,
      code,
      // One instance keeps the backend's own sentence. Several take the rule's
      // name, because no one instance's title describes the set.
      label:
        instances.length === 1
          ? lead.title
          : (CONDITION_LABEL[code] ?? fromCode(code)),
      category: lead.category,
      // The condition is as serious as its worst instance.
      tier: instances.reduce<RiskTier>(
        (worst, s) => (TIER_RANK[tierOf(s)] < TIER_RANK[worst] ? tierOf(s) : worst),
        "noted",
      ),
      lead,
      instances,
      count: instances.length,
    });
  }

  return conditions.sort((a, b) => {
    const t = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (t !== 0) return t;
    if (a.count !== b.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

/**
 * The one tier that may be drawn in colour, or null.
 *
 * Two rules, both borrowed from the homepage so that the two screens do not
 * disagree about what red means:
 *
 *   Only the WORST tier present in a surface is drawn. If anything is a
 *   contractual breach, the tolerance breaches below it render grey — they
 *   have not stopped being serious, they have stopped being the thing to read
 *   first, and rank inside a list is carried by position, not by hue.
 *
 *   Only a breach that has ALREADY HAPPENED may carry colour — a date passed,
 *   a tolerance exceeded, a ceiling crossed. `watch` is a deadline that has
 *   not arrived and `noted` is a fact on the record; neither has happened, so
 *   neither is ever drawn, even when it is the worst thing on the page. A
 *   project whose worst signal is a warning is a project with no colour on it,
 *   and that is the correct picture.
 */
export function chromaticTier<T extends SignalLike>(
  conditions: Condition<T>[],
): RiskTier | null {
  for (const tier of TIER_ORDER) {
    if (!conditions.some((c) => c.tier === tier)) continue;
    return tier === "breach" || tier === "tolerance" ? tier : null;
  }
  return null;
}
