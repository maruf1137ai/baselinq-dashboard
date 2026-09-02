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
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CheckCircle2, ShieldAlert, ShieldQuestion, X } from "lucide-react";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/formatCurrency";
import { FINANCE_TAB, riskGroupHref } from "@/lib/homeSignals";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { SETUP_LABELS } from "@/lib/homeSetup";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/hooks/useHomeData";
import { useScrollPagination } from "@/hooks/useScrollPagination";

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
 * **What KIND of panel this is, and it is the only thing that ranks them.**
 *
 * ── The regression this exists to undo ───────────────────────────────────
 *
 * Three panels sat on one screen — the queue, open risk, what changed — in
 * one identical treatment: same header, same title weight, same card surface,
 * same leading date pill, same row shape. The owner's words looking at the
 * live page were "very samey samey", and he was right. An information-design
 * pass had put the pill on all three to get them into horizontal register,
 * and register bought at the price of making three different KINDS of list
 * interchangeable is a bad trade: the reader then has to READ a heading to
 * know which list they are in, on a page whose whole argument is that you
 * should not have to.
 *
 * ── The two classes ──────────────────────────────────────────────────────
 *
 *   `primary`    The work. Exactly ONE panel on this page is this, and it is
 *                the queue — the page's reason to exist. Card surface kept,
 *                and a heavier title than anything else on the screen.
 *   `reference`  True whether or not anybody acts today. Its header sits on
 *                the WELL fill, which is the elevation ramp already documented
 *                in BRAND-GUIDELINES §1 (card 99% → page 95% → well 91%) and
 *                already drawn by `SectionHeading` a few pixels below it. A
 *                recessed header reads as recessed before a word of it is
 *                read, and it recesses the whole panel by association.
 *
 * Both are zero-height: a fill and a font weight on a line the panel already
 * draws. No token is introduced, no colour is spent, and the severity rule is
 * untouched — `bg-muted` is the neutral surface in the ramp, not a status.
 *
 * **It is a property of the PANEL, not of its state.** Every state the queue
 * can be in — populated, loading, empty, degraded — is `primary`, and every
 * state of `Open risk` and `What changed` is `reference`. A panel that changed
 * rank when its data went quiet would teach the reader nothing, and an empty
 * queue is still the thing you came to the page to check.
 *
 * Omitting the prop leaves a panel exactly as it was, for call sites off this
 * page that have no such hierarchy to express.
 */
type Emphasis = "primary" | "reference";

/**
 * A titled container.
 *
 * **`icon` is for the states where the icon IS the message** — an outage, an
 * empty queue — and nowhere else. A populated panel gets its title and its
 * lead and no graphic: NN/g's finding is that superfluous graphics slow visual
 * search and that removing them makes the numbers more salient, and a bordered
 * container already says where the module starts and stops.
 *
 * `emphasis` ranks one panel against another — see the note above `Emphasis`.
 */
