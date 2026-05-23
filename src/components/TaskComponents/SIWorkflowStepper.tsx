import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SIWorkflowStepperProps {
  currentDecisionTimeline: string;
}

const SI_WORKFLOW_STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'issued', label: 'Issued' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'verified', label: 'Verified' },
];

// Statuses that mean "this SI ended without going through the full
// Verified path" — e.g. it got auto-closed when escalated to a VO.
// Treat as terminal: every stage shown as complete, with a final
// "Closed/Superseded" marker so the UI doesn't lie about verification.
const TERMINAL_NON_VERIFIED = new Set(['closed', 'cancelled', 'superseded', 'completed']);

type StepperState =
  | { kind: 'in-flow'; index: number }
  | { kind: 'closed'; reason: string };

const getStepperState = (decisionTimeline: string): StepperState => {
  const t = (decisionTimeline || '').toLowerCase().replace(/\s+/g, '');

  // Match the 5-stage flow first.
  if (t.includes('verified'))     return { kind: 'in-flow', index: 4 };
  if (t.includes('actioned'))     return { kind: 'in-flow', index: 3 };
  if (t.includes('acknowledged')) return { kind: 'in-flow', index: 2 };
  if (t.includes('issued'))       return { kind: 'in-flow', index: 1 };
  if (t.includes('draft'))        return { kind: 'in-flow', index: 0 };

  // Non-verified terminal states (auto-closed via escalation, etc.)
  for (const term of TERMINAL_NON_VERIFIED) {
    if (t.includes(term)) {
      return { kind: 'closed', reason: term.charAt(0).toUpperCase() + term.slice(1) };
    }
  }

  return { kind: 'in-flow', index: 0 };
};

export const SIWorkflowStepper: React.FC<SIWorkflowStepperProps> = ({ currentDecisionTimeline }) => {
  const state = getStepperState(currentDecisionTimeline);

  // For terminal non-verified states (e.g. auto-closed via VO escalation):
  // mark every stage muted and show a clear "Closed" indicator. We don't
  // want to lie by showing green Verified.
  if (state.kind === 'closed') {
    return (
      <div className="w-full bg-white border border-border rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-muted z-0" />
          {SI_WORKFLOW_STAGES.map((stage) => (
            <div key={stage.key} className="flex flex-col items-center relative z-10 flex-1">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted border-2 border-border">
                <Circle className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs mt-2 text-center text-muted-foreground line-through">
                {stage.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <XCircle className="w-3.5 h-3.5" />
          <span>
            {state.reason} — this Site Instruction was closed without completing the verification flow.
          </span>
        </div>
      </div>
    );
  }

  const currentStageIndex = state.index;

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
