/**
 * Baselinq's own billing settings: the standard rate every project follows
 * unless it negotiated its own, payment terms, and the details a South African
 * tax invoice must carry. VAT (15%) is shown, never edited.
 */
import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import useFetch from "@/hooks/useFetch";
import { type Paged, usePagedFetch } from "@/hooks/usePagedFetch";
import { Pager } from "@/components/ui/pager";
import { postData, putData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";
import { ratePct, serverReason } from "@/lib/platformBilling";
import { AdminPage, ErrorNotice, SectionCard, TD, TH } from "../adminUi";
import { useRefreshBilling } from "./billingShared";

interface RateChange {
  id: number;
  projectName: string | null;
  oldRatePct: number | null;
  newRatePct: number | null;
  reason: string;
  changedBy: string | null;
  changedAt: string;
  status?: "applied" | "pending" | "approved" | "rejected";
  decidedBy?: string | null;
  decisionNote?: string | null;
}

/** Applied and approved changes took effect; pending and rejected ones did not. */
function RateStatus({ c }: { c: RateChange }) {
  if (c.status === "pending") return <Badge variant="warning">Awaiting approval</Badge>;
  if (c.status === "rejected") {
    return (
      <span className="space-y-0.5">
        <Badge variant="danger">Rejected — not applied</Badge>
        {(c.decidedBy || c.decisionNote) && (
          <span className="block text-xs text-muted-foreground whitespace-normal">
            {c.decidedBy ? `By ${c.decidedBy}` : ""}
            {c.decidedBy && c.decisionNote ? ": " : ""}
            {c.decisionNote ?? ""}
          </span>
        )}
      </span>
    );
  }
  if (c.status === "approved") {
    return (
      <span className="space-y-0.5">
        <Badge variant="success">Approved</Badge>
        {c.decidedBy && <span className="block text-xs text-muted-foreground">By {c.decidedBy}</span>}
      </span>
    );
  }
  return <Badge variant="neutral">Applied</Badge>;
}

interface PendingRate {
  id: number;
  projectName: string | null;
  oldRatePct: string | null;
  newRatePct: string | null;
  reason: string;
  requestedBy: string | null;
  requestedAt: string;
}

interface Settings {
  defaultFeeRatePct: number;
  minFeeRatePct: number;
  maxFeeRatePct: number;
  vatRatePct: number;
  paymentTermsDays: number;
  legalName: string;
  vatNumber: string;
  registrationNumber: string;
  address: string;
  billingEmail: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankSwiftCode: string;
  missingInvoiceDetails: string[];
  rateChanges: RateChange[];
}

type Form = Omit<Settings, "minFeeRatePct" | "maxFeeRatePct" | "vatRatePct" | "missingInvoiceDetails" | "rateChanges" | "defaultFeeRatePct" | "paymentTermsDays"> & {
  defaultFeeRatePct: string;
  paymentTermsDays: string;
  rateChangeReason: string;
};

const SUPPLIER_FIELDS: { key: keyof Form; label: string; wide?: boolean; required?: boolean }[] = [
  { key: "legalName", label: "Legal name", required: true },
  { key: "vatNumber", label: "VAT registration number", required: true },
  { key: "registrationNumber", label: "Company registration number" },
  { key: "billingEmail", label: "Billing email" },
  { key: "address", label: "Address", wide: true, required: true },
  { key: "bankName", label: "Bank" },
  { key: "bankAccountName", label: "Account name" },
  { key: "bankAccountNumber", label: "Account number" },
  { key: "bankBranchCode", label: "Branch code" },
  { key: "bankSwiftCode", label: "SWIFT / BIC" },
];

const describe = (c: RateChange) =>
  `${c.projectName ?? "Platform default"}: ${c.oldRatePct == null ? "standard" : ratePct(c.oldRatePct)} → ${c.newRatePct == null ? "standard" : ratePct(c.newRatePct)}`;

const BillingSettings = () => {
  const refresh = useRefreshBilling();
  const { data, isLoading, isError, error } = useFetch<Settings>("billing/admin/settings/", { refetchOnWindowFocus: false });
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useFetch<{ results: PendingRate[] }>("billing/admin/rate-changes/pending/", { refetchOnWindowFocus: false });
  const [deciding, setDeciding] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const history = usePagedFetch<Paged<RateChange>>("billing/admin/rate-changes/", historyPage, 10);

  // Rejecting asks for a reason in an in-app dialog. It used window.prompt,
  // which some browsers block, and an empty answer silently did nothing.
  const [rejecting, setRejecting] = useState<PendingRate | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const decide = async (c: PendingRate, decision: "approve" | "reject", note = "") => {
    setDeciding(c.id);
    try {
      await postData({ url: `billing/admin/rate-changes/${c.id}/${decision}/`, data: { note } });
      toast.success(decision === "approve" ? "Rate approved — it applies to new fees" : "Rate rejected");
      setRejecting(null);
      pending.refetch();
      refresh();
    } catch (e) {
      toast.error(serverReason(e, "Could not record the decision"));
    } finally {
      setDeciding(null);
    }
  };

  useEffect(() => {
    if (!data) return;
    setForm({
      ...data,
      defaultFeeRatePct: String(data.defaultFeeRatePct),
      paymentTermsDays: String(data.paymentTermsDays),
      rateChangeReason: "",
    });
  }, [data]);

  const rateChanged = !!form && !!data && Number(form.defaultFeeRatePct) !== data.defaultFeeRatePct;
  const rate = Number(form?.defaultFeeRatePct);
  const rateError = data && (!Number.isFinite(rate) || rate < data.minFeeRatePct || rate > data.maxFeeRatePct)
    ? `Between ${data.minFeeRatePct}% and ${data.maxFeeRatePct}%` : "";

  const save = async () => {
    if (!form || rateError || (rateChanged && !form.rateChangeReason.trim())) return;
    setSaving(true);
    try {
      const { rateChangeReason, ...fields } = form;
      const saved = (await putData({
        url: "billing/admin/settings/",
        data: { ...fields, ...(rateChanged ? { rateChangeReason: rateChangeReason.trim() } : {}) },
      })) as { pendingRateChange?: { message?: string } } | undefined;
      if (saved?.pendingRateChange) {
        toast.info("Settings saved. The new standard rate is waiting for approval — the current rate stays until another admin approves it.");
      } else {
        toast.success("Billing settings saved");
      }
      refresh();
      pending.refetch();
    } catch (e) {
      toast.error(serverReason(e, "Could not save the billing settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Billing settings" description="The standard rate, payment terms, and Baselinq's details printed on every tax invoice.">
      {isLoading || (!form && !isError) ? (
        <div className="flex items-center justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : isError || !form || !data ? (
        <ErrorNotice error={error} />
      ) : (
        <>
          {data.missingInvoiceDetails.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Invoices cannot be issued until Baselinq's legal name, VAT number and address are filled in below.
            </div>
          )}

          <SectionCard title="Rates and terms" subtitle="A new standard rate applies to new fees on every project without a negotiated rate.">
            {/* Capped: with the page width cap gone these inputs would otherwise
                stretch to ~900px on a wide monitor. page-header.tsx names this
                exact case — long settings forms read badly full-bleed. */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Standard fee rate</span>
                <div className="relative">
                  <Input type="number" step="0.05" value={form.defaultFeeRatePct} onChange={(e) => setForm({ ...form, defaultFeeRatePct: e.target.value })} className="pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                {rateError && <p className="text-xs text-destructive">{rateError}</p>}
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">VAT on the fee</span>
                <Input value={`${data.vatRatePct}%`} disabled />
                <p className="text-xs text-muted-foreground">Fixed by law — not editable.</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Payment terms (days after issue)</span>
                <Input type="number" min={1} max={365} value={form.paymentTermsDays} onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })} />
              </div>
              {rateChanged && (
                <div className="space-y-1.5 md:col-span-3">
                  <span className="text-xs text-muted-foreground">Why is the standard rate changing? (kept in the history below)</span>
                  <Textarea value={form.rateChangeReason} onChange={(e) => setForm({ ...form, rateChangeReason: e.target.value })} />
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Baselinq's invoice details" subtitle="Printed on every tax invoice and copied onto it when issued — editing these never changes an invoice already sent.">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              {SUPPLIER_FIELDS.map((f) => (
                <div key={f.key} className={`space-y-1.5 ${f.wide ? "md:col-span-2" : ""}`}>
                  <span className="text-xs text-muted-foreground">{f.label}{f.required ? " *" : ""}</span>
                  {f.wide ? (
                    <Textarea value={form[f.key] as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  ) : (
                    <Input value={form[f.key] as string} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={saving || !!rateError || (rateChanged && !form.rateChangeReason.trim())}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>

          <SectionCard title="Pending rate approvals" subtitle="A rate below 1% applies only once someone other than the requester approves it.">
            {!pending.data?.results?.length ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">Nothing waiting for approval.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Requested", "Change", "Why", "By", ""].map((h) => <th key={h} className={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pending.data.results.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className={TD}>{formatDate(c.requestedAt, "long")}</td>
                      <td className={TD}>
                        {c.projectName ?? "Platform default"}: {c.oldRatePct == null ? "standard" : `${Number(c.oldRatePct)}%`} → {Number(c.newRatePct)}%
                      </td>
                      <td className={`${TD} whitespace-normal max-w-[320px]`}>{c.reason}</td>
                      <td className={TD}>{c.requestedBy || "—"}</td>
                      <td className={`${TD} text-right space-x-2`}>
                        <Button size="sm" disabled={deciding === c.id} onClick={() => decide(c, "approve")}>Approve</Button>
                        <Button size="sm" variant="outline" disabled={deciding === c.id} onClick={() => { setRejectNote(""); setRejecting(c); }}>Reject</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          <SectionCard title="Rate history" subtitle="Every change of the standard or a negotiated rate. Fees already charged keep the rate they were charged at.">
            {!history.data ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">{history.isError ? "Could not load the rate history." : "Loading…"}</p>
            ) : history.data.results.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">No rate changes yet.</p>
            ) : (
              <table className={`w-full ${history.isPaging ? "opacity-60 transition-opacity" : ""}`}>
                <thead>
                  <tr className="border-b border-border">
                    {["When", "Change", "Status", "Why", "By"].map((h) => <th key={h} className={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {history.data.results.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-border last:border-0 ${c.status === "rejected" ? "text-muted-foreground" : ""}`}
                    >
                      <td className={TD}>{formatDate(c.changedAt, "long")}</td>
                      <td className={`${TD} ${c.status === "rejected" ? "line-through" : ""}`}>{describe(c)}</td>
                      <td className={TD}><RateStatus c={c} /></td>
                      <td className={`${TD} whitespace-normal max-w-[320px]`}>{c.reason}</td>
                      <td className={TD}>{c.changedBy || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {history.data && (
              <Pager
                page={history.data.page}
                pageSize={history.data.pageSize}
                count={history.data.count}
                totalPages={history.data.totalPages}
                onPage={setHistoryPage}
                loading={history.isPaging}
              />
            )}
          </SectionCard>
        </>
      )}
      <Dialog open={rejecting !== null} onOpenChange={(open) => { if (!open && deciding === null) setRejecting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this rate change?</DialogTitle>
            <DialogDescription>
              {rejecting
                ? `${rejecting.projectName ?? "Platform default"}: ${rejecting.newRatePct == null ? "standard" : ratePct(rejecting.newRatePct)}. The current rate stays. The reason is kept in the rate history.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1.5 block">
            <span className="text-xs text-muted-foreground">Why is it rejected?</span>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Not in the signed agreement"
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={deciding !== null} onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!rejectNote.trim() || deciding !== null}
              onClick={() => rejecting && decide(rejecting, "reject", rejectNote.trim())}
            >
              {deciding !== null ? "Rejecting…" : "Reject change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default BillingSettings;
