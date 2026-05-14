import React from "react";

interface TaskDCProps {
  formFields: any;
}

/**
 * Werner rev H — DC (Claim) body content.
 *
 * Matches the approved RFI body pattern exactly: bare label + paragraph,
 * no coloured backgrounds, no gridded header. Identity fields (cause
 * category, extension days, cost impact) live in the doc meta strip on
 * TaskDetails alongside From / To / CC / Date Required — so this
 * component only renders the prose body.
 */
export const TaskDC: React.FC<TaskDCProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-muted-foreground">Description</label>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
          {formFields.description}
        </p>
      </div>

      {formFields.mitigationStrategy && (
        <div>
          <label className="text-xs text-muted-foreground">Mitigation Strategy</label>
          <p className="text-sm text-foreground italic leading-relaxed whitespace-pre-line mt-2">
            {formFields.mitigationStrategy}
          </p>
        </div>
      )}
    </div>
  );
};
