import { Calendar } from "lucide-react";
import React from "react";

const legendItems = [
  { colour: "bg-red-400", title: "Critical Path" },
  { colour: "bg-amber-400", title: "At Risk" },
  { colour: "bg-muted-foreground/30", title: "Baseline" },
  { colour: "bg-primary", title: "Forecast" },
];

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

      {/* Gantt Chart */}
      <div className="p-4 border border-border rounded-lg">
        {/* Timeline header */}
        <div className="flex justify-between mb-3 text-xs text-muted-foreground border-b border-border pb-2">
          <span>Q1</span>
          <span>Q2</span>
          <span>Q3</span>
          <span>Q4</span>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No activities scheduled yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Activities will appear here once the programme is set up</p>
        </div>

        {/* Timeline footer */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground border-t border-border pt-2">
          <span>Start</span>
          <span>Mid</span>
          <span>End</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
