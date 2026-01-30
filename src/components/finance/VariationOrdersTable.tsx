import React from "react";
import { MoreIcon } from "../icons/icons";

interface VariationOrdersTableProps {
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
                <img
                  src={order.requestedBy.avatarUrl}
                  alt={order.requestedBy.name}
                  className="w-8 h-8 rounded-full"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                {order.updated}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base">
                <ImpactBadge days={order.impact} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreIcon className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
