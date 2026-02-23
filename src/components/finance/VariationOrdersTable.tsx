import React from "react";
import { MoreIcon } from "../icons/icons";
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

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";
  if (status === OrderStatus.Approved) {
    return (
      <span
        className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        {status}
      </span>
    );
  }
  if (status === OrderStatus.Open) {
    return (
      <span
        className={`${baseClasses} bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]`}>
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

const ImpactBadge: React.FC<{ days: number }> = ({ days }) => {
  const baseClasses = "px-2.5 py-1 text-xs rounded-full inline-block";
  if (days === 0) {
    return (
      <span
        className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        +0d
      </span>
    );
  }
  return (
    <span
      className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
      +{days}d
    </span>
  );
};

export const VariationOrdersTable: React.FC<VariationOrdersTableProps> = ({
  orders,
  onEdit,
  onDelete,
}) => {
  const formatCurrency = (value: number) => {
    return `+ R ${new Intl.NumberFormat("en-ZA").format(value)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              VO #
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Value
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Requested By
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Updated
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Impact
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
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
          ))}
        </tbody>
      </table>
    </div>
  );
};
