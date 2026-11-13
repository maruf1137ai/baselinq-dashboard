/**
 * The invoices half of Finance → Baselinq Billing: Baselinq's monthly platform
 * fee invoices to this project, read-only.
 *
 * IT IS A SECTION, NOT A TAB, as of the Baselinq Billing merge — see
 * `baselinqBilling.tsx`, which owns the tab, the fetch, the permission gates
 * and the one summary strip. This file owns the list and the preview dialog.
 *
 * Baselinq sends one invoice a month listing every fee (client meeting, 28 Oct
 * 2026). The project sees each one, what it adds up to (fee + 15% VAT), when
 * it is due, how to pay it, and whether Baselinq has marked it paid.
 *
 * Nothing is built, issued or settled here. Those are Baselinq's acts and live
 * in the Admin Panel → Billing, which reaches every project; the server refuses
 * them to anyone but a superuser either way. Drafts and cancelled invoices are
 * not served to the project at all (billing/views.py).
 *
 * Reading is gated on `finance.invoices.view`, the code the server enforces.
 */
import React, { useState } from "react";
import { ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoicePreview, InvoiceStatusBadge } from "@/components/billing/InvoiceDetail";
import { fetchData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";
import { type Invoice, money } from "@/lib/platformBilling";

/**
 * `uninvoiced` mirrors billing/invoicing.py::uninvoiced_summary IN FULL.
 *
 * It was typed as the count and the total only, which did not merely omit the
 * other three fields — it discarded `earliestUninvoicedOn`, the one fact that
 * turns "R 75 928,75 not invoiced yet" into something a client can check. The
 * server has computed it all along, in the project's timezone and not UTC,
 * precisely so it could be shown.
 */
export interface UninvoicedSummary {
  uninvoicedChargeCount: number;
  uninvoicedFee: string;
  uninvoicedVat: string;
  uninvoicedTotal: string;
  /** The date the oldest unbilled fee accrued. Null when there are none. */
  earliestUninvoicedOn: string | null;
}

export interface InvoiceListResponse {
  projectId: number;
  invoices: Invoice[];
  uninvoiced: UninvoicedSummary;
}

/*
  `_NUM` on both the header and the cell, as `adminUi` does it: a money column
  whose heading is right-aligned over left-aligned figures (or the reverse) is
  the shape this table was in — every amount sat left, under a left heading,
  so the rands in one row did not line up with the rands in the next.
*/
const TH = "px-5 py-3 text-left text-xs font-normal text-muted-foreground whitespace-nowrap";
const TH_NUM = `${TH} !text-right`;
const TD = "px-5 py-3 text-sm text-foreground whitespace-nowrap";
const TD_NUM = `${TD} text-right tabular-nums`;

/**
 * The invoice list and its preview dialog, over invoices the parent has
 * already fetched and already gated on `finance.invoices.view`.
 *
 * It takes `invoices` rather than fetching: the Baselinq Billing tab needs the
 * same payload for its summary strip, and two components reading the same
 * endpoint is how a figure on the strip and a figure in the list come to
 * disagree.
 */
export const InvoicesSection: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
  const [open, setOpen] = useState<Invoice | null>(null);

  /** Open a single invoice WITH its lines — the list omits them. */
  const openInvoice = async (row: Invoice) => {
    setOpen(row);
    try {
      setOpen((await fetchData(`billing/invoices/${row.id}/`)) as Invoice);
    } catch {
      toast.error("Could not load the invoice lines");
    }
  };

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No invoices yet"
          description="Baselinq sends one invoice a month listing every platform fee on this project."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead>
              {/*
                `numeric` drives the alignment of the heading and its cells
                from one declaration, so the two cannot drift apart.

                "Supply period" rather than "Fees up to": the document itself
                now states a range, and the list calling the same thing by a
                different name is how a client ends up asking which one is
                right.
              */}
              <tr className="border-b border-border">
                {[
                  { label: "Invoice" },
                  { label: "Supply period" },
                  { label: "Platform fee", numeric: true },
                  { label: "VAT (15%)", numeric: true },
                  { label: "Total", numeric: true },
                  { label: "Due" },
                  { label: "Status" },
                ].map((c) => (
                  <th key={c.label} className={c.numeric ? TH_NUM : TH}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => openInvoice(inv)}
                  className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50"
                >
                  <td className={`${TD} tabular-nums`}>{inv.invoiceNumber || "Draft"}</td>
                  <td className={TD}>
                    {formatDate(inv.periodStart, "short")} – {formatDate(inv.periodEnd, "short")}
                  </td>
                  <td className={TD_NUM}>{money(inv.subtotal)}</td>
                  <td className={TD_NUM}>{money(inv.vatAmount)}</td>
                  <td className={TD_NUM}>{money(inv.totalAmount)}</td>
                  <td className={TD}>{inv.dueOn ? formatDate(inv.dueOn, "long") : "—"}</td>
                  <td className={TD}><InvoiceStatusBadge invoice={inv} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          {open && (
            <>
              {/*
                A PREVIEW now, not the document. The tax invoice itself is a
                page at /invoices/:id — printable, linkable, and showing every
                line without a scrollbar — and this dialog's primary action
                opens it.
              */}
              <DialogHeader>
                <DialogTitle>Baselinq platform fee invoice</DialogTitle>
                <DialogDescription>
                  Pay by bank transfer using the invoice number as the reference. Baselinq marks it paid when the money
                  arrives.
                </DialogDescription>
              </DialogHeader>
              <InvoicePreview invoice={open} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesSection;
