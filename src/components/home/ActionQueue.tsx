/**
 * What needs you.
 *
 * One question: *what must a person actually do?*
 *
 * ── Only things a person can do ───────────────────────────────────────────
 *
 * Risk signals are not in this list — see the note above `groupRiskSignals` in
 * `src/lib/homeSignals.ts`. A standing condition with no move attached is not
 * a task, and twelve of them made the one real task on project 45 invisible.
 * The list is short by design; empty is a true and good answer.
 *
 * ── Sections, in a fixed order ────────────────────────────────────────────
 *
 * The rows are grouped by **the kind of obligation**, not by object type, and
 * **a section with nothing in it does not render**. This is Linear's "My
 * Issues" focus order (urgent · SLA-bound · blockers · cycle work · …, "some
 * sections only appear when they apply") and GitHub's rebuilt pull-request
 * dashboard (review requests · needs fixes · ready to merge — not by
 * repository) applied to contract administration.
 *
 * It solves the empty state structurally rather than cosmetically: on a quiet
 * day nothing renders and the panel is one header line, so there is no "you
 * are clear" well to design around.
 *
 * `SECTIONS` below is in `CONSEQUENCE_ORDER` — the same axis `rankQueue`
 * already sorts on — so section order and row order agree by construction
 * rather than by coincidence. **`homeQueueRank.ts` is untouched**: it still
 * decides the order of rows *within* a section, and its bands still decide
 * what `queueLead` calls urgent.
 *
 * One trade-off, stated: a forfeiture item thirty working days out is
 * deliberately demoted to band 5 by `BAND`, below an unsigned certificate, and
 * sectioning puts it back above one. The section headings therefore make no
 * urgency claim — "Notices to serve", not "Closing now" — and the clock chip on
 * the row says how far away it is.
 *
 * ── No decoration ─────────────────────────────────────────────────────────
 *
 * There is no per-row icon, no severity tile and no priority marker. Ten
 * near-identical rows each wearing a red triangle is why nothing stood out.
 * **Urgency is position** — the section a row sits in — and the only colour on
 * a row is the clock chip, and only when the clock has actually run out or runs
 * today. That is a fact, not a gradient.
 *
 * The DATE TILE at the head of a row is not an exception to this and is not
 * decoration. It carries information — the date the row's clock falls on —
 * which nothing else on the row carries, and it is achromatic. What it
 * replaced was that same date rendered as a prefix to the headline, in the
 * headline's own weight and colour: "Due 5 Aug 2026 — Notice of delay / claim
 * for revision of completion date". Six of those stacked is one wall of text
 * in which the thing that differs between the rows is buried inside the thing
 * that does not. The severity tile that was removed encoded a RATING, which
 * the rows above already state by position; this encodes a DATE, which nothing
 * else states.
 *
 * This is severity rule 1 in `blocks.tsx`, and this file was already keeping
 * it — a clock that has run out IS a breach that has already happened, and it
 * is the only thing here allowed to be red. What has changed is that the rest
 * of the page now keeps the rule too, so a red chip in this list is no longer
 * competing with six red words in the panel beside it. `SectionHeading` moved
 * to `blocks.tsx` for the same reason: the risk panel groups and labels its
 * rows exactly the way this list does, and there must be one heading style.
 *
 * ── Two things this file is still careful about ───────────────────────────
 *
 *  1. **One action per row, to a route that exists.** Every `href` comes from
 *     the `ROUTE` table in homeSignals.ts, checked against App.tsx.
 *
 *  2. **An outage never reads as clear.** If a source failed, the empty state
 *     says so, because on a page whose whole job is telling somebody what is
 *     outstanding, a confident silence is the most expensive thing we could
 *     render.
 */
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { summariseQueue } from "@/lib/homeQueueRank";
import type { QueueItem, QueueKind } from "@/lib/homeQueueRank";
import { ROUTE } from "@/lib/homeSignals";
import { formatZAR } from "@/lib/formatCurrency";
import type { HomeData } from "@/hooks/useHomeData";
import { useScrollPagination } from "@/hooks/useScrollPagination";

