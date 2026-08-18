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
import type { HomeData } from "@/hooks/useHomeData";

import { Panel, SectionHeading } from "./blocks";

/**
 * The fixed focus order. Named for what the reader must DO, never for how
 * urgent it is — a heading that claims urgency would be wrong for the tail of
 * its own section (see the trade-off in the header comment).
 *
 * In `CONSEQUENCE_ORDER`: forfeiture, money, breach, blocking, own-work.
 */
const SECTIONS: { label: string; kinds: QueueKind[] }[] = [
  // "Notices to serve" asserted a NOTICE STAGE for every row underneath it,
  // and the expense-and-loss clock is not necessarily at that stage — the
  // heading was making a contractual claim about rows it only groups. A
  // heading names what the rows have in common and nothing more, and what
  // these have in common is a deadline written into the contract.
  //
  // "· project-wide" is not decoration. `buildTimeBarQueue` sets
  // `requires: []` and the time-bar payload carries no assignee, so these rows
  // are the same for every viewer on the project. Under a panel titled "What
  // needs you" that was a claim the data cannot support, and the honest fix is
  // to say whose they are rather than to invent an owner for them.
  { label: "Contract deadlines · project-wide", kinds: ["time-bar"] },
  // This one IS scoped now, and is the only section heading here that was
  // repaired rather than qualified. Each certificate row declares the server's
  // own permission for the act it names — `finance.approve_certificate` to
  // certify (PRINCIPAL_PM alone), `finance.post_certificate` to post,
  // `finance.create_certificate` to rework, `finance.edit` to record a payment
  // — so a row reaches only somebody who can perform it. It used to require
  // `finance.view` alone, which made "Certify PC-006" render identically for
  // the principal agent, the contractor's QS and any finance viewer.
  { label: "Certificates awaiting you", kinds: ["certificate", "rejected"] },
  // `ObligationLike` carries `responsibleRole` and no assignee id — there is
  // no user on the payload to match the reader against — so these rows are
  // scoped to a ROLE at best and the heading says so. The role itself is
  // already named in each row's detail. Reported as a payload gap: an
  // obligation with an assigned user would make this section answerable.
  { label: "Contract obligations · by role", kinds: ["obligation"] },
  // Scoped, and always was: `my_rsvp` is resolved per requesting user by the
  // server, and a meeting action is dropped when the server says
  // `can_approve: false`.
  { label: "Blocking someone else", kinds: ["rsvp", "meeting-action"] },
  // Scoped: `needsAction` matches the current user against `assignedTo`.
  { label: "Assigned to you", kinds: ["task"] },
];

/**
 * A launcher, not a backlog.
 *
 * Jira's "Your work" hard-caps at 20 items with no "show more" for exactly
 * this reason, and Linear scales by removing things from view rather than by
 * paginating. Twelve is the cap here because the queue no longer carries risk
 * signals and a genuine action list this long is already a bad week.
 */
const CAP = 12;

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
 */
