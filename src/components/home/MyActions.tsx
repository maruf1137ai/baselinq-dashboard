/**
 * My actions.
 *
 * ── Why this is a panel again, and not a section of the queue ─────────────
 *
 * It was folded into "What needs you", where `buildTaskQueue` classifies a
 * plain task as `own-work` — the LOWEST of the six consequence classes — so an
 * RFI a person has actually been asked to answer sorted below every notice
 * deadline, every unsigned certificate, every contractual obligation and every
 * escalation on the project. On project 46 that put two RFIs genuinely
 * assigned to the signed-in user underneath rows that are not addressed to any
 * user at all (`buildTimeBarQueue` sets `requires: []` and carries no
 * assignee, which is why its own heading has to say "project-wide").
 *
 * The ranking is not wrong — a forfeiture clock does outrank your paperwork —
 * but it answers a different question from the one a person opens this page
 * with. "What is most consequential on this contract" and "what have I been
 * asked to do" are two lists, and merging them let the first bury the second.
 * So they are two lists again, side by side, and neither truncates the other.
 *
 * ── Ungated, deliberately and permanently ────────────────────────────────
 *
 * There is no `canViewFinance` anywhere in this file and none in `myActions`
 * in `useHomeData`. Most users of this product hold no finance permission at
 * all — an architect, an engineer, a contractor's site agent — and every one
 * of them still answers RFIs and receives site instructions. A page that shows
 * them nothing to do because they cannot see the contract sum is a page that
 * does not work for the majority of its users.
 *
 * Nothing on these rows needs a gate: a task subject, its priority, its
 * description and its due date. No money, no risk rating, no certificate. The
 * only scoping that applies is the one that defines the list — the task is
 * assigned to the person reading it.
 *
 * ── Never truncated ──────────────────────────────────────────────────────
 *
 * The list is uncapped and the panel scrolls. There is no "N more not shown",
 * because a line that names a number of things you owe and then does not let
 * you reach them is worse than no line: it tells a reader their own work list
 * is incomplete and offers no way to complete it.
 *
 * ── The tint, and where it stops ─────────────────────────────────────────
 *
 * The old rows were amber on every row, red once overdue. Amber-on-every-row
 * is exactly what the page's severity rule forbids (see `blocks.tsx`): if the
 * whole list is tinted, the tint has stopped being a signal and become a
 * surface treatment, and it also collides with the amber the setup strip above
 * uses for a genuinely different claim.
 *
 * So the tint survives on ONE condition and it is a fact: the due date has
 * passed. That is severity rule 1 — a breach that has already happened — and
 * it is drawn in `TONE.red`, not amber, because "late" is not "nearly late".
 * Everything else is a plain untinted row. On a list where three of eleven are
 * overdue, three rows are coloured and the reader can see the floor; under the
 * old treatment all eleven were, and none of them meant anything.
 *
 * Colour is never the only carrier: an overdue row also says "N days overdue"
 * in words, in the same slot the due date occupies on every other row.
 */
import { AlertCircle, ArrowRight, CheckCircle2, CircleDot } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatDate as formatDateUk } from "@/lib/dateUtils";
import { ROUTE } from "@/lib/homeSignals";
import { cn } from "@/lib/utils";
import type { HomeData } from "@/hooks/useHomeData";

import { Panel } from "./blocks";

/**
 * The priority chip.
 *
 * `Task.priority` is the backend's own field and the backend's own words —
 * "Normal", "High", "Urgent", "Low" — so the label is printed as it arrives,
 * capitalised and not otherwise rewritten. Nothing is invented for a task that
 * carries no priority: it draws no chip, which is a true statement about the
 * record, where the old page's hardcoded "Medium" default was not.
 *
 * `neutral` for everything except a priority the record itself calls the top
 * of its scale, which takes `warning`. That is a RATING and not a breach, so
 * under severity rule 1 it would strictly draw no colour at all — the reason
 * it is allowed one step is that the whole panel is otherwise achromatic and
 * this is the only ranking the rows carry, `myActions` being sorted by date.
 * It is held to `warning` so it can never outrank the destructive an overdue
 * row draws.
 */
function priorityChip(raw: unknown): { label: string; variant: "warning" | "neutral" } | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const label = raw.trim();
  const key = label.toLowerCase();
  if (key === "none" || key === "null") return null;
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    variant: key === "urgent" || key === "critical" || key === "high" ? "warning" : "neutral",
  };
}

/** Whole days between today and a due date. Negative once it is past. */
function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export interface MyActionRow {
  id: string;
  title: string;
  type?: string;
  priority?: string | null;
  description?: string | null;
  due_date?: string | null;
  overdue?: boolean;
}

