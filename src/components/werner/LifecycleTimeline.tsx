/**
 * Werner spec rev G — right-side lifecycle pill bar.
 *
 * Each doc detail page (RFI, SI, VO, GI, IC, Claim) shows the same
 * 4-stage timeline on the right per Werner pages 3-11:
 *   Draft created → Sent for review → Response provided → Closed
 *
 * Some doc types may show "Response provided" twice (one per
 * back-and-forth round). We pass the steps in as a prop so each entity
 * page can customise — but the rendering is the same.
 */
import { Check, Circle } from "lucide-react";

export type StepStatus = "complete" | "active" | "pending";

export interface LifecycleStep {
  label: string;
  status: StepStatus;
  /** Optional ISO timestamp displayed under the label when complete. */
  timestamp?: string;
}

interface LifecycleTimelineProps {
  steps: LifecycleStep[];
}

export function LifecycleTimeline({ steps }: LifecycleTimelineProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-4 w-64 shrink-0">
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              {step.status === "complete" ? (
                <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              ) : step.status === "active" ? (
                <div className="h-5 w-5 rounded-full bg-purple-100 border-2 border-purple-600 animate-pulse" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" strokeWidth={1.5} />
              )}
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 h-6 mt-1 ${
                    step.status === "complete" ? "bg-purple-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${
                  step.status === "pending" ? "text-gray-400" : "text-gray-900"
                }`}
              >
                {step.label}
              </div>
              {step.timestamp && step.status === "complete" && (
                <div className="text-xs text-gray-500 mt-0.5">{step.timestamp}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
