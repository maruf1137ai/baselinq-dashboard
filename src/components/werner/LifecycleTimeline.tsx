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
    <div className="bg-gray-100 border border-gray-300 rounded-md p-5 w-56 shrink-0 self-start">
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center">
              {step.status === "complete" ? (
                <div className="h-3 w-3 rounded-full bg-purple-600 mt-1" />
              ) : step.status === "active" ? (
                <div className="h-3 w-3 rounded-full bg-purple-600 ring-4 ring-purple-200 mt-1" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-gray-300 mt-1" />
              )}
              {i < steps.length - 1 && (
                <div
                  className={`w-px h-7 mt-1 ${
                    step.status === "complete" ? "bg-purple-300" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <div
                className={`text-sm leading-tight ${
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
