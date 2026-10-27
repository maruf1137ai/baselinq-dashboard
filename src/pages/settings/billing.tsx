/**
 * Settings → Billing — the project's billing terms.
 *
 * ── Why this replaced a placeholder ──────────────────────────────────────
 *
 * `ProjectFeeConfig` had no write surface anywhere: no serializer, no view,
 * no URL, and this page was `<UpcomingFeature />`. Switching billing on for a
 * project meant a superuser opening Django admin and hand-creating a row, per
 * project. And because `reconcile_all` only iterates projects that already
 * hold an enabled config, a project nobody remembered to configure was
 * invisible to every check in the system — it accrued nothing, reported
 * nothing, and looked exactly like a project that had genuinely earned no fee.
 *
 * ── Two audiences, one screen ────────────────────────────────────────────
 *
 * A customer sees their terms, read-only. That is the point: the terms are
 * not negotiable from inside the project, and a clear statement of what you
 * are signed up to is worth more here than an editable form. Baselinq staff
 * get the same screen with the fields unlocked.
 *
 * The gate is `useIsPlatformStaff`, matching the server — writing is
 * `is_staff or is_superuser`, deliberately outside the permission matrix. The
 * invoice screen learned this the expensive way: it gated on a project
 * permission and showed customers controls the server then refused.
 *
 * ── The one refusal worth knowing about ──────────────────────────────────
 *
 * Saving with billing enabled and no VAT rate is refused by the server, and
 * this screen says so before you try. `vat_rate_pct` is nullable and falls
 * back to the project's rate, which defaults to zero — so the quiet failure
 * mode was a numbered tax invoice carrying R0.00 VAT, on which the 15% is
 * still owed and cannot be recovered once issued.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Lock, Receipt } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { putData } from "@/lib/Api";
import { formatZAR } from "@/lib/formatCurrency";
import useFetch from "@/hooks/useFetch";
import { useIsPlatformStaff } from "@/hooks/usePermission";
import { billingDraftErrors, type BillingDraft } from "@/lib/billingTerms";
import { retryUnlessRefused } from "@/lib/queryRetry";

/** Mirrors billing/serializers.py::serialize_fee_config. */
interface FeeConfig {
  configured: boolean;
  enabled: boolean;
  feeBase: string;
  feeRatePct: number;
  vatRatePct: number;
  capAmount: number | null;
  billingContactName: string;
  billingContactEmail: string;
  updatedAt?: string | null;
}

const FEE_BASE_LABEL: Record<string, string> = {
  both: "Payment certificates and variation orders",
  pc_only: "Payment certificates only",
  vo_only: "Variation orders only",
};

/** The server returns {error, code}; only one path sets detail. */
function serverReason(e: any, fallback: string): string {
  const d = e?.response?.data;
  return d?.error || d?.detail || d?.message || e?.message || fallback;
}

const toText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

