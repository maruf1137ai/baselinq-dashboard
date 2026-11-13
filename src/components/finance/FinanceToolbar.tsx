import React from "react";
import { type LucideIcon, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

/**
 * A filter or sort control for the FinanceToolbar row: icon + current value
 * in one line, the toolbar's height. Reads as "on" (primary tint) once moved
 * off its default, so a filtered table never passes for the whole list.
 *
 * The icon and value sit in a <div>, not a <span>: SelectTrigger clamps its
 * direct <span> children (`[&>span]:line-clamp-1`), which stacks the icon
 * above the text.
 */
export function ToolbarSelect({
  value,
  defaultValue,
  onChange,
  options,
  icon: Icon,
  label,
  className = "w-[170px]",
}: {
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  const on = value !== defaultValue;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={`h-8 rounded-lg border-border bg-card px-3 text-xs text-foreground shadow-none hover:bg-muted/50 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 ${
          on ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10" : ""
        } ${className}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
