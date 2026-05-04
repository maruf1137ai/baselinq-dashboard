import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadWizardStepsProps {
  currentStep: 1 | 2 | 3;
  onStepClick?: (step: 1 | 2 | 3) => void;
}

const STEPS = [
  { number: 1, label: 'Category & Discipline', shortLabel: 'Category' },
  { number: 2, label: 'Select Folder', shortLabel: 'Folder' },
  { number: 3, label: 'Upload & Details', shortLabel: 'Upload' },
] as const;

/**
 * Visual step indicator for the upload wizard.
 * Shows 3 steps with completion status and allows navigation to completed steps.
 */
export function UploadWizardSteps({ currentStep, onStepClick }: UploadWizardStepsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all",
                    "border-2",
                    isCompleted && "bg-primary border-primary text-white",
                    isCurrent && "bg-white border-primary text-primary ring-4 ring-primary/10",
                    !isCompleted && !isCurrent && "bg-white border-border text-muted-foreground",
                    isClickable && "cursor-pointer hover:scale-105"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="text-center">
                  {/* Full label on desktop */}
                  <p className={cn(
                    "text-sm font-medium hidden sm:block",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {/* Short label on mobile */}
                  <p className={cn(
                    "text-xs font-medium sm:hidden",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.shortLabel}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-4 transition-colors",
                  step.number < currentStep ? "bg-primary" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
