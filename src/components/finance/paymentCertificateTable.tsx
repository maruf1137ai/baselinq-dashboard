import React, { useState, useMemo } from "react";
import { formatDate as formatDateCanonical } from "@/lib/dateUtils";
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
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AiMark } from "@/components/icons/AiMark";
import { Badge } from "@/components/ui/badge";
import { formatZAR } from '@/lib/formatCurrency';
import { EmptyState } from "@/components/ui/empty-state";

export interface PCEntry {
  id: number;
  projectId: number;
  pcNumber: string;
  period: string;
  claimAmount: number;
  retentionAmount: number;
  netAmount: number;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentCertificateTableProps {
  orders: PCEntry[];
  onNew?: () => void;
}

const PAGE_SIZE = 10;

const formatCurrency = formatZAR;

const formatDate = (iso: string) => formatDateCanonical(iso, "short", "—");

const ApprovalBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: 'bg-green-50', text: 'text-green-700', label: 'Approved' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
    draft: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Draft' },
  };
  const c = config[status] || config.draft;
  return (
    <Badge className={`${c.bg} ${c.text} border-0 text-xs px-2 py-0.5 rounded-full font-normal`}>
      {c.label}
    </Badge>
  );
};

// Mock AI flags per PC number
const aiFlags: Record<string, number> = {
  'PC-004': 2,
  'PC-003': 2,
  'PC-002': 1,
};

const ActionsCell = ({ entry }: { entry: PCEntry }) => {
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="More actions" className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end">
          <DropdownMenuItem onSelect={() => setShowViewDialog(true)}>
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details for {entry.pcNumber}</DialogTitle>
            <DialogDescription>Period: {entry.period}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm">
            <p><span className="text-muted-foreground">Claim Amount:</span> {formatCurrency(entry.claimAmount)}</p>
            <p><span className="text-muted-foreground">Retention:</span> {formatCurrency(entry.retentionAmount)}</p>
            <p><span className="text-muted-foreground">Net Amount:</span> {formatCurrency(entry.netAmount)}</p>
            <p><span className="text-muted-foreground">Status:</span> {entry.approvalStatus}</p>
            <p><span className="text-muted-foreground">Updated:</span> {formatDate(entry.updatedAt)}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-border rounded-lg text-sm text-gray-700 bg-card hover:bg-muted/50">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{entry.pcNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-border rounded-lg text-sm text-gray-700 bg-card hover:bg-muted/50">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="px-4 py-2 border border-transparent rounded-lg text-sm text-white bg-red-600 hover:bg-red-700">
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const PaymentCertificateTable: React.FC<PaymentCertificateTableProps> = ({ orders, onNew }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.pcNumber.toLowerCase().includes(q) ||
        (o.period || "").toLowerCase().includes(q) ||
        (o.approvalStatus || "").toLowerCase().includes(q)
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
    <div className="bg-card shadow-sm rounded-xl border border-border overflow-hidden">
      {/* Search + New button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by PC #, period, status..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white bg-primary hover:bg-primary transition-all shadow-sm shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Certificate
          </button>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-muted/50">
            <tr>
              {["PC #", "Period", "Claim", "Retention", "Net", "Approvals", "AI", "Updated", "Actions"].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-muted-foreground ">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  {search ? (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No payment certificates match this search"
                      description="Try a different certificate number or period, or clear the search to see every certificate issued."
                    />
                  ) : (
                    <EmptyState
                      variant="plain"
                      size="sm"
                      title="No payment certificates issued yet"
                      description="Certificates appear here once a payment claim is assessed, showing the amount certified, retention held and net due."
                    />
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary hover:text-primary/80 cursor-pointer">
                    {order.pcNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground tabular-nums">
                    {formatCurrency(order.claimAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                    {formatCurrency(order.retentionAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground tabular-nums">
                    {formatCurrency(order.netAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <ApprovalBadge status={order.approvalStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {aiFlags[order.pcNumber] ? (
                      <span className="inline-flex items-center gap-1">
                        <AiMark className="text-amber-500" />
                        <span className="text-xs text-amber-600">{aiFlags[order.pcNumber]} flags</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(order.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <ActionsCell entry={order} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-gray-500">
          {filtered.length === 0
            ? "No results"
            : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
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
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm transition-colors ${
                    safePage === p ? "bg-primary text-primary-foreground" : "text-gray-600 hover:bg-muted"
                  }`}>
                  {p}
                </button>
              )
            )}
          <button
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-md text-gray-500 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
