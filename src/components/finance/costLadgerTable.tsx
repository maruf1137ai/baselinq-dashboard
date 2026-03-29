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

const formatCurrency = formatZAR;

const ActionsCell = ({
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end">
          <DropdownMenuItem onSelect={() => setShowViewDialog(true)}>
            View Details
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onSelect={() => onEdit(entry)}>
              Edit
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Details for {entry.ref}</DialogTitle>
            <DialogDescription>
              Supplier: {entry.supplier} {entry.supplierShort}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm">
            <p><strong>Date:</strong> {entry.date}</p>
            <p><strong>Period:</strong> {entry.period}</p>
            <p><strong>Net:</strong> {formatCurrency(entry.net)}</p>
            <p><strong>Total:</strong> {formatCurrency(entry.total)}</p>
            <p><strong>Category:</strong> {entry.category}</p>
            <p><strong>Linked VO/PC:</strong> {entry.linkedVO}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const categoryColors: Record<string, string> = {
  [Category?.Subcontractor]: "bg-blue-100 text-blue-800 border border-blue-200",
  [Category?.Materials]: "bg-amber-100 text-amber-800 border border-amber-200",
  [Category?.PlantEquipment]: "bg-orange-100 text-orange-800 border border-orange-200",
  [Category?.Labour]: "bg-green-100 text-green-800 border border-green-200",
  [Category?.ProfessionalFees]: "bg-purple-100 text-purple-800 border border-purple-200",
  [Category?.Preliminaries]: "bg-cyan-100 text-cyan-800 border border-cyan-200",
  [Category?.Contingency]: "bg-red-100 text-red-800 border border-red-200",
  [Category?.Other]: "bg-gray-100 text-gray-700 border border-gray-200",
};

const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => {
  const colorClasses = categoryColors[category] || "bg-gray-100 text-gray-800 border border-gray-200";
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 rounded-full ${colorClasses}`}>
      {category}
    </span>
  );
};

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
    <div className="bg-white shadow-sm rounded-lg border border-border overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by supplier, ref, category..."
            className="w-full h-10 pl-9 pr-4 text-sm border border-border rounded-lg bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-muted/50">
            <tr>
              {["Date", "Supplier", "Ref", "Period", "Net", "Total", "Linked VO/PC", "Category", "Actions"].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-6 py-4 text-left text-xs text-muted-foreground font-normal  ${header === "Actions" ? "text-center" : ""}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">
                  {search ? "No results match your search." : "No ledger entries found."}
                </td>
              </tr>
            ) : (
              paginated.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50/50 transition-colors duration-150 text-foreground">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div>{entry.supplier}</div>
                    {entry.supplierShort && <div className="font-normal text-muted-foreground">{entry.supplierShort}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary hover:text-primary/80 cursor-pointer">
                    {entry.ref}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{entry.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatCurrency(entry.net)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatCurrency(entry.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary hover:text-primary/80 cursor-pointer">
                    {entry.linkedVOOrPC || entry.linkedVO || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <CategoryBadge category={entry.category} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <ActionsCell entry={entry} onEdit={onEditEntry} canEdit={canEdit} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? "No results"
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
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
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm transition-colors ${
                    safePage === p ? "bg-[#8081F6] text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostLedgerTable;
