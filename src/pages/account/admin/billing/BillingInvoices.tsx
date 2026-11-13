import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { InvoiceStatusBadge } from "@/components/billing/InvoiceDetail";
import { Pager } from "@/components/ui/pager";
import { type Paged, usePagedFetch } from "@/hooks/usePagedFetch";
import { formatDate } from "@/lib/dateUtils";
import { INVOICE_STATUS, type Invoice, type InvoiceDisplayStatus, money } from "@/lib/platformBilling";
import { AdminPage, ErrorNotice, SectionCard, TD, TD_NUM, TH, TH_NUM } from "../adminUi";
import { InvoiceDialog } from "./billingShared";

const FILTERS: InvoiceDisplayStatus[] = ["draft", "unpaid", "overdue", "paid", "cancelled"];
const PAGE_SIZE = 25;

const BillingInvoices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") as InvoiceDisplayStatus | null) || "";
  const [open, setOpen] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isPaging } = usePagedFetch<Paged<Invoice>>(
    `billing/admin/invoices/${status ? `?status=${status}` : ""}`,
    page,
    PAGE_SIZE,
  );

  const pick = (s: InvoiceDisplayStatus | "") => { setSearchParams(s ? { status: s } : {}); setPage(1); };

  return (
    <AdminPage title="Invoices" description="One invoice per project per month. Issue drafts, then mark each paid when the money arrives.">
      <div className="flex flex-wrap gap-2">
        {(["", ...FILTERS] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => pick(s)}
            className={`px-3 py-1.5 rounded-md text-sm border ${status === s ? "bg-card border-border text-foreground" : "border-transparent text-muted-foreground hover:bg-card"}`}
          >
            {s ? INVOICE_STATUS[s].label : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : isError || !data ? (
        <ErrorNotice error={error} />
      ) : (
        <SectionCard title={`${data.count} invoice${data.count === 1 ? "" : "s"}`} subtitle="Open one to see its lines and act on it.">
          {data.results.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              {status === "draft" ? "No drafts. Run month end from Billing to build them." : "No invoices match."}
            </p>
          ) : (
            <table className={`w-full ${isPaging ? "opacity-60 transition-opacity" : ""}`}>
              <thead>
                <tr className="border-b border-border">
                  {[
                    { label: "Invoice" },
                    { label: "Project" },
                    { label: "Fees up to" },
                    { label: "Fee", numeric: true },
                    { label: "VAT (15%)", numeric: true },
                    { label: "Total", numeric: true },
                    { label: "Due" },
                    { label: "Status" },
                  ].map((h) => (
                    <th key={h.label} className={h.numeric ? TH_NUM : TH}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((inv) => (
                  <tr key={inv.id} onClick={() => setOpen(inv)} className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50">
                    <td className={TD}>{inv.invoiceNumber || "Draft"}</td>
                    <td className={TD}>{inv.projectName}</td>
                    <td className={TD}>{formatDate(inv.periodEnd, "short")}</td>
                    <td className={TD_NUM}>{money(inv.subtotal)}</td>
                    <td className={TD_NUM}>{money(inv.vatAmount)}</td>
                    <td className={TD_NUM}>{money(inv.totalAmount)}</td>
                    <td className={TD}>{inv.dueOn ? formatDate(inv.dueOn, "short") : "—"}</td>
                    <td className={TD}><InvoiceStatusBadge invoice={inv} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pager {...data} onPage={setPage} loading={isPaging} />
        </SectionCard>
      )}

      <InvoiceDialog invoice={open} onClose={() => setOpen(null)} />
    </AdminPage>
  );
};

export default BillingInvoices;
