import { Calendar, Plus } from "lucide-react";
import React, { useMemo } from "react";
import { parseISO, differenceInDays, format, addMonths, startOfMonth } from "date-fns";
import { useMilestonePhaseCosts, MilestoneWithCost } from "@/hooks/useMilestones";

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

function formatCost(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface TimelineProps {
  projectId: string | number | null;
  onAddMilestone?: () => void;
}

const Timeline = ({ projectId, onAddMilestone }: TimelineProps) => {
  const { data, isLoading } = useMilestonePhaseCosts(projectId);
  const milestones = data?.milestones ?? [];
  const currency = data?.currency ?? "ZAR";

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
      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">Legend</span>
          {onAddMilestone && (
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
      <div className="p-4 border border-border rounded-lg overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading programme...
          </div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No phases added yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add programme phases using the Milestones tab
            </p>
          </div>
        ) : (
          <div style={{ minWidth: 600 }}>
            {/* Month headers */}
            <div className="flex border-b border-border pb-2 mb-3">
              <div className="w-40 shrink-0" />
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
              {milestones.map((m) => (
                <div key={m._id} className="flex items-center gap-2">
                  {/* Name column */}
                  <div className="w-40 shrink-0 pr-2">
                    <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCost(m.contractCost, currency)}
                    </p>
                  </div>

                  {/* Bar track */}
                  <div className="flex-1 relative h-7 bg-muted/30 rounded">
                    <div
                      className="absolute top-1 h-5 rounded flex items-center px-2 overflow-hidden"
                      style={barStyle(m)}
                      title={`${m.name} — ${formatCost(m.contractCost, currency)}`}>
                      <span className="text-[10px] text-white truncate font-medium">{m.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            {data && data.totalContractCost > 0 && (
              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <span className="text-xs text-muted-foreground">
                  Total contract cost:{" "}
                  <span className="font-medium text-foreground">
                    {formatCost(data.totalContractCost, currency)}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
