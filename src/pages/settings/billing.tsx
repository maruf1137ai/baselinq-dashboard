/**
 * Settings → Billing — the project's billing terms, read-only for everyone.
 *
 * Baselinq's terms are set by Baselinq, not from inside the project (client
 * meeting, 28 Oct 2026). They are managed by superusers in the Admin Panel →
 * Billing, which reaches every project — including ones no Baselinq person is
 * a member of, which this screen never could. So nobody edits here; a
 * superuser gets a link to the project's page in the admin panel instead.
 *
 * What the project needs to know is all here: the rate it is charged and
 * whether that is the standard rate or one negotiated for it, VAT (15%, fixed),
 * any cap, what is charged on, and who the invoices go to.
 */
import { AlertCircle, ExternalLink, HelpCircle, Lock, Receipt } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { formatZAR } from "@/lib/formatCurrency";
import { ratePct } from "@/lib/platformBilling";
import useFetch from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { retryUnlessRefused } from "@/lib/queryRetry";
import BaselinqBilling from "@/components/finance/baselinqBilling";

/** Mirrors billing/serializers.py::serialize_fee_config. */
interface FeeConfig {
  configured: boolean;
  enabled: boolean;
  feeBase: string;
  feeRatePct: number;
  rateSource: "default" | "negotiated";
  vatRatePct: number;
  capAmount: number | null;
  billingContactName: string;
  billingContactEmail: string;
}

const FEE_BASE_LABEL: Record<string, string> = {
  both: "Payment certificates and variation orders",
  pc_only: "Payment certificates only",
  vo_only: "Variation orders only",
};

/** The project users' billing guide, beside the title on every state of this page. */
const GUIDE_LINK = (
  <Link
    to="/help/billing"
    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    title="How Baselinq's platform fee and monthly invoice work, and how to pay"
  >
    <HelpCircle className="h-4 w-4" />
    Billing guide
  </Link>
);

const Billing = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const { data: user } = useCurrentUser();

  const key = projectId ? `billing/projects/${projectId}/fee-config/` : "";
  const { data: form, isLoading, isError, error } = useFetch<FeeConfig>(key, {
    enabled: !!projectId,
    retry: retryUnlessRefused,
  });

  const row = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="flex items-start justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0 text-sm text-foreground tabular-nums text-right">{value}</div>
    </div>
  );

  if (!projectId) {
    return (
      <PageBody>
        <PageHeader title="Billing" reference={GUIDE_LINK} />
        <EmptyState icon={Receipt} title="No project selected" description="Choose a project to see its billing terms." />
      </PageBody>
    );
  }

  // The error is checked BEFORE the loader: a role the server refuses used to
  // watch "Loading billing terms" forever (QA BUG-11).
  if (isError) {
    const refused = Number((error as { status?: number } | null)?.status) === 403;
    return (
      <PageBody>
        <PageHeader title="Billing" reference={GUIDE_LINK} />
        {refused ? (
          <EmptyState
            icon={Lock}
            title="Billing terms are not visible to your role"
            description="Only people with finance access on this project can see them — ask a project administrator."
          />
        ) : (
          <EmptyState icon={AlertCircle} title="Billing terms could not be loaded" description="This is not a statement that none are set." />
        )}
        {/* A role that sees Baselinq's fees or invoices but not the terms (the
            Employer) still gets them here — the Financial Position's "All fees
            and invoices" link lands on this page. Each section gates itself. */}
        {refused && <BaselinqBilling />}
      </PageBody>
    );
  }

  if (isLoading || !form) {
    return (
      <PageBody>
        <PageHeader title="Billing" reference={GUIDE_LINK} />
        <AwesomeLoader message="Loading billing terms" />
      </PageBody>
    );
  }

  return (
    <PageBody width="prose">
      <PageHeader
        title="Billing"
        description="What Baselinq charges on this project, and who it is charged to."
        reference={GUIDE_LINK}
        meta={
          form.configured ? (
            <Badge variant={form.enabled ? "success" : "neutral"}>{form.enabled ? "Active" : "Switched off"}</Badge>
          ) : (
            <Badge variant="warning">Not configured</Badge>
          )
        }
        actions={
          user?.is_superuser ? (
            <Button variant="outline" size="sm" onClick={() => navigate(`/account/admin/billing/projects/${projectId}`)}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Manage in Admin Panel
            </Button>
          ) : undefined
        }
      />

      {!form.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm text-amber-900">Billing has not been set up on this project, so nothing is being charged.</p>
          <p className="text-xs text-amber-800 mt-1">The figures below are the standard terms it would take once Baselinq switches it on.</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {row(
          "Platform fee",
          ratePct(form.feeRatePct),
          form.rateSource === "negotiated"
            ? "Negotiated for this project. Charged on the value certified, excluding VAT."
            : "Baselinq's standard rate. Charged on the value certified, excluding VAT.",
        )}
        {row("VAT on the fee", `${form.vatRatePct}%`, "Added to the fee. Fixed by law.")}
        {row("Charged on", FEE_BASE_LABEL[form.feeBase] ?? form.feeBase, "Each rand is charged once — a variation already charged is not charged again inside a certificate.")}
        {row("Cap", form.capAmount !== null ? formatZAR(form.capAmount) : "No cap", form.capAmount === null ? "Fees accrue without a ceiling on this project." : "The most this project is ever charged, excluding VAT.")}
        {/* The hint said what the row MEANS, except when an email was set, at
            which point the email took the hint's place and the explanation
            disappeared. One slot, one meaning: the address goes inside the
            sentence that explains what it is for. */}
        {row(
          "Billed to",
          form.billingContactName || "Not set",
          form.billingContactEmail
            ? `Invoices are emailed to ${form.billingContactEmail}.`
            : "No billing email is set, so invoices are shown in-app only.",
        )}
        {row("Invoices", "Below", "Each fee and invoice on this project, and what has been paid.")}
      </div>

      <p className="text-xs text-muted-foreground">
        These terms are set by Baselinq. To change them, contact your Baselinq account manager.
      </p>

      {/* Baselinq's charges and invoices, moved here from a Finance tab: they
          are Baselinq's bill to its customer, not the project's money. The
          component gates each section on its own code (and opens both to
          Baselinq staff). */}
      <BaselinqBilling />
    </PageBody>
  );
};

export default Billing;
