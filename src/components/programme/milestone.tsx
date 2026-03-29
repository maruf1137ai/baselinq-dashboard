import { CircleCheck, Circle, Clock } from "lucide-react";
import React from "react";
import { Badge } from "../ui/badge";
import { ViewDetailsDialog } from "./detailsDialog";

const milestones = [
  {
    id: "M1",
    title: "Site Mobilisation",
    status: "completed",
    planned: "Sep 1, 2024",
    actual: "Sep 1, 2024",
    progress: 100,
    description: "Site establishment, temporary services, and access roads completed.",
  },
  {
    id: "M2",
    title: "Foundation Complete",
    status: "completed",
    planned: "Oct 15, 2024",
    actual: "Oct 15, 2024",
    progress: 100,
    description: "All foundation works including piling, ground beams, and ground floor slab.",
  },
  {
    id: "M3",
    title: "Roof Structure Complete",
    status: "at_risk",
    planned: "Feb 28, 2025",
    forecast: "Mar 12, 2025",
    progress: 45,
    description: "Structural steel erection and roof sheeting. Currently 12 days behind baseline.",
  },
  {
    id: "M4",
    title: "MEP First Fix",
    status: "upcoming",
    planned: "Apr 15, 2025",
    forecast: "Apr 29, 2025",
    progress: 0,
    description: "Mechanical, electrical, and plumbing rough-in across all floors.",
  },
  {
    id: "M5",
    title: "Practical Completion",
    status: "upcoming",
    planned: "Jun 30, 2025",
    forecast: "Jul 12, 2025",
    progress: 0,
    description: "Final inspections, snag list clearance, and handover to client.",
  },
];

const statusConfig = {
  completed: { icon: CircleCheck, colour: "text-green-500", badge: "bg-green-50 text-green-700", label: "Completed" },
  at_risk: { icon: Clock, colour: "text-amber-500", badge: "bg-amber-50 text-amber-700", label: "At Risk" },
  upcoming: { icon: Circle, colour: "text-muted-foreground", badge: "bg-muted text-muted-foreground", label: "Upcoming" },
};

const Milestone = () => {
  return (
    <div className="space-y-3">
      {milestones.map((m) => {
        const config = statusConfig[m.status as keyof typeof statusConfig];
        const Icon = config.icon;

        return (
          <div key={m.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
            {/* Row 1: Title + badge + view details */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.colour}`} />
                <span className="text-xs text-muted-foreground">{m.id}</span>
                <span className="text-sm font-medium text-foreground">{m.title}</span>
                <Badge className={`${config.badge} border-0 text-xs px-2 py-0.5 rounded-full`}>
                  {config.label}
                </Badge>
              </div>
              <ViewDetailsDialog />
            </div>

            {/* Row 2: Dates + description */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
              <span>Planned: <span className="text-foreground">{m.planned}</span></span>
              <span>{m.status === 'completed' ? 'Actual' : 'Forecast'}: <span className={m.status === 'at_risk' ? 'text-amber-700' : 'text-foreground'}>{m.actual || m.forecast || '—'}</span></span>
              {m.description && (
                <span className="truncate max-w-sm">{m.description}</span>
              )}
            </div>

            {/* Row 3: Progress bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Progress</span>
              <div className="flex-1 bg-muted h-1.5 rounded-full max-w-xs">
                <div className="bg-primary h-full rounded-full" style={{ width: `${m.progress}%` }} />
              </div>
              <span className="text-xs text-foreground">{m.progress}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Milestone;
