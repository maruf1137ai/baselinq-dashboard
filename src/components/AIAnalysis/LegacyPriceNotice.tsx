import { AlertTriangle } from "lucide-react";

/** Shown under chat messages written by the old price check, which presented AI guesses as verified prices. */
export function LegacyPriceNotice() {
  return (
    <div role="note" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p>
        The prices in this message came from an earlier automated check that was not verified. Treat them as
        unverified AI estimates and ask a QS to review the rates.
      </p>
    </div>
  );
}
