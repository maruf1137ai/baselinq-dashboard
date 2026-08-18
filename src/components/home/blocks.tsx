/**
 * Homepage blocks.
 *
 * ── The container rule ────────────────────────────────────────────────────
 *
 * A section IS a panel. Its heading lives INSIDE the panel, on the card
 * surface — never as bare text on the page background.
 *
 * The shell below is not invented. It is the finance table shell, copied
 * verbatim from `src/components/finance/VariationOrdersTable.tsx:108` and
 * `paymentCertificateTable.tsx:585`, which is the app's real grammar for
 * "a titled container full of rows":
 *
 *   panel   bg-card border border-border rounded-xl overflow-hidden
 *   header  px-4 py-3
 *   rows    divide-y divide-border, px-4 py-2.5, hover:bg-muted/50
 *
 * No colour, radius, type size or spacing appears here that is not already in
 * `src/index.css` / `tailwind.config.ts`.
 *
 * ── The text rule ─────────────────────────────────────────────────────────
 *
 * **A figure and its label. A caveat only where its absence would mislead,
 * and then in as few words as possible.**
 *
 * The previous revision explained itself in prose — every panel carried a
 * sentence of preamble and every figure a sentence underneath ("Withheld at
 * 5% across posted certificates. No retention limit is recorded on this
 * contract."). The caveats were true and are not abandoned: the ones that
 * matter now live on `title` attributes, where a reader who wants them gets
 * them and a reader scanning four numbers is not made to read forty words.
 *
 * Cutting text has NOT been allowed to turn a caveat into a lie. Where a
 * figure could not be stated briefly and honestly it was cut, not softened —
 * that is why there is no "days overdue" anywhere on this page.
 *
 * ── The severity rule ─────────────────────────────────────────────────────
 *
 * One rule, applied everywhere on this page, stated so that anyone can apply
 * it to the next module without asking:
 *
 *   **1. Only a breach that has ALREADY HAPPENED may carry colour.** A
 *        threshold crossed, a date passed, a ceiling exceeded. Not a count,
 *        not a rating, not a forecast, not a category. "15 open risk signals"
 *        is a count and gets no colour however large it is; "certified past
 *        the revised contract sum" is a breach and gets one.
 *
 *   **2. A tier is named ONCE, at the head of the rows it governs — never
 *        repeated on every row.** Six rows sharing a severity is one heading,
 *        not six chips. Rank inside the tier is carried by POSITION.
 *
 *   **3. Within a module, only the WORST tier present is drawn in colour.**
 *        If anything is critical, the warnings are grey. The reader needs to
 *        know where the floor is, not to see the whole ladder painted.
 *
 *   **4. One coloured element per statement, and it is the element that
 *        NAMES the breach** — the badge or the tier word if there is one,
 *        otherwise the figure itself. Never both.
 *
 * The arithmetic this replaces: the Open risk panel drew six coloured words
 * (five "Critical", one "Warning") plus a red count in the strip above it,
 * so seven of the page's coloured elements said "urgent" at once. Under the
 * rule above the same data draws ONE — the "Critical" heading. That is the
 * whole point: alert acceptance falls roughly 30% per additional alert in
 * clinical decision-support studies, and override rates run 46-96%; colour
 * that appears on the majority of rows has stopped being a signal and become
 * a surface treatment.
 *
 * It is deliberately NOT "remove all colour" — an earlier revision did that
 * and read as bland. Colour is kept, and made rare enough to be worth
 * looking at.
 */
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, ShieldAlert, ShieldQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/formatCurrency";
import { FINANCE_TAB, riskGroupHref } from "@/lib/homeSignals";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { SETUP_LABELS } from "@/lib/homeSetup";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/hooks/useHomeData";

// ── Shared chrome ─────────────────────────────────────────────────────────

/** ProjectHealth's severity tiles, unchanged, plus the neutral it implies. */
const TONE: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-muted text-muted-foreground border-border",
};

type Tone = keyof typeof TONE;

/**
 * A titled container.
 *
 * **`icon` is for the states where the icon IS the message** — an outage, an
 * empty queue — and nowhere else. A populated panel gets its title and its
 * lead and no graphic: NN/g's finding is that superfluous graphics slow visual
 * search and that removing them makes the numbers more salient, and a bordered
 * container already says where the module starts and stops.
 */
