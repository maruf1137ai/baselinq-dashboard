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
  hint,
  icon: Icon,
  tone = "neutral",
  action,
  children,
}: {
  title: string;
  /** Short quantitative line beside the title — "10 red · 2 amber". */
  lead?: string;
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
                <span className="text-xs text-muted-foreground tabular-nums">{lead}</span>
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
        <p
          className={cn(
            "tabular-nums truncate",
            emphasis ? "text-lg" : "text-sm",
            danger ? "text-destructive" : "text-foreground",
          )}
        >
          {value ?? "—"}
        </p>
        {badge}
      </div>
      {compare && (
        <p className="text-xs text-muted-foreground tabular-nums truncate mt-0.5">{compare}</p>
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
        danger={over}
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
          danger={riskCounts.red > 0}
          compare={`${riskCounts.red} red · ${riskCounts.orange} amber`}
        />
      ),
    );
  }

  // A viewer holding neither gate: nothing to summarise.
  if (cells.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="grid gap-x-6 gap-y-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">{cells}</div>
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

  return (
    <Panel
      title="Open risk"
      lead={`${riskCounts.red} red · ${riskCounts.orange} amber`}
      // The one link on this page that is SUPPOSED to go to Project health:
      // "show me every open signal" is a diagnosis, and that is the page that
      // diagnoses. Every ROW below goes to the object instead.
      action={<ViewAll to="/project-health?tab=risk-signals">All signals</ViewAll>}
    >
      {/*
        ── Colour is on the BREACH, not on the count ────────────────────────

        This block used to render the group's TITLE — the sentence that states
        what has gone wrong — in plain foreground, and put the severity colour
        on the count badge beside it. That is the inversion: "Cumulative
        variations at 13.8% of budget (tolerance 10%)" is an actual breach of
        an actual tolerance and read as neutral body text, while "1" — a count,
        which has no state at all — was the only red thing on the row.

        So the colour moved onto the thing that has state. A red or amber group
        states its severity in words, in its severity colour; the count stays
        neutral because a count is not a condition. A green group is drawn in
        neither, because nothing about it has breached anything.
      */}
      {riskGroups.map((g) => {
        const breached = g.severity === "red" || g.severity === "orange";
        return (
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
            <p
              className={cn(
                "text-sm truncate min-w-0 flex-1",
                g.severity === "red"
                  ? "text-red-700"
                  : g.severity === "orange"
                    ? "text-amber-700"
                    : "text-foreground",
              )}
            >
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
            {breached && (
              <span
                className={cn(
                  "text-xs shrink-0",
                  g.severity === "red" ? "text-red-700" : "text-amber-700",
                )}
              >
                {g.severity === "red" ? "Critical" : "Warning"}
              </span>
            )}
          </Link>
        );
      })}
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
            t.extensionDays !== null && t.originalEnd ? (
              <Badge variant={t.extensionDays > 0 ? "warning" : "neutral"}>
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
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
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
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between gap-4">
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
