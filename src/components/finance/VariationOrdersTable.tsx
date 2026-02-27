import React, { useState, useMemo } from "react";
import { MoreIcon } from "../icons/icons";
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VariationOrdersTableProps {
  orders: VariationOrder[];
  onViewDetails?: (orderId: string) => void;
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
  requestedBy: {
    name: string;
    avatarUrl: string;
  };
  updated: string;
  impact: number;
  rawTask?: any;
}

const PAGE_SIZE = 10;

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";
  if (status === OrderStatus.Approved) {
    return (
      <span className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        {status}
      </span>
    );
  }
  if (status === OrderStatus.Open) {
    return (
      <span className={`${baseClasses} bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]`}>
        {status}
      </span>
    );
  }
  return (
    <span className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
      {status}
    </span>
  );
};

const ImpactBadge: React.FC<{ days: number }> = ({ days }) => {
  const baseClasses = "px-2.5 py-1 text-xs rounded-full inline-block";
  if (days === 0) {
    return (
      <span className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        +0d
      </span>
    );
  }
  return (
    <span className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
      +{days}d
    </span>
  );
};

export const VariationOrdersTable: React.FC<VariationOrdersTableProps> = ({
  orders,
  onEdit,
  onDelete,
  onNew,
}) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const formatCurrency = (value: number) =>
    `+ R ${new Intl.NumberFormat("en-ZA").format(value)}`;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.requestedBy.name.toLowerCase().includes(q) ||
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
    <div>
      {/* Search + New button */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by VO #, title, requested by..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8081F6]/30 focus:border-[#8081F6]"
          />
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white bg-[#8081F6] hover:bg-[#6366F1] transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Variation Order
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["VO #", "Title", "Value", "Status", "Requested By", "Updated", "Impact", "Actions"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">
                  {search ? "No results match your search." : "No variation orders found."}
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#3A6FF7] hover:text-blue-800 cursor-pointer">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                    {order.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-green-600 font-medium">
                    {formatCurrency(order.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                    <div className="flex items-center gap-2">
                      <img
                        src={order.requestedBy.avatarUrl}
                        alt={order.requestedBy.name}
                        className="w-7 h-7 rounded-full"
                      />
                      <span className="text-sm text-[#0E1C2E]">{order.requestedBy.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0E1C2E]">
                    {order.updated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <ImpactBadge days={order.impact} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreIcon className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white w-32">
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
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm transition-colors ${safePage === p
                    ? "bg-[#8081F6] text-white"
                    : "text-gray-600 hover:bg-gray-100"
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