import { Panel, RowDate, SectionHeading } from "./blocks";

/**
 * The fixed focus order. Named for what the reader must DO, never for how
 * urgent it is — a heading that claims urgency would be wrong for the tail of
 * its own section (see the trade-off in the header comment).
 *
 * The project's own deadlines first, then the rows the reader can act on —
 * which is the order `CONSEQUENCE_ORDER` already puts them in, forfeiture
 * ahead of money, breach, blocking and own-work.
 */
const SECTIONS: { label: string; note: string; kinds: QueueKind[] }[] = [
  /*
    ── TWO HEADINGS, NOT FIVE ────────────────────────────────────────────

    This list had five: "Contract deadlines · project-wide", "Certificates
    awaiting you", "Contract obligations · by role", "Blocking someone else"
    and "Escalated to you to chase". On the seeded project that is five
    headings over ten rows — a table of contents for a list you can already
    see whole — and four of the ten rows were the same sentence about a
    different certificate number.

    What is kept is the ONE distinction on this page a reader acts on
    differently, and it is the distinction the old suffixes were disclosing in
    heading position: **is this row addressed to me, or is it true of the
    project whatever I do?** A notice deadline carries no assignee at all
    (`buildTimeBarQueue` sets `requires: []` and the payload names nobody) and
    an obligation is scoped to a ROLE rather than a user, so both are the
    project's. Everything else reached the reader because the reader can
    perform the act: a certificate row declares the server's own permission
    for certifying, posting, reworking or recording payment; an RSVP is
    resolved per requesting user; a meeting action is dropped where the server
    says `can_approve: false`; an escalation names the reader in
    `escalatedTo`.

    The old headings' finer grain is not lost, it is demoted. "project-wide"
    and "by role" were honest disclosures promoted into heading position,
    where they read as apology; they are in `note` below, which the heading
    carries as its tooltip.

    `homeQueueRank.ts` is untouched. It still orders every row, sections still
    only appear when they apply, and rows keep `rankQueue`'s order inside a
    section — so merging headings changed which strip a row sits under and
    nothing about which row comes first.
  */
  {
    label: "Contract deadlines",
    note: "Project-wide. A notice deadline carries no assignee, and an obligation is scoped to a role rather than to a person, so these rows are the same for everyone on the project.",
    kinds: ["time-bar", "obligation"],
  },
  {
    label: "Yours to act on",
    note: "Rows that reached you because you can perform the act — certifying, posting or paying a certificate, answering an invitation, approving a meeting action, or chasing a task that escalated to you.",
    kinds: ["certificate", "rejected", "rsvp", "meeting-action", "task-escalated"],
  },
  /*
    ── "Assigned to you" WAS HERE, AND IT IS NOW ITS OWN PANEL ─────────────

    `buildTaskQueue` classifies a plain task as `own-work`, the LOWEST of the
    six consequence classes, so this section was always last and its rows were
    always the last thing paginated in. That ranking is defensible as a
    statement about the CONTRACT — a forfeiture clock does outrank your
    paperwork — and indefensible as an answer to "what have I been asked to
    do", which is the other question a person opens this page with.

    So the plain-task rows moved to `MyActionsBlock`, which is uncapped,
    ungated and sorted by the reader's own due dates. `task` rows are filtered
    out of this list in `ActionQueueBlock` below rather than merely losing
    their heading — a row with no section would be paginated in and then
    rendered nowhere, which is how a list quietly loses items.

    `task-escalated` DID NOT MOVE. An escalation is not your work: it is
    somebody else's silence past the SLA, the task stays with whoever owes it,
    and the move it asks for is a phone call rather than a form. It is still
    above, under "Yours to act on", because making that call is yours.
  */
];

