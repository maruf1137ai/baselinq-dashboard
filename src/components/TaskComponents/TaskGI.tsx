import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TaskGIProps {
  formFields: any;
}

export const TaskGI: React.FC<TaskGIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-50">
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Discipline</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Effective Date</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.effectiveDate || "Immediate"}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">General Instruction Details</label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
          {formFields.instruction}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Applicable To</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.applicableTo || "All Project Personnel"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Compliance Requirement</label>
          <div className="mt-1">
            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-100 font-normal">
              {formFields.complianceRequired || "Mandatory"}
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Distribution List</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(formFields.distributionList || ["Project Manager", "Site Engineer", "Safety Officer", "Sub-contractor Lead"]).map((person: string, i: number) => (
            <span key={i} className="text-[11px] px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-600">
              {person}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
