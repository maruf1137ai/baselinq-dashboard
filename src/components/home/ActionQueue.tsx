/**
 * The action queue.
 *
 * One question: *what will cost me money if I do not act today?*
 *
 * Everything in a row is decided in `src/lib/homeSignals.ts` (what the row
 * says) and `src/lib/homeQueueRank.ts` (what order the rows come in). This
 * file only renders them, and introduces no colour, radius, type size or
 * spacing that is not already in `src/index.css` / `tailwind.config.ts` — the
 * card treatment is the same `bg-card border border-border rounded-xl p-4`
 * used on ProjectHealth and Finance.
 *
 * Three things this component is careful about:
 *
 *  1. **One action per row, to a route that exists.** Every `href` comes from
 *     the `ROUTE` table in homeSignals.ts, checked against App.tsx. Nothing
 *     points at `/approvals`, which is not a route.
 *
 *  2. **Empty and calm are different.** A new project has no certificates, no
 *     variations and no meetings — the common case. That is "nothing is being
 *     tracked yet", not "you are clear". A project with eleven items, none of
 *     them inside a deadline window, IS clear and says so.
 *
 *  3. **An outage never reads as clear.** If a source failed, the empty state
 *     says which, because on a page whose whole job is telling somebody what
 *     is outstanding, a confident silence is the most expensive thing we could
 *     render.
 */
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FileWarning,
  Inbox,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { cn } from "@/lib/utils";
import { ACT_TODAY_BAND, bandOf, summariseQueue } from "@/lib/homeQueueRank";
import type { QueueItem, QueueKind } from "@/lib/homeQueueRank";
import type { HomeData } from "@/hooks/useHomeData";

import { Panel } from "./blocks";

const KIND_ICON: Record<QueueKind, typeof CalendarClock> = {
  "time-bar": CalendarClock,
  certificate: Banknote,
  rejected: FileWarning,
  risk: AlertTriangle,
  obligation: ClipboardCheck,
  "meeting-action": FileText,
  rsvp: CalendarClock,
  task: Inbox,
};

const KIND_LABEL: Record<QueueKind, string> = {
  "time-bar": "Notice deadline",
  certificate: "Certificate",
  rejected: "Returned certificate",
  risk: "Risk signal",
  obligation: "Contract obligation",
  "meeting-action": "Meeting notes",
  rsvp: "Meeting",
  task: "Task",
};

/**
 * The one chip on a row, and it is about the CLOCK, not the state.
 *
 * A forfeiture clock is stated in the unit the backend counted in. "3 days"
 * and "3 working days" are a week apart in May.
 */
function clockChip(item: QueueItem): { label: string; variant: "danger" | "warning" | "neutral" } | null {
  if (item.daysRemaining === null) {
    return item.consequence === "forfeiture"
      ? { label: "Not dated", variant: "warning" }
      : null;
  }
  const unit = item.clock === "working" ? " working" : "";
  if (item.daysRemaining < 0) {
    return { label: `${Math.abs(item.daysRemaining)}${unit} days over`, variant: "danger" };
  }
  if (item.daysRemaining === 0) return { label: "Today", variant: "danger" };
  return {
    label: `${item.daysRemaining}${unit} days left`,
    variant: item.pressure === "critical" ? "danger" : item.pressure === "soon" ? "warning" : "neutral",
  };
}

export function QueueRow({ item }: { item: QueueItem }) {
  const Icon = KIND_ICON[item.kind];
  const chip = clockChip(item);
  // Only the top bands earn the loud treatment. If every row is red, the row
  // that is actually forfeiting a claim reads the same as a late task.
  const urgent = bandOf(item) <= ACT_TODAY_BAND;

  return (
    <Link
      to={item.href}
      aria-label={`${item.headline}. ${item.action}.`}
      className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "p-1.5 rounded-md border shrink-0",
              urgent
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{item.headline}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {KIND_LABEL[item.kind]}
              {item.detail ? ` · ${item.detail}` : ""}
            </p>
            <p className="text-xs text-primary mt-1">{item.action}</p>
          </div>
        </div>
        {chip && (
          <Badge variant={chip.variant} className="shrink-0 tabular-nums">
            {chip.label}
          </Badge>
        )}
      </div>
    </Link>
  );
}

/** What the header line says, given the shape of the queue. */
function queueHint(summary: ReturnType<typeof summariseQueue>): string | undefined {
  if (summary.total === 0) return undefined;
  if (summary.calm) return `${summary.total} open, none inside a deadline window`;
  const parts = [`${summary.actToday} need${summary.actToday === 1 ? "s" : ""} you today`];
  if (summary.forfeiture > 0) {
    parts.push(
      `${summary.forfeiture} notice deadline${summary.forfeiture === 1 ? "" : "s"} running`,
    );
  }
  return `${parts.join(" · ")} · ${summary.total} open in all`;
}

export function ActionQueueBlock({
  data,
  limit,
  title = "What needs you",
}: {
  data: HomeData;
  limit?: number;
  title?: string;
}) {
  const { queue, isLoading, loadIssue } = data;
  const summary = summariseQueue(queue);
  const shown = limit ? queue.slice(0, limit) : queue;

  if (isLoading) {
    return (
      <Panel title={title}>
        <AwesomeLoader message="Working out what needs you" />
      </Panel>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  // Empty is the COMMON case on a new project, so it must read as correct
  // rather than as broken — and it must never read as reassurance we cannot
  // give. If a source failed, that is the headline, not the emptiness.
  if (queue.length === 0) {
    if (loadIssue.level === "partial") {
      return (
        <Panel title={title}>
          <EmptyState
            variant="bordered"
            icon={ShieldAlert}
            title="Nothing outstanding in the sources that answered"
            description="Some could not be read, so this is not a statement that nothing is waiting on you. Retry from the banner above."
          />
        </Panel>
      );
    }
    return (
      <Panel title={title}>
        <EmptyState
          icon={CheckCircle2}
          title="Nothing is waiting on you"
          description="Notice deadlines, certificates waiting to be certified, obligations from the contract, invitations to answer and instructions assigned to you all appear here — the ones that forfeit something first."
        />
      </Panel>
    );
  }

  return (
    <Panel title={title} hint={queueHint(summary)}>
      <div className="space-y-3">
        {shown.map((item) => (
          <QueueRow key={item.key} item={item} />
        ))}
        {limit && queue.length > limit && (
          <p className="text-xs text-muted-foreground">
            {queue.length - limit} more further down the queue.
          </p>
        )}
      </div>
    </Panel>
  );
}
