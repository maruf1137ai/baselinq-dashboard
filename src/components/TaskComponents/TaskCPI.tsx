import React from 'react';

interface TaskCPIProps {
  formFields: any;
}

export const TaskCPI: React.FC<TaskCPIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-gray-50">
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Baseline Finish</label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.startDate || "2024-03-01"}</p>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Current Forecast</label>
          <p className="text-sm text-red-600 mt-1 font-medium">{formFields.finishDate || "2024-03-15"}</p>
        </div>
        <div>
          <label className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Variance (Days)</label>
          <p className="text-sm text-red-600 mt-1 font-medium">+{formFields.duration || "14"} Days</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Activity Description & Criticality</label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
          {formFields.description || "This activity is on the critical path. Any delay here will directly impact the project completion date."}
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Blocking Dependencies</label>
        <div className="space-y-2">
          {(formFields.predecessors || ["Late structural steel delivery", "Awaiting foundation sign-off"]).map((blocker: string, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-red-50/50 border border-red-100/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <p className="text-sm text-red-900">{blocker}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
