import React from "react";

interface TaskCPIProps {
  formFields: any;
}

/**
 * Werner rev H — CPI (Critical Path Item) body content.
 *
 * Mirrors the RFI body pattern. Baseline / forecast dates and variance
 * surface in the doc meta strip on TaskDetails. Predecessors are
 * rendered as a plain comma-joined paragraph rather than coloured
 * alert boxes to stay consistent with RFI's prose body style.
 */
export const TaskCPI: React.FC<TaskCPIProps> = ({ formFields }) => {
  if (!formFields) return null;

  const predecessors: string[] = Array.isArray(formFields.predecessors)
    ? formFields.predecessors
    : [];

  return (
    <div className="space-y-5">
      {formFields.description && (
        <div>
          <label className="text-xs text-muted-foreground">Activity Description & Criticality</label>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
            {formFields.description}
          </p>
        </div>
      )}

      {predecessors.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground">Blocking Dependencies</label>
          <p className="text-sm text-foreground leading-relaxed mt-2">
            {predecessors.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
};
