import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSIProps {
  formFields: any;
}

export const TaskSI: React.FC<TaskSIProps> = ({ formFields }) => {
  if (!formFields) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-border">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Discipline</label>
          <p className="text-sm text-foreground mt-1">{formFields.discipline}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <p className="text-sm text-foreground mt-1">{formFields.location || "Site Wide"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Instruction Type</label>
          <p className="text-sm text-foreground mt-1">{formFields.instructionType || "General Instruction"}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Urgency</label>
          <div className="mt-1">
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-2 py-0.5 font-normal",
                formFields.urgency === "High" ? "bg-red-50 text-red-600 border-red-100" :
                  formFields.urgency === "Medium" ? "bg-orange-50 text-orange-600 border-orange-100" :
                    "bg-green-50 text-green-600 border-green-100"
              )}>
              {formFields.urgency || "Medium"}
            </Badge>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Variation Link</label>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              formFields.leadsToVariation ? "bg-orange-500" : "bg-gray-300"
            )} />
            <p className="text-sm text-foreground">
              {formFields.leadsToVariation ? "May lead to Variation" : "No Variation expected"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Technical Instruction</label>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 bg-muted p-4 rounded-lg border border-border">
          {formFields.instruction}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-900 mb-1">Safety & Compliance Notes</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              {formFields.safetyNotes || "Standard site safety protocols apply. Ensure all edge protection and PPE requirements are met before actioning this instruction."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
