import { CircleCheck } from "lucide-react";
import React from "react";



const Milestone = () => {
  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b border-border">
        <span className="w-6 shrink-0" />
        <span className="flex-1">Milestone</span>
        <span className="w-28 shrink-0">Planned</span>
        <span className="w-28 shrink-0">Forecast / Actual</span>
        <span className="w-32 shrink-0">Progress</span>
        <span className="w-20 shrink-0" />
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-lg">
        <CircleCheck className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No milestones added yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Project milestones will appear here once defined</p>
      </div>
    </div>
  );
};

export default Milestone;
