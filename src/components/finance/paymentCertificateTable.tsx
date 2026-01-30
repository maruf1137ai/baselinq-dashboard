import React, { useState } from "react";
import { MoreIcon } from "../icons/icons";
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

interface PaymentCertificateTableProps {
  orders: VariationOrder[];
  onViewDetails: (orderId: string) => void;
}

export enum OrderStatus {
  Approved = "Approved",
  InReview = "In Review",
}

export interface VariationOrder {
  id: string;
  title: string;
  value: number;
  status: OrderStatus;
  requestedBy: {
    name: string;
    avatarUrl: string;
  };
  updated: string;
  impact: number;
}

const ActionsCell = ({ entry }: { entry: LedgerEntry }) => {
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
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:bg-red-50 focus:text-red-700">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the entry for invoice{" "}
              <strong>{entry.ref}</strong> from{" "}
              <strong>{entry.supplier}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => {
                // onDelete(entry.id);
                setShowDeleteDialog(false);
              }}
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
  // const formatCurrency = (value: number) => {
  //   return `+ R ${new Intl.NumberFormat("en-ZA").format(value)}`;
  // };

  return (
    <div className="overflow-x-aut">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              PC #
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Period
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Claim
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Retention
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Net
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Approvals
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Updated
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-sm font-normal text-[#6B7280]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#8081F6] hover:text-blue-800">
                {order.pc}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                {order.period}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                {order.claim}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                {order.retention}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                {order.net}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base">
                {/* {order.approvals || "-"} */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((dot) => (
                    <span
                      key={dot}
                      className={`h-2 w-2 rounded-full ${
                        order.approvals === "approved"
                          ? "bg-[#16A34A]"
                          : order.approvals === "pending"
                          ? dot <= 2
                            ? "bg-[#16A34A]"
                            : "bg-[#E5E7EB]"
                          : "bg-[#E5E7EB]"
                      }`}></span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                {order.updated}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                <ActionsCell entry={order} />
                {/* <button className="text-gray-400 hover:text-gray-600">
                  <MoreIcon className="w-5 h-5" />
                </button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
