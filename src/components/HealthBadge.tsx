import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HealthStatus, HealthDetail } from "@/hooks/useProjectsHealth";

const statusConfig: Record<HealthStatus, { dot: string; label: string; labelColor: string }> = {
  green: { dot: "bg-emerald-500", label: "On Track", labelColor: "text-emerald-700" },
  orange: { dot: "bg-amber-500", label: "At Risk", labelColor: "text-amber-700" },
  red: { dot: "bg-red-500", label: "Critical", labelColor: "text-red-700" },
  grey: { dot: "bg-slate-400", label: "No Data", labelColor: "text-slate-500" },
};

const signalDot: Record<HealthStatus, string> = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-red-500",
  grey: "bg-slate-400",
};

interface HealthBadgeProps {
  status: HealthStatus;
  detail?: HealthDetail;
  className?: string;
}

export function HealthBadge({ status, detail, className = "" }: HealthBadgeProps) {
  const { dot, label, labelColor } = statusConfig[status] ?? statusConfig.grey;

  const badge = (
    <div className={`inline-flex items-center gap-1 cursor-default ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className={`text-[9px] font-medium leading-none ${labelColor}`}>{label}</span>
    </div>
  );

  if (!detail?.schedule || !detail?.budget) return badge;

  const { schedule, budget } = detail;

  const scheduleText =
    schedule.total_tasks === 0
      ? "No tasks recorded"
      : schedule.overdue_tasks === 0
      ? `${schedule.total_tasks} task${schedule.total_tasks !== 1 ? "s" : ""} · none overdue`
      : `${schedule.overdue_tasks} overdue task${schedule.overdue_tasks !== 1 ? "s" : ""} of ${schedule.total_tasks}`;

  const budgetText =
    budget.spent_pct === 0 && budget.total_spent === 0
      ? "No spending recorded"
      : `${budget.spent_pct}% of budget spent`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="left" className="p-0 border-0 shadow-lg bg-transparent">
          <div className="bg-white border border-border rounded-xl shadow-md px-4 py-3 min-w-[200px]">
            <p className="text-[11px] font-medium text-foreground mb-2.5">Health Breakdown</p>

            {/* Schedule row */}
            <div className="flex items-start gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${signalDot[schedule.status]}`} />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Schedule</p>
                <p className="text-[11px] text-foreground">{scheduleText}</p>
              </div>
            </div>

            {/* Budget row */}
            <div className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${signalDot[budget.status]}`} />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Budget</p>
                <p className="text-[11px] text-foreground">{budgetText}</p>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
