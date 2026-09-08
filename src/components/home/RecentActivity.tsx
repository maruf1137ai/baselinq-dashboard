import { Activity } from "lucide-react";
/**
 * Recent activity — the old feed, restored.
 *
 * This is the previous homepage's Activity Feed brought back verbatim: the
 * same most-recently-touched tasks, the same status→verb map, the same
 * three display statuses, the same `ActivityFeedItem` row (which was never
 * deleted, only orphaned when the panel was replaced) and the same empty
 * state. The derivation below is `Index.tsx`'s at commit f4cdc51, moved into a
 * component and given a name. The old feed's fixed cap is now just the first
 * page — scrolling the panel reveals more, same as the two panels beside it.
 *
 * ── The ONE thing that was not carried across ────────────────────────────
 *
 * The old code read:
 *
 *     const actorNames = ["Sarah Chen", "Maruf M.", "David K.", "Linda N.", "James P."];
 *     const actorName = task.assignedBy?.name || actorNames[idx % actorNames.length];
 *
 * — a hard-coded list of people who do not exist in the database, cycled by
 * row index whenever the payload carried no `assignedBy`. On a product whose
 * value is being the contemporaneous record of who instructed what and when,
 * that put an invented person's name against a real contractual document, on
 * the project's own homepage, in the panel that claims to log "every
 * instruction issued, response given and status change on this project".
 *
 * So there is no fallback. Where `assignedBy.name` is present the row reads
 * exactly as it always did. Where it is absent the actor is OMITTED and the
 * sentence begins with the verb — "Created RFI: …" — and the row draws no
 * avatar, because an initial is a claim about a person too. A shorter true
 * sentence beats a complete invented one.
 *
 * ── What it can and cannot say ───────────────────────────────────────────
 *
 * It reports the tasks' CURRENT state ordered by when they were last touched,
 * not a transition log — there is no project-scoped history endpoint — so the
 * verb describes the state the row is in now. That was true of the old panel
 * as well and is why the copy says "logged here as it happens" rather than
 * promising a full audit; the full record is on each object.
 *
 * Ungated, and it has to be: `taskList` is the one source on this page every
 * viewer can see regardless of permission (see the note above `myActions` in
 * `useHomeData`). The rows carry a task subject, a type code and a status —
 * no money, no risk rating — so there is nothing here for a permission to
 * protect, and no viewer gets a panel they cannot fill.
 */
import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { formatDate } from "@/lib/utils";
import { Panel } from "./blocks";
import { ROUTE } from "@/lib/homeSignals";
import type { HomeData } from "@/hooks/useHomeData";
import { useScrollPagination } from "@/hooks/useScrollPagination";

/** Rows shown up front. More are revealed on scroll. */
const PAGE_SIZE = 10;

/** The old map, verbatim. A status not in it is "updated". */
const STATUS_VERB: Record<string, string> = {
  done: "approved",
  closed: "approved",
  in_review: "submitted for review",
  inreview: "submitted for review",
  "in review": "submitted for review",
  answered: "submitted for review",
  todo: "created",
  in_progress: "updated",
};

/** Entity-type-aware verbs, keyed by [type][entity status]. Falls back to
 * STATUS_VERB (the 3-bucket Task.status) when the entity status is
 * missing or not in this table, so every row still renders something
 * true. "Draft" is intentionally absent — falls through to the bucket's
 * "created", which is correct for a freshly drafted doc. */
const ENTITY_STATUS_VERB: Record<string, Record<string, string>> = {
  VO: {
    Submitted: "submitted", "Under Review": "submitted for review",
    Priced: "priced", Recommended: "recommended for approval",
    Approved: "approved", Rejected: "rejected", Closed: "closed",
  },
  SI: {
    Issued: "issued", Acknowledged: "acknowledged", Actioned: "actioned",
    Verified: "verified", Completed: "closed", Closed: "closed",
  },
  RFI: {
    "Sent for Review": "submitted for review",
    "Further Info Required": "requested more information on",
    "Response Provided": "responded to", Closed: "closed", Answered: "closed",
  },
  DC: {
    "Notice Issued": "issued a delay notice for",
    "Under Assessment": "began assessing",
    "Determination Made": "made a determination on",
    "EOT Awarded": "awarded an extension of time on",
    Rejected: "rejected", "Re-evaluate": "sent back for re-evaluation",
  },
  IC: {
    Sent: "sent", Acknowledged: "acknowledged",
    "Escalated to Claim": "escalated to a claim", Closed: "closed",
  },
  GI: { Sent: "sent", Replied: "replied to", Closed: "closed" },
  CPI: {
    "In Review": "began progress on", "In Progress": "began progress on",
    "On Hold": "put on hold", Approved: "approved",
    Closed: "closed", Completed: "closed",
  },
};