const Billing = () => {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const numericProjectId = projectId ? Number(projectId) : undefined;
  const isStaff = useIsPlatformStaff(numericProjectId);
  const qc = useQueryClient();

  const key = projectId ? `billing/projects/${projectId}/fee-config/` : "";
  const { data, isLoading, isError, error } = useFetch<FeeConfig>(key, {
    enabled: !!projectId,
    retry: retryUnlessRefused,
  });

  const [form, setForm] = useState<FeeConfig | null>(null);
  const [draft, setDraft] = useState<BillingDraft>({ rate: "", vat: "", cap: "" });
  const [saving, setSaving] = useState(false);

  // The server's values are the truth; the form is a draft of them.
  useEffect(() => {
    if (data) {
      setForm(data);
      setDraft({ rate: toText(data.feeRatePct), vat: toText(data.vatRatePct), cap: toText(data.capAmount) });
    }
  }, [data]);

  const errors = form ? billingDraftErrors(draft, form.enabled) : {};
  const hasErrors = Object.keys(errors).length > 0;

  const save = async () => {
    if (!form || hasErrors) return;
    setSaving(true);
    try {
      await putData({
        url: key,
        data: {
          enabled: form.enabled,
          feeBase: form.feeBase,
          feeRatePct: draft.rate.trim(),
          vatRatePct: draft.vat.trim(),
          capAmount: draft.cap.trim() === "" ? null : draft.cap.trim(),
          billingContactName: form.billingContactName,
          billingContactEmail: form.billingContactEmail,
        },
      });
      toast.success("Billing terms saved");
      qc.invalidateQueries({ queryKey: [key] });
    } catch (e: any) {
      toast.error(serverReason(e, "The billing terms could not be saved"));
    } finally {
      setSaving(false);
    }
  };

  const row = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="flex items-start justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0 text-sm text-foreground tabular-nums">{value}</div>
    </div>
  );

  if (!projectId) {
    return (
      <PageBody>
        <PageHeader title="Billing" />
        <EmptyState
          icon={Receipt}
          title="No project selected"
          description="Choose a project to see its billing terms."
        />
      </PageBody>
    );
  }

  // The error is checked BEFORE the loader. `form` stays null when the read
  // fails, and the loader's `!form` used to win — a role the server refuses
  // (settings.view without finance access) watched "Loading billing terms"
  // forever (QA BUG-11).
  if (isError) {
    const refused = Number((error as any)?.status) === 403;
    return (
      <PageBody>
        <PageHeader title="Billing" />
        {refused ? (
          <EmptyState
            icon={Lock}
            title="Billing terms are not visible to your role"
            description="Only people with finance access on this project can see them — ask a project administrator."
          />
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="Billing terms could not be loaded"
            description="This is not a statement that none are set."
          />
        )}
      </PageBody>
    );
  }

  if (isLoading || !form) {
    return (
      <PageBody>
        <PageHeader title="Billing" />
        <AwesomeLoader message="Loading billing terms" />
      </PageBody>
    );
  }

  const fieldError = (key: keyof BillingDraft) =>
    errors[key] ? <p className="text-xs text-red-600 mt-1 text-right">{errors[key]}</p> : null;

  return (
    <PageBody width="prose">
      <PageHeader
        title="Billing"
        description="What Baselinq charges on this project, and who it is charged to."
        meta={
          form.configured ? (
            <Badge variant={form.enabled ? "success" : "neutral"}>
              {form.enabled ? "Active" : "Switched off"}
            </Badge>
          ) : (
            <Badge variant="warning">Not configured</Badge>
          )
        }
      />

      {/*
        A project with no config accrues nothing. That is the single most
        important thing this screen can say — everywhere else in the product
        it is indistinguishable from a project that genuinely earned no fee.
      */}
      {!form.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm text-amber-900">
            Billing has never been set up on this project, so nothing has accrued.
          </p>
          <p className="text-xs text-amber-800 mt-1">
            The figures below are the defaults it would take, not terms anyone has agreed.
            {isStaff ? " Save them to switch billing on." : ""}
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {isStaff ? (
          <>
            {row(
              "Fee rate",
              <div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    aria-label="Fee rate"
                    aria-invalid={!!errors.rate}
                    className="h-8 w-24 text-right"
                    value={draft.rate}
                    onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                {fieldError("rate")}
              </div>,
              "Of certified value, per the revenue model.",
            )}
            {row(
              "VAT rate",
              <div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    aria-label="VAT rate"
                    aria-invalid={!!errors.vat}
                    className="h-8 w-24 text-right"
                    value={draft.vat}
                    onChange={(e) => setDraft({ ...draft, vat: e.target.value })}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                {fieldError("vat")}
              </div>,
              "Baselinq's VAT on its own fee. It does not follow the construction contract's rate, and billing cannot be switched on at 0%.",
            )}
            {row(
              "Cap",
              <div>
                <Input
                  type="number"
                  aria-label="Cap"
                  aria-invalid={!!errors.cap}
                  className="h-8 w-36 text-right"
                  placeholder="No cap"
                  value={draft.cap}
                  onChange={(e) => setDraft({ ...draft, cap: e.target.value })}
                />
                {fieldError("cap")}
              </div>,
              "The most this project can ever be charged. Empty means uncapped.",
            )}
            {row(
              "Billed to",
              <div className="space-y-1.5">
                <Input
                  className="h-8 w-64"
                  placeholder="Name"
                  value={form.billingContactName}
                  onChange={(e) => setForm({ ...form, billingContactName: e.target.value })}
                />
                <Input
                  className="h-8 w-64"
                  placeholder="Email"
                  value={form.billingContactEmail}
                  onChange={(e) => setForm({ ...form, billingContactEmail: e.target.value })}
                />
              </div>,
              "Whoever carries the fee on this project — client, contractor or consultant.",
            )}
            {row(
              "Billing active",
              <Button
                size="xs"
                variant={form.enabled ? "default" : "outline"}
                onClick={() => setForm({ ...form, enabled: !form.enabled })}
              >
                {form.enabled ? "On" : "Off"}
              </Button>,
              "While off, nothing accrues on this project at all.",
            )}
          </>
        ) : (
          <>
            {row("Fee rate", `${form.feeRatePct}%`, "Of certified value.")}
            {row("VAT", `${form.vatRatePct}%`)}
            {row(
              "Cap",
              form.capAmount !== null ? formatZAR(form.capAmount) : "No cap",
              form.capAmount === null
                ? "Fees accrue without a ceiling on this project."
                : undefined,
            )}
            {row("Charged on", FEE_BASE_LABEL[form.feeBase] ?? form.feeBase)}
            {row(
              "Billed to",
              form.billingContactName || "Not set",
              form.billingContactEmail || undefined,
            )}
          </>
        )}
      </div>

      {isStaff && (
        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-muted-foreground mr-auto">
            Changing the rate does not re-price anything already charged — every fee keeps the
            rate it was raised at.
          </p>
          <Button size="sm" onClick={save} disabled={saving || hasErrors}>
            {saving ? "Saving…" : "Save billing terms"}
          </Button>
        </div>
      )}
    </PageBody>
  );
};

export default Billing;
