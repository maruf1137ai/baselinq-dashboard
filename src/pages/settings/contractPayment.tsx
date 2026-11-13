/**
 * Settings → Contract & payment.
 *
 * The contract's payment machinery and the parties a tax invoice names, on
 * one page. Each piece already had a home on the server and none had a
 * screen, so every project ran on its contract form's defaults: due dates
 * counted from the certificate date because nobody could enter the date for
 * issue, GCC's "payment subject to a tax invoice" was invisible, and Baselinq
 * invoices went out without the employer's VAT number.
 *
 *   Payment terms      PUT  projects/<id>/payment-terms/   (finance.edit)
 *   Progress check     PATCH projects/<id>/risk-policy/    (risk administrators)
 *   Parties            GET  projects/<id>/billing-parties/ (finance.view)
 *                      PATCH projects/<id>/  client_details / appointed_company (project.edit)
 *
 * A blank field means "the contract form's default", and says what that is.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileText, HelpCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useFetch from "@/hooks/useFetch";
import { usePermissions } from "@/hooks/usePermissions";
import { updatePaymentTerms, updateProject, updateRiskPolicy } from "@/lib/Api";
import { CONTRACT_FORMS } from "@/lib/contractForms";

interface Terms {
  contractForm: string;
  paymentDays: number | null;
  unit: string;
  interestBasis: string;
  interestMarginPct: string | null;
  fixedInterestRatePct: string | null;
  configured: boolean;
  provenance: string;
  defaulted: string[];
  certificateIssueDay: number | null;
  invoiceRequiredForPayment: boolean;
}

interface RiskPolicy {
  valuation_basis: string;
  pc_gate_mode: string;
  blocking_permitted?: boolean;
}

interface Party {
  role: "employer" | "contractor";
  name: string;
  registrationNumber: string;
  vatNumber: string;
  address: string;
  contactName: string;
  email: string;
  missing: string[];
}

interface Parties {
  employer: Party;
  contractor: Party;
  readyForTaxInvoices: boolean;
}

const INTEREST_BASES: Record<string, string> = {
  repo_plus_margin: "Repo rate plus margin",
  fixed: "Fixed annual rate",
  none: "No contractual interest",
};

/** The finance guide, beside the title on every state of this page. */
const GUIDE_LINK = (
  <Link
    to="/help/finance"
    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    <HelpCircle className="h-4 w-4" />
    Finance reference
  </Link>
);

/** "default" stands for null: the contract form's own value. */
type Tri = "default" | "yes" | "no";

interface TermsForm {
  contractForm: string;
  paymentDays: string;
  unit: string;
  certificateIssueDay: string;
  invoiceRule: Tri;
  interestBasis: string;
  interestMarginPct: string;
  fixedInterestRatePct: string;
}

const isDefaulted = (t: Terms, field: string) => t.defaulted.includes(field);

