import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * A finance table that failed to load. Without it a failed request rendered the
 * table's empty state — "No payment certificates issued yet" during an outage —
 * which is a false statement about the project's money. Built on EmptyState so
 * it sits where the table would, in the same well as the other states.
 *
 * Callers render it only when there is NO data (`isError && !data`): a failed
 * background refresh must not replace a table that is already showing good
 * figures.
 */
export function FinanceLoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        icon={AlertCircle}
        title={`${what} could not be loaded`}
        description="This is a loading problem, not a statement that there is nothing here. Try again, or refresh the page."
        action={
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
