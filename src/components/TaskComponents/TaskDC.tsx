import React from "react";
import { Clock, CheckCircle2, FileText, RefreshCw } from "lucide-react";

interface TaskDCProps {
  formFields: any;
}

export const TaskDC: React.FC<TaskDCProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide flex items-center mb-2">
            Days Requested
          </label>
          <p className="text-sm text-[#1B1C1F] mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {formFields.requestedExtension || 0} Days
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide flex items-center gap-2">
            Days Approved
          </label>
          <p className="text-sm text-[#1B1C1F] mt-1 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {formFields.approvedDays || 0} Days
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Description
        </label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-1 whitespace-pre-wrap">
          {formFields.description}
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Requested Extension
        </label>
        <p className="text-sm text-[#1B1C1F] mt-1">
          {formFields.requestedExtension} days
        </p>
      </div>
    </div>
  );
};