export function Panel({
  title,
  lead,
  leadTone = "muted",
  hint,
  icon: Icon,
  tone = "neutral",
  action,
  children,
}: {
  title: string;
  /** Short quantitative line beside the title — "12 critical of 15 open". */
  lead?: string;
  /**
   * The panel header is the head of the rows beneath it, so it is a legal
   * place to name the worst severity tier ONCE (severity rule 2) — and it is
   * a line the panel already draws, so naming it here costs no height.
   * `danger` is only ever for a tier that is an actual breach (rule 1).
   */
  leadTone?: "muted" | "danger";
  /** A sentence under the title. Reserved for what a figure cannot carry. */
  hint?: string;
  icon?: typeof CalendarClock;
  tone?: Tone;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  // An empty array is still truthy, and rendering it would draw a 1px divider
  // strip under the header with nothing beneath it.
  const hasBody =
    children !== undefined &&
    children !== null &&
    children !== false &&
    !(Array.isArray(children) && children.length === 0);

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={cn("p-1.5 rounded-md border shrink-0", TONE[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-sm font-medium text-foreground">{title}</h2>
              {lead && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    leadTone === "danger" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {lead}
                </span>
              )}
            </div>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      {/* No body at all when there is nothing to list: an empty section is its
          header, and the lead or hint above has already said so. */}
      {hasBody && <div className="border-t border-border divide-y divide-border">{children}</div>}
    </section>
  );
}

/**
 * A heading strip inside a panel — a row-height label, not a second panel.
 *
 * **This is where severity is allowed to be said.** It lives here rather than
 * in ActionQueue.tsx because both lists on this page now group their rows and
 * label the group once (severity rule 2), and two lists inside the same panel
 * grammar must not invent two heading styles.
 *
 * **It is never coloured.** Severity rule 3 allows exactly one tier to be
 * drawn, and that is the worst one present, which is named in the panel
 * header instead — see `Panel`'s `leadTone`. A heading strip therefore only
 * ever marks a boundary, never an alarm.
 */
export function SectionHeading({
  label,
  count,
}: {
  label: string;
  /** Rows under this heading. Said once here instead of on each row. */
  count?: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-1.5 bg-muted/50">
      {/*
        `text-foreground`, not `text-muted-foreground`. Muted grey on this
        strip computes 4.19:1 against `bg-muted/50` over a card — under the
        4.5:1 floor for 12px text, and this label is now load-bearing: it is
        where severity is stated. It is still separated from the rows by size
        and by the strip's own fill, which is what was doing the work anyway.
      */}
      <p className="text-xs text-foreground">{label}</p>
      {count !== undefined && count > 1 && (
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}</span>
      )}
    </div>
  );
}

function ViewAll({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

/**
 * Label · figure · what it is measured against. Three lines, no prose.
 *
 * ── Why `compare` exists ──────────────────────────────────────────────────
 *
 * It is the replacement for the sentence that used to sit under every number.
 * Stripe makes the comparison range a first-class control and every Xero
 * Business Snapshot figure carries a prior-period delta; none of them writes
 * prose beneath a value. So wherever a figure previously needed explaining, it
 * now prints its **baseline** instead: not "Certified value against the
 * contract sum — a commercial measure, not physical progress" but
 * `82% of R 10 000 000,00`.
 *
 * A comparison is a figure, not prose, and it is held to that: one clause, no
 * verb, no caveat smuggled in. It also earns its line back — stating certified
 * against the contract sum here deleted a whole separate "Share of contract
 * sum" cell.
 *
 * `caveat` is the tooltip, and only for what neither the label nor the
 * comparison can carry honestly — that this contract records a retention rate
 * but no retention limit, for instance. It never holds anything the face of
 * the cell needed in order to be true.
 *
 * **No icon.** NN/g measured this directly: elements carrying superfluous
 * graphics make visual search harder, and elements without them make the
 * numbers more salient. Icons on this page appear only where they are the
 * control or the whole message (an outage, an empty queue).
 */
function Figure({
  label,
  value,
  compare,
  caveat,
  badge,
  emphasis = false,
  danger = false,
  to,
}: {
  /** Five words at most. */
  label: string;
  value: string | null;
  /** One comparison clause — a baseline, a rate, a split. Never a sentence. */
  compare?: string;
  caveat?: string;
  badge?: React.ReactNode;
  /** The figures a reader looks for first, at the stat size. */
  emphasis?: boolean;
  danger?: boolean;
  /**
   * Where the figure came from. A summary you cannot open is a poster: every
   * number here is the total of a list the app already has a page for, and
   * the reader's next question is always "which ones". Omitted only where no
   * list exists to open — a figure the engine could not compute.
   *
   * The gate is NOT here. Each cell is pushed inside the permission branch
   * that already decided the figure may be shown at all, so a link can never
   * become a way in to something the viewer was not served.
   */
  to?: string;
}) {
  // The row hover already used by every list on this page. Layout is
  // unchanged: the padding it needs is cancelled by an equal negative margin.
  const interactive =
    "rounded-lg -mx-2 px-2 -my-1 py-1 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const inner = (
    <>
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <div className="flex items-baseline gap-2 mt-0.5 min-w-0">
        {/*
          ── A number is never truncated ──────────────────────────────────

          This carried `truncate`. At exactly the `lg` breakpoint the strip
          gave each of five cells about 125px and "R 8 200 000,00" needs
          about 135px at 18px type, so it rendered as "R 8 200 0…" — a
          DIFFERENT NUMBER, presented with the same confidence as the right
          one, and an ellipsis is not a warning that digits are missing.

          A label may be truncated because a clipped word is recoverable from
          context. A figure may not. `break-words` is the fallback of last
          resort: if a cell is ever too narrow, the figure wraps and stays
          whole rather than clipping. The grid below is also fixed so the
          case does not arise in the first place.
        */}
        <p
          className={cn(
            "tabular-nums break-words",
            emphasis ? "text-lg" : "text-sm",
            danger ? "text-destructive" : "text-foreground",
          )}
        >
          {value ?? "—"}
        </p>
        {badge}
      </div>
      {compare && (
        // Same rule as the value above, and for the same reason: a comparison
        // is a FIGURE ("after R 410 000,00 retention", "82% of R 10 000
        // 000,00"), so it may wrap but it may never clip. It carried
        // `truncate` and lost digits off the retention deduction at the `lg`
        // breakpoint exactly as the value did.
        <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{compare}</p>
      )}
    </>
  );

  return to ? (
    <Link to={to} className={cn("min-w-0 block", interactive)} title={caveat}>
      {inner}
    </Link>
  ) : (
    <div className="min-w-0" title={caveat}>
      {inner}
    </div>
  );
}

// ── Action queue ──────────────────────────────────────────────────────────
//
// The queue is the page's reason to exist and lives in its own file, next to
// the pure ranking it renders. Re-exported here so every call site keeps
// importing blocks.
export { ActionQueueBlock, QueueRow } from "./ActionQueue";

// ── The position strip ────────────────────────────────────────────────────
//
// Six numbers, one row, above everything else on the page.
//
// This replaces two separate panels — "Key indicators" (a full panel low on
// the page, a paragraph of preamble and a sentence under every figure) and
// "Commercial position" (five more figures and a caption). Between them they
// stated retention twice and ran to about 385px of vertical space for what is
// a single question: *where does this project stand right now.*
//
// It is a STRIP and not a panel, and it draws nothing. GitHub, Jira and Linear
// all put analytics on a separate named surface — Insights, Dashboards, Views
// — and none of their home or queue surfaces renders a chart. The certified
// proportion is a number here (82%) and a bar on `/finance`; a bar restating a
// figure written out beside it was ink for no information.
//
// ── What was cut, and why it is not a lie ─────────────────────────────────
//
//   "Awaiting certification · N days" — CUT ENTIRELY, not shortened. It was
//       the elapsed wait on the live certificate, and it needed a sentence
//       ("time elapsed — this contract records no payment date to be measured
//       against") to stop being read as an overdue count. That certificate is
//       already the first row of the queue, where it says what to do about it.
//       Per the brief: where a figure cannot be shown briefly AND honestly,
//       cut the figure, not the honesty.
//
//   "Contract sum" and "N approved variations" — cut as reference. Certified
//       plus balance state the same position, and /finance owns the detail.
//
//   The retention caveat ("no retention limit is recorded on this contract")
//       survives on the cell's tooltip. `Project` carries a retention RATE and
//       no retention LIMIT, so "at 5%" is stated and no limit is implied.
//
// Nothing here is fetched that the page did not already fetch, and the gates
// are unchanged: the money cells require `finance.view` exactly as the old
// `MoneyLineBlock` did, and the risk cell reads `riskCounts`, which
// `visibleRiskSignals` has already filtered for this viewer.

export function PositionStripBlock({ data }: { data: HomeData }) {
  const {
    canViewFinance,
    canViewCompliance,
    money,
    retention,
    variationPosition: vos,
    variationsTruncated,
    riskCounts,
    riskUnavailable,
  } = data;

  const over = money.certifiedPct !== null && money.certifiedPct > 100;
  const cells: React.ReactNode[] = [];

  // Deep links use the finance tab labels verbatim — see `FINANCE_TAB`.
  const CERTIFICATES = `/finance?tab=${encodeURIComponent(FINANCE_TAB.certificates)}`;
  const VARIATIONS = `/finance?tab=${encodeURIComponent(FINANCE_TAB.variations)}`;

  if (canViewFinance) {
    cells.push(
      <Figure
        key="certified"
        // Certified to date IS the sum of the posted certificates. "Which
        // ones" is the only follow-on question it raises.
        to={CERTIFICATES}
        label="Certified to date"
        value={money.certified === null ? null : formatZAR(money.certified)}
        emphasis
        // Severity rule 4: ONE coloured element per statement, and it is the
        // element that NAMES the breach. "Over" names it; the rand figure is
        // just the figure. Drawing both red said the same thing twice and
        // spent two of the page's colour budget on one fact.
        badge={over ? <Badge variant="danger">Over</Badge> : undefined}
        // The comparison that used to be its own "Share of contract sum" cell
        // AND a sentence underneath. Certifying past an agreed sum is the one
        // judgement this strip makes, and the figure alone makes it.
        // The baseline named here is the REVISED sum — original plus approved
        // variations — because that is what the works are being carried out
        // for and what the server's own over-certification ceiling uses.
        compare={
          money.certifiedPct === null || money.revisedContractSum === null
            ? undefined
            : `${money.certifiedPct}% of ${formatZAR(money.revisedContractSum)}`
        }
        caveat={
          money.variations
            ? "Against the contract sum as revised by approved variations. A commercial measure, not physical progress — Baselinq records no measure of what has been built."
            : "A commercial measure, not physical progress. Baselinq records no measure of what has been built."
        }
      />,
      <Figure
        key="balance"
        // Balance moves only when a certificate is posted, so the certificate
        // list is the ledger behind it.
        to={CERTIFICATES}
        label="Balance remaining"
        value={money.balance === null ? null : formatZAR(money.balance)}
        emphasis
        // The retention deduction is the part a reader will not assume, so it
        // is the part the comparison line spends itself on.
        compare={
          money.retentionHeld
            ? `after ${formatZAR(money.retentionHeld)} retention`
            : money.certifiedPct === null
              ? undefined
              : `${Math.max(0, 100 - money.certifiedPct)}% remaining`
        }
        caveat="Contract sum as revised by approved variations, less certified value, less retention held."
      />,
      <Figure
        key="retention"
        // Retention is withheld certificate by certificate.
        to={CERTIFICATES}
        label="Retention held"
        value={retention.held === null ? null : formatZAR(retention.held)}
        emphasis
        compare={retention.ratePct === null ? undefined : `at ${retention.ratePct}%`}
        caveat={
          retention.ratePct === null
            ? "Withheld across posted certificates. No retention rate is recorded on this contract."
            : "Withheld across posted certificates. No retention limit is recorded on this contract."
        }
      />,
      <Figure
        key="variations"
        to={VARIATIONS}
        label="Variations awaiting decision"
        value={vos.total === 0 ? "—" : String(vos.outstanding)}
        emphasis
        badge={variationsTruncated ? <Badge variant="neutral">May be short</Badge> : undefined}
        compare={vos.total === 0 ? undefined : `of ${vos.total} raised`}
        caveat={
          vos.drafts > 0
            ? `${vos.drafts} further in draft — the raiser's own unfinished work, not waiting on anyone.`
            : undefined
        }
      />,
    );
  }

  // ── Risk ──────────────────────────────────────────────────────────────
  // Two different silences, and neither may be printed as a zero.
  //
  //   No `compliance.view` — `riskSignals` is empty because the viewer was
  //       never served it, and "0" would assert a clear project to somebody
  //       who was simply not shown it. The cell is absent instead.
  //   The engine did not answer — a zeroed count is indistinguishable from a
  //       healthy one, so it is said in a word rather than a number.
  if (canViewCompliance) {
    cells.push(
      riskUnavailable ? (
        <Figure
          key="risk"
          label="Open risk signals"
          value="Unknown"
          compare="engine did not respond"
          caveat="Treat this project's risk posture as unknown, not as clear."
        />
      ) : (
        <Figure
          key="risk"
          // The one figure whose destination really is Project health: a count
          // of open signals is a diagnosis, and the signals tab is where the
          // whole list lives with its evidence.
          to="/project-health?tab=risk-signals"
          label="Open risk signals"
          value={String(riskCounts.total)}
          emphasis
          // Severity rule 1: a COUNT is not a breach, so it carries no
          // colour however large it gets. "15" in red asserted an emergency
          // that the number alone cannot support — fifteen advisory signals
          // and fifteen tolerance breaches printed identically. The tiers
          // are stated in the comparison line and worked in the panel below,
          // where the worst one is named once and drawn once.
          compare={`${riskCounts.red} critical · ${riskCounts.orange} warning`}
        />
      ),
    );
  }

  // A viewer holding neither gate: nothing to summarise.
  if (cells.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl px-4 py-3">
      {/*
        Five across only from `xl`. It was `lg:grid-cols-5`, which at 1024px
        left each cell about 125px — too narrow for a rand figure at the stat
        size (see the note in `Figure`). At `xl` the content area is 976px and
        a cell is about 176px, which clears it. Between `sm` and `xl` the
        strip is three across and each cell has 200px or more.
      */}
      <div className="grid gap-x-6 gap-y-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">{cells}</div>
    </section>
  );
}

// ── Risk, as the project's condition ──────────────────────────────────────
//
// One line per rule that fired, worst first — see `groupRiskSignals`. Project
// 45's twelve open signals are five rules, and three of the twelve were the
// same sentence about three variations. They are now one line saying so.
//
// The signals are not lost and not summarised away: every one of them is on
// `/project-health`, in full, with its evidence and an Acknowledge control,
// and the panel's only action goes there.

export function RiskConditionBlock({ data }: { data: HomeData }) {
  const { riskGroups, riskCounts, riskUnavailable } = data;

  // An outage must never read as "healthy".
  if (riskUnavailable) {
    return (
      <Panel
        title="Risk"
        icon={ShieldQuestion}
        tone="orange"
        hint="The risk engine did not respond — posture unknown, not clear."
      />
    );
  }

  if (riskGroups.length === 0) return null;

  // Severity rule 2 and 3: the tier is said ONCE, at the head of the rows it
  // governs, and only the worst tier present is drawn in colour. Groups
  // already arrive worst-first from `groupRiskSignals`, so a single pass in
  // fixed tier order preserves that order exactly — no re-sorting here.
  const TIERS = [
    { severity: "red" as const, label: "Critical" },
    { severity: "orange" as const, label: "Warning" },
    { severity: "green" as const, label: "Advisory" },
  ];
  const present = TIERS.map((t) => ({
    ...t,
    groups: riskGroups.filter((g) => g.severity === t.severity),
  })).filter((t) => t.groups.length > 0);

  // The worst tier is named in the panel header rather than in a heading
  // strip of its own. Two reasons, and the second is the one that decided it:
  //
  //   1. The header IS the head of the rows beneath it, so this satisfies
  //      severity rule 2 exactly as a strip would.
  //   2. It is a line the panel already draws. A strip for every tier added
  //      56px to the taller of the two columns and pushed the page past the
  //      one-screen budget for a label the header had room to carry.
  //
  // So the first tier is stated above, and a strip appears only where the
  // list DROPS a tier — which is the only place a reader needs a boundary.
  const worst = present[0];
  return (
    <Panel
      title="Open risk"
      lead={`${worst.groups.reduce((n, g) => n + g.count, 0)} ${worst.label.toLowerCase()} of ${riskCounts.total} open`}
      leadTone={worst.severity === "red" ? "danger" : "muted"}
      // The one link on this page that is SUPPOSED to go to Project health:
      // "show me every open signal" is a diagnosis, and that is the page that
      // diagnoses. Every ROW below goes to the object instead.
      action={<ViewAll to="/project-health?tab=risk-signals">All signals</ViewAll>}
    >
      {/*
        ── Six coloured words became one ────────────────────────────────────

        The previous revision drew the whole row in its severity colour AND
        repeated the severity as a word at the end of it. On project 45 that
        is five rows of red text each ending in a red "Critical" and one of
        amber ending in an amber "Warning" — six of six rows coloured, which
        is a background, not a signal.

        Severity now behaves exactly like the queue's sections: the tier is
        stated once above the rows it governs, the rows themselves are plain,
        and rank inside the tier is position. The panel header names the worst
        tier and is the only coloured thing here; a strip marks each drop to a
        lower tier and is always muted. If the worst thing open is a warning,
        NOTHING on this panel is coloured, and that is the correct reading.

        `text-destructive` and `text-muted-foreground` are the tokens. The
        raw `red-700` / `amber-700` palette classes this block used are gone.
      */}
      {present.flatMap((tier, tierIndex) => [
        // The worst tier is already named in the header, so no strip for it.
        // Every LOWER tier gets one, always muted: rule 3 says only the worst
        // tier present is drawn in colour, and it has already been drawn.
        tierIndex === 0 ? null : (
          <SectionHeading
            key={`h-${tier.severity}`}
            label={tier.label}
            count={tier.groups.reduce((n, g) => n + g.count, 0)}
          />
        ),
        ...tier.groups.map((g) => (
          <Link
            key={g.code}
            /*
              The object, not the page about objects. `riskGroupHref` sends a
              lone signal to its own variation / certificate / milestone, and a
              folded group of N to the LIST holding all N — never to one of the
              N, which would name the wrong variation. Only a signal with no
              usable source falls back to Project health.
            */
            to={riskGroupHref(g)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {/*
              ── Two lines, and never a broken word ────────────────────────

              `truncate` cut these mid-word, so "3 variations exceed the
              principal agent…" and "3 variation tolerance breaches…" arrived
              as the same row. A risk headline names a rule, a figure and the
              tolerance it passed, and the distinguishing half is at the END.

              `line-clamp-2` wraps at a word boundary and only clips a headline
              that will not fit TWO lines, which no current rule produces. It
              costs nothing on the common case — a one-line row is still one
              line — and the severity word that used to compete for this space
              is gone, so the label starts wider than it was as well.
            */}
            <p className="text-sm text-foreground line-clamp-2 min-w-0 flex-1">
              {g.title}
              {/* Stated only when true of every signal in the group, so a
                  folded line never upgrades a commercial guide into a breach. */}
              {g.contractual && <span className="text-muted-foreground"> · contractual</span>}
            </p>
            {/* Only ever more than one signal folded into a line needs saying;
                a bare "1" beside a single sentence was decoration. */}
            {g.count > 1 && (
              <Badge variant="neutral" className="shrink-0 tabular-nums">
                {g.count}
              </Badge>
            )}
          </Link>
        )),
      ])}
    </Panel>
  );
}

// ── Contract time ─────────────────────────────────────────────────────────
//
// Off three real fields — Project.start_date, Project.end_date and
// Project.contract_end_date — derived in `summariseTime`.
//
// NOT gated on `finance.view`. Dates are not money: a contractor who may not
// see the contract sum still has to know when the works are due.
//
// **Every figure is a count of calendar days.** There is no bar and no
// percentage, because Baselinq holds no measure of physical progress and the
// old homepage's "50% complete at the halfway date" was elapsed calendar time
// wearing that measure's clothes.

/** "30 days" / "1 day" — never a bare number, never a percentage. */
const days = (n: number) => `${n} day${Math.abs(n) === 1 ? "" : "s"}`;

export function ContractTimeBlock({ data }: { data: HomeData }) {
  const t = data.time;

  if (!t.hasDates) {
    return <Panel title="Contract time" hint="No project timeline recorded." />;
  }

  // Only ever "past the contract completion date", which is a fact about the
  // contract, never "behind programme", which would be a judgement about the
  // works that nothing in Baselinq can support.
  const overrun = t.overrun && t.remainingDays !== null;

  return (
    <Panel title="Contract time" action={<ViewAll to="/programme">Programme</ViewAll>}>
      {/* Three cells, not four. This panel sits in a half-width column, and
          "15 Nov 2026" beside an extension badge does not fit a quarter of it.
          Days elapsed was the one figure of the four that decides nothing —
          remaining is what a reader wants and build length is its context —
          so it moved to the build-length tooltip, which already carries the
          two dates it is the difference between. */}
      <div className="px-4 py-3 grid gap-x-6 gap-y-4 grid-cols-2 sm:grid-cols-3">
        <Figure
          label={overrun ? "Past completion" : "Time remaining"}
          value={t.remainingDays === null ? null : days(Math.abs(t.remainingDays))}
          danger={overrun}
          badge={t.notStarted ? <Badge variant="neutral">Not started</Badge> : undefined}
          caveat="Calendar days against the contract dates. Not a measure of what has been built — Baselinq records none."
        />
        <Figure
          label="Build length"
          value={t.buildDays === null ? null : days(t.buildDays)}
          caveat={[
            t.start && t.contractEnd
              ? `${formatDateUk(t.start, "short", "—")} – ${formatDateUk(t.contractEnd, "short", "—")}.`
              : null,
            t.elapsedDays === null ? null : `${days(t.elapsedDays)} elapsed.`,
          ]
            .filter(Boolean)
            .join(" ") || undefined}
        />
        {/* contract_end_date is mutated by a signed variation granting an
            extension of time (backend: tasks/views_signing.py::
            _apply_vo_to_project), so a date differing from the one originally
            agreed is evidence of an EOT and not a typo. The badge is the one
            movement worth showing. */}
        <Figure
          label="Completion"
          value={t.contractEnd ? formatDateUk(t.contractEnd, "short", "—") : null}
          badge={
            // Severity rule 1: an extension of time is a RECORDED FACT — a
            // signed variation moved the completion date — not a breach and
            // not a warning. It wore `warning` amber, which put the page's
            // second-loudest colour on the one figure here that nobody has
            // done anything wrong to earn. The sign on the number already
            // says which way the date moved.
            t.extensionDays !== null && t.originalEnd ? (
              <Badge variant="neutral">
                {t.extensionDays > 0
                  ? `+${days(t.extensionDays)}`
                  : `−${days(Math.abs(t.extensionDays))}`}
              </Badge>
            ) : undefined
          }
          caveat={
            t.originalEnd
              ? `Originally ${formatDateUk(t.originalEnd, "short", "—")}, moved by a signed extension of time.`
              : undefined
          }
        />
      </div>
    </Panel>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────

/**
 * Project setup as ONE line, at the very top of the page. It is a precondition
 * for the rest of the screen being trustworthy, so it sits above it — but a
 * precondition is not the work, so it gets a hairline strip and nothing more.
 *
 * **It draws no container of its own.** It is a ROW inside the single
 * precondition panel that `Index.tsx` builds — see the note there. It used to
 * carry `bg-card border border-border rounded-xl` and be one of up to four
 * separately-bordered full-width blocks stacked above the actual work.
 */
export function SetupLineBlock({
  data,
  onOpen,
  onOpenSection,
}: {
  data: HomeData;
  onOpen: () => void;
  onOpenSection: (section: string) => void;
}) {
  const { projectStats, canEditProject } = data;
  if (!projectStats || projectStats.percentage === 100) return null;

  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm text-muted-foreground min-w-0">
        <span className="text-foreground tabular-nums">
          Project setup {projectStats.filledCount} of {projectStats.totalCount}
        </span>
        {" — "}
        {projectStats.missing.map((item, i) => (
          <span key={item}>
            {i > 0 && (i === projectStats.missing.length - 1 ? " and " : ", ")}
            {canEditProject ? (
              <button
                onClick={() => onOpenSection(item)}
                className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {SETUP_LABELS[item]}
              </button>
            ) : (
              <span className="text-foreground">{SETUP_LABELS[item]}</span>
            )}
          </span>
        ))}
        {" still to add."}
      </p>
      {canEditProject && (
        <Button size="xs" variant="outline" className="shrink-0" onClick={onOpen}>
          Complete setup
        </Button>
      )}
    </div>
  );
}

// ── Load banner ───────────────────────────────────────────────────────────

/** One line, one action. Never three stacked permanent banners. */
export function LoadIssueBanner({ data }: { data: HomeData }) {
  if (data.loadIssue.level !== "partial") return null;
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">{data.loadIssue.message}</p>
      </div>
      <Button variant="outline" size="xs" className="shrink-0" onClick={data.retryFailed}>
        Try again
      </Button>
    </div>
  );
}
