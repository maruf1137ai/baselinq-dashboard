import React from "react";
import { Clock, CheckCircle2, FileText, RefreshCw } from "lucide-react";

interface TaskDCProps {
  formFields: any;
}

export const TaskDC: React.FC<TaskDCProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-border">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cause Category</label>
          <p className="text-sm text-foreground mt-1">{formFields.causeCategory || "Scope Change"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Extension Requested</label>
          <p className="text-sm text-foreground mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#6c5ce7]" /> {formFields.requestedExtension || 0} Days
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cost Impact</label>
          <p className="text-sm text-foreground mt-1">{formFields.costImpact || "R 0.00"}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Delay Description & Root Cause</label>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 bg-muted p-4 rounded-lg border border-border">
          {formFields.description}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Mitigation Strategy</label>
        <div className="mt-2 bg-green-50/50 p-4 rounded-lg border border-green-100/50">
          <p className="text-sm text-muted-foreground italic">
            {formFields.mitigationStrategy || "Contractor is evaluating re-sequencing options and additional labor resources to recover the delayed period."}
          </p>
        </div>
      </div>
    </div>
  );
};
