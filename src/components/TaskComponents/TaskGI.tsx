import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TaskGIProps {
  formFields: any;
}

export const TaskGI: React.FC<TaskGIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Discipline</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Effective Date</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.effectiveDate}</p>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Instruction</label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-1">{formFields.instruction}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Applicable To</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.applicableTo}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Compliance</label>
          <Badge className="mt-1 bg-purple-50 text-purple-600 border-purple-200">
            {formFields.complianceRequired}
          </Badge>
        </div>
      </div>
      {formFields.description && (
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Attachments</label>
          <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line mt-1">{formFields.description}</p>
        </div>
      )}
    </div>
  );
};