function formFromTerms(t: Terms): TermsForm {
  return {
    contractForm: t.contractForm,
    paymentDays: isDefaulted(t, "paymentDays") || t.paymentDays == null ? "" : String(t.paymentDays),
    unit: t.unit,
    certificateIssueDay: t.certificateIssueDay == null ? "" : String(t.certificateIssueDay),
    invoiceRule: isDefaulted(t, "invoiceRequiredForPayment") ? "default" : t.invoiceRequiredForPayment ? "yes" : "no",
    interestBasis: t.interestBasis,
    interestMarginPct: isDefaulted(t, "interestMarginPct") ? "" : (t.interestMarginPct ?? ""),
    fixedInterestRatePct: t.fixedInterestRatePct ?? "",
  };
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export default function ContractPayment() {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const queryClient = useQueryClient();
  const { canEditFinance, canEditProject } = usePermissions();

  const termsKey = projectId ? `projects/${projectId}/payment-terms/` : "";
  const policyKey = projectId ? `projects/${projectId}/risk-policy/` : "";
  const partiesKey = projectId ? `projects/${projectId}/billing-parties/` : "";
  const projectKey = projectId ? `projects/${projectId}/` : "";

  const terms = useFetch<Terms>(termsKey, { enabled: !!projectId });
  const policy = useFetch<RiskPolicy>(policyKey, { enabled: !!projectId });
  const parties = useFetch<Parties>(partiesKey, { enabled: !!projectId });
  const project = useFetch<any>(projectKey, { enabled: !!projectId });

  const [form, setForm] = useState<TermsForm | null>(null);
  const [savingTerms, setSavingTerms] = useState(false);
  useEffect(() => {
    if (terms.data) setForm(formFromTerms(terms.data));
  }, [terms.data]);

  if (!projectId) {
    return (
      <PageBody>
        <PageHeader title="Contract & payment" reference={GUIDE_LINK} />
        <EmptyState icon={FileText} title="No project selected" description="Choose a project to set its payment terms." />
      </PageBody>
    );
  }

  if (terms.isError && !terms.data) {
    const refused = Number((terms.error as { status?: number } | null)?.status) === 403;
    return (
      <PageBody>
        <PageHeader title="Contract & payment" reference={GUIDE_LINK} />
        {refused ? (
          <EmptyState
            icon={Lock}
            title="Payment terms are not visible to your role"
            description="Only people with finance access on this project can see them."
          />
        ) : (
          <EmptyState icon={AlertCircle} title="Payment terms could not be loaded" description="This is not a statement that none are set." />
        )}
      </PageBody>
    );
  }

  if (terms.isLoading || !terms.data || !form) {
    return (
      <PageBody>
        <PageHeader title="Contract & payment" reference={GUIDE_LINK} />
        <AwesomeLoader message="Loading payment terms" />
      </PageBody>
    );
  }

  const t = terms.data;
  const set = <K extends keyof TermsForm>(key: K, value: TermsForm[K]) => setForm({ ...form, [key]: value });
  const defaultInvoiceRule = t.contractForm === "gcc" ? "Yes" : "No";

  const saveTerms = async () => {
    setSavingTerms(true);
    try {
      await updatePaymentTerms(projectId, {
        contractForm: form.contractForm,
        paymentDays: form.paymentDays.trim() === "" ? null : Number(form.paymentDays),
        paymentDaysUnit: form.unit,
        certificateIssueDay: form.certificateIssueDay.trim() === "" ? null : Number(form.certificateIssueDay),
        invoiceRequiredForPayment: form.invoiceRule === "default" ? null : form.invoiceRule === "yes",
        interestBasis: form.interestBasis,
        interestMarginPct: form.interestMarginPct.trim() === "" ? null : form.interestMarginPct,
        fixedInterestRatePct: form.fixedInterestRatePct.trim() === "" ? null : form.fixedInterestRatePct,
      });
      toast.success("Payment terms saved");
      await queryClient.invalidateQueries({ queryKey: [termsKey] });
      // Due dates on every certificate read these terms.
      queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/payments/`] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment terms could not be saved");
    } finally {
      setSavingTerms(false);
    }
  };

  return (
    <PageBody width="prose">
      <PageHeader
        title="Contract & payment"
        description="When certificates are due, when they must be paid, and who the tax invoices name."
        reference={GUIDE_LINK}
        meta={
          t.configured ? (
            <Badge variant="success">Set for this project</Badge>
          ) : (
            <Badge variant="warning">Using {CONTRACT_FORMS[t.contractForm] ?? t.contractForm} defaults</Badge>
          )
        }
      />

      <Section
        title="Payment terms"
        description="Blank fields use the contract form's default. Changes apply to every certificate's due date."
      >
        <fieldset disabled={!canEditFinance} className="grid gap-5 sm:grid-cols-2">
          <Field id="ct-form" label="Contract form" hint={t.provenance}>
            <Select value={form.contractForm} onValueChange={(v) => set("contractForm", v)}>
              <SelectTrigger id="ct-form" aria-describedby="ct-form-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTRACT_FORMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            id="ct-issue-day"
            label="Certificate issue day"
            hint="The date for issue in the contract data, as a day of the month (31 = last day). New certificates take this day of their valuation month, and the payment period runs from it."
          >
            <Input
              id="ct-issue-day"
              inputMode="numeric"
              placeholder="Not set"
              value={form.certificateIssueDay}
              onChange={(e) => set("certificateIssueDay", e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              aria-describedby="ct-issue-day-hint"
            />
          </Field>

          <Field
            id="ct-days"
            label="Payment period"
            hint={isDefaulted(t, "paymentDays") ? "Blank uses the contract form's period." : undefined}
          >
            <div className="flex gap-2">
              <Input
                id="ct-days"
                inputMode="numeric"
                className="w-28"
                placeholder={t.paymentDays != null ? String(t.paymentDays) : "Required"}
                value={form.paymentDays}
                onChange={(e) => set("paymentDays", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                aria-describedby="ct-days-hint"
              />
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger className="w-40" aria-label="Day type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">calendar days</SelectItem>
                  <SelectItem value="working">working days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>

          <Field
            id="ct-invoice"
            label="Tax invoice required before payment"
            hint="GCC 2015 makes payment subject to the contractor's tax invoice; JBCC does not, so a missing invoice never stops the JBCC payment clock."
          >
            <Select value={form.invoiceRule} onValueChange={(v) => set("invoiceRule", v as Tri)}>
              <SelectTrigger id="ct-invoice" aria-describedby="ct-invoice-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Contract form's default ({defaultInvoiceRule})</SelectItem>
                <SelectItem value="yes">Yes — payment is subject to the tax invoice</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field id="ct-interest" label="Late-payment interest">
            <Select value={form.interestBasis} onValueChange={(v) => set("interestBasis", v)}>
              <SelectTrigger id="ct-interest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INTEREST_BASES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {form.interestBasis === "repo_plus_margin" && (
            <Field id="ct-margin" label="Margin above repo (percentage points)">
              <Input
                id="ct-margin"
                inputMode="decimal"
                placeholder={t.interestMarginPct ?? "6"}
                value={form.interestMarginPct}
                onChange={(e) => set("interestMarginPct", e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </Field>
          )}
          {form.interestBasis === "fixed" && (
            <Field id="ct-fixed" label="Fixed rate (% per year)">
              <Input
                id="ct-fixed"
                inputMode="decimal"
                value={form.fixedInterestRatePct}
                onChange={(e) => set("fixedInterestRatePct", e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </Field>
          )}
        </fieldset>
        {canEditFinance ? (
          <div className="mt-6 flex justify-end">
            <Button onClick={saveTerms} disabled={savingTerms}>
              {savingTerms ? "Saving…" : "Save payment terms"}
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Changing payment terms needs the finance edit permission.</p>
        )}
      </Section>

      <ProgressCheck projectId={projectId} policyKey={policyKey} policy={policy.data} isError={policy.isError} />

      <PartiesSection
        projectId={projectId}
        parties={parties.data}
        partiesKey={partiesKey}
        projectKey={projectKey}
        rawProject={project.data}
        canEdit={canEditProject}
        isError={parties.isError && !parties.data}
      />
    </PageBody>
  );
}

/**
 * Whether a certificate may claim ahead of measured progress. Measured progress
 * is the JBCC default and can only warn — blocking a certificate there would
 * withhold money the contractor is entitled to. Only an agreed stage-payment
 * schedule may block.
 */
function ProgressCheck({
  projectId,
  policyKey,
  policy,
  isError,
}: {
  projectId: string;
  policyKey: string;
  policy?: RiskPolicy;
  isError: boolean;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const save = async (patch: Partial<RiskPolicy>) => {
    setSaving(true);
    try {
      await updateRiskPolicy(projectId, patch);
      await queryClient.invalidateQueries({ queryKey: [policyKey] });
      toast.success("Progress check saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Progress check could not be saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title="Certificate progress check"
      description="Compares what a certificate claims with the progress recorded on its linked programme phases."
    >
      {isError && !policy ? (
        <p className="text-sm text-muted-foreground">The progress check settings could not be loaded.</p>
      ) : !policy ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="pc-basis" label="How certificates are valued">
            <Select
              value={policy.valuation_basis}
              onValueChange={(v) =>
                save({
                  valuation_basis: v,
                  // Measured progress may only warn; drop a block with it.
                  ...(v === "measured_progress" && policy.pc_gate_mode === "block" ? { pc_gate_mode: "advisory" } : {}),
                })
              }
              disabled={saving}
            >
              <SelectTrigger id="pc-basis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="measured_progress">Measured monthly progress (JBCC default)</SelectItem>
                <SelectItem value="milestone_stage">Agreed stage or milestone payments</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="pc-mode"
            label="When a claim runs ahead of progress"
            hint={
              policy.valuation_basis === "measured_progress"
                ? "Warn only: under measured valuation, blocking would withhold money the contractor may be owed."
                : undefined
            }
          >
            <Select value={policy.pc_gate_mode} onValueChange={(v) => save({ pc_gate_mode: v })} disabled={saving}>
              <SelectTrigger id="pc-mode" aria-describedby="pc-mode-hint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Do nothing</SelectItem>
                <SelectItem value="advisory">Warn the certifier</SelectItem>
                <SelectItem value="block" disabled={policy.valuation_basis !== "milestone_stage"}>
                  Block approval
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}
    </Section>
  );
}

interface PartyDraft {
  name: string;
  registrationNumber: string;
  vatNumber: string;
  street: string;
  city: string;
  postalCode: string;
  contactName: string;
  email: string;
}

function draftFrom(raw: any): PartyDraft {
  const r = raw && typeof raw === "object" ? raw : {};
  const address = r.physical_address && typeof r.physical_address === "object" ? r.physical_address : {};
  const client = r.client && typeof r.client === "object" ? r.client : {};
  return {
    name: r.company_name || r.name || "",
    registrationNumber: r.company_registration || r.registration || "",
    vatNumber: r.vat_number || r.vat || "",
    street: address.street || "",
    city: address.city || "",
    postalCode: address.postal_code || "",
    contactName: client.name || r.contact || "",
    email: client.email || r.email || "",
  };
}

/**
 * The draft merged back into the project's JSON in the create-project shape,
 * keeping every key this form does not own (the PATCH replaces the field).
 */
function mergeParty(raw: any, d: PartyDraft, role: Party["role"]) {
  const r = raw && typeof raw === "object" ? raw : {};
  const merged: Record<string, unknown> = {
    ...r,
    company_name: d.name,
    company_registration: d.registrationNumber,
    vat_number: d.vatNumber,
    physical_address: { ...(r.physical_address ?? {}), street: d.street, city: d.city, postal_code: d.postalCode },
  };
  if (role === "employer") {
    merged.client = { ...(r.client ?? {}), name: d.contactName, email: d.email };
  } else {
    merged.contact = d.contactName;
    merged.email = d.email;
  }
  return merged;
}

function PartiesSection({
  projectId,
  parties,
  partiesKey,
  projectKey,
  rawProject,
  canEdit,
  isError,
}: {
  projectId: string;
  parties?: Parties;
  partiesKey: string;
  projectKey: string;
  rawProject?: any;
  canEdit: boolean;
  isError: boolean;
}) {
  return (
    <Section
      title="Employer and contractor"
      description="Who the contractor's and Baselinq's tax invoices name."
    >
      <p className="mb-4 text-xs text-muted-foreground">
        A tax invoice over R5,000 must carry each party's name and address, the supplier's VAT
        number, and the recipient's VAT number where they are registered (VAT Act s20(4)).
      </p>
      {isError ? (
        <p className="text-sm text-muted-foreground">The party details could not be loaded.</p>
      ) : !parties ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <p
            className={`flex items-center gap-1.5 text-sm ${parties.readyForTaxInvoices ? "text-green-700" : "text-amber-800"}`}
            role="status"
          >
            {parties.readyForTaxInvoices ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {parties.readyForTaxInvoices
              ? "Both parties have what a tax invoice needs."
              : "Tax invoices on this project are not yet valid. Complete the details marked below."}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {(["employer", "contractor"] as const).map((role) => (
              <PartyCard
                key={role}
                role={role}
                party={parties[role]}
                raw={role === "employer" ? (rawProject?.clientDetails ?? rawProject?.client_details) : (rawProject?.appointedCompany ?? rawProject?.appointed_company)}
                projectId={projectId}
                partiesKey={partiesKey}
                projectKey={projectKey}
                canEdit={canEdit && !!rawProject}
              />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function PartyCard({
  role,
  party,
  raw,
  projectId,
  partiesKey,
  projectKey,
  canEdit,
}: {
  role: Party["role"];
  party: Party;
  raw: any;
  projectId: string;
  partiesKey: string;
  projectKey: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PartyDraft>(() => draftFrom(raw));
  const [saving, setSaving] = useState(false);
  const title = role === "employer" ? "Employer (client)" : "Contractor";
  const field = role === "employer" ? "client_details" : "appointed_company";

  const save = async () => {
    setSaving(true);
    try {
      await updateProject({ id: projectId, [field]: mergeParty(raw, draft, role) } as any);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [partiesKey] }),
        queryClient.invalidateQueries({ queryKey: [projectKey] }),
      ]);
      toast.success(`${title} details saved`);
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Details could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const input = (key: keyof PartyDraft, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`${role}-${key}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`${role}-${key}`}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    </div>
  );

  const line = (label: string, value: string, required = false) => (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={value ? "text-foreground text-right" : required ? "text-amber-800" : "text-muted-foreground"}>
        {value || (required ? "Missing" : "—")}
      </dd>
    </div>
  );

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {party.missing.length === 0 ? (
          <Badge variant="success">Complete</Badge>
        ) : (
          <Badge variant="warning">{party.missing.length} missing</Badge>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          {input("name", "Company name")}
          <div className="grid gap-3 sm:grid-cols-2">
            {input("registrationNumber", "Registration number")}
            {input("vatNumber", "VAT number")}
          </div>
          {input("street", "Street address")}
          <div className="grid gap-3 sm:grid-cols-2">
            {input("city", "City")}
            {input("postalCode", "Postal code")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {input("contactName", "Contact person")}
            {input("email", "Billing email")}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <dl className="space-y-1.5">
            {line("Company", party.name, true)}
            {line("Registration", party.registrationNumber)}
            {line("VAT number", party.vatNumber, true)}
            {line("Address", party.address, true)}
            {line("Contact", [party.contactName, party.email].filter(Boolean).join(" · "))}
          </dl>
          {canEdit && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(draftFrom(raw));
                  setEditing(true);
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
