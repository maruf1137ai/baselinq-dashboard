import { Calendar } from "lucide-react";
import React from "react";

const legendItems = [
  { colour: "bg-red-400", title: "Critical Path" },
  { colour: "bg-amber-400", title: "At Risk" },
  { colour: "bg-muted-foreground/30", title: "Baseline" },
  { colour: "bg-primary", title: "Forecast" },
];

// Placeholder Gantt bars
const activities = [
  { name: "Foundation", start: 0, end: 20, status: "complete" },
  { name: "Structure", start: 15, end: 45, status: "complete" },
  { name: "Roof", start: 40, end: 60, status: "at_risk" },
  { name: "MEP First Fix", start: 55, end: 75, status: "upcoming" },
  { name: "Finishes", start: 70, end: 90, status: "upcoming" },
  { name: "Handover", start: 88, end: 100, status: "upcoming" },
];

const statusColour = {
  complete: "bg-primary",
  at_risk: "bg-amber-400",
  upcoming: "bg-muted-foreground/20",
};

const Timeline = () => {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="p-4 border border-border rounded-lg">
        <div className="text-xs text-muted-foreground mb-3">Legend</div>
        <div className="flex items-center gap-6">
          {legendItems.map(({ colour, title }) => (
            <div className="flex items-center gap-2" key={title}>
              <div className={`h-3 w-3 rounded ${colour}`} />
              <span className="text-xs text-muted-foreground">{title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Placeholder */}
      <div className="p-4 border border-border rounded-lg">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{activity.name}</span>
              <div className="flex-1 bg-muted h-6 rounded relative">
                <div
                  className={`absolute top-0 h-full rounded ${statusColour[activity.status as keyof typeof statusColour]}`}
                  style={{ left: `${activity.start}%`, width: `${activity.end - activity.start}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>Sep 2024</span>
          <span>Dec 2024</span>
          <span>Mar 2025</span>
          <span>Jun 2025</span>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        Interactive Gantt chart with drag-and-drop, dependencies, and critical path highlighting, coming soon.
      </p>
    </div>
  );
};

export default Timeline;
