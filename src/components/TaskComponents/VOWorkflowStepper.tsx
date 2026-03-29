import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VOWorkflowStepperProps {
  currentStatus: string;
}

const VO_WORKFLOW_STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'underreview', label: 'Under Review' },
  { key: 'priced', label: 'Priced' },
  { key: 'approved', label: 'Approved' },
];

// Map various status values to workflow stage keys
const getStageIndex = (status: string): number => {
  const statusLower = status.toLowerCase().replace(/\s+/g, '');

  if (statusLower.includes('draft') || statusLower.includes('open') || statusLower.includes('todo')) {
    return 0;
  } else if (statusLower.includes('submitted')) {
    return 1;
  } else if (statusLower.includes('review') || statusLower.includes('pending') || statusLower.includes('inreview')) {
    return 2;
  } else if (statusLower.includes('priced') || statusLower.includes('quoted')) {
    return 3;
  } else if (statusLower.includes('approved') || statusLower.includes('done') || statusLower.includes('closed')) {
    return 4;
  }

  return 0; // Default to draft
};

export const VOWorkflowStepper: React.FC<VOWorkflowStepperProps> = ({ currentStatus }) => {
  const currentStageIndex = getStageIndex(currentStatus);

  return (
    <div className="w-full bg-white border border-border rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-muted z-0">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStageIndex / (VO_WORKFLOW_STAGES.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stage Steps */}
        {VO_WORKFLOW_STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10 flex-1">
              {/* Icon */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-green-100 border-2 border-green-600",
                  isCurrent && "bg-blue-100 border-2 border-blue-600 ring-4 ring-blue-100",
                  isPending && "bg-muted border-2 border-border"
                )}
              >
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {isCurrent && <Clock className="w-5 h-5 text-primary" />}
                {isPending && <Circle className="w-5 h-5 text-muted-foreground" />}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs mt-2 text-center",
                  isCompleted && "text-green-700",
                  isCurrent && "text-blue-700",
                  isPending && "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
