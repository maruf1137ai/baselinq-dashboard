/**
 * Finance → Baselinq Billing — one tab, read top to bottom as one sequence:
 * what has accrued → what has been invoiced → what has been paid.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * "Platform Fees" and "Invoices" were two tabs telling one story twice. The
 * fee tab's headline said "Total charged R 345 141,46"; the invoice tab's said
 * "On the next invoice R 345 141,46" — the same number, on two tabs, with no
 * way for a reader to know whether they were two facts or one. Worse, every
 * charge row carried "Not invoiced" or "Invoiced · BLQ-0007" as DEAD TEXT: a
 * statement about the other tab, which the reader then had to go and find by
 * eye. The merge makes that string a link and the two headlines one strip.
 *
 * THE PERMISSION MODEL IS UNCHANGED, deliberately.
 * `finance.platform_fees.view` and `finance.invoices.view` are separate codes
 * and the server enforces them separately (cost_ledger/views.py for the fee
 * ledger, billing/views.py for the invoices). A client can hold one and not
 * the other, so:
 *
 *   • the TAB appears when the viewer holds EITHER code (or is platform staff);
 *   • each SECTION inside it renders only if its own code is held;
 *   • each FETCH is keyed off its own code, so a viewer holding one code never
 *     issues the request the server would refuse.
 *
 * A viewer with only `finance.invoices.view` therefore sees the invoices and no
 * fee derivation; one with only `finance.platform_fees.view` sees the
 * derivation and no invoices. Merging the tabs widened nobody's sight of
 * anything.
 */
import React, { useMemo } from "react";
import { AlertCircle, Lock, Receipt } from "lucide-react";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatCard } from "./FinanceStatCard";
import FeeChargesSection, {
  chargeBillingPosition,
  type FeesResponse,
} from "./platformFees";
import InvoicesSection, { type InvoiceListResponse } from "./platformInvoices";
import useFetch from "@/hooks/useFetch";
import { useIsPlatformStaff, usePermission } from "@/hooks/usePermission";
import { formatDate } from "@/lib/dateUtils";
import { money } from "@/lib/platformBilling";

/** A section heading on the tab. The sequence is the point, so it is labelled. */
const SectionHeader: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="space-y-0.5">
    <h2 className="text-sm font-medium text-foreground">{title}</h2>
    <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

/** The three figures the strip states, from whichever payload this viewer may read. */
interface Position {
  notInvoiced: number | string;
  notInvoicedCount: number;
  accruingSince: string | null;
  invoicedUnpaid: number;
  invoicedUnpaidNote: string;
  overdue: number;
  overdueNote: string;
}

