import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import CashIcon from "@/components/icons/CashIcon";

interface TaskVOProps {
  formFields: any;
}

export const TaskVO: React.FC<TaskVOProps> = ({ formFields }) => {
  if (!formFields) return null;

  // Use API data or fallback to calculated values
  const lineItems = formFields.lineItems || [];
  const subTotal = formFields.subTotal || 0;
  const grandTotal = formFields.grandTotal || 0;
  const tax = formFields.tax || { type: "VAT", rate: 15, amount: 0 };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `R ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Discipline
        </label>
        <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Description
        </label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-1 whitespace-pre-wrap">
          {formFields.description}
        </p>
      </div>

      <h2 className="text-base  text-[#0E1C2E] mb-5">Financial Breakdown</h2>
      {/* Stats card */}
      <div className="grid gap-2.5 mt-[27px] md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
          <CardContent className="p-2.5 flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <CashIcon />
                <p className="text-sm text-gray2 mb-1">Total Value</p>
              </div>
            </div>
            <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
              <div className="">
                <h3 className="text-2xl text-[#0F172A]">{formatCurrency(grandTotal)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
          <CardContent className="p-2.5  flex-1 flex flex-col ">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <CashIcon />
                <p className="text-sm text-gray2 mb-1">{tax.type || "Tax"}</p>
              </div>
            </div>
            <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
              <h3 className="text-2xl text-[#0F172A]">{tax.rate}%</h3>
              <p className="text-xs text-[#717784]">
                {formatCurrency(tax.amount)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
          <CardContent className="p-2.5  flex-1 flex flex-col ">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <CashIcon />
                <p className="text-sm text-gray2 mb-1">Subtotal</p>
              </div>
            </div>
            <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
              <h3 className="text-2xl text-black">{formatCurrency(subTotal)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variation Order Table */}
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2 block">
          Line Items
        </label>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F9FAFB] border-b">
              <tr>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">
                  #
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">
                  Description
                </th>
                <th className="text-right text-xs font-medium text-[#6B7280] px-4 py-2">
                  Qty
                </th>
                <th className="text-right text-xs font-medium text-[#6B7280] px-4 py-2">
                  Rate
                </th>
                <th className="text-right text-xs font-medium text-[#6B7280] px-4 py-2">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length > 0 ? (
                lineItems.map((item: any, index: number) => (
                  <tr key={item._id || index} className="border-b">
                    <td className="text-sm text-[#1B1C1F] px-4 py-3 font-mono">
                      {index + 1}
                    </td>
                    <td className="text-sm text-[#1B1C1F] px-4 py-3">
                      {item.description || "-"}
                    </td>
                    <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                      {item.quantity || 0}
                    </td>
                    <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                      {formatCurrency(item.unitRate || 0)}
                    </td>
                    <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                      {formatCurrency(item.total || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b">
                  <td colSpan={5} className="text-sm text-[#6B7280] px-4 py-3 text-center">
                    No line items
                  </td>
                </tr>
              )}

              {/* Subtotal Row */}
              <tr className="bg-[#F9FAFB] font-medium border-t-2">
                <td
                  colSpan={4}
                  className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  Subtotal:
                </td>
                <td className="text-sm font-semibold text-[#1B1C1F] px-4 py-3 text-right">
                  {formatCurrency(subTotal)}
                </td>
              </tr>

              {/* Tax Row */}
              <tr className="bg-[#F9FAFB]">
                <td
                  colSpan={4}
                  className="text-sm text-[#4B5563] px-4 py-3 text-right">
                  {tax.type || "Tax"} ({tax.rate}%):
                </td>
                <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                  {formatCurrency(tax.amount)}
                </td>
              </tr>

              {/* Total Row */}
              <tr className="bg-[#1B1C1F] hover:bg-[#1B1C1F] border-t-2">
                <td
                  colSpan={4}
                  className="text-sm font-bold text-white px-4 py-3 text-right">
                  Total Amount:
                </td>
                <td className="text-base font-bold text-white px-4 py-3 text-right">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
