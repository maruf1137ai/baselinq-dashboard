import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TaskGIProps {
  formFields: any;
}

export const TaskGI: React.FC<TaskGIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-border">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Discipline</label>
          <p className="text-sm text-foreground mt-1">{formFields.discipline}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Effective Date</label>
          <p className="text-sm text-foreground mt-1">{formFields.effectiveDate || "Immediate"}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">General Instruction Details</label>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 bg-muted p-4 rounded-lg border border-border">
          {formFields.instruction}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Applicable To</label>
          <p className="text-sm text-foreground mt-1">{formFields.applicableTo || "All Project Users"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Compliance Requirement</label>
          <div className="mt-1">
            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-100 font-normal">
              {formFields.complianceRequired || "Mandatory"}
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Distribution List</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(formFields.distributionList || ["Project Manager", "Site Engineer", "Safety Officer", "Sub-contractor Lead"]).map((person: string, i: number) => (
            <span key={i} className="text-xs px-2 py-1 bg-white border border-border rounded-md text-muted-foreground">
              {person}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
