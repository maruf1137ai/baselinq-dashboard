import React, { useState, useMemo } from "react";
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

const formatCurrency = (value: number) =>
  `R ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const ApprovalDots = ({ status }: { status: string }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3].map((dot) => (
      <span
        key={dot}
        className={`h-2 w-2 rounded-full ${
          status === "approved"
            ? "bg-[#16A34A]"
            : status === "pending"
            ? dot <= 2
              ? "bg-[#16A34A]"
              : "bg-[#E5E7EB]"
            : "bg-[#E5E7EB]"
        }`}
      />
    ))}
  </div>
);

const ActionsCell = ({ entry }: { entry: PCEntry }) => {
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Details for {entry.pcNumber}</DialogTitle>
            <DialogDescription>Period: {entry.period}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm">
            <p><span className="text-[#6B7280]">Claim Amount:</span> {formatCurrency(entry.claimAmount)}</p>
            <p><span className="text-[#6B7280]">Retention:</span> {formatCurrency(entry.retentionAmount)}</p>
            <p><span className="text-[#6B7280]">Net Amount:</span> {formatCurrency(entry.netAmount)}</p>
            <p><span className="text-[#6B7280]">Status:</span> {entry.approvalStatus}</p>
            <p><span className="text-[#6B7280]">Updated:</span> {formatDate(entry.updatedAt)}</p>
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{entry.pcNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
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
    <div>
      {/* Search + New button */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by PC #, period, status..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8081F6]/30 focus:border-[#8081F6]"
          />
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white bg-[#8081F6] hover:bg-[#6366F1] transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Certificate
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["PC #", "Period", "Claim", "Retention", "Net", "Approvals", "Updated", "Actions"].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">
                  {search ? "No results match your search." : "No payment certificates found."}
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#8081F6] hover:text-blue-800 cursor-pointer">
                    {order.pcNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                    {order.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                    {formatCurrency(order.claimAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                    {formatCurrency(order.retentionAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                    {formatCurrency(order.netAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <ApprovalDots status={order.approvalStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                    {formatDate(order.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                    <ActionsCell entry={order} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 px-1">
        <p className="text-sm text-gray-500">
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
