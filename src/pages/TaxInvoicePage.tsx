/**
 * /finance/tax-invoices/:id — the contractor's tax invoice as a document.
 *
 * Printed from the browser (window.print), like CertificatePage and
 * InvoicePage: no PDF library, the print rules hide the toolbar. Every
 * particular VAT Act s20(4) asks of a full tax invoice is on it — the words
 * "Tax invoice", supplier and recipient names, addresses and VAT numbers, a
 * serial number, the date, a description (here, by reference to the
 * certificate, as SARS BGR 27 allows), and the value, VAT and total. A draft
 * and a cancelled invoice say so across the page.
 */
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Printer } from "lucide-react";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import useFetch from "@/hooks/useFetch";
import { formatDate } from "@/lib/dateUtils";
import { formatMoney, setActiveCurrency } from "@/lib/formatCurrency";
import { type TaxInvoice, type TaxInvoiceParty } from "@/lib/taxInvoice";

function PartyBlock({ title, party }: { title: string; party: TaxInvoiceParty }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      <p className="text-sm font-medium text-foreground">{party.name || "—"}</p>
      {party.address && <p className="text-sm text-foreground">{party.address}</p>}
      {party.vatNumber && <p className="text-sm text-foreground">VAT no. {party.vatNumber}</p>}
      {party.registrationNumber && <p className="text-sm text-muted-foreground">Reg. no. {party.registrationNumber}</p>}
    </div>
  );
}

export default function TaxInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useFetch<TaxInvoice>(id ? `tax-invoices/${id}/` : "", { enabled: !!id });
  // Printed outside the app's layout, so it takes its currency from the invoice.
  setActiveCurrency(data?.currency);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <AwesomeLoader message="Loading the tax invoice" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <EmptyState
          icon={AlertCircle}
          title="This tax invoice could not be loaded"
          description="It may not exist, or it belongs to a project you do not have finance access on."
        />
      </div>
    );
  }

  const banner =
    data.status === "draft"
      ? "Draft — not yet issued, not a valid tax invoice"
      : data.status === "credited"
        ? `Cancelled by credit note ${data.creditNoteNumber ?? ""}`
        : data.status === "void"
          ? "Discarded draft"
          : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .ti-shell { background: white !important; padding: 0 !important; }
          .ti-document { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <div className="ti-shell min-h-screen bg-background px-4 py-10">
        <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print or save as PDF
          </Button>
        </div>

        <article className="ti-document mx-auto max-w-[820px] bg-card border border-border rounded-xl shadow-sm p-10 space-y-8">
          {banner && (
            <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {banner}
            </p>
          )}

          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Tax invoice</h1>
              {data.projectName && <p className="text-sm text-muted-foreground mt-1">{data.projectName}</p>}
            </div>
            <dl className="text-sm grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Invoice no.</dt>
              <dd className="text-foreground">{data.invoiceNumber ?? "—"}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="text-foreground">{data.invoiceDate ? formatDate(data.invoiceDate) : "—"}</dd>
              <dt className="text-muted-foreground">Certificate</dt>
              <dd className="text-foreground">{data.pcNumber}</dd>
            </dl>
          </header>

          <section className="grid gap-6 sm:grid-cols-2">
            <PartyBlock title="From (supplier)" party={data.supplier} />
            <PartyBlock title="To (recipient)" party={data.recipient} />
          </section>

          <section>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-normal">Description</th>
                  <th className="py-2 font-normal text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border align-top">
                  <td className="py-3 pr-4 text-foreground">{data.description}</td>
                  <td className="py-3 text-right tabular-nums">{formatMoney(Number(data.amountExclVat))}</td>
                </tr>
              </tbody>
            </table>
            <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Value excl. VAT</dt>
                <dd className="tabular-nums">{formatMoney(Number(data.amountExclVat))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT @ {Number(data.vatRatePct)}%</dt>
                <dd className="tabular-nums">{formatMoney(Number(data.vatAmount))}</dd>
              </div>
              <div className="flex justify-between border-t border-foreground pt-2 font-medium">
                <dt>Total incl. VAT</dt>
                <dd className="tabular-nums">{formatMoney(Number(data.totalInclVat))}</dd>
              </div>
            </dl>
            {Number(data.advanceRecovery) > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {formatMoney(Number(data.advanceRecovery))} advance payment is recovered on certificate {data.pcNumber}
                {" "}below the VAT line. It does not reduce the value of this supply.
              </p>
            )}
          </section>

          <footer className="text-xs text-muted-foreground">
            Prepared through Baselinq from payment certificate {data.pcNumber}
            {data.issuedBy ? `, issued by ${data.issuedBy}` : ""}.
          </footer>
        </article>
      </div>
    </>
  );
}
