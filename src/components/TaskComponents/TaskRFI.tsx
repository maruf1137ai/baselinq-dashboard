import React from 'react';

interface TaskRFIProps {
  formFields: any;
}

export const TaskRFI: React.FC<TaskRFIProps> = ({ formFields }) => {
  if (!formFields) return null;

  // console.log(formFields);

  // Werner spec rev H — Subject + Discipline now appear in the meta
  // strip on the doc card; this component only renders the body
  // (Description / Proposed Solution).
  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-muted-foreground">Description</label>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
          {formFields.question || formFields.description}
        </p>
      </div>

      {formFields.proposedSolution && (
        <div>
          <label className="text-xs text-muted-foreground">Proposed Solution / Suggestion</label>
          <p className="text-sm text-foreground italic leading-relaxed whitespace-pre-line mt-2">
            {formFields.proposedSolution}
          </p>
        </div>
      )}
    </div>
  );
};
