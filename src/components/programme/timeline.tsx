import { Calendar, Plus } from "lucide-react";
import React, { useMemo } from "react";
import { parseISO, differenceInDays, format, addMonths, startOfMonth } from "date-fns";
import { useMilestonePhaseCosts, MilestoneWithCost } from "@/hooks/useMilestones";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/formatCurrency";

const STATUS_COLORS: Record<string, string> = {
  planned: "#6B7280",
  in_progress: "#6c5ce7",
  completed: "#10B981",
  delayed: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

/**
 * Whole rands in Finance's format (R 13 605 500), not the browser locale's
 * ("ZAR 13,605,500" on one machine, "ZAR 13.605.500" on another).
 */
export function formatCost(amount: number, currency: string) {
  return formatMoney(Math.round(amount), currency || "ZAR").replace(/,00$/, "");
}

interface TimelineProps {
  projectId: string | number | null;
  discipline: string;
  canCreate?: boolean;
  onAddMilestone?: () => void;
}

const Timeline = ({ projectId, discipline, canCreate = false, onAddMilestone }: TimelineProps) => {
  const { data, isLoading } = useMilestonePhaseCosts(projectId, discipline);
  const milestones = data?.milestones ?? [];
  const currency = data?.currency ?? "ZAR";
  // Construction phases carry what was certified against them, not a cost:
  // each posted certificate counted once, excl. VAT. "On certificates"
  // because Finance's certified to date also counts manual Cost Ledger
  // credits, which belong to no phase.
  const construction = discipline === "construction";
  const totalLabel = construction ? "Certified on certificates (excl. VAT)" : "Total planned fees";

  const { rangeStart, rangeEnd, months } = useMemo(() => {
    if (!milestones.length) {
      const now = new Date();
      const start = startOfMonth(now);
      const end = addMonths(start, 5);
      const months: Date[] = [];
      for (let i = 0; i <= 5; i++) months.push(addMonths(start, i));
      return { rangeStart: start, rangeEnd: end, months };
    }

    const starts = milestones.map((m) => parseISO(m.startDate));
    const ends = milestones.map((m) => parseISO(m.endDate));
    const minDate = startOfMonth(new Date(Math.min(...starts.map((d) => d.getTime()))));
    const maxDate = addMonths(
      startOfMonth(new Date(Math.max(...ends.map((d) => d.getTime())))),
      1
    );

    const months: Date[] = [];
    let cur = minDate;
    while (cur <= maxDate) {
      months.push(cur);
      cur = addMonths(cur, 1);
    }
    return { rangeStart: minDate, rangeEnd: maxDate, months };
  }, [milestones]);

  const totalDays = differenceInDays(rangeEnd, rangeStart) || 1;
  const todayOffset = differenceInDays(new Date(), rangeStart);
  const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? `${(todayOffset / totalDays) * 100}%` : null;

  function barStyle(m: MilestoneWithCost) {
    const start = parseISO(m.startDate);
    const end = parseISO(m.endDate);
    const left = (Math.max(0, differenceInDays(start, rangeStart)) / totalDays) * 100;
    const width = Math.max(1, (differenceInDays(end, start) / totalDays) * 100);
    return { left: `${left}%`, width: `${width}%`, backgroundColor: STATUS_COLORS[m.status] ?? "#6B7280" };
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="p-4 bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Legend</span>
          {canCreate && onAddMilestone && (
            <button
              onClick={onAddMilestone}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              <Plus className="h-3 w-3" />
              Add Phase
            </button>
          )}
        </div>
        <div className="flex items-center gap-6">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div className="flex items-center gap-2" key={key}>
              <div className="h-3 w-3 rounded" style={{ backgroundColor: STATUS_COLORS[key] }} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="p-4 bg-card border border-border rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading programme...
          </div>
        ) : milestones.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={Calendar}
            title="No programme phases yet"
            description="Add phases below and they plot here against the contract dates."
          />
        ) : (
          <div style={{ minWidth: 600 }}>
            {/* Month headers */}
            <div className="flex border-b border-border pb-2 mb-3">
              <div className="w-56 shrink-0" />
              <div className="flex-1 relative flex">
                {months.map((m) => (
                  <div
                    key={m.toISOString()}
                    className="text-xs text-muted-foreground"
                    style={{ width: `${(1 / months.length) * 100}%` }}>
                    {format(m, "MMM yy")}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone rows */}
            <div className="space-y-3">
              {milestones.map((m) => {
                // Redacted (feeVisible: false) renders blank, same as "not
                // entered yet" — no "Hidden" label. Applies uniformly to
                // every discipline including Construction — the backend
                // (MilestonePhaseCostsView) now gates contractCost by the
                // same feeVisible flag as every professional fee.
                const cost = !m.feeVisible
                  ? []
                  : construction
                  ? [
                      `${formatCost(m.contractCost ?? 0, currency)} certified`,
                      m.plannedValue != null ? `${formatCost(m.plannedValue, currency)} planned` : null,
                    ].filter((x): x is string => !!x)
                  : [m.contractCost != null ? formatCost(m.contractCost, currency) : "Not set"];
                return (
                  <div key={m._id} className="flex items-center gap-2">
                    {/* Name column: one figure per line, never split mid-amount. */}
                    <div className="w-56 shrink-0 pr-2">
                      <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                      {cost.map((line) => (
                        <p key={line} className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Bar track */}
                    <div className="flex-1 relative h-7 bg-muted/30 rounded">
                      <div
                        className="absolute top-1 h-5 rounded"
                        style={barStyle(m)}
                        title={`${m.name}${cost.length ? ` — ${cost.join(" · ")}` : ""}`}
                      />
                      {todayPct && (
                        <div aria-hidden className="absolute inset-y-0 w-px bg-foreground/30" style={{ left: todayPct }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            {data && data.totalContractCost != null && data.totalContractCost > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">
                  {totalLabel}:{" "}
                  <span className="font-medium text-foreground">
                    {formatCost(data.totalContractCost, currency)}
                  </span>
                </span>
                {construction && (data.unallocatedCertified ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Includes {formatCost(data.unallocatedCertified ?? 0, currency)} certified outside every phase&apos;s dates.
                  </span>
                )}
                {construction && (
                  <span className="text-xs text-muted-foreground">
                    Each certificate counted once: in the phases it is linked to, otherwise the earliest phase running on its date.
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