type DisplayStatus = "In Progress" | "Pending" | "Completed";

export interface ActivityRow {
  id: string;
  title: string;
  status: DisplayStatus;
  /** Null where the payload named nobody. Never substituted for. */
  author: string | null;
  timeAgo: string;
  needsAction: boolean;
}

/**
 * The old derivation, exported so it can be tested without a screen.
 *
 * Sorted by `updated_at || created_at` descending — the same sort the
 * previous homepage used, kept because it is what "recent" means. Returns the
 * full list; the panel below paginates it for display.
 */
export function buildRecentActivity(tasks: any[]): ActivityRow[] {
  return [...tasks]
    .sort((a: any, b: any) => {
      const dateA = new Date(b.updated_at || b.created_at).getTime();
      const dateB = new Date(a.updated_at || a.created_at).getTime();
      return dateA - dateB;
    })
    .map((task: any) => {
      const s = (task.status ?? "").toString().toLowerCase();
      const entityVerb = ENTITY_STATUS_VERB[task.type as string]?.[task.entityStatus as string];
      const verb = entityVerb || STATUS_VERB[s] || "updated";
      const status: DisplayStatus =
        s === "done" || s === "closed"
          ? "Completed"
          : s === "in review" || s === "in_review" || s === "inreview" || s === "answered"
            ? "In Progress"
            : "Pending";
      const author = task.assignedBy?.name || null;
      const subject = `${task.type || "Task"}: ${task.title}`;
      return {
        id: String(task.id),
        // With an actor: "Sarah Chen approved VO: …" exactly as before. Without
        // one: the verb leads, capitalised, and nobody is named.
        // The AUTHOR is not in the sentence — `ActivityFeedItem` prints it in
        // bold at the front of the row. The old page put it in both, which
        // read "Anja Kruger pending Anja Kruger created SI: …". Removing the
        // bold one instead left the row starting on "pending", which was
        // worse. So: bold name, then the verb.
        title: author
          ? `${verb} ${subject}`
          : `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${subject}`,
        status,
        author,
        timeAgo:
          task.updated_at || task.created_at
            ? formatDate(task.updated_at || task.created_at)
            : "Just now",
        needsAction: !!task.needsAction,
      };
    });
}

export function RecentActivityBlock({ data }: { data: HomeData }) {
  // Memoized on `data.taskList` (itself stable unless the underlying data
  // changes) rather than rebuilt as a fresh array every render — otherwise a
  // render with no real data change still hands `useScrollPagination` a new
  // array identity, and it resets the revealed rows back to one page.
  const rows = useMemo(() => buildRecentActivity(data.taskList as any[]), [data.taskList]);
  // Hooks must run unconditionally, ahead of the empty-state early return
  // below.
  const { visibleItems, hasMore, containerRef, sentinelRef } = useScrollPagination(
    rows,
    PAGE_SIZE,
  );

  if (rows.length === 0) {
    return (
      <Panel title="Recent activity"
      emphasis="primary">
        <div className="p-4">
          <EmptyState
              icon={Activity}
            variant="plain"
            size="sm"
            title="No activity recorded yet"
            description="Instructions, responses and status changes you're party to on this project will be logged here as they happen."
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Recent activity"
      emphasis="primary"
      // Describes exactly what's rendered below, not the full feed behind
      // it — "most recently updated" is only true of the visible window.
      lead={`${visibleItems.length} most recently updated`}
    >
      {/* Bounded at every width, not just below `lg` — this row is
          `items-start` (Index.tsx), not a stretched grid, so a max-height
          that cancelled out on desktop left the container unclipped and the
          scroll-triggered pagination below with no scroll to trigger on. */}
      <div ref={containerRef} className="max-h-[420px] overflow-y-auto px-2">
        {visibleItems.map((r) => (
          <ActivityFeedItem
            key={r.id}
            title={r.title}
            status={r.status}
            author={r.author}
            timeAgo={r.timeAgo}
            needsAction={r.needsAction}
            to={ROUTE.task(r.id)}
          />
        ))}
        {hasMore && <div ref={sentinelRef} />}
      </div>
    </Panel>
  );
}
