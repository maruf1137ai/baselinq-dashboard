import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal } from "lucide-react";

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
}

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
          {/* <DropdownMenuItem>Edit</DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:bg-red-50 focus:text-red-700">
            Delete
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
            <p>
              <span className="text-[#6B7280]">Claim Amount:</span>{" "}
              {formatCurrency(entry.claimAmount)}
            </p>
            <p>
              <span className="text-[#6B7280]">Retention:</span>{" "}
              {formatCurrency(entry.retentionAmount)}
            </p>
            <p>
              <span className="text-[#6B7280]">Net Amount:</span>{" "}
              {formatCurrency(entry.netAmount)}
            </p>
            <p>
              <span className="text-[#6B7280]">Status:</span>{" "}
              {entry.approvalStatus}
            </p>
            <p>
              <span className="text-[#6B7280]">Updated:</span>{" "}
              {formatDate(entry.updatedAt)}
            </p>
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
              Are you sure you want to delete{" "}
              <strong>{entry.pcNumber}</strong>? This action cannot be undone.
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

export const PaymentCertificateTable: React.FC<
  PaymentCertificateTableProps
> = ({ orders }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {["PC #", "Period", "Claim", "Retention", "Net", "Approvals", "Updated", "Actions"].map(
              (header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
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
          ))}
        </tbody>
      </table>
    </div>
  );
};