function clockChip(item: QueueItem): { label: string; variant: "danger" | "warning" | "neutral" } | null {
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

/**
 * The row's date, as an object rather than as a sentence prefix.
 *
 * ── Why it is a tile at all ───────────────────────────────────────────────
 *
 * "Due 5 Aug 2026 — Notice of delay / claim for revision of completion date"
 * put the date in the same weight and colour as the label behind it, so it
 * read as more prose. Six of those stacked is a wall of text in which the one
 * thing that differs between the rows is buried inside the one thing that does
 * not. Given a fixed slot at the head of the row, filled, tabular and aligned
 * down a column, the date becomes something the eye lands on and compares
 * without reading — which is the whole of what a date column is for.
 *
 * ── Why ONE line and not two, measured ────────────────────────────────────
 *
 * A day-over-month tile is the more obviously "date-like" of the two and was
 * rejected on height. Measured in the browser at the panel's real width
 * (528px at a 1440px viewport), with the real stylesheet:
 *
 *   time-bar row, date in the headline   60px   ← what this replaces
 *   time-bar row, one-line tile          40px
 *   time-bar row, two-line tile          66px
 *
 * The one-line tile does not merely cost nothing — **it takes 20px off every
 * long row on the list.** The reason is the redundancy itself: "Due 5 Aug
 * 2026 — " is eighteen characters in front of a 55-character label, and the
 * pair wrapped to two lines in this column. Remove the prefix and the label
 * fits on one. The two-line tile would have ADDED 6px to the same row.
 *
 * Rows that were already one line — "Certify PC-006", a folded group — measure
 * 40px before and after, empty slot included. So no row on this list got
 * taller and several got shorter; the page height can only fall.
 *
 * The date still reads as an object rather than as prose, which is what was
 * being asked for. The fill, the fixed slot and the tabular figures do that
 * work; the second line was never what did it.
 *
 * ── What it shows ─────────────────────────────────────────────────────────
 *
 * Day and short month, on `bg-muted` in `text-foreground` — the same muted
 * fill `SectionHeading` uses, so no new token appears on this page. The YEAR
 * is shown ONLY when the date falls outside the current year: four characters
 * on every row for a fact that is identical on nearly all of them is exactly
 * the noise this change is removing, and a deadline eighteen months out must
 * never be mistaken for one this year. The full date, year included, is in the
 * row's tooltip and in its accessible name.
 *
 * ── What it does NOT show ─────────────────────────────────────────────────
 *
 * Nothing at all, when the row has no date. Not a dash, not a placeholder, not
 * an outlined empty tile: "—" inside a date tile reads as a date that failed
 * to load, and these dates have not failed to load — a certificate awaiting
 * certification genuinely has no due date anywhere in the payload. The slot
 * keeps its width so every headline in the list starts on the same vertical
 * line, and the chip says which kind of absence it is ("Not dated" for an
 * undated notice deadline, "No date" for an undated task).
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 *
 * None, ever. Severity rule 4 gives the ink to the one element that names the
 * breach, and that is the chip — the element that knows whether the clock has
 * run out. A date is a fact about the calendar and is the same fact whether it
 * has passed or not.
 */
function DateTile({ item }: { item: QueueItem }) {
  // Fixed width whether or not it draws anything, so the headlines align. w-20
  // fits "27 Sep 26" at `text-xs` without wrapping, which is the widest string
  // this can produce.
  const slot = "w-20 shrink-0";

  const parsed = item.date ? new Date(item.date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return <div className={slot} aria-hidden />;

  const day = parsed.getDate();
  const month = parsed.toLocaleDateString("en-GB", { month: "short" });
  const sameYear = parsed.getFullYear() === new Date().getFullYear();
  const year = String(parsed.getFullYear()).slice(2);

  return (
    // `aria-hidden`: the full date is already in the row's `aria-label`, in
    // words and with its year. A screen-reader user should not be handed
    // "5 Aug" as a second, worse copy of it.
    <div
      className={`${slot} rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-foreground text-center`}
      aria-hidden
    >
      {`${day} ${month}${sameYear ? "" : ` ${year}`}`}
    </div>
  );
}

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
      {/* The date, first, as an object. See `DateTile`. */}
      <DateTile item={item} />
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
      <p className="text-sm text-foreground line-clamp-2 min-w-0 flex-1">{item.headline}</p>
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
function queueLead(summary: ReturnType<typeof summariseQueue>): string | undefined {
  if (summary.total === 0) return undefined;
  if (summary.calm) return `${summary.total} open · none urgent`;
  return `${summary.actToday} today · ${summary.total} open`;
}

export function ActionQueueBlock({
  data,
  title = "What needs you",
}: {
  data: HomeData;
  title?: string;
}) {
  const { queue, isLoading, loadIssue } = data;
  const summary = summariseQueue(queue);

  if (isLoading) {
    return (
      <Panel title={title}>
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
          icon={ShieldAlert}
          tone="orange"
          // Still a sentence, and deliberately: this is the one empty state
          // that must NOT be read at a glance as "you are clear".
          hint="Some sources could not be read — this is not a statement that nothing is waiting on you."
        />
      );
    }
    return <Panel title={title} icon={CheckCircle2} tone="green" hint="Nothing is waiting on you." />;
  }

  // Rows keep `rankQueue`'s order inside their section; sections keep theirs.
  const shown = queue.slice(0, CAP);
  const rows: React.ReactNode[] = [];
  for (const section of SECTIONS) {
    const items = shown.filter((i) => section.kinds.includes(i.kind));
    if (items.length === 0) continue; // Sections only appear when they apply.
    rows.push(
      <SectionHeading key={`h-${section.label}`} label={section.label} count={items.length} />,
    );
    for (const item of items) rows.push(<QueueRow key={item.key} item={item} />);
  }
  if (queue.length > shown.length) {
    rows.push(
      <p key="capped" className="px-4 py-2.5 text-xs text-muted-foreground">
        {queue.length - shown.length} more not shown
      </p>,
    );
  }

  return (
    <Panel title={title} lead={queueLead(summary)}>
      {rows}
    </Panel>
  );
}