const BaselinqBilling: React.FC = () => {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const numericProjectId = parseInt(projectId, 10) || null;

  // The same two codes the server enforces, repeated from the tab gate in
  // src/pages/finance.tsx so this component is not safe only by virtue of
  // where it is mounted. Baselinq staff hold neither on a customer's project
  // and the server serves them both anyway — the bill is ours to raise, and we
  // are not members of their team (QA BUG-06).
  const isStaff = useIsPlatformStaff(numericProjectId);
  const canViewFees = usePermission("finance.platform_fees.view", numericProjectId) || isStaff;
  const canViewInvoices = usePermission("finance.invoices.view", numericProjectId) || isStaff;

  const feesKey =
    projectId && canViewFees ? `cost-ledger/fees/?project_id=${projectId}` : "";
  const fees = useFetch<FeesResponse>(feesKey, { enabled: !!feesKey });

  const invoicesKey =
    projectId && canViewInvoices ? `billing/projects/${projectId}/invoices/` : "";
  const invoiceList = useFetch<InvoiceListResponse>(invoicesKey, { enabled: !!invoicesKey });

  const invoices = useMemo(() => invoiceList.data?.invoices ?? [], [invoiceList.data]);

  /*
    ONE strip, from the better of the two sources this viewer may read.

    The invoices payload is preferred because an invoice is the document the
    money is actually owed against, and `uninvoiced` mirrors the server's own
    uninvoiced_summary. A viewer holding only the fee code cannot read it, so
    the same three figures are folded off the charges instead — off the
    server's `billingState`, never re-derived — which is exactly what the old
    Platform Fees headline already showed them.

    Null means "nobody can tell": no invoices payload, and no charge carrying a
    billing state. The strip is then not rendered at all, rather than reporting
    R 0,00 outstanding, which reads as "nothing is owed".
  */
  const position = useMemo((): Position | null => {
    const uninvoiced = invoiceList.data?.uninvoiced;
    if (canViewInvoices && invoiceList.data) {
      const owed = invoices.filter(
        (i) => i.displayStatus === "unpaid" || i.displayStatus === "overdue",
      );
      const overdue = owed.filter((i) => i.displayStatus === "overdue");
      const sum = (list: typeof invoices) =>
        list.reduce((t, i) => t + Number(i.totalAmount || 0), 0);
      return {
        notInvoiced: uninvoiced?.uninvoicedTotal ?? 0,
        notInvoicedCount: uninvoiced?.uninvoicedChargeCount ?? 0,
        accruingSince: uninvoiced?.earliestUninvoicedOn ?? null,
        invoicedUnpaid: sum(owed),
        invoicedUnpaidNote: `${owed.length} unpaid invoice${owed.length === 1 ? "" : "s"}, incl. 15% VAT`,
        overdue: sum(overdue),
        overdueNote: `${overdue.length} past the due date`,
      };
    }

    const folded = canViewFees ? chargeBillingPosition(fees.data?.calculatedFees ?? []) : null;
    if (!folded) return null;
    return {
      notInvoiced: folded.notInvoiced,
      notInvoicedCount: folded.notInvoicedCount,
      accruingSince: folded.earliestUninvoicedOn,
      invoicedUnpaid: folded.invoicedUnpaid,
      invoicedUnpaidNote: `${folded.invoicedUnpaidCount} fee${folded.invoicedUnpaidCount === 1 ? "" : "s"} on an issued invoice, incl. VAT`,
      overdue: folded.overdue,
      overdueNote: `${folded.overdueCount} on an invoice past its due date`,
    };
  }, [canViewFees, canViewInvoices, fees.data, invoiceList.data, invoices]);

  /* ---- gates ---- */

  if (!canViewFees && !canViewInvoices) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Lock}
          title="Baselinq billing is not visible to your role"
          description="The platform fee is billed to the employer. Ask a project administrator if you need sight of it."
        />
      </main>
    );
  }

  if (!projectId) {
    return (
      <main className="pt-6">
        <EmptyState
          icon={Receipt}
          title="No project selected"
          description="Baselinq bills per project. Select a project to see what has accrued on it."
        />
      </main>
    );
  }

  // Only a section this viewer actually requested can be in flight: with no
  // key, `enabled` is false and the query never starts.
  if ((!!feesKey && fees.isLoading) || (!!invoicesKey && invoiceList.isLoading)) {
    return (
      <main className="pt-6">
        <AwesomeLoader compact message="Totalling Baselinq billing" />
      </main>
    );
  }

  return (
    <main className="pt-6 space-y-6">
      {/*
        The three questions a reader has, each answered once. "Accruing since
        <date> · invoiced after month end" and NOT a date: there is no
        scheduler on the backend — a billing run is a person in the admin panel
        pressing Build — so naming a day would be a promise nothing keeps.
      */}
      {position && (
        <div className="grid gap-4 md:grid-cols-3 items-stretch">
          <FinanceStatCard
            label="Accrued, not yet invoiced"
            value={money(position.notInvoiced)}
            meta={
              position.notInvoicedCount === 0
                ? "Every fee so far has been invoiced"
                : position.accruingSince
                  ? `${position.notInvoicedCount} fee${position.notInvoicedCount === 1 ? "" : "s"} · accruing since ${formatDate(position.accruingSince, "long")} · invoiced after month end`
                  : `${position.notInvoicedCount} fee${position.notInvoicedCount === 1 ? "" : "s"} not invoiced yet, incl. VAT`
            }
          />
          <FinanceStatCard
            label="Invoiced, unpaid"
            value={money(position.invoicedUnpaid)}
            meta={position.invoicedUnpaidNote}
          />
          <FinanceStatCard
            label="Overdue"
            value={money(position.overdue)}
            alarm={position.overdue > 0}
            meta={position.overdueNote}
          />
        </div>
      )}

      {/* What has been invoiced. Nothing is built, issued or settled here:
          those are Baselinq's acts and live in Admin Panel → Billing, and the
          server refuses them to anyone but a superuser either way. */}
      {canViewInvoices && (
        <section className="space-y-3">
          <SectionHeader title="Invoices">
            Baselinq issues one invoice a month listing every platform fee on this project. Pay by
            bank transfer using the invoice number as the reference.
          </SectionHeader>
          {invoiceList.isError ? (
            <EmptyState
              icon={AlertCircle}
              title="Invoices could not be loaded"
              description="This is not a statement that there are none."
            />
          ) : (
            <InvoicesSection invoices={invoices} />
          )}
        </section>
      )}

      {/* How each fee on those invoices was arrived at. */}
      {canViewFees && (
        <section className="space-y-3">
          <SectionHeader title="How the fees were calculated">
            Every charge, what it was calculated on, and where it stands on an invoice. Expand a row
            for its full derivation.
          </SectionHeader>
          {fees.isError || !fees.data ? (
            <EmptyState
              icon={Receipt}
              title="Platform fees could not be loaded"
              description="The fee ledger did not respond. Charges remain recorded against the cost ledger."
            />
          ) : (
            <FeeChargesSection data={fees.data} />
          )}
        </section>
      )}
    </main>
  );
};

export default BaselinqBilling;