/**
 * The unpaid-certificate chase, folded to one row.
 *
 * `buildPaymentOverdueQueue` emits one row per overdue certificate and they
 * arrive adjacent, because they share a kind, a consequence and a `subRank`.
 * On the seeded project that is four consecutive rows reading "Chase payment
 * on PC-004 · 151 days over", "Chase payment on PC-005 · 148 days over" and
 * so on: forty per cent of the whole list spent saying one thing four times,
 * and the near-identical sentences are what made the panel unreadable rather
 * than long.
 *
 * `groupRiskSignals` already does exactly this for repeated signals and this
 * is the same operation in the same words — a count, a total, and the worst
 * instance named — so the two panels fold alike.
 *
 * ── What the folded row may and may not say ──────────────────────────────
 *
 *  - The TOTAL is stated only when every folded row published a usable
 *    figure. One null and the clause is dropped: a sum over three of four
 *    debts printed as "R X unpaid" is a wrong number, and a wrong number
 *    about money is the most expensive thing this page can render.
 *  - "oldest N days over" is the WORST row's real count, not an average.
 *  - The row goes to the certificate LIST, never to one of the N — naming a
 *    single certificate for a group would name the wrong one.
 *  - Nothing is folded away: every certificate is on the list it links to.
 *
 * Position is preserved exactly. The group takes the first member's place in
 * the ranked array and the rest are dropped, so `rankQueue`'s order is
 * untouched. Folding happens AFTER ranking and after the permission filter,
 * and the panel's own lead still counts the unfolded queue.
 */
const PAYMENT_CHASE_PREFIX = "payment-overdue-";

export function foldPaymentChases(items: QueueItem[]): QueueItem[] {
  const chases = items.filter((i) => i.key.startsWith(PAYMENT_CHASE_PREFIX));
  if (chases.length < 2) return items;

  const total = chases.every((c) => typeof c.amount === "number" && Number.isFinite(c.amount))
    ? chases.reduce((n, c) => n + (c.amount as number), 0)
    : null;
  // Most overdue first: `daysRemaining` is negative on these rows.
  const worst = chases.reduce((a, b) =>
    (a.daysRemaining ?? 0) <= (b.daysRemaining ?? 0) ? a : b,
  );
  const oldest = worst.daysRemaining === null ? null : Math.abs(worst.daysRemaining);

  const folded: QueueItem = {
    ...worst,
    key: "payment-overdue-group",
    headline: [
      `${chases.length} certificates unpaid`,
      total === null ? null : formatZAR(total),
      oldest === null ? null : `oldest ${oldest} days over`,
    ]
      .filter(Boolean)
      .join(" · "),
    detail:
      [
        total === null ? "One or more outstanding amounts were not published" : null,
        // Every certificate in the fold, named, so the tooltip is the full
        // list even though the row is one line.
        chases
          .map((c) => c.headline.replace(/^Chase payment on /, ""))
          .join(", "),
      ]
        .filter(Boolean)
        .join(" · ") || null,
    // The oldest debt's due date, which is the one the tile should carry.
    date: worst.date,
    // No chip: "oldest N days over" is in the headline, and `clockChip` would
    // print a bare "151 days over" beside it as though it were the group's.
    daysRemaining: null,
    clock: null,
    countdownLabel: null,
    amount: total,
    href: ROUTE.certificates,
    action: "Open the certificate list",
  };

  const first = items.findIndex((i) => i.key.startsWith(PAYMENT_CHASE_PREFIX));
  return items.flatMap((i, idx) => {
    if (!i.key.startsWith(PAYMENT_CHASE_PREFIX)) return [i];
    return idx === first ? [folded] : [];
  });
}

/** Rows are revealed 10 at a time; scrolling to the bottom of the panel loads the next 10. */
const PAGE_SIZE = 10;

