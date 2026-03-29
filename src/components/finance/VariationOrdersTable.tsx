import React, { useState, useMemo } from "react";
import { MoreIcon } from "../icons/icons";
import { Search, ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatZAR } from '@/lib/formatCurrency';

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
      <span className={`${baseClasses} bg-green-50 text-green-700 border border-green-200`}>
        {status}
      </span>
    );
  }
  if (status === OrderStatus.Open) {
    return (
      <span className={`${baseClasses} bg-muted text-muted-foreground border border-border`}>
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
      <span className={`${baseClasses} bg-green-50 text-green-700 border border-green-200`}>
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

  const formatCurrency = (value: number) => `+ ${formatZAR(value)}`;

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
    <div className="bg-white shadow-sm rounded-lg border border-border overflow-hidden">
      {/* Search + New button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by VO #, title, requested by..."
            className="w-full h-10 pl-9 pr-4 text-sm border border-border rounded-lg bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm text-white bg-primary hover:opacity-90 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Variation Order
          </button>
        )}
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {["VO #", "Title", "Value", "Status", "Requested By", "Updated", "Impact", "AI", "Actions"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-6 py-4 text-left text-xs font-normal text-muted-foreground ">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  {search ? "No results match your search." : "No variation orders found."}
                </td>
              </tr>
            ) : (
              paginated.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary hover:text-primary/80 cursor-pointer">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {formatCurrency(order.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {order.requestedBy.avatarUrl ? (
                        <img
                          src={order.requestedBy.avatarUrl}
                          alt={order.requestedBy.name}
                          className="w-7 h-7 rounded-full object-cover text-white"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }}
                        />
                      ) : null}
                      <div
                        className="w-7 h-7 rounded-full bg-[#8081F6] flex items-center justify-center text-white text-xs font-medium shrink-0"
                        style={{ display: order.requestedBy.avatarUrl ? 'none' : 'flex' }}
                      >
                        {order.requestedBy.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground">{order.requestedBy.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.updated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <ImpactBadge days={order.impact} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.value > 100000 ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-xs">{order.value > 300000 ? '3 flags' : '1 flag'}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
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
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
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
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`min-w-[32px] h-8 px-2 rounded-md text-sm transition-colors ${safePage === p
                    ? "bg-[#8081F6] text-white"
                    : "text-foreground hover:bg-muted"
                    }`}>
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
