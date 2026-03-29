import React from 'react';

interface TaskRFIProps {
  formFields: any;
}

export const TaskRFI: React.FC<TaskRFIProps> = ({ formFields }) => {
  if (!formFields) return null;

  // console.log(formFields);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-border">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <p className="text-sm text-foreground mt-1">{formFields.subject}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Discipline</label>
          <p className="text-sm text-foreground mt-1">{formFields.discipline}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Technical Query</label>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mt-2 bg-muted p-4 rounded-lg border border-border">
          {formFields.question || formFields.description}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Proposed Solution / Suggestion</label>
        <div className="mt-2 bg-blue-50/50 p-4 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground italic">
            {formFields.proposedSolution || "No solution proposed by the originator. Awaiting engineering assessment."}
          </p>
        </div>
      </div>
    </div>
  );
};
