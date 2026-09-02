import type * as React from "react";
/**
 * Upcoming meetings.
 *
 * The old homepage had this panel and the rebuild dropped it, on the reasoning
 * that a meeting in the diary carries no verb — nothing to do, so nothing for a
 * work queue. That reasoning held for the queue and was wrong for the page: for
 * a consultant whose sidebar is six items, the diary IS most of their week, and
 * removing it left them a screen with nothing on it.
 *
 * `upcomingMeetings` is already derived in `useHomeData` — filtered of
 * cancelled and declined, past ones dropped, soonest first. This only renders
 * it.
 */
import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { Panel, ViewAll } from "./blocks";
import type { HomeData } from "@/hooks/useHomeData";
import { useScrollPagination } from "@/hooks/useScrollPagination";

/** Rows are revealed 10 at a time; scrolling to the bottom of the panel loads the next 10. */
const PAGE_SIZE = 10;

export function UpcomingMeetingsBlock({
  data,
  segments,
}: {
  data: HomeData;
  /** The Contract-watch switcher, drawn in this panel's header. */
  segments?: React.ReactNode;
}) {
  const rows = data.upcomingMeetings ?? [];
  // Hooks must run unconditionally, ahead of the empty-state branch below.
  const { visibleItems, hasMore, containerRef, sentinelRef } = useScrollPagination(
    rows,
    PAGE_SIZE,
  );

  return (
    <Panel
      /*
        "My meetings", and possessive on purpose. `upcomingMeetings` is the
        reader's own diary — `useHomeData` has already dropped cancelled
        meetings and ones this user declined — so the panel is about them in
        the same way "My actions" is, and its heading should say so. The lead
        carries the "upcoming" that came out of the title, which is where that
        word belonged: it qualifies the count, not the panel.
      */
      title="My meetings"
      emphasis="primary"
      segments={segments}
      lead={rows.length ? `${rows.length} coming up` : undefined}
      action={<ViewAll to="/meetings">All meetings</ViewAll>}
    >
      {rows.length === 0 ? (
        <EmptyState
          variant="plain"
          size="sm"
          icon={CalendarDays}
          title="Nothing in your diary"
          description="Meetings you are invited to appear here, soonest first."
        />
      ) : (
        // Bounded at every width — `ContractWatchBlock` renders full-width
        // on its own row (Index.tsx), not paired in a stretched grid, so a
        // max-height that only applied below `lg` used to cancel out on
        // desktop, leaving the container unclipped and the
        // scroll-triggered pagination below with no scroll to trigger on.
        <div ref={containerRef} className="max-h-[420px] overflow-y-auto">
          <ul className="divide-y divide-border">
            {visibleItems.map((m: any) => (
              <li key={m.id}>
                <Link
                  to={`/meetings/${m.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {m.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {formatDateUk(m.date) ?? m.date}
                        {m.time ? ` · ${m.time}` : ""}
                      </span>
                      {m.location ? (
                        <span className="flex min-w-0 items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{m.location}</span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {hasMore && <div ref={sentinelRef} />}
        </div>
      )}
    </Panel>
  );
}
