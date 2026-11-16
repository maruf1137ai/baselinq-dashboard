/**
 * Baselinq's own fee, wherever the app shows it.
 *
 * The fee is invoiced in rand whatever the project's currency (client meeting,
 * 10 Nov 2026), so it goes through `formatZAR`, as Settings → Billing always
 * has, and never `formatMoney`, which follows the selected project. Using the
 * latter labelled the same fee "US$" on the certificate drawer and the
 * financial position, and "R" on the invoice.
 */
import { formatZAR } from "./formatCurrency";

export const formatFee = (value: number | string): string => formatZAR(Number(value));

/** "Baselinq platform fee R 1 000,00 + VAT R 150,00". */
export function platformFeeSummary(fee: { feeAmount: number | string; vatAmount: number | string }): string {
  return `Baselinq platform fee ${formatFee(fee.feeAmount)} + VAT ${formatFee(fee.vatAmount)}`;
}
