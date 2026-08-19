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

/**
 * **The leading date slot every list row on this page starts with.**
 *
 * ── Why it lives here and not in `ActionQueue.tsx` ────────────────────────
 *
 * It was the queue's private `DateTile`, and that is what put three lists out
 * of register. The queue's headlines began at x≈108px — an 80px tile plus a
 * 12px gap — while the risk rows and the change rows, drawn in the same panel
 * grammar sixteen pixels to the right, began at x≈16px. Two visually identical
 * lists, 92px apart at the one edge the eye uses to tell a list is a list.
 *
 * Registering them was a choice between deleting the queue's tile and giving
 * the other two lists one, and the tile is not decoration: it carries the row's
 * date as an OBJECT in a fixed, tabular, achromatic column that can be scanned
 * without being read. Both other lists have a real date to put in it — a risk
 * condition has the day it appeared, a change has the day it moved — so both
 * get the column and all three now start their text on one vertical line.
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
 */
export const ROW_DATE_SLOT = "w-20 shrink-0";

export function RowDate({ date }: { date: string | null | undefined }) {
  const parsed = date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return <div className={ROW_DATE_SLOT} aria-hidden />;
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
            /* The tile is `aria-hidden` and a bare date must never be left to
               imply a deadline. This is a condition's APPEARANCE date, and the
               word is here, in the tooltip and in the accessible name. */
            title={firstDetected(g) ? `Open since ${formatDateUk(firstDetected(g), "long")}` : undefined}
          >
            {/* The same leading slot the queue and the change feed draw, so
                three lists on one screen start their text on one line. */}
            <RowDate date={firstDetected(g)} />
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
