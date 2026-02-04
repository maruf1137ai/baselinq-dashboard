import React from 'react';

interface TaskRFIProps {
  formFields: any;
}

export const TaskRFI: React.FC<TaskRFIProps> = ({ formFields }) => {
  if (!formFields) return null;

  // console.log(formFields);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Subject</label>
        <p className="text-sm text-[#1B1C1F] mt-1">{formFields.subject}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Discipline</label>
        <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Question</label>
        <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line mt-1">{formFields.question}</p>
      </div>
      {formFields.description && (
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Description</label>
          <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line mt-1">{formFields.description}</p>
        </div>
      )}
    </div>
  );
};
