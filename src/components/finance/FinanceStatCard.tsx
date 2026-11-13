/**
 * The summary card above a Finance tab's table.
 *
 * WHY IT MOVED HERE
 * -----------------
 * This shape was defined inside `platformFees.tsx`, with a comment explaining
 * that it had been corrected once already because "the Platform Fees row [was]
 * a different size from the Cost Ledger row one tab away". The Invoices tab
 * then grew its own cards — `bg-card border rounded-xl p-5`, a text-xs label,
 * no reserved meta slot — so the same correction was owed one tab further
 * along, and the Payments tab would have owed it a third time.
 *
 * One file, three tabs. Cost Ledger keeps `ProjectStatusCard`, which is the
 * app-wide card used on several other pages and is not this page's to change.
 */
import * as React from "react";

export const FinanceStatCard: React.FC<{
  label: string;
  value: string;
  meta?: React.ReactNode;
  /** Set on a figure that is bad news — the destructive tone, never alone. */
  alarm?: boolean;
}> = ({ label, value, meta, alarm }) => (
  // h-full + flex so the shell fills the grid row, and the white well below
  // grows to take whatever height is left. Each card carries a different
  // amount of supporting text — two lines under the fee, none under VAT, a
  // progress bar under the cap — and without this the white wells size
  // themselves independently and the row reads as ragged.
  <div className="bg-muted/50 rounded-xl p-2 min-w-0 h-full flex flex-col">
    <p className="text-sm text-gray2 mb-2 px-0.5">{label}</p>
    <div className="bg-card px-3 py-2.5 rounded-md flex-1">
      <p
        // nowrap, not break-words: the formatter joins a figure with
        // non-breaking spaces, and break-words split it at the comma anyway —
        // "R 42 750 000," on one line and "00" on the next.
        className={`text-lg sm:text-2xl font-normal tabular-nums whitespace-nowrap ${alarm ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
      {/* Reserved rather than conditional: not every card has meta, and if the
          slot collapses that card's figure sits at a different height from the
          others in the row. */}
      <div className="text-xs text-muted-foreground mt-2 min-h-[1rem]">{meta}</div>
    </div>
  </div>
);

export default FinanceStatCard;
