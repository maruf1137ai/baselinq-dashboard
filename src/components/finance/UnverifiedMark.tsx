import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Why an amount is "unverified": the certificate was saved before the server
 * stored its VAT and total, and its recorded net was VAT-inclusive on some
 * older rows and VAT-exclusive on others. `manage.py
 * backfill_certificate_totals` proves which; until then every screen says so.
 */
export const UNVERIFIED_REASON =
  "Saved before VAT and the total were stored, so this amount may exclude VAT.";

/**
 * The marker under an unverified amount. One component so Certificates and
 * Payments mark it the same way, and so the reason is reachable by keyboard,
 * touch and screen reader rather than living in a `title` only.
 */
export function UnverifiedMark() {
  return (
    <span className="block text-xs text-muted-foreground">
      {/* Own provider: these tables also render outside the app shell (tests, embeds). */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Unverified. ${UNVERIFIED_REASON}`}
              className="inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              unverified
              <Info className="h-3 w-3" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{UNVERIFIED_REASON}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

/** The banner above a table or form that holds unverified amounts. */
export function UnverifiedNote({ count, children }: { count?: number; children?: React.ReactNode }) {
  return (
    <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {children ??
        `${count} certificate${count === 1 ? " was" : "s were"} saved before VAT and the total were
        stored, so the amount shown may exclude VAT. They are marked unverified until confirmed.`}
    </p>
  );
}
