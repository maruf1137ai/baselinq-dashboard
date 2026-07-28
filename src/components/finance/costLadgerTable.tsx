import React, { useState, useMemo } from "react";
import { Category, LedgerEntry } from "./costLadger";
import { MoreHorizontal, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";

interface CostLedgerTableProps {
  entries: LedgerEntry[];
  onEditEntry: (entry: LedgerEntry) => void;
  canEdit: boolean;
}

const PAGE_SIZE = 10;

import { formatZAR } from '@/lib/formatCurrency';
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

const formatCurrency = formatZAR;

const ActionsCell = ({
  entry,
  onEdit,
  canEdit,
  onViewDetails,
}: {
  entry: LedgerEntry;
  onEdit: (entry: LedgerEntry) => void;
  canEdit: boolean;
  onViewDetails: () => void;
}) => {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="More actions" className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end">
          <DropdownMenuItem onSelect={onViewDetails}>
            View Details
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onSelect={() => onEdit(entry)}>
              Edit
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

const LedgerDetailsDialog = ({
  entry,
  open,
  onOpenChange,
}: {
  entry: LedgerEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details for {entry.ref}</DialogTitle>
            <DialogDescription>
              Supplier: {entry.supplier} {entry.supplierShort}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm tabular-nums">
            <p><strong>Date:</strong> {entry.date}</p>
            <p><strong>Period:</strong> {entry.period}</p>
            <p><strong>Net:</strong> {formatCurrency(entry.net)}</p>
            <p><strong>Total:</strong> {formatCurrency(entry.total)}</p>
            <p><strong>Category:</strong> {entry.category}</p>
            <p><strong>Linked VO/PC:</strong> {entry.linkedVO}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="h-10 px-4 border border-border rounded-lg text-sm text-foreground bg-card hover:bg-muted/50 transition-colors">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LedgerRow = ({
  entry,
  onEdit,
  canEdit,
}: {
  entry: LedgerEntry;
  onEdit: (entry: LedgerEntry) => void;
  canEdit: boolean;
}) => {
  const [showViewDialog, setShowViewDialog] = useState(false);

  return (
    <tr className="hover:bg-muted/50 transition-colors text-foreground">
      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground tabular-nums">{entry.date}</td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
        <div>{entry.supplier}</div>
        {entry.supplierShort && (
          <div className="text-xs font-normal text-muted-foreground">{entry.supplierShort}</div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <button
          type="button"
          onClick={() => setShowViewDialog(true)}
          className="text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          {entry.ref || "—"}
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{entry.period}</td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {formatCurrency(entry.net)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {formatCurrency(entry.total)}
      </td>
      {/* Plain text, not a link: the ledger payload carries the VO/PC number
          and its own primary key, neither of which resolves to a route. */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
        {entry.linkedVOOrPC || entry.linkedVO || "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <CategoryBadge category={entry.category} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
        <ActionsCell
          entry={entry}
          onEdit={onEdit}
          canEdit={canEdit}
          onViewDetails={() => setShowViewDialog(true)}
        />
        <LedgerDetailsDialog
          entry={entry}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />
      </td>
    </tr>
  );
};

// The 50/700/200 intensity scale codified on the Badge primitive's semantic
// variants (see ui/badge.tsx) — these were on the 100/800 scale, which read a
// full step heavier than every other chip in the app.
const categoryColors: Record<string, string> = {
  [Category?.Subcontractor]: "bg-blue-50 text-blue-700 border-blue-200",
  [Category?.Materials]: "bg-amber-50 text-amber-700 border-amber-200",
  [Category?.PlantEquipment]: "bg-orange-50 text-orange-700 border-orange-200",
  [Category?.Labour]: "bg-green-50 text-green-700 border-green-200",
  [Category?.ProfessionalFees]: "bg-purple-50 text-purple-700 border-purple-200",
  [Category?.Preliminaries]: "bg-cyan-50 text-cyan-700 border-cyan-200",
  [Category?.Contingency]: "bg-red-50 text-red-700 border-red-200",
  [Category?.Other]: "bg-muted text-muted-foreground border-border",
};

const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => {
  const colorClasses = categoryColors[category] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`whitespace-nowrap ${colorClasses}`}>
      {category}
    </Badge>
  );
};

/** Column headers. Sentence case, numerics right-aligned — same shape as the
 *  other three finance tables so the four read as one register. */
const HEADERS: { label: string; align?: "right" }[] = [
  { label: "Date" },
  { label: "Supplier" },
  { label: "Ref" },
  { label: "Period" },
  { label: "Net", align: "right" },
  { label: "Total", align: "right" },
  { label: "Linked VO/PC" },
  { label: "Category" },
  { label: "Actions", align: "right" },
];

const CostLedgerTable: React.FC<CostLedgerTableProps> = ({
  entries,
  onEditEntry,
  canEdit,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.supplier.toLowerCase().includes(q) ||
        e.ref.toLowerCase().includes(q) ||
        (e.period || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.linkedVOOrPC || e.linkedVO || "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by supplier, ref, category..."
            className="w-full h-8 pl-9 pr-4 text-xs border border-border rounded-lg bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {HEADERS.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  className={`px-4 py-3 text-xs text-muted-foreground font-normal whitespace-nowrap ${
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
                <td colSpan={9}>
                  {search ? (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No ledger entries match this search"
                      description="Try a different supplier, reference or period, or clear the search to see the full cost ledger."
                    />
                  ) : (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No cost ledger entries yet"
                      description="Committed and incurred cost is recorded here, linked to the variation orders and payment certificates it arises from."
                    />
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((entry) => (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                  onEdit={onEditEntry}
                  canEdit={canEdit}
                />
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
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm tabular-nums transition-colors ${
                    safePage === p ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
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

export default CostLedgerTable;
