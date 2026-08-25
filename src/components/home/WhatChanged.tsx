/**
 * "What changed" — the right-hand column's second panel.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 *
 * The queue on the left answers "what must I do". This answers the other
 * question a person opening a project asks, which the page had no answer to at
 * all: **what has moved since I last looked.**
 *
 * The two are deliberately disjoint, and the rule is enforced in
 * `homeChanges.ts` §5 against the queue's builders one by one rather than by
 * eye. Nothing that "What needs you" already draws appears here.
 *
 * ── Why the order is not newest-first ────────────────────────────────────
 *
 * It is tier-major, recency-minor: a three-week-old certificate posting sits
 * above forty RFIs answered this morning. Sorting a feed by timestamp is
 * exactly what made the activity feed that was deleted from this page useless,
 * because any volume of routine traffic pushed the consequential row off it.
 *
 * That has a cost this component has to pay: a reader who sees "6 days ago"
 * above "today" and no explanation reads the panel as broken. So the tier is
 * carried in the type — a decisive row is set in the foreground colour at
 * medium weight, a routine one in the muted colour — which explains the order
 * without adding a chip, a colour or a pixel of height.
 *
 * There is deliberately no severity colour on any row. Nothing in this panel
 * is a breach and nothing here carries a countdown; that is the queue's axis,
 * and borrowing its red would make a posted certificate look like a problem.
 *
 * ── Role-tailoring ───────────────────────────────────────────────────────
 *
 * Every row declares the permissions its source requires and `buildChangeFeed`
 * drops what the viewer does not hold, failing closed on an absent flag. A
 * contractor without `finance.view` is not shown a greyed-out "PC-006 posted":
 * the row is not in their list and the panel is shorter. The hidden COUNT is
 * not disclosed either — "3 changes hidden" tells a contractor exactly how
 * much commercial activity is happening this week, which is the fact being
 * withheld.
 *
 * ── Its honest limits, printed rather than hidden ────────────────────────
 *
 * The feed reports POSITION, not history — there is no project-scoped
 * transition log on the backend — and what it cannot date it omits and counts.
 * `undated`, `aged` and `taskOverflow` are those counts and this component
 * prints them in the panel header, in the one place a reader will see them
 * before drawing a conclusion from a short list.
 */
import { Link } from "react-router-dom";

import { Panel } from "./blocks";
import { relativeDays } from "@/lib/homeSignals";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import type { ChangeFeed, ChangeItem } from "@/lib/homeChanges";

/**
 * How prominent a row is, by its tier.
 *
 * This is the ONLY thing that explains the ordering to a reader, so it is not
 * decoration. Existing tokens only, and no extra element: the hierarchy is
 * carried by weight and by the two text colours the rest of the page uses.
 */
const HEADLINE_CLASS: Record<ChangeItem["significance"], string> = {
  // ── ALL THREE STEPPED DOWN ONE NOTCH, AND THE `font-medium` IS GONE ─────
  //
  // `decisive` carried `font-medium`, and it was the ONLY `font-medium`
  // content row on the whole homepage — in the panel whose own header comment
  // says these rows are explicitly not what you must do. The page's single
  // heaviest content row belonged to the thing nobody has to act on, while the
  // queue's rows, which are the only rows that ask a person to move, were
  // plain `text-sm`. The weight moved to `QueueRow`, where it earns its keep.
  //
  // The three tiers survive, because the weight was never the only channel
  // and the tier is what explains an order that is not newest-first. They are
  // now colour-then-size — foreground, muted, muted-and-smaller — all existing
  // tokens, and `text-xs` on the routine tier also takes a little height off
  // the taller of the two columns, which is where it was needed.
  decisive: "text-sm text-foreground",
  material: "text-sm text-muted-foreground",
  routine: "text-xs text-muted-foreground",
};

