/**
 * Contract watch — one panel, three lists, a segmented switcher.
 *
 * ── Why three panels became one ──────────────────────────────────────────
 *
 * "What needs you", "Project risk" and "My meetings" were three stacked
 * cards doing one job: a ranked list of things standing on this contract. A
 * reader had to learn the boundary between them before the page was usable —
 * which is the question the owner asked out loud ("what's the difference
 * between What needs you and My actions?") and the reason the page read
 * messy. Three headers, three borders and three lots of empty state for one
 * question is chrome, not information.
 *
 * Folding them removes two containers and roughly 150px, which is what buys
 * the page back its one-screen budget now that My actions and the activity
 * feed have the top of it.
 *
 * ── The four rules that make a switcher work here ────────────────────────
 *
 *  1. **A segment a role cannot populate does not render.** Not greyed, not
 *     an empty tab — absent. `RiskConditionBlock` already returns null
 *     without `compliance.view`, on the reasoning that "no open risk
 *     signals" is an all-clear addressed to the one viewer who cannot know
 *     whether it is true. A disabled tab labelled "Risk" leaks the same
 *     fact the panel withholds, so the tab goes with the panel.
 *
 *  2. **It opens on the worst thing present, not on a fixed default.**
 *     `summariseQueue` already reports the queue's worst consequence, and a
 *     live forfeiture clock must never sit behind a tab the reader has to
 *     think to press. A remembered choice is honoured EXCEPT where the queue
 *     holds something graver than the remembered segment can show.
 *
 *  3. **The choice persists** per user per project, so somebody who lives in
 *     Risk is not returned to Needs-you every morning.
 *
 *  4. **Counts sit on the segments.** A tab that hides its number is worse
 *     than no tab: the reader cannot tell whether pressing it is worth the
 *     click, so they press all of them, and the switcher has cost them time
 *     rather than saved it.
 *
 * The active segment's own title and lead stay in the panel header. A tab
 * label cannot carry "13 critical of 14 open signals", and that line is the
 * most useful string on the panel.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { summariseQueue } from "@/lib/homeQueueRank";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/hooks/useHomeData";

import { ActionQueueBlock, RiskConditionBlock } from "./blocks";
import { UpcomingMeetingsBlock } from "./UpcomingMeetings";

type SegmentId = "queue" | "risk" | "meetings";

/** The URL key, so a notification can deep-link straight to the right list. */
const PARAM = "watch";

const storageKey = (projectId: string | number | null | undefined) =>
  projectId ? `home.contractWatch.${projectId}` : null;

interface Segment {
  id: SegmentId;
  label: string;
  count: number;
  /** Drawn in the destructive token when true — a breach already happened. */
  urgent: boolean;
}

export function ContractWatchBlock({
  data,
  projectId,
}: {
  data: HomeData;
  projectId?: string | number | null;
}) {
  const [params, setParams] = useSearchParams();

  /*
    Rule 1. Each segment is offered only where the viewer could populate it.

    The queue is never withheld: it filters itself per row via `requires`, so
    a viewer without finance simply sees the rows they may see. Risk is gated
    whole. Meetings are the reader's own diary and need no permission, but an
    empty diary is worth a tab only when the panel would otherwise be the
    reader's only view of it — so it is offered whenever the other two are.
  */
  const segments = useMemo<Segment[]>(() => {
    const queue = data.queue.filter((i) => i.kind !== "task");
    const summary = summariseQueue(queue);
    const out: Segment[] = [
      {
        id: "queue",
        label: "Needs you",
        count: summary.total,
        urgent: queue.some((i) => i.overdue),
      },
    ];
    if (data.canViewCompliance && !data.riskUnavailable) {
      out.push({
        id: "risk",
        label: "Risk",
        count: data.riskCounts.total,
        urgent: data.riskGroups.some((g) => g.severity === "red"),
      });
    }
    /*
      A meeting starting imminently should be able to win the default tab —
      but only when the viewer has not already dealt with it. `starting_soon`
      is not reimplemented here: it is read straight off the backend's own
      ~15-minute window (`meetings/serializers.py::_compute_display_status`,
      via `MeetingListSerializer.status`), so this can never drift from the
      one other place the product draws the same line. `my_rsvp === "invited"`
      is the second half: a meeting the viewer already accepted starting soon
      needs no rescue from the queue tab; one they have not answered and is
      about to start does.
    */
    const meetings = data.upcomingMeetings ?? [];
    out.push({
      id: "meetings",
      label: "Meetings",
      count: meetings.length,
      urgent: meetings.some((m) => m.status === "starting_soon" && m.my_rsvp === "invited"),
    });
    return out;
  }, [data]);

  const available = segments.map((s) => s.id);

  /*
    Rule 2 and 3, in that order of authority.

    A URL parameter wins outright — it is an explicit instruction, usually
    from a notification that knows what it wants shown. Otherwise the
    remembered choice is honoured, and only when there is neither does the
    panel pick: the first segment carrying something already overdue, else
    the first segment with anything in it at all.

    A remembered segment that is no longer offered (a permission changed, the
    risk engine went down) falls back the same way rather than rendering
    nothing.
  */
  const key = storageKey(projectId);
  const [chosen, setChosen] = useState<SegmentId | null>(() => {
    if (!key) return null;
    const saved = localStorage.getItem(key);
    return saved === "queue" || saved === "risk" || saved === "meetings" ? saved : null;
  });

  const fromUrl = params.get(PARAM) as SegmentId | null;
  const urlValid = fromUrl && available.includes(fromUrl) ? fromUrl : null;

  const fallback: SegmentId =
    segments.find((s) => s.urgent)?.id ?? segments.find((s) => s.count > 0)?.id ?? "queue";

  const active: SegmentId =
    urlValid ?? (chosen && available.includes(chosen) ? chosen : fallback);

  useEffect(() => {
    if (key && chosen) localStorage.setItem(key, chosen);
  }, [key, chosen]);

  const select = (id: SegmentId) => {
    setChosen(id);
    // Clearing the parameter keeps a deep link from pinning the panel for the
    // rest of the session once the reader has moved off it themselves.
    if (params.get(PARAM)) {
      const next = new URLSearchParams(params);
      next.delete(PARAM);
      setParams(next, { replace: true });
    }
  };

  const switcher = (
    <div
      role="tablist"
      aria-label="Contract watch"
      className="flex items-center gap-1 flex-wrap"
    >
      {segments.map((s) => {
        const on = s.id === active;
        return (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => select(s.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on
                ? "border-border bg-background font-medium text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {s.label}
            {/* Rule 4. Zero is still stated: "Meetings 0" tells a reader the
                diary was read and is empty, which an absent count does not. */}
            <span
              className={cn(
                "tabular-nums",
                s.urgent ? "text-destructive font-medium" : "text-muted-foreground",
              )}
            >
              {s.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (active === "risk") return <RiskConditionBlock data={data} segments={switcher} />;
  if (active === "meetings") return <UpcomingMeetingsBlock data={data} segments={switcher} />;
  return <ActionQueueBlock data={data} segments={switcher} />;
}
