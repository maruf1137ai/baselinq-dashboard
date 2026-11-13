/**
 * Pieces shared by the admin panel's billing pages: opening an invoice and
 * acting on it, and the fees table with its reverse action.
 *
 * Every action posts and then refetches — never patches the cache. An
 * invoice's number, status and totals are the server's, and a guessed invoice
 * number is the kind of thing that ends up in front of a client.
 */
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoicePreview } from "@/components/billing/InvoiceDetail";
import { fetchData, postData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";
import {
  CHARGE_STATE,
  type FeeChargeRow,
  type Invoice,
  money,
  ratePct,
  serverReason,
} from "@/lib/platformBilling";
import { TD, TD_NUM, TH, TH_NUM } from "../adminUi";

/** Refetch every billing screen — an action on one changes the others' figures. */
export function useRefreshBilling() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("billing/"),
    });
}

type Step = "view" | "issue" | "settle" | "cancel";

/**
 * Open an invoice (with its lines) and drive it: issue, mark paid, cancel.
 * `invoice` is the row from a list; its lines are fetched on open.
 */
export function InvoiceDialog({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const refresh = useRefreshBilling();
  const [full, setFull] = useState<Invoice | null>(null);
  const [step, setStep] = useState<Step>("view");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [settledOn, setSettledOn] = useState(() => formatDate(new Date(), "input"));
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setFull(null);
    setStep("view");
    setReason("");
    setReference("");
    if (!invoice) return;
    fetchData(`billing/invoices/${invoice.id}/`)
      .then((data) => setFull(data as Invoice))
      .catch(() => toast.error("Could not load the invoice lines"));
  }, [invoice]);

  const shown = full ?? invoice;

  const act = async (action: "issue" | "settle" | "cancel", body: Record<string, unknown> = {}) => {
    if (!shown) return;
    setBusy(true);
    try {
      const result = (await postData({ url: `billing/invoices/${shown.id}/${action}/`, data: body })) as
        | { emailQueuedTo?: string | null }
        | undefined;
      if (action === "issue") {
        // Only claim an email when the server says one was queued — a project
        // with no "Billed to" email is notified in-app only.
        if (result?.emailQueuedTo) {
          toast.success(`Invoice issued and emailed to ${result.emailQueuedTo}`);
        } else {
          toast.warning(
            "Invoice issued — no billing email on this project, so it was only shown in-app. Set 'Billed to' on the project.",
          );
        }
      } else {
        toast.success(
          action === "settle" ? "Marked as paid" : "Invoice cancelled — its fees are unbilled again",
        );
      }
      refresh();
      onClose();
    } catch (e) {
      toast.error(serverReason(e, `Could not ${action} the invoice`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        {shown && (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === "issue" ? "Issue this invoice?" : step === "settle" ? "Mark as paid" : step === "cancel" ? "Cancel this invoice?" : "Platform fee invoice"}
              </DialogTitle>
              <DialogDescription>
                {step === "issue" &&
                  "Issuing assigns the tax invoice number, freezes these lines, sets the due date, and emails the billing contact and notifies the project. It cannot be edited afterwards."}
                {step === "settle" && `${shown.invoiceNumber} · ${money(shown.totalAmount)}. Record the payment once it is in the bank.`}
                {step === "cancel" &&
                  "Its fees go back to Not invoiced and will be picked up by the next invoice. The reason is kept."}
                {step === "view" && `${shown.projectName} · ${shown.projectNumber}`}
              </DialogDescription>
            </DialogHeader>

            {/*
              A preview, with "Open the full tax invoice" as its primary
              action — the same document, at /invoices/:id, that the customer
              reads. That was always the intent of sharing this component; it
              could not be met while the shared part was a fragment of a modal
              with a 300px scroll box in it. Staff and customer now read the
              one document, so a query about a line is a query about the same
              page on both sides of the call.
            */}
            {step === "view" && <InvoicePreview invoice={shown} />}
            {step === "settle" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Bank reference</label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. FNB 4417829" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Date received</label>
                  <Input type="date" value={settledOn} onChange={(e) => setSettledOn(e.target.value)} />
                </div>
              </div>
            )}
            {step === "cancel" && (
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is it being cancelled?" />
            )}

            <DialogFooter>
              {step !== "view" ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setStep("view")} disabled={busy}>
                    Back
                  </Button>
                  {step === "issue" && (
                    <Button size="sm" disabled={busy} onClick={() => act("issue")}>
                      {busy ? "Issuing…" : "Issue and send"}
                    </Button>
                  )}
                  {step === "settle" && (
                    <Button size="sm" disabled={busy || !reference.trim()} onClick={() => act("settle", { reference, settledOn })}>
                      {busy ? "Saving…" : "Mark as paid"}
                    </Button>
                  )}
                  {step === "cancel" && (
                    <Button variant="destructive" size="sm" disabled={busy || !reason.trim()} onClick={() => act("cancel", { reason })}>
                      Cancel invoice
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {(shown.status === "draft" || shown.status === "issued") && (
                    <Button variant="outline" size="sm" onClick={() => setStep("cancel")}>
                      <Ban className="h-4 w-4 mr-1.5" />
                      Cancel invoice
                    </Button>
                  )}
                  {shown.status === "draft" && (
                    <Button size="sm" onClick={() => setStep("issue")}>
                      <Send className="h-4 w-4 mr-1.5" />
                      Issue
                    </Button>
                  )}
                  {shown.status === "issued" && (
                    <Button size="sm" onClick={() => setStep("settle")}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Mark as paid
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ChargeStateBadge({ charge }: { charge: Pick<FeeChargeRow, "billingState" | "invoiceNumber"> }) {
  const s = CHARGE_STATE[charge.billingState] ?? CHARGE_STATE.not_invoiced;
  return (
    <Badge variant={s.variant} className="font-normal">
      {s.label}
      {charge.invoiceNumber ? ` · ${charge.invoiceNumber}` : ""}
    </Badge>
  );
}

const EVENT_LABEL: Record<FeeChargeRow["eventType"], string> = {
  pc_posted: "Payment certificate",
  vo_approved: "Variation order",
};

/**
 * Fees as a table, each with Fee + VAT = Total and where it stands. A live,
 * not-yet-reversed fee can be reversed — superusers only, server-enforced too.
 */
export function ChargesTable({ charges, showProject }: { charges: FeeChargeRow[]; showProject?: boolean }) {
  const refresh = useRefreshBilling();
  const [reverseFor, setReverseFor] = useState<FeeChargeRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reverse = async () => {
    if (!reverseFor) return;
    setBusy(true);
    try {
      await postData({ url: `billing/charges/${reverseFor.id}/reverse/`, data: { reason: reason.trim() } });
      toast.success("Fee reversed — a credit will appear on the next invoice");
      refresh();
      setReverseFor(null);
      setReason("");
    } catch (e) {
      toast.error(serverReason(e, "Could not reverse the fee"));
    } finally {
      setBusy(false);
    }
  };

  /*
    `numeric` drives the right-alignment on both the header and its cells, so
    a column cannot end up with a right-aligned heading over left-aligned
    figures (or the reverse) by someone editing one list and not the other.
  */
  const columns: { label: string; numeric?: boolean }[] = [
    { label: "Date" },
    ...(showProject ? [{ label: "Project" }] : []),
    { label: "Source" },
    { label: "Base", numeric: true },
    { label: "Rate", numeric: true },
    { label: "Fee", numeric: true },
    { label: "VAT", numeric: true },
    { label: "Total", numeric: true },
    { label: "Status" },
    { label: "" },
  ];

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c, i) => (
              <th key={`${c.label}-${i}`} className={c.numeric ? TH_NUM : TH}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {charges.map((c) => {
            const credit = c.status === "reversal";
            return (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className={TD}>{c.createdAt ? formatDate(c.createdAt, "short") : "—"}</td>
                {showProject && (
                  /*
                    Truncated, not wrapped, and not `nowrap`.

                    Left to itself this was the widest column on the table —
                    292px of 1492 for a name repeated identically down every
                    row. Wrapping it instead made each row three lines tall
                    and dropped the page from 17 visible fees to 7. The full
                    name stays on `title` for anyone who needs it.
                  */
                  <td className={`${TD} max-w-[150px] truncate`} title={c.projectName}>
                    {c.projectName}
                  </td>
                )}
                <td className={TD}>
                  {c.sourceRef || "—"}
                  <span className="block text-xs text-muted-foreground">{EVENT_LABEL[c.eventType]}</span>
                </td>
                <td className={TD_NUM}>{money(c.baseAmount, { signed: credit })}</td>
                <td className={TD_NUM}>{ratePct(c.feeRatePct)}</td>
                <td className={TD_NUM}>{money(c.feeAmount, { signed: credit })}</td>
                <td className={TD_NUM}>{money(c.vatAmount, { signed: credit })}</td>
                <td className={TD_NUM}>{money(c.totalAmount, { signed: credit })}</td>
                <td className={TD}>
                  <ChargeStateBadge charge={c} />
                </td>
                <td className={TD}>
                  {c.status === "active" && (
                    <Button variant="ghost" size="sm" onClick={() => setReverseFor(c)}>
                      <Undo2 className="h-4 w-4 mr-1" />
                      Reverse
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={!!reverseFor} onOpenChange={(v) => !v && setReverseFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse this fee?</DialogTitle>
            <DialogDescription>
              {reverseFor?.sourceRef} · {money(reverseFor?.totalAmount)} incl. VAT. A matching credit is written and
              appears on the next invoice; the fee is never charged again for this event. The reason is kept.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is it being reversed?" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReverseFor(null)} disabled={busy}>
              Back
            </Button>
            <Button variant="destructive" size="sm" onClick={reverse} disabled={busy || !reason.trim()}>
              {busy ? "Reversing…" : "Reverse fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