/**
 * The one chip on a row, and it is about the CLOCK, not a priority.
 *
 * A forfeiture clock is stated in the unit the backend counted in: "3 days"
 * and "3 working days" are a week apart in May.
 *
 * **Colour marks a fact, not a gradient.** Only a clock that has run out or
 * runs today is drawn in `danger`; everything with time left is neutral,
 * whatever its `pressure`. Urgency is carried by which section the row is in.
 *
 * ── The chip and the date tile do not say the same thing ─────────────────
 *
 * The chip counts DOWN and changes every day; the tile names a fixed date. The
 * row used to state the date twice — an absolute date at the head of the
 * headline and a relative countdown here — which is the redundancy behind the
 * wall of text. It states each once now, in the register that suits it.
 *
 * ── `countdownLabel` wins, and this file does not second-guess it ─────────
 *
 * Where the source published a finished countdown phrase, it is printed
 * VERBATIM and nothing here reassembles one. The most expensive defect this
 * page has had was a client pairing a number with a unit that did not belong
 * to it — a calendar-day count beside the word "working" on a JBCC notice —
 * and `risk/models_evidence.py` now publishes `days_remaining_label` expressly
 * so that pairing cannot happen in a client again. Reformatting the phrase
 * into something terser would put the pairing straight back here, which is why
 * the chip carries "12 working days remaining" in full rather than trimming it
 * to fit an idea of how wide a badge should be.
 *
 * The number-plus-unit branch below survives for the sources that publish no
 * such phrase — tasks, obligations, certificate due dates — where the count
 * and the unit come out of one derivation and cannot disagree.
 */
function clockChip(item: QueueItem): { label: string; variant: "danger" | "warning" | "neutral" } | null {
  if (item.countdownLabel) {
    // The variant is decided from the SIGN of the count, not by reading the
    // phrase — parsing the server's words to colour them would be the same
    // mistake in a different costume.
    const d = item.daysRemaining;
    return {
      label: item.countdownLabel,
      variant: d !== null && d <= 0 ? "danger" : "neutral",
    };
  }
  if (item.daysRemaining === null) {
    // An undated forfeiture clock is an UNKNOWN deadline and must not read as
    // "no deadline". It is the one non-fact that still earns a colour.
    if (item.consequence === "forfeiture") return { label: "Not dated", variant: "warning" };
    /*
      ── The undated-task hole, disclosed rather than filled ──────────────

      A site instruction or a variation reply assigned to you DOES reach this
      list — `buildTaskQueue` is scoped on `assignedTo`, which is Werner's
      "To". But a task saved without a due date carries no clock, so it lands
      in `own-work`/`none` at band 8 and draws nothing at all: it looked
      identical to a task that is comfortably in hand, and it was the quietest
      row on the page.

      No date is invented for it. `Task` has `dueDate` and `finishDate` and
      the hook already reads both; where neither is set, nothing on the wire
      says when the thing is wanted. What changes is that the row now SAYS the
      date is missing instead of being silent about it, which is the same
      discipline "Not dated" keeps for a notice deadline. Neutral, not amber:
      an undated task is an incomplete record, not a clock running out.
    */
    if (item.consequence === "own-work") return { label: "No date", variant: "neutral" };
    return null;
  }
  const unit = item.clock === "working" ? " working" : "";
  if (item.daysRemaining < 0) {
    return { label: `${Math.abs(item.daysRemaining)}${unit} days over`, variant: "danger" };
  }
  if (item.daysRemaining === 0) return { label: "Today", variant: "danger" };
  return { label: `${item.daysRemaining}${unit} days left`, variant: "neutral" };
}

/*
  ── The date tile MOVED to `blocks.tsx` as `RowDate` ──────────────────────

  Its long justification travelled with it, including the measurement that
  settled one line against two (a one-line tile takes 20px off every long row;
  a two-line tile adds 6px). What changed is only where it lives: the risk
  panel and the change feed now draw the same slot, so all three lists on this
  page start their text on one vertical line instead of two lists starting 92px
  apart across a 16px gutter.
*/

