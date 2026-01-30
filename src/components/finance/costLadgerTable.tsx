import React, { useState } from "react";
import { Category, LedgerEntry } from "./costLadger";
import { MoreHorizontal } from "lucide-react";
// import CategoryBadge from './CategoryBadge';
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
import { ViewFeesDrawer } from "./viewFessDrwaer";

interface CostLedgerTableProps {
  entries: LedgerEntry[];
  onDeleteEntry: (id: number) => void;
}

const formatCurrency = (value: number) => {
  return `R ${value.toLocaleString("en-ZA")}`;
};

const ActionsCell = ({
  entry,
  onDelete,
}: {
  entry: LedgerEntry;
  onDelete: (id: number) => void;
}) => {
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

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details for {entry.ref}</DialogTitle>
            <DialogDescription>
              Supplier: {entry.supplier} {entry.supplierShort}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <strong>Date:</strong> {entry.date}
            </p>
            <p>
              <strong>Period:</strong> {entry.period}
            </p>
            <p>
              <strong>Net:</strong> {formatCurrency(entry.net)}
            </p>
            <p>
              <strong>Total:</strong> {formatCurrency(entry.total)}
            </p>
            <p>
              <strong>Category:</strong> {entry.category}
            </p>
            <p>
              <strong>Linked VO/PC:</strong> {entry.linkedVO}
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
                onDelete(entry.id);
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

interface CategoryBadgeProps {
  category: Category;
}

const categoryColors: Record<Category, string> = {
  [Category?.Electrical]:
    "bg-orange-100 text-orange-800 border border-orange-200",
  [Category?.Structure]: "bg-blue-100 text-blue-800 border border-blue-200",
  [Category?.Plumbing]: "bg-green-100 text-green-800 border border-green-200",
  [Category?.Concrete]: "bg-gray-200 text-gray-800 border border-gray-300",
  [Category?.HVAC]: "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const colorClasses =
    categoryColors[category] ||
    "bg-gray-100 text-gray-800 border border-gray-200";

  return (
    <span
      className={`px-4 py-1 inline-flex text-sm leading-5 rounded-full ${colorClasses}`}>
      {category}
    </span>
  );
};

const CostLedgerTable: React.FC<CostLedgerTableProps> = ({
  entries,
  onDeleteEntry,
}) => {
  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/70">
            <tr>
              {[
                "Date",
                "Supplier",
                "Ref",
                "Period",
                "Net",
                "Total",
                "Linked VO/PC",
                "Category",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-6 py-4 text-left text-sm text-[#6B7280] font-normal uppercase ${
                    header === "Actions" ? "text-center" : ""
                  }`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-gray-50/50 transition-colors duration-150 text-[#0E1C2E]">
                <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                  {entry.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                  <div>{entry.supplier}</div>
                  {entry.supplierShort && (
                    <div className="font-normal">{entry.supplierShort}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-[#8081F6] hover:text-indigo-800 cursor-pointer">
                  {entry.ref}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base">
                  {entry.period}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base">
                  {formatCurrency(entry.net)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base">
                  {formatCurrency(entry.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-[#8081F6] hover:text-indigo-800 cursor-pointer">
                  {entry.linkedVO}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base">
                  <CategoryBadge category={entry.category} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-center">
                  <ActionsCell entry={entry} onDelete={onDeleteEntry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CostLedgerTable;
