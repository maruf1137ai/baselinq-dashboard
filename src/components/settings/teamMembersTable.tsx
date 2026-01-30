import React, { useState } from "react";
import { Category, LedgerEntry } from "../finance/costLadger";
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
import { Button } from "../ui/button";
import FilterBtns from "./filterBtns";

interface TeamMembersTableProps {
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
            Edit Role
          </DropdownMenuItem>
          <DropdownMenuItem>Suspend</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:bg-red-50 focus:text-red-700">
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
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
      </Dialog> */}
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

export enum OrderStatus {
  Active = "Active",
  Pending = "Pending",
}

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";
  if (status === OrderStatus.Active) {
    return (
      <span
        className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
      {status}
    </span>
  );
};

const data = [
  {
    id: 1,
    name: "John Smith",
    profile: "",
    email: "john.smith@westfield.com",
    role: "Project Manager",
    status: "Active",
    permissions: ["Finance", "Compliance", "Tasks", "Communication"],
  },
  {
    id: 2,
    name: "John Smith",
    profile: "",
    email: "john.smith@westfield.com",
    role: "Project Manager",
    status: "Active",
    permissions: ["Finance", "Compliance", "Tasks", "Communication"],
  },
];

const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  entries,
  onDeleteEntry,
}) => {
  return (
    <div className="">
      <div className="top flex items-center gap-2.5 mb-4">
        <input
          type="text"
          className="py-2 px-6 text-base text-[rgba(26,26,26,0.5)] border border-border_color bg-white rounded-[10px] w-full"
          placeholder="Search team members"
        />
        <FilterBtns />
        <Button className="bg-primary text-white border border-border_color text-base !py-3 !px-4">
          <span className="mr-1">+</span>
          Add AI Rules
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="divide-y divide-gray-200 w-full">
            <thead className="bg-gray-50/70">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Role",
                  "Permissions",
                  "Status",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={`px-6 py-4 text-left text-sm text-[#6B7280] font-normal uppercase ${header === "Actions" ? "text-center" : ""
                      }`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50/50 transition-colors duration-150 text-[#1A1A1A]">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#1A1A1A] h">
                    <div className="my-auto flex items-center gap-5">
                      <img
                        src="/images/profile-img-4.png"
                        alt=""
                        className="h-[37px] w-[37px] rounded-full"
                      />
                      {entry.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                    <div>{entry.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <CategoryBadge category={entry.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base flex flex-wrap gap-1">
                    <div className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                      Finance
                    </div>
                    <div className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                      Finance
                    </div>
                    <div className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                      Finance
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <StatusBadge status={entry.status} />
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
    </div>
  );
};

export default TeamMembersTable;
