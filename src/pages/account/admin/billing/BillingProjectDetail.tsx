/**
 * One project's billing, managed by a superuser who need not be on the project
 * (the server lets Baselinq administrators reach every project's billing).
 *
 * Terms: on/off, the rate — platform default or negotiated within 0.5–1% —
 * the cap and who is billed. A rate change needs a reason; it is logged and
 * only affects fees raised from then on. VAT is 15% and is not editable.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { InvoiceStatusBadge } from "@/components/billing/InvoiceDetail";
import useFetch from "@/hooks/useFetch";
import { type Paged, usePagedFetch } from "@/hooks/usePagedFetch";
import { Pager } from "@/components/ui/pager";
import { putData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";
import {
  type FeeChargeRow,
  type Invoice,
  VAT_RATE_PCT,
  money,
  ratePct,
  serverReason,
} from "@/lib/platformBilling";
import { AdminPage, ErrorNotice, SectionCard, TD, TD_NUM, TH, TH_NUM } from "../adminUi";
import { ChargesTable, InvoiceDialog, useRefreshBilling } from "./billingShared";
import type { BillingProjectRow } from "./BillingProjects";

interface FeeConfig {
  configured: boolean;
  enabled: boolean;
  feeRatePct: number;
  negotiatedFeeRatePct: number | null;
  defaultFeeRatePct: number;
  minFeeRatePct: number;
  maxFeeRatePct: number;
  rateSource: "default" | "negotiated";
  capAmount: number | null;
  billingContactName: string;
  billingContactEmail: string;
  /** Staff only: a rate change below 1% still waiting for a second admin. */
  pendingRateChange?: {
    newRatePct: string | null;
    reason: string;
    requestedBy: string | null;
    requestedAt: string | null;
  } | null;
}

interface Draft {
  enabled: boolean;
  useDefault: boolean;
  rate: string;
  cap: string;
  contactName: string;
  contactEmail: string;
  reason: string;
}

function draftFrom(c: FeeConfig): Draft {
  return {
    enabled: c.configured ? c.enabled : true,
    useDefault: c.negotiatedFeeRatePct == null,
    rate: c.negotiatedFeeRatePct != null ? String(c.negotiatedFeeRatePct) : String(c.defaultFeeRatePct),
    cap: c.capAmount != null ? String(c.capAmount) : "",
    contactName: c.billingContactName,
    contactEmail: c.billingContactEmail,
    reason: "",
  };
}

const BillingProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const refresh = useRefreshBilling();

  // No refetch on focus: the form below is seeded from this, and a refetch
  // would wipe what the administrator is typing.
  const config = useFetch<FeeConfig>(`billing/projects/${projectId}/fee-config/`, { refetchOnWindowFocus: false });
  const project = useFetch<{ results: BillingProjectRow[] }>(`billing/admin/projects/?projectId=${projectId}`);
  const [chargesPage, setChargesPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const charges = usePagedFetch<Paged<FeeChargeRow>>(`billing/admin/charges/?projectId=${projectId}`, chargesPage, 10);
  const invoices = usePagedFetch<Paged<Invoice>>(`billing/admin/invoices/?projectId=${projectId}`, invoicesPage, 10);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (config.data) setDraft(draftFrom(config.data));
  }, [config.data]);

  const row = project.data?.results[0];
  const name = row ? `${row.projectName} · ${row.projectNumber}` : "Project billing";

  const c = config.data;
  const rateChanged = !!(c && draft) && (
    draft.useDefault !== (c.negotiatedFeeRatePct == null) ||
    (!draft.useDefault && Number(draft.rate) !== c.negotiatedFeeRatePct)
  );
  const rateError = draft && !draft.useDefault && c && (
    !Number.isFinite(Number(draft.rate)) || Number(draft.rate) < c.minFeeRatePct || Number(draft.rate) > c.maxFeeRatePct
  ) ? `Between ${c.minFeeRatePct}% and ${c.maxFeeRatePct}%` : "";
  const capError = draft && draft.cap.trim() !== "" && !(Number(draft.cap) >= 0) ? "A positive amount, or empty for no cap" : "";

  const save = async () => {
    if (!draft || rateError || capError || (rateChanged && !draft.reason.trim())) return;
    setSaving(true);
    try {
      const saved = (await putData({
        url: `billing/projects/${projectId}/fee-config/`,
        data: {
          enabled: draft.enabled,
          capAmount: draft.cap.trim() === "" ? null : draft.cap.trim(),
          billingContactName: draft.contactName,
          billingContactEmail: draft.contactEmail,
          ...(rateChanged
            ? { feeRatePct: draft.useDefault ? null : draft.rate, rateChangeReason: draft.reason.trim() }
            : {}),
        },
      })) as { backfilledCharges?: number; draftInvoicesAtOldRate?: number; pendingRateChange?: { message?: string } } | undefined;
      // Switching billing on also charges what was already approved.
      const backfilled = saved?.backfilledCharges ?? 0;
      if (saved?.pendingRateChange) {
        // One message, not "saved" next to "sent for approval": the rate has
        // NOT changed yet. Any other field in the form was saved with it.
        toast.info("Rate change sent for approval — the current rate stays until another admin approves it.");
      } else {
        toast.success(
          backfilled > 0
            ? `Billing switched on — ${backfilled} fee${backfilled === 1 ? "" : "s"} raised for work already approved`
            : "Billing terms saved",
        );
      }
      // A new rate applies from the next charge; drafts already built keep the old one.
      const staleDrafts = saved?.draftInvoicesAtOldRate ?? 0;
      if (staleDrafts > 0) {
        toast.warning(
          `${staleDrafts} draft invoice${staleDrafts === 1 ? " was" : "s were"} built at the old rate — cancel and re-run month end to re-bill.`,
        );
      }
      refresh();
    } catch (e) {
      toast.error(serverReason(e, "Could not save the billing terms"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title={name} description="Fee terms, every fee and every invoice for this project.">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => navigate("/account/admin/billing/projects")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        All projects
      </Button>

      {config.isLoading || !draft ? (
        config.isError ? <ErrorNotice error={config.error} /> : <div className="flex justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : (
        <SectionCard title="Fee terms" subtitle={c?.configured ? "Changes apply to fees raised from now on — nothing already charged is repriced." : "Billing has never been set up for this project. Saving switches it on — and charges any certificate or variation already approved."}>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
            {c?.pendingRateChange && (
              <div role="status" className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="font-medium">
                  {c.pendingRateChange.newRatePct != null ? ratePct(Number(c.pendingRateChange.newRatePct)) : "Standard rate"} is waiting for approval.
                </span>{" "}
                Requested by {c.pendingRateChange.requestedBy ?? "an admin"}
                {c.pendingRateChange.requestedAt ? ` on ${formatDate(c.pendingRateChange.requestedAt)}` : ""}. The current rate
                ({ratePct(c.feeRatePct)}) applies until someone else approves it in{" "}
                <button type="button" className="underline" onClick={() => navigate("/account/admin/billing/settings")}>
                  Billing settings
                </button>
                .
              </div>
            )}
            <label className="flex items-center justify-between gap-4 md:col-span-2">
              <span>
                <span className="text-sm text-foreground block">Billing active</span>
                <span className="text-xs text-muted-foreground">While off, nothing on this project is charged.</span>
              </span>
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Fee rate</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={draft.useDefault ? "default" : "outline"} onClick={() => setDraft({ ...draft, useDefault: true })}>
                  Standard {ratePct(c?.defaultFeeRatePct)}
                </Button>
                <Button type="button" size="sm" variant={!draft.useDefault ? "default" : "outline"} onClick={() => setDraft({ ...draft, useDefault: false })}>
                  Negotiated
                </Button>
              </div>
              {!draft.useDefault && (
                <div className="relative">
                  <Input type="number" step="0.05" min={c?.minFeeRatePct} max={c?.maxFeeRatePct} value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} className="pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              )}
              {rateError && <p className="text-xs text-destructive">{rateError}</p>}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">VAT on the fee</span>
              <Input value={`${VAT_RATE_PCT}%`} disabled />
              <p className="text-xs text-muted-foreground">Fixed by law — not editable.</p>
            </div>

            {rateChanged && (
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-xs text-muted-foreground">Why is the rate changing? (kept in the rate history)</span>
                <Textarea value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="e.g. Negotiated 0.75% in the signed agreement of 12 Nov" />
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Cap (lifetime fee, excl. VAT)</span>
              <Input value={draft.cap} onChange={(e) => setDraft({ ...draft, cap: e.target.value })} placeholder="No cap" inputMode="decimal" />
              {capError && <p className="text-xs text-destructive">{capError}</p>}
            </div>
            <div />

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Billed to — name</span>
              <Input value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Client or company name" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Billed to — email (invoices are emailed here)</span>
              <Input type="email" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} placeholder="accounts@client.co.za" />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button size="sm" onClick={save} disabled={saving || !!rateError || !!capError || (rateChanged && !draft.reason.trim())}>
                {saving ? "Saving…" : c?.configured ? "Save terms" : "Switch billing on"}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Invoices" subtitle="Open one to issue it, mark it paid or cancel it.">
        {invoices.isError ? (
          <div className="p-6"><ErrorNotice error={invoices.error} /></div>
        ) : !invoices.data?.results.length ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No invoices yet — month end builds them.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: "Invoice" },
                  { label: "Fees up to" },
                  { label: "Fee", numeric: true },
                  { label: "VAT", numeric: true },
                  { label: "Total", numeric: true },
                  { label: "Due" },
                  { label: "Status" },
                ].map((h) => <th key={h.label} className={h.numeric ? TH_NUM : TH}>{h.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {invoices.data.results.map((inv) => (
                <tr key={inv.id} onClick={() => setOpenInvoice(inv)} className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50">
                  <td className={TD}>{inv.invoiceNumber || "Draft"}</td>
                  <td className={TD}>{formatDate(inv.periodEnd, "long")}</td>
                  <td className={TD_NUM}>{money(inv.subtotal)}</td>
                  <td className={TD_NUM}>{money(inv.vatAmount)}</td>
                  <td className={TD_NUM}>{money(inv.totalAmount)}</td>
                  <td className={TD}>{inv.dueOn ? formatDate(inv.dueOn, "long") : "—"}</td>
                  <td className={TD}><InvoiceStatusBadge invoice={inv} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {invoices.data && (
          <Pager
            page={invoices.data.page}
            pageSize={invoices.data.pageSize}
            count={invoices.data.count}
            totalPages={invoices.data.totalPages}
            onPage={setInvoicesPage}
            loading={invoices.isPaging}
          />
        )}
      </SectionCard>

      <SectionCard title="Fees" subtitle={`${charges.data?.count ?? 0} fees on this project, newest first.`}>
        {charges.isError ? (
          <div className="p-6"><ErrorNotice error={charges.error} /></div>
        ) : !charges.data?.results.length ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">No fees yet. They appear when a payment certificate is posted or a variation is approved.</p>
        ) : (
          <ChargesTable charges={charges.data.results} />
        )}
        {charges.data && (
          <Pager
            page={charges.data.page}
            pageSize={charges.data.pageSize}
            count={charges.data.count}
            totalPages={charges.data.totalPages}
            onPage={setChargesPage}
            loading={charges.isPaging}
          />
        )}
      </SectionCard>

      <InvoiceDialog invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </AdminPage>
  );
};

export default BillingProjectDetail;
