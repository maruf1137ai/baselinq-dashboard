import React from "react";
import { Search } from "lucide-react";

/**
 * The one toolbar row every Finance tab uses.
 *
 * Search, filter and the page actions belong on a single line. The four tabs
 * used to disagree — Cost Ledger put its buttons in the parent and its search
 * in a strip inside the table card (three stacked rows of chrome before any
 * data), while Variation Orders and Payment Certificates put search and a New
 * button inside the card and Platform Fees put its toolbar above it.
 *
 * The toolbar now lives in the PARENT, above the table card, for all four.
 * That is the only placement that works for Cost Ledger, whose parent swaps
 * the table for an EmptyState when the register is empty — a toolbar owned by
 * the table would take New Entry, Filter and Export off screen exactly when
 * the user needs New Entry. Tables therefore take `search` as a prop and own
 * no chrome of their own.
 *
 * Search flex-grows to a 320px ceiling: enough for a supplier name, not half
 * the page. Actions sit right-aligned on the same line and wrap beneath on
 * narrow viewports rather than compressing the input to nothing.
 */
export const FinanceToolbar: React.FC<{
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  /** Filter controls and page actions, right-aligned on the same line. */
  children?: React.ReactNode;
}> = ({ search, onSearchChange, placeholder, children }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative flex-1 min-w-[180px] max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-8 pl-9 pr-4 text-xs border border-border rounded-lg bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
    {children && <div className="flex items-center gap-2 ml-auto">{children}</div>}
  </div>
);

export default FinanceToolbar;
