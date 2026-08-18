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
  { label: "Contract deadlines", kinds: ["time-bar"] },
  { label: "Certificates awaiting you", kinds: ["certificate", "rejected"] },
  { label: "Contract obligations", kinds: ["obligation"] },
  { label: "Blocking someone else", kinds: ["rsvp", "meeting-action"] },
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
 */
function clockChip(item: QueueItem): { label: string; variant: "danger" | "warning" | "neutral" } | null {
  if (item.daysRemaining === null) {
    // An undated forfeiture clock is an UNKNOWN deadline and must not read as
    // "no deadline". It is the one non-fact that still earns a colour.
    return item.consequence === "forfeiture"
      ? { label: "Not dated", variant: "warning" }
      : null;
  }
  const unit = item.clock === "working" ? " working" : "";
  if (item.daysRemaining < 0) {
    return { label: `${Math.abs(item.daysRemaining)}${unit} days over`, variant: "danger" };
  }
  if (item.daysRemaining === 0) return { label: "Today", variant: "danger" };
  return { label: `${item.daysRemaining}${unit} days left`, variant: "neutral" };
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
 *    and its severity colour was the decoration described above.
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

  return (
    <Link
      to={item.href}
      title={item.detail ?? undefined}
      /*
        The chip MUST be in here. `aria-label` replaces the accessible name
        computed from descendants, so a screen-reader user was given the
        headline and the action and never the clock — and now that the day
        count lives only in the chip and no longer appears in the headline,
        that was the whole deadline going missing for exactly the users least
        able to recover it from a glance.
      */
      aria-label={[item.headline, chip?.label, item.action].filter(Boolean).join(". ") + "."}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
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
