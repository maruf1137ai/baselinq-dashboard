import React from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import CashIcon from "@/components/icons/CashIcon";

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
      {(formFields.discipline || formFields.cause || formFields.originatingDoc || formFields.impactDays || formFields.clauseRef || formFields.submittedDate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
          {/* Origin & Cause Section */}
          {(formFields.discipline || formFields.cause || formFields.originatingDoc) && (
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-foreground">Origin & Cause</h3>
              <div className="grid grid-cols-1 gap-3">
                {formFields.discipline && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Discipline</label>
                    <p className="text-sm text-foreground">{formFields.discipline}</p>
                  </div>
                )}
                {formFields.cause && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Variation Cause</label>
                    <p className="text-sm text-foreground">{formFields.cause}</p>
                  </div>
                )}
                {formFields.originatingDoc && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Originating Document</label>
                    <p className="text-sm text-primary cursor-pointer flex items-center gap-1">
                      {formFields.originatingDoc}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Impact Assessment Section */}
          {(formFields.impactDays || formFields.clauseRef || formFields.submittedDate) && (
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-foreground">Impact Assessment</h3>
              <div className="grid grid-cols-1 gap-3">
                {formFields.impactDays && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Programme Impact</label>
                    <p className="text-sm text-foreground">{formFields.impactDays} days</p>
                  </div>
                )}
                {formFields.clauseRef && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Contract Clause Reference</label>
                    <p className="text-sm text-foreground">{formFields.clauseRef}</p>
                  </div>
                )}
                {formFields.submittedDate && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Submission Status</label>
                    <p className="text-sm text-foreground">Submitted: {formFields.submittedDate}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {formFields.description && (
        <div className="pt-4">
          <label className="text-xs font-medium text-muted-foreground">
            Full Description
          </label>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 whitespace-pre-wrap bg-muted p-4 rounded-lg border border-border">
            {formFields.description}
          </p>
        </div>
      )}

      {lineItems.length > 0 && <>
        <h2 className="text-sm text-foreground mb-4 mt-8">Financial Breakdown</h2>

        {/* Line Items Table - Now Primary */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Line Items
          </label>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                    #
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">
                    Unit
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">
                    Qty
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">
                    Rate
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 ? (
                  lineItems.map((item: any, index: number) => (
                    <tr key={item._id || index} className="border-b hover:bg-muted/50/50">
                      <td className="text-sm text-foreground px-4 py-3 font-mono">
                        {index + 1}
                      </td>
                      <td className="text-sm text-foreground px-4 py-3">
                        {item.description || "-"}
                      </td>
                      <td className="text-sm text-muted-foreground px-4 py-3">
                        {item.unit || "nr"}
                      </td>
                      <td className="text-sm text-foreground px-4 py-3 text-right">
                        {item.quantity || 0}
                      </td>
                      <td className="text-sm text-foreground px-4 py-3 text-right">
                        {formatCurrency(item.unitRate || 0)}
                      </td>
                      <td className="text-sm font-normal text-foreground px-4 py-3 text-right">
                        {formatCurrency(item.total || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b">
                    <td colSpan={6} className="text-sm text-muted-foreground px-4 py-8 text-center">
                      No line items added yet
                    </td>
                  </tr>
                )}

                {/* Subtotal Row */}
                <tr className="bg-muted font-medium border-t-2">
                  <td
                    colSpan={5}
                    className="text-sm text-foreground px-4 py-3 text-right">
                    Subtotal:
                  </td>
                  <td className="text-sm font-normal text-foreground px-4 py-3 text-right">
                    {formatCurrency(subTotal)}
                  </td>
                </tr>

                {/* Tax Row */}
                <tr className="bg-muted">
                  <td
                    colSpan={5}
                    className="text-sm text-muted-foreground px-4 py-3 text-right">
                    {tax.type || "Tax"} ({tax.rate}%):
                  </td>
                  <td className="text-sm font-normal text-foreground px-4 py-3 text-right">
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
                  <td className="text-sm font-medium text-white px-4 py-3 text-right">
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
        <div className="bg-sidebar rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CashIcon />
            <span className="text-xs font-medium text-muted-foreground">Subtotal</span>
          </div>
          <span className="text-sm font-normal text-foreground">{formatCurrency(subTotal)}</span>
        </div>

        <div className="bg-sidebar rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CashIcon />
            <span className="text-xs font-medium text-muted-foreground">{tax.type || "Tax"}</span>
          </div>
          <span className="text-sm font-medium text-foreground">
            {tax.rate}% • {formatCurrency(tax.amount)}
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CashIcon />
            <span className="text-xs font-medium text-blue-900">Total</span>
          </div>
          <span className="text-sm font-medium text-blue-900">{formatCurrency(grandTotal)}</span>
        </div>
      </div> */}
    </div>
  );
};
