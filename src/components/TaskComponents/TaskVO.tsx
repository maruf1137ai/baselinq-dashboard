import React from "react";

interface TaskVOProps {
  formFields: any;
}

/**
 * Werner rev H — VO (Variation Order) body content.
 *
 * Matches the RFI body pattern: bare label + paragraph, no coloured
 * boxes, no gridded headers. Discipline / Origin / Impact Assessment
 * fields live in the doc meta strip on TaskDetails. VO keeps its
 * contractually required Financial Breakdown line-items table because
 * Werner spec page 8 requires it as part of the VO certificate.
 */
export const TaskVO: React.FC<TaskVOProps> = ({ formFields }) => {
  if (!formFields) return null;

  const lineItems = formFields.lineItems || [];
  const subTotal = formFields.subTotal || 0;
  const grandTotal = formFields.grandTotal || 0;
  const tax = formFields.tax || { type: "VAT", rate: 15, amount: 0 };

  const formatCurrency = (amount: number) =>
    `R ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-5">
      {formFields.description && (
        <div>
          <label className="text-xs text-muted-foreground">Description of Variation Order</label>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-2">
            {formFields.description}
          </p>
        </div>
      )}

      {lineItems.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground">Financial Breakdown</label>
          <div className="border rounded-lg overflow-hidden mt-2">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">#</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Description</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Unit</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Qty</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Rate</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any, index: number) => (
                  <tr key={item._id || index} className="border-b hover:bg-muted/50/50">
                    <td className="text-sm text-foreground px-4 py-3 font-mono">{index + 1}</td>
                    <td className="text-sm text-foreground px-4 py-3">{item.description || "-"}</td>
                    <td className="text-sm text-muted-foreground px-4 py-3">{item.unit || "nr"}</td>
                    <td className="text-sm text-foreground px-4 py-3 text-right">{item.quantity || 0}</td>
                    <td className="text-sm text-foreground px-4 py-3 text-right">{formatCurrency(item.unitRate || 0)}</td>
                    <td className="text-sm font-normal text-foreground px-4 py-3 text-right">{formatCurrency(item.total || 0)}</td>
                  </tr>
                ))}
                <tr className="bg-muted font-medium border-t-2">
                  <td colSpan={5} className="text-sm text-foreground px-4 py-3 text-right">Subtotal:</td>
                  <td className="text-sm font-normal text-foreground px-4 py-3 text-right">{formatCurrency(subTotal)}</td>
                </tr>
                <tr className="bg-muted">
                  <td colSpan={5} className="text-sm text-muted-foreground px-4 py-3 text-right">
                    {tax.type || "Tax"} ({tax.rate}%):
                  </td>
                  <td className="text-sm font-normal text-foreground px-4 py-3 text-right">{formatCurrency(tax.amount)}</td>
                </tr>
                <tr className="bg-[#1B1C1F] hover:bg-[#1B1C1F] border-t-2">
                  <td colSpan={5} className="text-sm font-medium text-white px-4 py-3 text-right">Total Amount:</td>
                  <td className="text-sm font-medium text-white px-4 py-3 text-right">{formatCurrency(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {formFields.voTimeImpact != null && formFields.voTimeImpact !== "" && (
            <div className="flex items-center justify-between mt-3 px-4 py-3 bg-muted/50 rounded-lg border border-border">
              <span className="text-xs font-medium text-muted-foreground">Time Impact</span>
              <span className="text-sm text-foreground">
                {formFields.voTimeImpact} {Number(formFields.voTimeImpact) === 1 ? "day" : "days"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