/**
 * One row, one line.
 *
 * It was a bordered card with an icon tile, a headline, a subtitle and a
 * separate "Open it" link — 92px, and 104px of pitch once the gap between
 * cards was counted. Four things went:
 *
 *  - **The card.** A row inside a panel is a row; `divide-y` is how every other
 *    list in the app (finance tables, ProjectHealth) separates them.
 *  - **The icon tile.** The bordered 28px tile set the row's height by itself,
 *    and its severity colour was the decoration described above. The date tile
 *    that now occupies the head of the row is a different animal: 36px wide,
 *    no border, no colour, and it carries a value rather than a rating.
 *  - **The action link.** The whole row is already the link to exactly that
 *    place. It survives in `aria-label`, where it is genuinely useful.
 *  - **The kind label and the detail.** "Certificate · In this state since
 *    today" was object type plus prose. The section heading now says the kind
 *    once for every row under it, and the detail moves to the row's tooltip.
 *
 * The headline is untouched and already leads with the verb ("Certify PC-006
 * — submitted and waiting on you"), so nothing was lost from the face of it.
 */
export function QueueRow({ item }: { item: QueueItem }) {
  const chip = clockChip(item);
  // The date in full, for the two places prose belongs: the tooltip and the
  // accessible name. The tile shows day and month; nobody should have to infer
  // a year from three letters.
  const fullDate = formatDateUk(item.date, "long");

  return (
    <Link
      to={item.href}
      title={[fullDate ? `Due ${fullDate}` : null, item.detail].filter(Boolean).join(" · ") || undefined}
      /*
        The chip MUST be in here. `aria-label` replaces the accessible name
        computed from descendants, so a screen-reader user was given the
        headline and the action and never the clock — and now that the day
        count lives only in the chip and no longer appears in the headline,
        that was the whole deadline going missing for exactly the users least
        able to recover it from a glance.
      */
      aria-label={
        [item.headline, fullDate ? `due ${fullDate}` : null, chip?.label, item.action]
          .filter(Boolean)
          .join(". ") + "."
      }
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {/* The date, first, as an object. See `RowDate` in `blocks.tsx`. */}
      <RowDate date={item.date} />
      {/*
        ── Two lines, and never a broken word ──────────────────────────────

        `truncate` clipped mid-word, and a queue headline is built as
        "<verb> <object> — <why it is waiting>": the verb and the object are
        the first few words, so two rows about two certificates arrived as
        the same sentence with the same ellipsis. `line-clamp-2` breaks at a
        word and only clips what will not fit two lines.

        A one-line headline still occupies one line, so the common row keeps
        its 41px pitch and the panel does not grow on a normal day.
      */}
      {/*
        ── `font-medium`, and it is the only content weight on the page ──────

        Measured before this change: 40 uses of `text-sm` across the homepage
        against 5 of `text-lg`, and the ONE `font-medium` content row belonged
        to "What changed" — the panel whose own header comment says it is
        explicitly not what you must do. The page's one bold row was on the
        thing nobody has to act on.

        This is the list that asks a person to move, so this is the list that
        gets the weight. It costs no height, adds no element and introduces no
        token: `font-medium` is already the panel-title weight, so the queue's
        rows now read at the same weight as the headings around them and the
        passive column reads a step below.
      */}
      <p className="text-sm font-medium text-foreground line-clamp-2 min-w-0 flex-1">
        {item.headline}
      </p>
      {chip && (
        <Badge variant={chip.variant} className="shrink-0 tabular-nums">
          {chip.label}
        </Badge>
      )}
    </Link>
  );
}

/**
 * The count beside the heading. A `lead`, not a `hint` — it is a figure, and
 * the sentence it used to be ("4 need you today · 13 open in all") was three
 * clauses where one number does. `summariseQueue`'s bands decide "today".
 */
/*
  "3 today · 6 open" counts things whose unit the reader has to infer, and all
  three panels on this page were leading with an unlabelled figure of a
  different kind — actions, signals, events — in the same treatment. Each one
  now names what it is counting, in the same number of words: "3 due today ·
  6 to do", "4 critical of 11 open signals", "3 recent · most consequential
  first". "due" also states this list's axis, which is the deadline in the
  pill at the head of each of its rows, and no other list on the page has one.
*/
function queueLead(summary: ReturnType<typeof summariseQueue>): string | undefined {
  if (summary.total === 0) return undefined;
  if (summary.calm) return `${summary.total} to do · none urgent`;
  return `${summary.actToday} due today · ${summary.total} to do`;
}