function ChangeRow({ item }: { item: ChangeItem }) {
  // `ageDays` is whole days SINCE the event; `relativeDays` speaks in days
  // until, so it is negated. The same vocabulary the queue uses for its
  // clocks, so two panels side by side do not date things two different ways.
  const when = relativeDays(-item.ageDays);
  const full = formatDateUk(item.at, "long");
  return (
    <Link
      to={item.href}
      /* `py-2`, matching the risk rows. The right-hand column is passive
         reference by this page's own argument, so it is the column that gives
         height back to the one that is not. */
      className="flex items-baseline gap-3 px-4 py-2 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-ring-offset-1"
      /* The ABSOLUTE date, in words and with its year, and the word that says
         what kind of date it is. The row shows the relative form; a reader who
         needs the calendar day gets it here. */
      title={[full ? `Moved ${full}` : null, when].filter(Boolean).join(" · ") || undefined}
      aria-label={[item.headline, when ? `moved ${when}` : null].filter(Boolean).join(". ") + "."}
    >
      {/* ONE LINE PER ROW, and the detail runs on inside it rather than under
          it. The page has to hold one screen at 1440px and the right-hand
          column is what sets its height: measured on the real layout, a
          single-line row is 45px and the page came to 856px at four rows,
          where a two-line row would put it past 900px and start the scroll.
          So `detail` is provenance that runs on after a separator and is the
          first thing to be truncated away — the row still resolves to the
          object, which is where the full record is. */}
      <p className={`${HEADLINE_CLASS[item.significance]} truncate min-w-0`}>
        {item.headline}
        {item.detail && (
          <span className="text-muted-foreground font-normal"> · {item.detail}</span>
        )}
      </p>
      {/*
        ── RELATIVE time, back on the right, where it was and where it belongs ─

        It was here, it was moved into a leading date pill to put this list in
        register with the queue, and the pill printed the absolute event date:
        "17 Aug" on nearly every row of the live project, in the strongest
        position a row has, replacing the one thing a reader of a history
        actually asks — **how long ago**. Nobody scanning what has moved on a
        project is looking up a calendar day; they are asking whether a thing
        is fresh. "yesterday" answers that and "17 Aug" makes them work it out.

        On the RIGHT because it is metadata about the row rather than the row's
        subject — a history's rows are the things that moved, not the days they
        moved on. It is also what separates this list from `Open risk` directly
        above it, which is plain sentences and ends in nothing; the two start
        their text on the same vertical line and diverge at the other end, which
        is the right way round. The queue, in the other column, is the only list
        weighted at both ends.

        Muted and `text-xs`: quieter than every headline tier including
        `routine`, so it never competes with the sentence it dates.

        It also explains the order. This feed is tier-major and recency-minor
        by design — see the header — so a reader WILL see "6 days ago" above
        "yesterday". Printing the age is what makes that visibly deliberate
        rather than visibly broken, and the panel's lead says the rule outright.
      */}
      {when && (
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{when}</span>
      )}
    </Link>
  );
}

/**
 * The disclosure line, or nothing.
 *
 * ── Cut from about 130 characters to about 40 ─────────────────────────────
 *
 * It read, in full: "3 carry no date this page can read and cannot be placed
 * in this order; 12 older changes are off the list; 4 further task rows." Two
 * things were wrong with that. It was the longest sentence on the homepage,
 * set in 11px grey under a panel title, competing for attention with the
 * queue. And it was self-doubt about facts the reader cannot act on — a
 * knowing that some rows are not in a list is not a move, and there is no
 * control anywhere on this page for showing them.
 *
 * The counts THEMSELVES are kept, because a reader drawing "nothing much
 * happened" off a short list needs to know the list is short. What is cut is
 * the explanation of why, which belongs in this comment and not in the
 * interface: "3 undated · 12 older · 4 more tasks" carries the same warning at
 * a third of the length.
 */
function changeFeedDisclosure(feed: ChangeFeed): string | undefined {
  const parts: string[] = [];
  if (feed.undated > 0) parts.push(`${feed.undated} undated`);
  if (feed.aged > 0) parts.push(`${feed.aged} older`);
  if (feed.taskOverflow > 0) parts.push(`${feed.taskOverflow} more tasks`);
  return parts.length === 0 ? undefined : `${parts.join(" · ")} not listed`;
}

export function WhatChangedBlock({ feed }: { feed: ChangeFeed }) {
  if (feed.items.length === 0) {
    return (
      <Panel
        title="What changed"
        emphasis="reference"
        // "Nothing is tracked" and "nothing has moved" are different states and
        // the page must not say the second when it means the first — a brand
        // new project has no certificates and no meetings, and calling that
        // quiet is a claim about a project nobody has started.
        hint={
          feed.empty
            ? "Nothing is tracked on this project yet, so there is nothing to report movement on."
            : (changeFeedDisclosure(feed) ??
              "Nothing has moved on this project in the last month.")
        }
      />
    );
  }

  return (
    <Panel
      title="What changed"
      emphasis="reference"
      /*
        "3 recent" was a count with no unit and no grammar. The rows now print
        their age on the right, so the ordering is visible — and it is NOT
        newest-first, by design, which this panel's header comment names as the
        thing a reader misreads as broken. Saying the rule beside the title
        costs no height (the lead already rides on the title's baseline) and
        turns a confusing column into an explained one.
      */
      lead={`${feed.items.length} recent · most consequential first`}
      hint={changeFeedDisclosure(feed)}
    >
      {feed.items.map((item) => (
        <ChangeRow key={item.key} item={item} />
      ))}
    </Panel>
  );
}
