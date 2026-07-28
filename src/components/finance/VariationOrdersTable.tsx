import React, { useState, useMemo } from "react";
import { MoreIcon } from "../icons/icons";
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { UserChip } from "@/components/TaskComponents/UserChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatZAR } from '@/lib/formatCurrency';
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

interface VariationOrdersTableProps {
  orders: VariationOrder[];
  /** Opens the underlying VO record. Receives the task id, which is what
   *  `/tasks/:taskId` resolves against — not the display VO number. */
  onViewDetails?: (taskId: string) => void;
  onEdit?: (order: VariationOrder) => void;
  onDelete?: (order: VariationOrder) => void;
  onNew?: () => void;
}

export enum OrderStatus {
  Open = "Open",
  InReview = "In Review",
  Approved = "Approved",
}

export interface VariationOrder {
  id: string;
  taskId: string;
  title: string;
  value: number;
  status: OrderStatus;
  /** null when the record carries no assignee — never substituted. */
  requestedBy: { name: string } | null;
  updated: string;
  /** Schedule impact in days, or null when the record does not state one. */
  impact: number | null;
  rawTask?: any;
}

const PAGE_SIZE = 10;

// Both chips go through the Badge primitive's semantic variants. The
// "In Review"/non-zero-impact case was three hardcoded hex values on the
// amber ramp, off the 50/700/200 scale every other status chip uses.
const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  if (status === OrderStatus.Approved) return <Badge variant="success">{status}</Badge>;
  if (status === OrderStatus.Open) return <Badge variant="neutral">{status}</Badge>;
  return <Badge variant="warning">{status}</Badge>;
};

const ImpactBadge: React.FC<{ days: number }> = ({ days }) => (
  <Badge variant={days === 0 ? "success" : "warning"} className="tabular-nums">
    +{days}d
  </Badge>
);

/** Sentence case, numerics right-aligned — same shape as the other three
 *  finance tables. */
const HEADERS: { label: string; align?: "right" }[] = [
  { label: "VO #" },
  { label: "Title" },
  { label: "Value", align: "right" },
  { label: "Status" },
  { label: "Requested by" },
  { label: "Updated" },
  { label: "Impact" },
  { label: "Actions", align: "right" },
];

export const VariationOrdersTable: React.FC<VariationOrdersTableProps> = ({
  orders,
  onViewDetails,
  onEdit,
  onDelete,
  onNew,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const formatCurrency = (value: number) => `+ ${formatZAR(value)}`;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        (o.requestedBy?.name || "").toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Search + New button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by VO #, title, requested by..."
            className="w-full h-8 pl-9 pr-4 text-xs border border-border rounded-lg bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs text-primary-foreground bg-primary hover:opacity-90 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Variation Order
          </button>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  className={`px-4 py-3 text-xs font-normal text-muted-foreground whitespace-nowrap ${
                    h.align === "right" ? "text-right" : "text-left"
                  }`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  {search ? (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No variation orders match this search"
                      description="Try a different VO number, title or requester, or clear the search to see the full register."
                    />
                  ) : (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No variation orders yet"
                      description="Variations raised against this project appear here with their approval status and cost impact."
                    />
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {onViewDetails ? (
                      <button
                        type="button"
                        onClick={() => onViewDetails(order.taskId)}
                        className="text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                        {order.id}
                      </button>
                    ) : (
                      <span className="text-foreground">{order.id}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                    {order.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 font-medium tabular-nums">
                    {formatCurrency(order.value)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                    {order.requestedBy ? (
                      <UserChip name={order.requestedBy.name} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground tabular-nums">
                    {order.updated}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {order.impact != null ? (
                      <ImpactBadge days={order.impact} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="More actions" className="text-muted-foreground hover:text-foreground">
                          <MoreIcon className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card w-32">
                        <DropdownMenuItem
                          className="cursor-pointer text-sm"
                          onClick={() => onEdit?.(order)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-sm text-red-600 focus:text-red-600"
                          onClick={() => onDelete?.(order)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? "No results"
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
            .reduce<(number | string)[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm tabular-nums transition-colors ${safePage === p
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                    }`}>
                  {p}
                </button>
              )
            )}
          <button
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
