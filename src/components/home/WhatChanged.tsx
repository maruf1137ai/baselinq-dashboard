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
import type { ChangeFeed, ChangeItem } from "@/lib/homeChanges";

/**
 * How prominent a row is, by its tier.
 *
 * This is the ONLY thing that explains the ordering to a reader, so it is not
 * decoration. Existing tokens only, and no extra element: the hierarchy is
 * carried by weight and by the two text colours the rest of the page uses.
 */
const HEADLINE_CLASS: Record<ChangeItem["significance"], string> = {
  decisive: "text-sm text-foreground font-medium",
  material: "text-sm text-foreground",
  routine: "text-sm text-muted-foreground",
};

function ChangeRow({ item }: { item: ChangeItem }) {
  // `ageDays` is whole days SINCE the event; `relativeDays` speaks in days
  // until, so it is negated. The same vocabulary the queue uses for its
  // clocks, so two panels side by side do not date things two different ways.
  const when = relativeDays(-item.ageDays);
  return (
    <Link
      to={item.href}
      className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-ring-offset-1"
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
      {when && (
        <p className="text-xs text-muted-foreground tabular-nums shrink-0">{when}</p>
      )}
    </Link>
  );
}

/**
 * The disclosure line, or nothing.
 *
 * Three counts, one sentence, because the panel header has room for one line
 * and the page has to hold one screen. Each clause is only present when its
 * count is, and each says what the reader would otherwise wrongly conclude
 * from a short list.
 */
function changeFeedDisclosure(feed: ChangeFeed): string | undefined {
  const parts: string[] = [];
  if (feed.undated > 0) {
    parts.push(
      `${feed.undated} carry no date this page can read and cannot be placed in this order`,
    );
  }
  if (feed.aged > 0) {
    parts.push(`${feed.aged} older ${feed.aged === 1 ? "change is" : "changes are"} off the list`);
  }
  if (feed.taskOverflow > 0) {
    parts.push(`${feed.taskOverflow} further task ${feed.taskOverflow === 1 ? "row" : "rows"}`);
  }
  if (parts.length === 0) return undefined;
  return `${parts.join("; ")}.`;
}

export function WhatChangedBlock({ feed }: { feed: ChangeFeed }) {
  if (feed.items.length === 0) {
    return (
      <Panel
        title="What changed"
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
      lead={`${feed.items.length} recent`}
      hint={changeFeedDisclosure(feed)}
    >
      {feed.items.map((item) => (
        <ChangeRow key={item.key} item={item} />
      ))}
    </Panel>
  );
}
