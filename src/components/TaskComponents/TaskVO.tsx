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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
        {/* Origin & Cause Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-gray-900 uppercase tracking-widest">Origin & Cause</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] font-medium text-[#6B7280] uppercase">Discipline</label>
              <p className="text-sm text-[#1B1C1F]">{formFields.discipline || "General"}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#6B7280] uppercase">Variation Cause</label>
              <p className="text-sm text-[#1B1C1F]">{formFields.cause || "Client Instruction"}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#6B7280] uppercase">Originating Document</label>
              <p className="text-sm text-blue-600 cursor-pointer flex items-center gap-1">
                {formFields.originatingDoc || "SI-042 (Structural Changes)"}
              </p>
            </div>
          </div>
        </div>

        {/* Impact Assessment Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-gray-900 uppercase tracking-widest">Impact Assessment</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] font-medium text-[#6B7280] uppercase">Programme Impact</label>
              <p className="text-sm text-[#1B1C1F]">{formFields.impactDays ? `${formFields.impactDays} days` : "5 days (Estimated)"}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#6B7280] uppercase">Contract Clause Reference</label>
              <p className="text-sm text-[#1B1C1F]">{formFields.clauseRef || "JBCC Clause 26.1"}</p>
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#6B7280] uppercase">Submission Status</label>
              <p className="text-sm text-[#1B1C1F]">Submitted: {formFields.submittedDate || "2024-02-15"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Full Description
        </label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">
          {formFields.description}
        </p>
      </div>

      {lineItems.length > 0 && <>
        <h2 className="text-base text-[#0E1C2E] mb-4 mt-8">Financial Breakdown</h2>

        {/* Line Items Table - Now Primary */}
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
                  <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">
                    Unit
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
                    <tr key={item._id || index} className="border-b hover:bg-gray-50/50">
                      <td className="text-sm text-[#1B1C1F] px-4 py-3 font-mono">
                        {index + 1}
                      </td>
                      <td className="text-sm text-[#1B1C1F] px-4 py-3">
                        {item.description || "-"}
                      </td>
                      <td className="text-sm text-[#6B7280] px-4 py-3">
                        {item.unit || "nr"}
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
                    <td colSpan={6} className="text-sm text-[#6B7280] px-4 py-8 text-center">
                      No line items added yet
                    </td>
                  </tr>
                )}

                {/* Subtotal Row */}
                <tr className="bg-[#F9FAFB] font-medium border-t-2">
                  <td
                    colSpan={5}
                    className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                    Subtotal:
                  </td>
                  <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                    {formatCurrency(subTotal)}
                  </td>
                </tr>

                {/* Tax Row */}
                <tr className="bg-[#F9FAFB]">
                  <td
                    colSpan={5}
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
                    colSpan={5}
                    className="text-sm font-medium text-white px-4 py-3 text-right">
                    Total Amount:
                  </td>
                  <td className="text-base font-medium text-white px-4 py-3 text-right">
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* Financial Summary - Now Secondary Compact Row */}
      {/* <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-[#F3F2F0] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CashIcon />
            <span className="text-xs font-medium text-[#6B7280]">Subtotal</span>
          </div>
          <span className="text-sm font-medium text-[#1B1C1F]">{formatCurrency(subTotal)}</span>
        </div>

        <div className="bg-[#F3F2F0] rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CashIcon />
            <span className="text-xs font-medium text-[#6B7280]">{tax.type || "Tax"}</span>
          </div>
          <span className="text-sm font-medium text-[#1B1C1F]">
            {tax.rate}% • {formatCurrency(tax.amount)}
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CashIcon />
            <span className="text-xs font-medium text-blue-900">Total</span>
          </div>
          <span className="text-base font-medium text-blue-900">{formatCurrency(grandTotal)}</span>
        </div>
      </div> */}
    </div>
  );
};
