import React from 'react';

interface TaskCPIProps {
  formFields: any;
}

export const TaskCPI: React.FC<TaskCPIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Discipline</label>
        <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Description</label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-1 whitespace-pre-wrap">{formFields.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Proposed Cost</label>
          <p className="text-sm text-[#1B1C1F] mt-1 font-medium">{formFields.proposedCost}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Impact on Schedule</label>
          <p className="text-sm text-red-600 mt-1">{formFields.impactOnSchedule}</p>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Justification</label>
        <p className="text-sm text-[#4B5563] mt-1">{formFields.justification}</p>
      </div>
    </div>
  );
};
