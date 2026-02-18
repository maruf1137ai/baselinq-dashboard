import React from 'react';

interface TaskRFIProps {
  formFields: any;
}

export const TaskRFI: React.FC<TaskRFIProps> = ({ formFields }) => {
  if (!formFields) return null;

  // console.log(formFields);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-50">
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Subject</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.subject}</p>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Discipline</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Technical Query</label>
        <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line mt-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
          {formFields.question || formFields.description}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Proposed Solution / Suggestion</label>
        <div className="mt-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100/50">
          <p className="text-sm text-[#4B5563] italic">
            {formFields.proposedSolution || "No solution proposed by the originator. Awaiting engineering assessment."}
          </p>
        </div>
      </div>
    </div>
  );
};
