/**
 * /finance/statement — the Financial Position as a printable statement of
 * account. Same figures as the Finance tab (one payload), laid out for paper:
 * the browser prints it, as CertificatePage and InvoicePage do.
 */
import { useSearchParams } from "react-router-dom";
import { Printer, X } from "lucide-react";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import {
  FinancialPositionError,
  FinancialPositionView,
  type FinancialPositionData,
} from "@/components/finance/FinancialPosition";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/useFetch";
import { contractFormLabel } from "@/lib/contractForms";
import { setActiveCurrency } from "@/lib/formatCurrency";
import { formatDate } from "@/lib/dateUtils";

export default function FinancialStatementPage() {
  // The statement emailed after a certificate or payment links here with its
  // project, which need not be the one selected in this browser. Access is
  // still the server's decision.
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || localStorage.getItem("selectedProjectId") || "";
  const { data, isLoading, isError } = useFetch<FinancialPositionData & { currency?: string }>(
    projectId ? `projects/${projectId}/financial-position/` : "",
    { enabled: !!projectId },
  );
  // Printed outside the app's layout, so it takes its currency from the payload.
  setActiveCurrency(data?.currency);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          body, .statement-shell { background: white !important; }
          .statement-shell { padding: 0 !important; }
        }
      `}</style>
      <div className="statement-shell min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-[1100px] space-y-5">
          <div className="no-print flex items-center justify-between">
            {/* Opened in its own tab from Finance, so there is no page to go back to. */}
            <Button variant="ghost" size="sm" onClick={() => window.close()}>
              <X className="mr-1.5 h-4 w-4" />
              Close
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print or save as PDF
            </Button>
          </div>
          {isLoading ? (
            <AwesomeLoader message="Loading the statement" />
          ) : isError || !data ? (
            <FinancialPositionError />
          ) : (
            <>
              <header className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Financial Position · statement</p>
                  <h1 className="text-2xl font-semibold text-foreground">{data.projectName}</h1>
                  <p className="text-sm text-muted-foreground">As at {formatDate(data.asAt)}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-border px-4 py-3 text-xs md:grid-cols-4 print:grid-cols-4">
                  {[
                    ["Employer", data.parties?.employer],
                    ["Contractor", data.parties?.contractor],
                    ["Contract", contractFormLabel(data.parties?.contractForm)],
                    ["Project number", data.parties?.projectNumber],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium text-foreground">{value || "Not recorded"}</dd>
                    </div>
                  ))}
                </dl>
              </header>
              <FinancialPositionView data={data} linkable={false} />
              <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                {data.projectName} · Financial Position as at {formatDate(data.asAt)} · prepared through Baselinq.
                Contract figures exclude VAT; money figures include it.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
