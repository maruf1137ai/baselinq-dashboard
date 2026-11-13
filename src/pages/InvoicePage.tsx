/**
 * /invoices/:id — one Baselinq tax invoice, as a page.
 *
 * WHY A ROUTE AND NOT A BIGGER MODAL
 * ----------------------------------
 * A payment certificate gets a full page and a server-rendered PDF. Baselinq's
 * own invoice to that customer got a 300px scrolling box inside a dialog, with
 * no address for it: nothing could be linked, mailed, bookmarked or printed.
 * An invoice that cannot be sent to an accounts department as a document is an
 * invoice that gets paid late.
 *
 * `window.print()` on a dedicated route is the established pattern here — see
 * `CertificatePage.tsx`, whose print rules these are. No PDF library is added:
 * the browser already renders A4 from a page that tells it what not to print.
 *
 * ── Permission ────────────────────────────────────────────────────────────
 *
 * Gated in `App.tsx` on `finance.invoices.view` OR platform staff, exactly as
 * the Finance page's Invoices tab is (finance.tsx:58-60): Baselinq staff raise
 * the bill on projects they are not members of, so they hold no project
 * permission there. The server gates `billing/invoices/{id}/` independently
 * (billing/views.py), which is what actually decides it — a route guard keyed
 * on the SELECTED project cannot be the authority on an invoice belonging to
 * another one.
 *
 * No `ProjectProtectedRoute`: an invoice names its own project, and a staff
 * member opening one from the admin panel may have no project selected at all.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Copy as CopyIcon, Lock, Printer } from "lucide-react";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { InvoiceDocument } from "@/components/billing/InvoiceDetail";
import { InvoiceGraceControl } from "@/components/billing/InvoiceGraceControl";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/useFetch";
import { useIsPlatformStaff } from "@/hooks/usePermission";
import { type Invoice } from "@/lib/platformBilling";
import { retryUnlessRefused } from "@/lib/queryRetry";

/** A standalone page still needs somewhere to put a refusal or an outage. */
const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background px-4 py-10">
    <div className="mx-auto max-w-[820px]">{children}</div>
  </div>
);

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, error } = useFetch<Invoice>(id ? `billing/invoices/${id}/` : "", {
    enabled: !!id,
    // A 403 is an answer, not a flake. Retrying it made a refused role watch a
    // loader through four attempts before being told — see QA BUG-11.
    retry: retryUnlessRefused,
  });

  // Only staff are told where to capture a missing issuer field; the gap itself
  // is shown to everybody. `data?.projectId` because the invoice names its own
  // project, which need not be the selected one.
  const isStaff = useIsPlatformStaff(data?.projectId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Best-effort: clipboard access is refused in some browsers and on
         insecure origins. The address bar still holds the link. */
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <AwesomeLoader message="Loading the invoice" />
      </Shell>
    );
  }

  if (isError || !data) {
    const refused = Number((error as { status?: number } | null)?.status) === 403;
    return (
      <Shell>
        {refused ? (
          <EmptyState
            icon={Lock}
            title="This invoice is not visible to your role"
            description="Baselinq's invoices are visible to people with invoice access on the project they belong to."
          />
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="This invoice could not be loaded"
            description="The link may name an invoice that no longer exists. This is not a statement that nothing is owed."
            action={
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                Go back
              </Button>
            }
          />
        )}
      </Shell>
    );
  }

  return (
    <>
      {/*
        Print rules, as CertificatePage.tsx:133 established them: hide the
        toolbar, drop the page background so paper is white, and flatten the
        document's own border and shadow — a printed box outline reads as a
        screenshot of an invoice rather than as an invoice.
      */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-shell { background: white !important; padding: 0 !important; }
          .invoice-document {
            box-shadow: none !important;
            border: none !important;
            max-width: none !important;
            min-height: 0 !important;
          }
        }
      `}</style>

      <div className="invoice-shell min-h-screen bg-background px-4 py-10">
        <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-wrap items-center gap-1.5">
            {isStaff && <InvoiceGraceControl invoice={data} />}
            <Button variant="outline" size="sm" onClick={copyLink}>
              <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/*
          One centred column at A4 proportions — 820px wide against a 1123px
          minimum height, so what is on screen is the shape of what comes out
          of the printer and a short invoice does not float in a half page.
        */}
        <div className="invoice-document mx-auto min-h-[1123px] max-w-[820px] rounded-xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <InvoiceDocument invoice={data} isStaff={isStaff} />
        </div>
      </div>
    </>
  );
}
