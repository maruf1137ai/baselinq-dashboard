import React from "react";

interface TaskGIProps {
  formFields: any;
}

/**
 * Werner rev H — GI (General Instruction) body content.
 *
 * Matches the RFI body pattern: bare label + paragraph, no coloured
 * boxes, no gridded header. Discipline / Effective Date / Applicable To
 * live in the doc meta strip on TaskDetails alongside From / To / CC.
 */
export const TaskGI: React.FC<TaskGIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-muted-foreground">Instruction</label>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
          {formFields.instruction || formFields.description}
        </p>
      </div>

      {formFields.complianceRequired && (
        <div>
          <label className="text-xs text-muted-foreground">Compliance Requirement</label>
          <p className="text-sm text-foreground leading-relaxed mt-2">
            {formFields.complianceRequired}
          </p>
        </div>
      )}
    </div>
  );
};