export function Panel({
  title,
  lead,
  leadTone = "muted",
  hint,
  icon: Icon,
  tone = "neutral",
  emphasis,
  action,
  segments,
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
  /** `warning` exists so a panel whose worst state is "soon" can say so
   *  without borrowing the red that means "already breached". */
  leadTone?: "muted" | "warning" | "danger";
  /** A sentence under the title. Reserved for what a figure cannot carry. */
  hint?: string;
  icon?: typeof CalendarClock;
  tone?: Tone;
  /** See the note above: `primary` is the work, `reference` is everything else. */
  emphasis?: Emphasis;
  action?: React.ReactNode;
  /**
   * A switcher drawn as a second header row, beneath the title.
   *
   * It lives in the header rather than above the panel so that one bordered
   * container holds the control and the list it governs. A switcher floating
   * outside the card reads as page furniture and leaves the reader to work
   * out which panel it drives — which is the exact ambiguity folding three
   * panels into one was meant to remove.
   *
   * The title and lead stay: they belong to the ACTIVE segment and say what
   * is in the list, which a tab label alone cannot ("Project risk" plus
   * "13 critical of 14 open signals").
   */
  segments?: React.ReactNode;
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
    <section className="bg-card border border-border rounded-xl overflow-hidden flex flex-col w-full">
      <header
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 lg:shrink-0",
          // The recessed header. `bg-muted/50` is the well fill this page
          // already uses for `SectionHeading`, at the same opacity, so a
          // reference panel's header and its own heading strips are one
          // material and the primary panel is the only card-surfaced header
          // on the screen. Separated from a strip by height and title size,
          // which is what was distinguishing them anyway.
          emphasis === "reference" && "bg-muted/50",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={cn("p-1.5 rounded-md border shrink-0", TONE[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              {/*
                `font-semibold` on the primary panel and nowhere else.

                The queue's ROWS already took `font-medium` — the page's one
                content weight — in the previous change, on the argument that
                the list which asks a person to move is the list that gets the
                weight. Carrying that up to its own title is the same argument
                applied one level higher: the queue's heading now outranks the
                two headings beside it by exactly the step its rows outrank
                their rows. No new size, and `font-semibold` is already in the
                app; this page simply had no use for it until there was a
                genuine top of the hierarchy to mark.
              */}
              <h2
                className={cn(
                  "text-sm text-foreground",
                  emphasis === "primary" ? "font-semibold" : "font-medium",
                )}
              >
                {title}
              </h2>
              {lead && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    leadTone === "danger"
                      ? "text-destructive"
                      : leadTone === "warning"
                        ? "text-amber-700"
                        : "text-muted-foreground",
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

      {segments && (
        <div className="px-4 pb-3 lg:shrink-0 border-b border-border">{segments}</div>
      )}

      {/* No body at all when there is nothing to list: an empty section is its
          header, and the lead or hint above has already said so. */}
      {hasBody && (
        <div
          className={cn(
            "divide-y divide-border lg:flex-1 lg:min-h-0",
            // The segments row already drew the rule under the header.
            !segments && "border-t border-border",
          )}
        >
          {children}
        </div>
      )}
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
  note,
}: {
  label: string;
  /** Rows under this heading. Said once here instead of on each row. */
  count?: number;
  /**
   * The heading's qualifier, in the tooltip rather than in the label.
   *
   * The queue's headings used to read "Contract deadlines · project-wide" and
   * "Escalated to you to chase". Both suffixes are honest — they say whose
   * the rows actually are — but a disclosure set in heading position reads as
   * an apology attached to every row beneath it, and two of them made a
   * ten-row list look like five lists. The qualification is still one hover
   * away and is still written down in `SECTIONS`; it is no longer the second
   * half of the label.
   */
  note?: string;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 px-4 py-1.5 bg-muted/50"
      title={note}
    >
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

/**
 * **The leading DEADLINE slot. The queue draws it. Nothing else does.**
 *
 * ── It was given to all three lists, and that was the error ──────────────
 *
 * The reasoning that spread it is preserved here because it was half right
 * and the half that was right still holds. The queue's headlines began at
 * x≈108px — an 80px tile plus a 12px gap — while risk rows and change rows,
 * drawn in the same panel grammar, began at x≈16px. Two visually identical
 * lists, 92px apart at the one edge the eye uses to tell a list is a list.
 * That ragged edge was real.
 *
 * What was wrong was the remedy. Registering three lists by giving all three
 * the same leading object made them **identical**, and they are not the same
 * kind of thing. Worse, two of the three pills carried nothing: `Open risk`
 * printed `first_detected_at`, which on the live project reads "17 Aug" on
 * every one of five rows, and `What changed` printed the event date, likewise
 * identical down the column — and to make room for it, that panel's relative
 * time ("yesterday", "6 days ago"), which is the only recency statement a
 * reader of a history actually uses, was deleted. **A column of identical
 * values occupying the strongest position in every row is not register, it is
 * noise with good posture.**
 *
 * So the register requirement is met where it is real and dropped where it is
 * not. **Risk and change are stacked in the SAME column, one directly above
 * the other, and they align with each other exactly** — both start their text
 * at the panel's left edge, both terminate at the right, and that is where a
 * ragged edge would actually have been read as one. The queue is alone in the
 * other column with nothing above or below it, and reads at its own indent
 * because it is a different kind of list.
 *
 * Register is a within-column obligation. Across a 16px gutter, between two
 * lists that are not the same kind of thing, it is a false one — and paying
 * for it in sameness is the trade the owner objected to.
 *
 * It stays exported from here rather than moving back into `ActionQueue.tsx`
 * because the deletion note directly below is the other half of this argument
 * and the two belong on one screen.
 *
 * ── What the tile shows ──────────────────────────────────────────────────
 *
 * Day and short month, on `bg-muted` in `text-foreground`. The YEAR appears
 * only when the date falls outside the current year: four characters on every
 * row for a fact identical on nearly all of them is exactly the noise this
 * page is removing, and a deadline eighteen months out must never be mistaken
 * for one this year.
 *
 * ── What it does NOT show ────────────────────────────────────────────────
 *
 * Nothing at all when the row has no date. Not a dash, not a placeholder: "—"
 * in a date tile reads as a date that failed to load, and these have not
 * failed to load — a certificate awaiting certification genuinely has no due
 * date anywhere in the payload. The slot keeps its width so the headlines
 * still align, and the row says which kind of absence it is elsewhere (the
 * queue's chip reads "Not dated" or "No date").
 *
 * ── Colour ───────────────────────────────────────────────────────────────
 *
 * None, ever. Severity rule 4 gives the ink to the element that NAMES the
 * breach — the chip, which knows whether the clock has run out. A date is a
 * fact about the calendar and is the same fact whether it has passed or not.
 *
 * ── Accessibility ────────────────────────────────────────────────────────
 *
 * `aria-hidden`, always. Every row that draws one states the date in full, in
 * words and with its year, in its own `aria-label` or `title`. A screen-reader
 * user must not be handed "5 Aug" as a second, worse copy of it — and must
 * never be handed a bare date with no word saying whether it is a deadline or
 * a day something happened.
 *
 * ── Now that only one list draws it, it means one thing ──────────────────
 *
 * A pill at the head of a row on this page is a DEADLINE. It was ambiguous
 * while three lists drew it and a reader had to know which panel they were in
 * to know whether "17 Aug" was a date to hit or a date something happened.
 */
export const ROW_DATE_SLOT = "w-20 shrink-0";

export function RowDate({ date }: { date: string | null | undefined }) {
  const parsed = date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    // An EMPTY slot read as a date that failed to load, and left the column
    // looking broken. These rows have no deadline on the wire — a rejected
    // certificate, a proposed meeting action — and borrowing `updatedAt`
    // would present "when somebody last touched it" as a due date. So the
    // slot says what is true, in the same words `MyActions` already uses for
    // the same absence.
    return (
      <div
        className={`${ROW_DATE_SLOT} text-xs text-muted-foreground text-center`}
        title="No deadline is recorded for this item"
      >
        No date
      </div>
    );
  }

  const day = parsed.getDate();
  const month = parsed.toLocaleDateString("en-GB", { month: "short" });
  const sameYear = parsed.getFullYear() === new Date().getFullYear();
  const year = String(parsed.getFullYear()).slice(2);

  return (
    <div
      className={`${ROW_DATE_SLOT} rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-foreground text-center`}
      aria-hidden
    >
      {`${day} ${month}${sameYear ? "" : ` ${year}`}`}
    </div>
  );
}

/*
  ── `RowTally` WAS HERE, AND IS DELETED ───────────────────────────────────

  A leading slot on the risk rows carrying "×3" for a folded group — the
  replacement for the useless `first_detected_at` pill, on the reasoning that
  a risk row is a standing condition and the fact distinguishing one line from
  the next is how many signals it folds.

  It was built, rendered and then removed, because seen on the page it printed
  the number TWICE:

      ×3   3 variations exceed the principal agent's authority tolerance

  `groupRiskSignals` writes the count into the title of every folded group —
  through `RISK_GROUP_TITLE[code](n)`, or through the `· +N more` fallback —
  so the count is already the sentence's own first token in exactly the rows a
  tally would appear on, and absent from exactly the rows where it would be
  blank. A leading column of it is redundant on every row it draws and empty on
  every row it does not, which is a worse version of the pill it replaced.

  The trailing `Badge` holding the same count is gone for the same reason and
  is not coming back either. So `Open risk` leads with the SENTENCE and ends
  with nothing, which is what the row actually has to say.
*/

/**
 * When the condition appeared — `RiskSignal.first_detected_at`, which is
 * `auto_now_add` on the model and therefore genuinely dates the signal.
 *
 * The worst signal in the group, which is the same member every other value on
 * the row already comes from (`groupRiskSignals` returns `signals` worst
 * first). Never `last_evaluated_at`: that is `auto_now` and moves on every
 * rules run, so a column of it would redate the whole register nightly.
 */
const firstDetected = (g: { signals: { first_detected_at?: string }[] }): string | null =>
  g.signals[0]?.first_detected_at ?? null;

export function ViewAll({ to, children }: { to: string; children: React.ReactNode }) {
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

/*
  ── `Figure` WAS HERE, AND IS DELETED ─────────────────────────────────────

  A label / value / comparison cell with an `emphasis` flag that set its value
  in `text-lg`. It had ZERO importers: `PositionStripBlock` was its only call
  site and moved into `StatusBand.tsx`'s zones months ago, and nothing has
  used it since.

  Dead code is reason enough, but it was specifically this dead code's
  `emphasis` prop that had to go. It was one of exactly two `text-lg`
  treatments in the whole homepage, and it existed to make several figures
  co-equally large — the arrangement the page was rebuilt to get away from,
  where five numbers at one weight say nothing about which of them matters.
  Left in the file it is a working, documented, importable way for the next
  person to recreate that.

  Nothing is lost: `Zone` in `StatusBand.tsx` renders the same three parts —
  name, figure, comparison — with a shape underneath, and is the only cell
  grammar this page now has.
*/

// ── The verdict ───────────────────────────────────────────────────────────

/**
 * **The page's title.** The single worst true fact, or the statement that
 * there is not one.
 *
 * ── Why this is the h1 and "Home" is deleted ─────────────────────────────
 *
 * This was `text-sm text-muted-foreground`, in `PageHeader`'s `actions` slot —
 * top-RIGHT, the position every other page in this app fills with buttons and
 * which users are therefore trained to skip. Meanwhile the largest element on
 * the page, at 24px, was the word "Home": a constant string, identical on
 * every project on every day, carrying exactly zero information. The page
 * applied hierarchy rigorously inside each module and inverted it between
 * them.
 *
 * So the two swap. The verdict is the h1, at 24px, top-left, first in reading
 * order — and "Home" is gone rather than demoted, because there is nowhere on
 * a page it belongs. The project's name is already in the sidebar switcher,
 * where it is also the control that changes it.
 *
 * The page now leads with "PC-006 — 9 days past its date · 2 others past a
 * date", or with "Nothing is past a contractual date." Both are answers. The
 * word "Home" was not.
 *
 * ── It also fixes an overflow ────────────────────────────────────────────
 *
 * `actions` is `flex items-center gap-2 shrink-0`. A headline plus a "· N
 * others" tail could not wrap inside it and pushed the header wider than the
 * column at and below 1280px. The title slot is `min-w-0` and wraps, so the
 * bug goes with the move rather than needing a rule of its own.
 *
 * ── The split between `lead` and `tail` ──────────────────────────────────
 *
 * `homeVerdict` returns them apart. The lead names ONE object and is the
 * sentence; the tail is a count of rows already listed in the queue below. A
 * subordinate count set at 24px would compete with the fact it qualifies, so
 * the tail rides beside the title in `text-sm`, on the same baseline —
 * `PageHeader`'s existing `meta` grammar, unchanged.
 *
 * ── Colour ───────────────────────────────────────────────────────────────
 *
 * Severity rule 1, exactly as before: only a breach that has ALREADY HAPPENED
 * carries colour. `breach` is `text-destructive`; everything else, including
 * "closes in 3 days", is the plain title colour. Rule 4 is why there is no
 * badge, icon or tile beside it — this IS the element that names the breach.
 *
 * A `clear` verdict is deliberately NOT green. "Nothing is past a contractual
 * date." at title size, in the page's own ink, is the whole message; tinting
 * it would spend the page's one colour channel on the absence of news.
 */
export function VerdictTitle({ data }: { data: HomeData }) {
  const { verdict } = data;

  // NOTHING is asserted while the page is loading — `useHomeData` holds
  // `verdict` at null until every source has answered, precisely so the title
  // never reads as an all-clear about data that has not arrived. The h1 says
  // what the page is doing instead, which is a state and not a label.
  if (!verdict) return <span className="text-muted-foreground">Reading this project</span>;

  const body = (
    <span className={cn(verdict.tone === "breach" && "text-destructive")}>{verdict.lead}</span>
  );

  // A verdict that names an object links to it, for the same reason every
  // queue row does: the reader's next question is always "show me".
  return verdict.href ? (
    <Link
      to={verdict.href}
      className="rounded-sm outline-none hover:underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

/** The "· N others past a date" clause, for `PageHeader`'s `meta` slot. */
export function VerdictTail({ data }: { data: HomeData }) {
  const tail = data.verdict?.tail;
  return tail ? <>· {tail}</> : null;
}

// ── Action queue ──────────────────────────────────────────────────────────
//
// The queue is the page's reason to exist and lives in its own file, next to
// the pure ranking it renders. Re-exported here so every call site keeps
// importing blocks.
export { ActionQueueBlock, QueueRow } from "./ActionQueue";

// ── The position strip: MOVED ─────────────────────────────────────────────
//
// `PositionStripBlock` lived here and is gone. It was six figures in a row,
// and every one of them survives — redistributed into the zone of
// `StatusBand.tsx` that owns the question it answers:
//
//   certified, balance, retention  → the MONEY zone, now with the certified
//                                    S-curve underneath them rather than a
//                                    row of rand values on their own.
//   variations awaiting decision   → the CHANGE zone, with the status split.
//   open risk signals              → deleted from the band, because
//                                    `RiskConditionBlock` below already names
//                                    the worst tier once and lists the rules
//                                    that fired. The strip's count was the
//                                    same fact stated a second time, higher
//                                    up the page.
//
// The strip's own note argued that a home surface should render no chart, on
// the grounds that GitHub, Jira and Linear all put analytics on a separate
// named surface. That was overruled deliberately: the owner's complaint was
// that this page is "a wall of rows of text, nothing that tells you where we
// are", and six rand figures with no scale under them is exactly that. The
// distinction that survives is a different one — a chart here must answer
// "where do we stand", never "browse the history". The certificate RUN, which
// was 562px of one bar per certificate, is still on /finance and is still not
// here; what is here is its cumulative curve at 64px.

// ── Risk, as the project's condition ──────────────────────────────────────
//
// One line per rule that fired, worst first — see `groupRiskSignals`. Project
// 45's twelve open signals are five rules, and three of the twelve were the
// same sentence about three variations. They are now one line saying so.
//
// The signals are not lost and not summarised away: every one of them is on
// `/project-health`, in full, with its evidence and an Acknowledge control,
// and the panel's only action goes there.
//
// ── Its row grammar, and how it differs from the other two lists ──────────
//
//   deadline · verb · clock chip     ← the queue. Bracketed at both ends: a
//                                      date to hit, a move to make, and how
//                                      long is left to make it.
//   sentence                         ← HERE. Nothing but the condition, full
//                                      width, one weight, under a tier
//                                      heading that governs several of them.
//   sentence · relative time         ← what changed. Right-weighted; the age
//                                      is the only thing anyone asks of a
//                                      history and it is quiet metadata.
//
// Three shapes, deliberately, because these are three kinds of thing and the
// page had made them one — all three leading with the same grey date pill, of
// which only the queue's carried a value that differed row to row.
//
// This list is the plain one on purpose. A standing condition has no clock, no
// deadline and no count that its own sentence does not already state, so
// anything drawn at either end of the row would be decoration or repetition.
// Its distinguishing marks are the ones it earns: uniform full-width prose, a
// tier heading above each block of it, and the page's only "All signals" link.

export function RiskConditionBlock({
  data,
  segments,
}: {
  data: HomeData;
  /** The Contract-watch switcher, drawn in this panel's header. */
  segments?: React.ReactNode;
}) {
  const { riskGroups, riskCounts, riskUnavailable, canViewCompliance } = data;

  // Severity rule 2 and 3: the tier is said ONCE, at the head of the rows it
  // governs, and only the worst tier present is drawn in colour. Groups
  // already arrive worst-first from `groupRiskSignals`, so a single pass in
  // fixed tier order preserves that order exactly — no re-sorting here.
  const TIERS = [
    { severity: "red" as const, label: "Critical" },
    { severity: "orange" as const, label: "Warning" },
    { severity: "green" as const, label: "Advisory" },
  ];
  // Memoized on `riskGroups` (itself stable unless the underlying data
  // changes) rather than recomputed as a fresh array every render — otherwise
  // a render with no real data change still hands `useScrollPagination` a new
  // array identity, and it resets the revealed rows back to one page.
  const present = useMemo(
    () =>
      TIERS.map((t) => ({
        ...t,
        groups: riskGroups.filter((g) => g.severity === t.severity),
      })).filter((t) => t.groups.length > 0),
    [riskGroups],
  );

  // Flattened, tier-tagged, worst-first — the order `present` already carries
  // — so pagination can walk it as one continuous list and still know which
  // tier boundary it just crossed.
  const orderedGroups = useMemo(
    () =>
      present.flatMap((tier) =>
        tier.groups.map((g) => ({ ...g, tierLabel: tier.label, tierSeverity: tier.severity })),
      ),
    [present],
  );
  // Hooks must run unconditionally, ahead of the early returns below.
  const { visibleItems, hasMore, containerRef, sentinelRef } = useScrollPagination(
    orderedGroups,
    10,
  );

  /*
    ── A PANEL NOBODY CAN FILL DOES NOT RENDER ───────────────────────────

    Without `compliance.view`, `visibleRiskSignals` returns `[]` for every
    signal on the project and the risk endpoint is never even requested. Drawn
    as an ordinary empty panel that is a headed, bordered block reading
    "No open risk signals" — which is an ALL-CLEAR, addressed to the one
    viewer who has no way to know whether it is true. The seeded CONTRACTOR
    role holds neither `compliance.view` nor `finance.view`, so this is what a
    contractor was being told about a project with open critical signals.

    So the two states are separated and must never be drawn the same way:

      cannot populate (permission)  → nothing renders, here and in `Index.tsx`,
                                      which drops the layout slot with it.
      could populate, but empty     → the panel renders and says so below.

    Nothing is disclosed by the absence beyond the absence: no count, no
    "hidden by permission" strip. That a project has risk signals is itself
    the fact `compliance.view` withholds.
  */
  if (!canViewCompliance) return null;

  // An outage must never read as "healthy".
  if (riskUnavailable) {
    return (
      <Panel
        title="Project risk"
        emphasis="primary"
        icon={ShieldQuestion}
        tone="orange"
        segments={segments}
        hint="The risk engine did not respond — posture unknown, not clear."
      />
    );
  }

  // Genuinely nothing open, for a reader who WOULD be shown it. This is a
  // real statement about the project and it keeps its empty state.
  if (riskGroups.length === 0) {
    return (
      <Panel
        title="Project risk"
        emphasis="primary"
        icon={CheckCircle2}
        tone="green"
        segments={segments}
        hint="No open risk signals on this project."
        action={<ViewAll to="/project-health?tab=risk-signals">All signals</ViewAll>}
      />
    );
  }

  const tierCount = new Map(
    present.map((t) => [t.label, t.groups.reduce((n, g) => n + g.count, 0)]),
  );

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
      title="Project risk"
      // "of 11 open" said what the number was OF only if you already knew what
      // this panel counts. The unit is named now — the rows below are folded
      // SIGNALS, and the tally at the head of each says how many it folds, so
      // the header and the column agree on what they are counting.
      lead={`${worst.groups.reduce((n, g) => n + g.count, 0)} ${worst.label.toLowerCase()} of ${riskCounts.total} open signals`}
      leadTone={worst.severity === "red" ? "danger" : "muted"}
      emphasis="primary"
      // The one link on this page that is SUPPOSED to go to Project health:
      // "show me every open signal" is a diagnosis, and that is the page that
      // diagnoses. Every ROW below goes to the object instead.
      action={<ViewAll to="/project-health?tab=risk-signals">All signals</ViewAll>}
      segments={segments}
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
      {/* Bounded at every width — `ContractWatchBlock` renders full-width on
          its own row (Index.tsx), not paired in a stretched grid, so a
          max-height that only applied below `lg` used to cancel out on
          desktop, leaving the container unclipped and the scroll-triggered
          pagination below with no scroll to trigger on. */}
      <div
        ref={containerRef}
        className="max-h-[420px] overflow-y-auto divide-y divide-border"
      >
        {visibleItems.flatMap((g, index) => [
          // The worst tier is already named in the header, so no strip for it.
          // Every LOWER tier gets one, always muted, the first time it's
          // reached: rule 3 says only the worst tier present is drawn in
          // colour, and it has already been drawn.
          index > 0 && g.tierLabel !== visibleItems[index - 1].tierLabel ? (
            <SectionHeading
              key={`h-${g.tierSeverity}`}
              label={g.tierLabel}
              count={tierCount.get(g.tierLabel)}
            />
          ) : null,
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
            /*
              `py-2` where the queue keeps `py-2.5`. Four pixels a row is not a
              refinement, it is the priority made geometric: measured on the
              real layout the right column ran ~464px of passive reference
              against ~368px of the work, on a page whose own comment holds the
              right column to passive reference because 80% of fixations land
              left. The queue keeps its pitch and its weight; the column that
              is not asking anyone to move gives some back.
            */
            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            /*
              ── Where the detection date went ────────────────────────────

              Here, and only here. It was a pill at the head of the row and it
              read "17 Aug" on every one of the live project's five rows — the
              same value five times in the strongest position a row has. As a
              tooltip it costs nothing, it keeps the word that says what kind
              of date it is, and it is stated in full with its year, which the
              pill never was.
            */
            title={
              firstDetected(g)
                ? `${g.tierLabel} · open since ${formatDateUk(firstDetected(g), "long")}`
                : g.tierLabel
            }
            /*
              The row's own sentence already names the count where there is
              one to name, so this adds only the fact the row shows nowhere: the
              date, in words, behind the word that says what kind of date it is.
              Without it a screen-reader user gets the condition and nothing
              about how long it has stood, because `title` is not reliably
              announced on a link that already has an accessible name.
            */
            aria-label={
              [
                g.tierLabel,
                g.title,
                g.contractual ? "contractual" : null,
                g.count > 1 ? `${g.count} signals` : null,
                firstDetected(g) ? `open since ${formatDateUk(firstDetected(g), "long")}` : null,
              ]
                .filter(Boolean)
                .join(". ") + "."
            }
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
            {/*
              ── The dot, and why the tier-heading rule was not enough ─────

              Severity rule 2 says the tier is named once above the rows it
              governs. On the live project that rule degenerates: 13 of the 14
              open signals are Critical, so every visible row is in the FIRST
              tier, the header names it, and no strip is ever reached. The
              panel arrived as five identical lines of body text with the only
              urgency in a header the eye reads once.

              A 6px dot per row is not the thing rule 3 forbids. What was
              banned was drawing the whole row in its colour AND repeating the
              severity as a word — six coloured words a row, which reads as a
              background. This is one glyph at a fixed position: it ranks rows
              against each other inside the panel, it survives a list that is
              entirely one tier, and it leaves the sentence in body colour. The
              severity is also still named in text on hover and to a screen
              reader via `aria-label`, so the dot is never the only carrier.
            */}
            <span
              aria-hidden
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                g.tierSeverity === "red"
                  ? "bg-destructive"
                  : g.tierSeverity === "orange"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/40"
              }`}
            />
            <p className="text-sm text-foreground line-clamp-2 min-w-0 flex-1">
              {g.title}
              {/* Stated only when true of every signal in the group, so a
                  folded line never upgrades a commercial guide into a breach. */}
              {g.contractual && <span className="text-muted-foreground"> · contractual</span>}
            </p>
            {/*
              ── The trailing count badge is GONE, and nothing replaced it ──

              Two reasons, either of which is sufficient. It restated a number
              the sentence beside it already opens with (see the deletion note
              on `RowTally`). And it sat in exactly the position the queue puts
              its clock chip, so two lists on one screen both terminated in a
              small bordered pill meaning two unrelated things.

              **The right edge of a row on this page is now a clock or nothing,
              and only the queue has clocks.** That is the rule; a future count,
              rating or status pill on a risk row breaks it.
            */}
          </Link>,
        ])}
        {hasMore && <div ref={sentinelRef} />}
      </div>
    </Panel>
  );
}

// ── Contract time: MOVED ──────────────────────────────────────────────────
//
// `ContractTimeBlock` lived here and is gone. Its three figures are the TIME
// zone of `StatusBand.tsx`: time remaining is the zone's headline, and build
// length and the completion date are the two ends of the axis drawn under it,
// which is the same information with the scale it was missing.
//
// Its warning is not gone and is repeated on the axis that replaced it: there
// is no fill on that axis and no percentage anywhere near it, because
// Baselinq holds no measure of physical progress and elapsed calendar time is
// not one. See the note on `ContractTimeline` in `homeVisuals.ts`.
//
// Vacating this slot in the right-hand column is what pays for
// `WhatChangedBlock`, so the page did not grow.

// ── Setup ─────────────────────────────────────────────────────────────────

/**
 * Project setup as ONE row, at the very top of the page. It is a precondition
 * for the rest of the screen being trustworthy, so it sits above it — but a
 * precondition is not the work, so it gets a hairline row and nothing more.
 *
 * **It draws no container of its own.** It is a ROW inside the single
 * precondition panel that `Index.tsx` builds — see the note there.
 *
 * ── Why the missing fields are chips, not a clause ────────────────────────
 *
 * The version this replaces said the same thing in the same space, as prose:
 * "Project setup 3 of 7 — client details, scope of work, attached documents
 * and the appointed company still to add." Every field name was already its
 * own button, but it was styled as underlined text inside a sentence, so four
 * separate things read as one sentence. The card that PRECEDED the prose used
 * four full-width icon-and-description rows and half the fold; it was
 * genuinely tidier, and what made it tidier was not the whitespace — it was
 * that each missing field was a discrete, bounded, labelled OBJECT.
 *
 * So: keep the one-row height of the prose, restore the thing-ness of the
 * card. Each missing field is a `badgeVariants({ variant: "neutral" })` chip
 * — the app's own status-chip primitive, `border-border bg-muted
 * text-muted-foreground rounded-md px-2 py-0.5 text-xs`, no new token — on a
 * `button` so it stays individually actionable and still opens
 * `ProjectSetupDialog` at its named section. Four things are now countable at
 * a glance without reading a sentence.
 *
 * Neutral, not amber: under the severity rule at the top of this file an
 * unfilled setup field is a MISSING PRECONDITION, not a breach that has
 * already happened, so it carries no colour.
 *
 * The chip labels are `SETUP_LABELS` verbatim — the same words the prose
 * used, unrenamed, so no step is invented, dropped or relabelled here.
 */
/**
 * ── The project summary banner ────────────────────────────────────────────
 *
 * The first thing on the page: which project this is, and the three figures
 * that frame everything under it.
 *
 * **THE RING IS SETUP COMPLETENESS AND IT SAYS SO.** This is the single thing
 * most likely to be misread on the whole page, so it is labelled in text
 * ("Setup") inside the ring's own row and stated again in full on `title`.
 * `projectStats` is `summariseProjectSetup` — how many of the project's
 * RECORD FIELDS have been filled in — and it is what the old page's ring was
 * measuring too, unlabelled, where it read as a completion percentage for the
 * works. Baselinq holds no measure of physical progress; the page says so in
 * two other places and this ring must not quietly contradict them.
 *
 * **The money chip is gated on `finance.view` and nothing else is.** A
 * contractor's site agent must not be shown the contract sum, and the same
 * person absolutely must be shown the project number, the address and how
 * many days are left — those are on every drawing and every notice they
 * already handle.
 *
 * **Every chip is omitted rather than zeroed.** No dates, no days chip. No
 * contract sum recorded, no money chip even with the permission. A dash in a
 * figure's place is a claim that the figure is nothing.
 */
export function ProjectSummaryBlock({ data }: { data: HomeData }) {
  const { project, projectStats, time, money, canViewFinance } = data;
  if (!project) return null;

  const pct = projectStats?.percentage ?? null;
  const number = project.project_number || project.projectNumber || null;
  const location = project.location || null;
  const days = time.hasDates && time.remainingDays !== null ? time.remainingDays : null;
  const sum = canViewFinance ? money.revisedContractSum ?? money.contractSum : null;

  // The setup ring. Geometry only — `r=16` in a 40px box, the same 2px stroke
  // the app's other rings use. `--muted` for the track and `--primary` for the
  // filled arc, so it inherits the theme rather than naming a hex.
  const R = 16;
  const C = 2 * Math.PI * R;

  return (
    <section className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {pct !== null && (
          <div
            className="relative h-10 w-10 shrink-0"
            title={`Project setup: ${projectStats!.filledCount} of ${projectStats!.totalCount} record fields completed. This measures the PROJECT RECORD, not work done on site — Baselinq holds no measure of physical progress.`}
          >
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40" aria-hidden>
              <circle
                cx="20"
                cy="20"
                r={R}
                fill="none"
                strokeWidth="3"
                className="stroke-muted"
              />
              <circle
                cx="20"
                cy="20"
                r={R}
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct / 100)}
                className="stroke-primary"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">{project.name}</h2>
            {pct !== null && pct < 100 && (
              // The ring's label, on the page and not only on a tooltip. Without
              // it a percentage beside a project name reads as progress.
              <span className="text-xs text-muted-foreground">Setup {pct}% complete</span>
            )}
          </div>
          {(number || location) && (
            <p className="text-xs text-muted-foreground truncate" title={location ?? undefined}>
              {[number, location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap shrink-0">
        {days !== null && (
          // The old summary's own three-step scale, restored verbatim: past
          // the date is red, inside a month is orange, otherwise green. This
          // is the one place on the page that reads as a status at a glance,
          // and the owner asked for it back by name.
          <span
            className={cn(
              "text-xs font-medium px-3 py-1 rounded-md border tabular-nums",
              days < 0
                ? "bg-red-50 text-red-600 border-red-200"
                : days <= 30
                  ? "bg-orange-50 text-orange-600 border-orange-200"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200",
            )}
          >
            {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
          </span>
        )}
        {sum !== null && (
          <span
            className="text-xs font-medium px-3 py-1 rounded-md border bg-card text-foreground border-border tabular-nums"
            title="The contract sum as recorded, revised by approved variations. Ex-VAT."
          >
            {formatZAR(sum)}
          </span>
        )}
        <span className="text-xs font-medium px-3 py-1 rounded-md border bg-primary/10 text-primary border-primary/20 tabular-nums">
          {data.myActions.length} open action{data.myActions.length === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
}

export function SetupLineBlock({
  data,
  onOpen,
  onOpenSection, onDismiss }: {
  data: HomeData;
  onOpen: () => void;
  onOpenSection: (section: string) => void; onDismiss?: () => void }) {
  const { projectStats, canEditProject } = data;
  if (!projectStats || projectStats.percentage === 100) return null;

  // The chip. Identical geometry whether or not it is pressable, so the row
  // does not reflow for a reader who lacks edit rights — only the hover and
  // focus affordances appear, and only for someone who can act on them.
  // `badgeVariants({ variant: "neutral" })` is `border-border bg-muted
  // text-muted-foreground`, and --muted-foreground on --muted measures
  // 4.53:1 — over the floor, but thin for `text-xs`. The label takes
  // --foreground instead (13.66:1), which is also exactly what the prose
  // this replaces used for the same field names. Nothing else changes, and
  // it keeps the hierarchy right: the lead-in is muted, the chips are the
  // content.
  const chip = cn(badgeVariants({ variant: "neutral" }), "text-foreground");

  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap bg-amber-50 border-b border-amber-200">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-sm text-muted-foreground shrink-0">
          Project setup{" "}
          <span className="text-foreground tabular-nums">
            {projectStats.filledCount} of {projectStats.totalCount}
          </span>
          {" · still to add"}
        </span>
        {projectStats.missing.map((item) =>
          canEditProject ? (
            <button
              key={item}
              type="button"
              onClick={() => onOpenSection(item)}
              // `--accent` and `--muted` are the same value, so a background
              // hover would be invisible here. The hairline carries it
              // instead: `--border` on `--muted` is 1.13:1 at rest and
              // --muted-foreground on --muted is 4.53:1, so the chip's edge
              // resolves on hover and is otherwise silent.
              className={cn(
                chip,
                "hover:border-muted-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              )}
            >
              {SETUP_LABELS[item]}
            </button>
          ) : (
            <span key={item} className={chip}>
              {SETUP_LABELS[item]}
            </span>
          )
        )}
      </div>
      {canEditProject && (
        <Button size="xs" variant="outline" className="shrink-0 w-36 justify-center" onClick={onOpen}>
          Complete setup
        </Button>
      )}
      {onDismiss && (
        <button
          type="button"
          aria-label="Hide setup reminders"
          onClick={onDismiss}
          className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
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
