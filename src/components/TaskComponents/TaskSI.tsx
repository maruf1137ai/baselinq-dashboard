import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface TaskSIProps {
  formFields: any;
}

export const TaskSI: React.FC<TaskSIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            Discipline
          </label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            Location
          </label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.location}</p>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Instruction
        </label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-1">
          {formFields.instruction}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            Urgency
          </label>
          <Badge
            className={`mt-1 ${formFields.urgency === "High" ? "bg-red-50 text-red-600 border-red-200" : formFields.urgency === "Medium" ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-green-50 text-green-600 border-green-200"}`}>
            {formFields.urgency || "Medium"}
          </Badge>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            VO Reference
          </label>
          <p className="text-sm text-[#1B1C1F] mt-1">
            {formFields.voReference || "N/A"}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            Cost Impact
          </label>
          <p className="text-sm text-[#1B1C1F] mt-1">{formFields.costImpact}</p>
        </div>
      </div>
      {formFields.description && (
        <div>
          <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
            Attachments
          </label>
          <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line mt-1">
            {formFields.description}
          </p>
        </div>
      )}

      {/* caution */}
      {/* Safety Notes Section */}
      <div className="mt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">
                Safety Notes
              </h3>
              <ul className="">
                <li className="flex items-center gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span className="text-sm text-amber-800">
                    Wind picks up after 15:00
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span className="text-sm text-amber-800">
                    Ensure edge protection in bay S2
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