/**
 * One row, and it is the old page's row: a leading status icon, the title, a
 * priority chip on the right, the description beneath, and a footer carrying
 * the due date on the left and the way in on the right.
 *
 * The whole row is the link. The "View →" affordance is kept because the owner
 * asked for this row by name and it is where the eye goes for the way in, but
 * it is rendered as text inside the anchor rather than as a second control, so
 * there is one tab stop and one target rather than two that go to the
 * same place.
 */
export function MyActionRow({ item }: { item: MyActionRow }) {
  const chip = priorityChip(item.priority);
  const days = daysFromToday(item.due_date);
  const overdue = item.overdue ?? (days !== null && days < 0);
  const label = item.type ? `${item.type}: ${item.title}` : item.title;
  const due = formatDateUk(item.due_date ?? null, "long") || null;

  const dueLine =
    days === null
      ? "No due date"
      : overdue
        ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue${due ? ` · due ${due}` : ""}`
        : `Due ${due ?? "—"}`;

  return (
    <Link
      to={ROUTE.task(item.id)}
      aria-label={[label, dueLine, chip ? `${chip.label} priority` : null, "Open the task"]
        .filter(Boolean)
        .join(". ")}
      className={cn(
        "group block px-4 py-3 transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        // The one coloured surface on this panel, and only for a date that has
        // already passed. `bg-red-50` / `text-red-700` is `TONE.red` in
        // blocks.tsx — the page's existing tinted-row grammar, the same one
        // the setup strip uses in amber. No new colour.
        overdue ? "bg-red-50 hover:bg-red-100" : "hover:bg-muted/50",
      )}
    >
      {/*
        Icon column, then content column. The description and the footer align
        under the title rather than under the icon, and they do it by living in
        the same flex child — no indent value is invented to fake it.
      */}
      <div className="flex items-start gap-2">
        {overdue ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-700" aria-hidden />
        ) : (
          <CircleDot className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {/*
              `font-medium`: this is the other list on the page that asks a
              person to move, so it reads at the same weight as the queue's
              rows and a step above the reference column. Two lines, clamped
              at a word — a task subject is a sentence, and clipping it
              mid-word made two RFIs about two different things arrive as the
              same row with the same ellipsis.
            */}
            <p className="text-sm font-medium text-foreground line-clamp-2 min-w-0">{label}</p>
            {chip && (
              <Badge variant={chip.variant} className="shrink-0">
                {chip.label}
              </Badge>
            )}
          </div>

          {/* The description, and nothing at all where there is none. The old
              page fell back to the title, which printed the same sentence
              twice on every task without one. */}
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
          )}

          <div className="flex items-center justify-between gap-3 mt-1.5">
            <span
              className={cn(
                "text-xs tabular-nums",
                overdue ? "text-red-700" : "text-muted-foreground",
              )}
            >
              {dueLine}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
              View
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** "3 overdue · 11 assigned to you", or the plain count when none is late. */
function lead(rows: MyActionRow[], overdue: number): string {
  if (overdue > 0) return `${overdue} overdue · ${rows.length} assigned to you`;
  return `${rows.length} assigned to you`;
}

export function MyActionsBlock({
  data,
  title = "My actions",
}: {
  data: HomeData;
  title?: string;
}) {
  const rows = data.myActions as MyActionRow[];
  const overdue = rows.filter((r) => r.overdue).length;

  if (data.isLoading) {
    return (
      <Panel title={title} emphasis="primary">
        <AwesomeLoader message="Reading what is assigned to you" />
      </Panel>
    );
  }

  if (rows.length === 0) {
    /*
      A failed task read is a different statement from an empty task list, and
      this panel must never render the first as the second. `loadIssue`'s
      partial level covers a source that could not be read; the tasks endpoint
      is one of the sources it counts.
    */
    const failed = data.loadIssue.level === "partial";
    return (
      <Panel title={title} emphasis="primary">
        <div className="p-4">
          <EmptyState
            variant="plain"
            size="sm"
            icon={failed ? undefined : CheckCircle2}
            title={failed ? "Your tasks could not be read" : "Nothing is assigned to you"}
            description={
              failed
                ? "This is not a statement that nothing is waiting on you — try again from the banner above."
                : "Instructions, RFIs and variations assigned to you appear here, overdue ones first."
            }
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      emphasis="primary"
      lead={lead(rows, overdue)}
      // Severity rule 2: the tier is named ONCE, at the head of the rows it
      // governs, rather than repeated. `danger` only because overdue is a
      // breach that has already happened.
      leadTone={overdue > 0 ? "danger" : "muted"}
    >
      {/*
        Uncapped and scrollable. `max-h` below `lg` so the panel cannot run the
        page off the bottom on a narrow screen; `lg:h-full` inside the fixed
        row above it, where the column already has a height. Either way every
        row is reachable — there is no cap on what is rendered, only on how
        much of it is visible at once.
      */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border lg:max-h-none lg:h-full">
        {rows.map((r) => (
          <MyActionRow key={r.id} item={r} />
        ))}
      </div>
    </Panel>
  );
}
