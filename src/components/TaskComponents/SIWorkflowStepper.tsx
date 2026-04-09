import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SIWorkflowStepperProps {
  currentDecisionTimeline: string;
}

const SI_WORKFLOW_STAGES = [
  { key: 'issued', label: 'Issued' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'verified', label: 'Verified' },
];

// Map decision timeline values to workflow stage keys
const getStageIndex = (decisionTimeline: string): number => {
  const timelineLower = decisionTimeline.toLowerCase().replace(/\s+/g, '');

  if (timelineLower.includes('issued')) {
    return 0;
  } else if (timelineLower.includes('acknowledged')) {
    return 1;
  } else if (timelineLower.includes('actioned')) {
    return 2;
  } else if (timelineLower.includes('verified')) {
    return 3;
  }

  return 0; // Default to issued
};

export const SIWorkflowStepper: React.FC<SIWorkflowStepperProps> = ({ currentDecisionTimeline }) => {
  const currentStageIndex = getStageIndex(currentDecisionTimeline);

  return (
    <div className="w-full bg-white border border-border rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-muted z-0">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStageIndex / (SI_WORKFLOW_STAGES.length - 1)) * 100}%` }}
          />
        </div>

        {/* Stage Steps */}
        {SI_WORKFLOW_STAGES.map((stage, index) => {
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
