/**
 * Recent activity — the old feed, restored.
 *
 * This is the previous homepage's Activity Feed brought back verbatim: the
 * same eight most-recently-touched tasks, the same status→verb map, the same
 * three display statuses, the same `ActivityFeedItem` row (which was never
 * deleted, only orphaned when the panel was replaced) and the same empty
 * state. The derivation below is `Index.tsx`'s at commit f4cdc51, moved into a
 * component and given a name.
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
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeedItem } from "@/components/ActivityFeedItem";
import { formatDate } from "@/lib/utils";
import { Panel } from "./blocks";
import type { HomeData } from "@/hooks/useHomeData";

/** How many rows the panel shows. The old feed's cap, unchanged. */
const CAP = 8;

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
 * Sorted by `updated_at || created_at` descending and capped — the same sort
 * the previous homepage used, kept because it is what "recent" means.
 */
export function buildRecentActivity(tasks: any[]): ActivityRow[] {
  return [...tasks]
    .sort((a: any, b: any) => {
      const dateA = new Date(b.updated_at || b.created_at).getTime();
      const dateB = new Date(a.updated_at || a.created_at).getTime();
      return dateA - dateB;
    })
    .slice(0, CAP)
    .map((task: any) => {
      const s = (task.status ?? "").toString().toLowerCase();
      const verb = STATUS_VERB[s] || "updated";
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
        title: author
          ? `${author} ${verb} ${subject}`
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
  const rows = buildRecentActivity(data.taskList as any[]);

  if (rows.length === 0) {
    return (
      <Panel title="Recent activity" emphasis="reference">
        <div className="p-4">
          <EmptyState
            variant="plain"
            size="sm"
            title="No activity recorded yet"
            description="Every instruction issued, response given and status change on this project is logged here as it happens."
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Recent activity"
      emphasis="reference"
      lead={`${rows.length} most recently updated`}
    >
      {/* Same scroll behaviour as the two panels above it in this column, so
          the right-hand column still starts and ends on the left column's
          line rather than growing with the feed. */}
      <div className="max-h-[420px] overflow-y-auto px-2 lg:max-h-none lg:h-full">
        {rows.map((r) => (
          <ActivityFeedItem
            key={r.id}
            title={r.title}
            status={r.status}
            author={r.author}
            timeAgo={r.timeAgo}
            needsAction={r.needsAction}
          />
        ))}
      </div>
    </Panel>
  );
}