export function ActionQueueBlock({
  data,
  title = "What needs you",
}: {
  data: HomeData;
  title?: string;
}) {
  const { isLoading, loadIssue } = data;
  /*
    Plain tasks are `MyActionsBlock`'s, and they are removed HERE rather than
    in `useHomeData` so that `queueSummary` and `homeVerdict` keep reading the
    whole queue: a task assigned to somebody is still a true thing waiting on
    them, and the page's verdict must not stop counting it because one panel
    stopped drawing it. `task-escalated` is deliberately kept — see SECTIONS.
  */
  const queue = data.queue.filter((i) => i.kind !== "task");
  // The LEAD counts the unfolded queue. Four unpaid certificates are four
  // things outstanding however many lines they are drawn on, and the panel's
  // own count must not shrink because its presentation got tidier.
  const summary = summariseQueue(queue);
  // The ROWS are the folded list. See `foldPaymentChases`.
  const rows = foldPaymentChases(queue);
  // Hooks must run unconditionally, ahead of the loading/empty early returns
  // below.
  const { visibleItems, hasMore, containerRef, sentinelRef } = useScrollPagination(
    rows,
    PAGE_SIZE,
  );

  if (isLoading) {
    return (
      <Panel title={title} emphasis="primary">
        <AwesomeLoader message="Working out what needs you" />
      </Panel>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  // Empty is the COMMON case, and it must read as correct rather than as
  // broken — but it must never read as reassurance we cannot give. If a source
  // failed, that is the headline, not the emptiness.
  if (queue.length === 0) {
    if (loadIssue.level === "partial") {
      return (
        <Panel
          title={title}
          emphasis="primary"
          icon={ShieldAlert}
          tone="orange"
          // Still a sentence, and deliberately: this is the one empty state
          // that must NOT be read at a glance as "you are clear".
          hint="Some sources could not be read — this is not a statement that nothing is waiting on you."
        />
      );
    }
    return (
      <Panel
        title={title}
        emphasis="primary"
        icon={CheckCircle2}
        tone="green"
        hint="Nothing is waiting on you."
      />
    );
  }

  // Rows keep `rankQueue`'s order inside their section; sections keep theirs.
  const drawn: React.ReactNode[] = [];
  const sectioned = SECTIONS.map((section) => ({
    section,
    items: visibleItems.filter((i) => section.kinds.includes(i.kind)),
  })).filter((s) => s.items.length > 0); // Sections only appear when they apply.
  for (const { section, items } of sectioned) {
    // One section left standing is a heading for the whole panel, and the
    // panel already has one. The strip is drawn only where it divides.
    if (sectioned.length > 1) {
      drawn.push(
        <SectionHeading
          key={`h-${section.label}`}
          label={section.label}
          count={items.length}
          note={section.note}
        />,
      );
    }
    for (const item of items) drawn.push(<QueueRow key={item.key} item={item} />);
  }

  return (
    /*
      ── The ONE primary panel on this page ──────────────────────────────

      `emphasis="primary"` keeps this header on the card surface and sets its
      title a weight above every other heading on the screen, while `Open risk`
      and `What changed` take `reference` and drop their headers onto the well
      fill. See the long note on `Panel` in blocks.tsx.

      This is the same argument that gave these rows `font-medium` one change
      ago, carried one level up: the list that asks a person to move outranks
      the two lists that are true whether or not anybody moves. The owner asked
      to be able to "identify the hierarchy" of the blocks below the financial
      band; this is the hierarchy, stated in the two channels that cost no
      height — weight and surface.
    */
    <Panel title={title} emphasis="primary" lead={queueLead(summary)}>
      <div
        ref={containerRef}
        className="max-h-[420px] overflow-y-auto divide-y divide-border lg:max-h-none lg:h-full"
      >
        {drawn}
        {hasMore && <div ref={sentinelRef} />}
      </div>
    </Panel>
  );
}
