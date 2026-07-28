import React, { useState, useMemo, useEffect } from "react";
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
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
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
  /** Owned by the parent's FinanceToolbar — the table renders no chrome. */
  search: string;
}

const PAGE_SIZE = 10;

const formatCurrency = formatZAR;

const formatDate = (iso: string) => formatDateCanonical(iso, "short", "—");

// Status colour comes from the Badge primitive's semantic variants rather
// than a local colour map, so a certified/pending/rejected chip here is the
// same chip as everywhere else in the app.
const ApprovalBadge = ({ status }: { status: string }) => {
  const config: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; label: string }> = {
    approved: { variant: 'success', label: 'Approved' },
    pending: { variant: 'warning', label: 'Pending' },
    rejected: { variant: 'danger', label: 'Rejected' },
    draft: { variant: 'neutral', label: 'Draft' },
  };
  const c = config[status] || config.draft;
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

const PCDetailsDialog = ({
  entry,
  open,
  onOpenChange,
}: {
  entry: PCEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details for {entry.pcNumber}</DialogTitle>
            <DialogDescription>Period: {entry.period}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm tabular-nums">
            <p><span className="text-muted-foreground">Claim Amount:</span> {formatCurrency(entry.claimAmount)}</p>
            <p><span className="text-muted-foreground">Retention:</span> {formatCurrency(entry.retentionAmount)}</p>
            <p><span className="text-muted-foreground">Net Amount:</span> {formatCurrency(entry.netAmount)}</p>
            <p><span className="text-muted-foreground">Status:</span> {entry.approvalStatus}</p>
            <p><span className="text-muted-foreground">Updated:</span> {formatDate(entry.updatedAt)}</p>
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

const PCRow = ({ entry }: { entry: PCEntry }) => {
  const [showViewDialog, setShowViewDialog] = useState(false);

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <button
          type="button"
          onClick={() => setShowViewDialog(true)}
          className="text-primary hover:text-primary/80 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          {entry.pcNumber}
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
        {entry.period}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {formatCurrency(entry.claimAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground tabular-nums">
        {formatCurrency(entry.retentionAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground tabular-nums">
        {formatCurrency(entry.netAmount)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <ApprovalBadge status={entry.approvalStatus} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
        {formatDate(entry.updatedAt)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-muted-foreground">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="More actions" className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="end">
            <DropdownMenuItem onSelect={() => setShowViewDialog(true)}>
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <PCDetailsDialog
          entry={entry}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />
      </td>
    </tr>
  );
};

/** Sentence case, numerics right-aligned — same shape as the other three
 *  finance tables. */
const HEADERS: { label: string; align?: "right" }[] = [
  { label: "PC #" },
  { label: "Period" },
  { label: "Claim", align: "right" },
  { label: "Retention", align: "right" },
  { label: "Net", align: "right" },
  { label: "Approvals" },
  { label: "Updated" },
  { label: "Actions", align: "right" },
];

export const PaymentCertificateTable: React.FC<PaymentCertificateTableProps> = ({ orders, search }) => {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

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

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="min-w-full divide-y divide-border">
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
              paginated.map((order) => <PCRow key={order.id} entry={order} />)
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
