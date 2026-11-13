/**
 * The contractor's tax invoice for a posted certificate, inside its details.
 *
 * Drafted by the server when the certificate posts, with its amounts locked to
 * the certificate (tasks/tax_invoices.py) — so there is nothing here to type
 * but the contractor's own invoice number and date. Issued under that number;
 * cancelled only by the contractor's credit note.
 *
 * This is the ONE place a tax invoice is supplied. The contractor's own
 * document is uploaded here (the certificate's Attachments no longer offer
 * "Attach invoice", which counted for nothing), and the upload is offered
 * whether or not Baselinq has drafted one. Nothing reads the uploaded PDF: the
 * amounts are the ones the uploader types, matched to the certificate, and
 * the page says exactly that.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useFetch from "@/hooks/useFetch";
import { postData } from "@/lib/Api";
import { resolveApiUrl } from "@/lib/apiUrl";
import { formatDate } from "@/lib/dateUtils";
import { formatMoney } from "@/lib/formatCurrency";
import { parseMoneyInput } from "@/lib/money";
import { TAX_INVOICE_STATUS_LABEL, type TaxInvoice } from "@/lib/taxInvoice";

interface Response {
  invoice: TaxInvoice | null;
  cancelled: TaxInvoice[];
  canEdit: boolean;
  /** The viewer is the contractor's side: the invoice is theirs to supply. */
  contractorSide?: boolean;
}

const AMOUNT_FIELDS = [
  ["amountExclVat", "Amount excl. VAT"],
  ["vatAmount", "VAT"],
  ["totalInclVat", "Total incl. VAT"],
] as const;

const EMPTY_STATED = { amountExclVat: "", vatAmount: "", totalInclVat: "" };

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function MissingDetails({ missing }: { missing: string[] }) {
  return (
    <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Missing for a valid tax invoice: {missing.join(", ")}.{" "}
      <Link to="/settings/contract-payment" className="underline">
        Complete them in Settings → Contract &amp; payment
      </Link>
      .
    </div>
  );
}

export function TaxInvoiceSection({
  certificateId,
  invoiceRequiredForPayment,
  termsUnavailable = false,
}: {
  certificateId: number;
  /**
   * From the payment terms: whether payment is subject to this invoice (GCC).
   * Undefined while they load or when they could not be read — and then no
   * rule is stated, because "a missing invoice does not delay payment" is a
   * contractual claim that must not rest on absent data.
   */
  invoiceRequiredForPayment?: boolean;
  /** The payment terms failed to load. */
  termsUnavailable?: boolean;
}) {
  const key = `payment-certificates/${certificateId}/tax-invoice/`;
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useFetch<Response>(key);
  const [busy, setBusy] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(localToday());
  const [creditNote, setCreditNote] = useState("");
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  // The contractor's own invoice, uploaded instead of the draft (client
  // meeting, 10 Nov 2026). Its amounts must match the certificate.
  // The draft the upload replaces: the live invoice, or the one just prepared
  // so the contractor can upload without a separate "Prepare" step.
  const [uploadTarget, setUploadTarget] = useState<TaxInvoice | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stated, setStated] = useState<Record<(typeof AMOUNT_FIELDS)[number][0], string>>(EMPTY_STATED);
  const [differences, setDifferences] = useState<{ label: string; invoice: string; certificate: string }[]>([]);
  // The server's reason for the last refusal, shown inside the open dialog: a
  // toast alone was easy to miss behind the modal, and the dialog just sat
  // there looking as if nothing had happened.
  const [refusal, setRefusal] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: [key] });

  const run = async (url: string, body: Record<string, unknown> | FormData, done: string) => {
    setBusy(true);
    setMissing([]);
    setDifferences([]);
    setRefusal(null);
    try {
      const result = await postData({ url, data: body });
      (result?.warnings ?? []).forEach((w: string) => toast.warning(w));
      toast.success(done);
      await refresh();
      return result ?? true;
    } catch (e: any) {
      // postData rethrows the axios error with the server's body attached.
      const body = e?.response?.data;
      if (Array.isArray(body?.missing)) setMissing(body.missing);
      if (Array.isArray(body?.differences)) setDifferences(body.differences);
      const reason = body?.error ?? body?.detail ?? (e instanceof Error ? e.message : "That did not work.");
      setRefusal(reason);
      toast.error(reason);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Each dialog opens clean: a file, number or difference left over from the
  // last attempt must never be submitted, or shown, by the next one.
  const resetForm = () => {
    setNumber("");
    setDate(localToday());
    setFile(null);
    setStated(EMPTY_STATED);
    setDifferences([]);
    setMissing([]);
    setRefusal(null);
  };
  const openIssue = () => {
    resetForm();
    setIssuing(true);
  };
  const openUpload = async () => {
    resetForm();
    if (data?.invoice) {
      setUploadTarget(data.invoice);
      return;
    }
    // No draft yet: prepare one (the server's amounts) and upload over it.
    const result = await run(key, {}, "Ready for your invoice");
    const prepared = result && typeof result === "object" ? (result as { invoice?: TaxInvoice }).invoice : null;
    if (prepared) setUploadTarget(prepared);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading the tax invoice…</p>;
  if (isError || !data) return <p className="text-sm text-muted-foreground">The tax invoice could not be loaded.</p>;

  const invoice = data.invoice;
  const mine = data.contractorSide === true;
  const rule =
    invoiceRequiredForPayment === true
      ? "Under this contract, payment is subject to the contractor's tax invoice."
      : invoiceRequiredForPayment === false
        ? "Under this contract, a missing tax invoice does not delay payment; the payment period runs from the certificate."
        : termsUnavailable
          ? "The payment terms could not be read, so whether payment waits for this invoice is not shown."
          : null;
  const uploadLabel = mine ? "Upload your tax invoice…" : "Upload the contractor's invoice…";
  const unreadable = (v: string) => v.trim() !== "" && parseMoneyInput(v) === null;
  const amountsReady = AMOUNT_FIELDS.every(([f]) => stated[f].trim() !== "" && parseMoneyInput(stated[f]) !== null);

  return (
    <div className="space-y-3">
      {rule && <p className="text-xs text-muted-foreground">{rule}</p>}

      {!invoice ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">No tax invoice yet for this certificate.</p>
          {data.canEdit && (
            <div className="flex flex-wrap gap-2">
              {/* The contractor's own invoice is their path, so it leads. */}
              <Button size="sm" variant={mine ? "default" : "outline"} disabled={busy} onClick={openUpload}>
                {uploadLabel}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(key, {}, "Tax invoice prepared")}>
                {mine ? "Use Baselinq's draft instead" : "Prepare tax invoice"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {invoice.invoiceNumber ? `Tax invoice ${invoice.invoiceNumber}` : "Tax invoice (draft)"}
            </p>
            <Badge variant={invoice.status === "issued" ? "success" : "neutral"}>
              {TAX_INVOICE_STATUS_LABEL[invoice.status]}
            </Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Value excl. VAT</dt>
            <dd className="text-right tabular-nums">{formatMoney(Number(invoice.amountExclVat))}</dd>
            <dt className="text-muted-foreground">VAT @ {Number(invoice.vatRatePct)}%</dt>
            <dd className="text-right tabular-nums">{formatMoney(Number(invoice.vatAmount))}</dd>
            <dt className="font-medium">Total incl. VAT</dt>
            <dd className="text-right tabular-nums font-medium">{formatMoney(Number(invoice.totalInclVat))}</dd>
          </dl>
          {Number(invoice.advanceRecovery) > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatMoney(Number(invoice.advanceRecovery))} advance payment is recovered on the certificate below
              the VAT line, so the amount payable is less than this invoice total.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            From {invoice.supplier.name || "the contractor (name missing)"} to{" "}
            {invoice.recipient.name || "the employer (name missing)"}.
            {invoice.status === "issued" &&
              ` Issued ${invoice.invoiceDate ? formatDate(invoice.invoiceDate) : ""}${invoice.issuedBy ? ` by ${invoice.issuedBy}` : ""}.`}
          </p>
          {invoice.source === "uploaded" && invoice.status === "issued" && (
            /* Honest about what was checked: the typed amounts, not the PDF. */
            <p className="text-xs text-muted-foreground">
              The amounts above were typed by {invoice.issuedBy ?? "the uploader"} when uploading and matched to the
              certificate. Baselinq does not read the document itself: open it to check it shows the same.
            </p>
          )}

          {missing.length > 0 && !issuing && <MissingDetails missing={missing} />}

          <div className="flex flex-wrap gap-2 pt-1">
            {invoice.source === "uploaded" && invoice.documentUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a href={resolveApiUrl(invoice.documentUrl)} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Contractor's invoice
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/finance/tax-invoices/${invoice.id}`} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  {invoice.status === "draft" ? "Preview" : "View and print"}
                </Link>
              </Button>
            )}
            {data.canEdit && invoice.status === "draft" && (
              <Button size="sm" variant={mine ? "default" : "outline"} disabled={busy} onClick={openUpload}>
                {uploadLabel}
              </Button>
            )}
            {data.canEdit && invoice.status === "draft" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={openIssue}>
                {mine ? "Issue Baselinq's draft…" : "Issue on the contractor's behalf…"}
              </Button>
            )}
            {data.canEdit && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setCancelling(true)}>
                {invoice.status === "draft" ? "Discard draft…" : "Cancel by credit note…"}
              </Button>
            )}
          </div>
        </div>
      )}

      {data.cancelled.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {data.cancelled.map((c) => (
            <li key={c.id}>
              {c.invoiceNumber ?? "Draft"} — {TAX_INVOICE_STATUS_LABEL[c.status].toLowerCase()}
              {c.creditNoteNumber ? ` (${c.creditNoteNumber})` : ""}
              {c.reason ? `: ${c.reason}` : ""}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!uploadTarget} onOpenChange={(v) => !v && !busy && setUploadTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mine ? "Upload your tax invoice" : "Upload the contractor's tax invoice"}</DialogTitle>
            <DialogDescription>
              This becomes the tax invoice for the certificate. Type the three amounts printed on the invoice: they
              are matched to the certificate
              {uploadTarget && (
                <>
                  {" "}
                  ({formatMoney(Number(uploadTarget.amountExclVat))} excl. VAT, {formatMoney(Number(uploadTarget.vatAmount))}{" "}
                  VAT, {formatMoney(Number(uploadTarget.totalInclVat))} in total)
                </>
              )}
              , and the upload is refused if they differ. Baselinq does not read the document, so the amounts you type
              must be the ones on it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`tu-number-${certificateId}`}>{mine ? "Your invoice number" : "Contractor's invoice number"}</Label>
              <Input id={`tu-number-${certificateId}`} value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`tu-date-${certificateId}`}>Invoice date</Label>
              <Input id={`tu-date-${certificateId}`} type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} />
            </div>
            {AMOUNT_FIELDS.map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`tu-${field}-${certificateId}`}>{label} on the invoice</Label>
                <Input
                  id={`tu-${field}-${certificateId}`}
                  inputMode="decimal"
                  className="tabular-nums"
                  value={stated[field]}
                  aria-invalid={unreadable(stated[field]) || undefined}
                  onChange={(e) => setStated((v) => ({ ...v, [field]: e.target.value }))}
                />
                {unreadable(stated[field]) && (
                  <span className="block text-xs text-destructive">That is not a readable amount.</span>
                )}
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`tu-file-${certificateId}`}>Invoice document</Label>
              <Input
                id={`tu-file-${certificateId}`}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {refusal && differences.length === 0 && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {refusal}
            </p>
          )}
          {differences.length > 0 && (
            <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Does not match the certificate:
              <ul className="mt-1 list-disc pl-4">
                {differences.map((d) => (
                  <li key={d.label}>
                    {d.label}: {formatMoney(Number(d.invoice))} on the invoice, {formatMoney(Number(d.certificate))} certified
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || !number.trim() || !date || !file || !amountsReady}
              onClick={async () => {
                if (!uploadTarget || !file) return;
                const form = new FormData();
                form.append("invoiceNumber", number.trim());
                form.append("invoiceDate", date);
                Object.entries(stated).forEach(([k, v]) => form.append(k, String(parseMoneyInput(v))));
                form.append("file", file);
                if (await run(`tax-invoices/${uploadTarget.id}/upload/`, form, `Invoice ${number.trim()} is recorded`)) {
                  setUploadTarget(null);
                }
              }}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issuing} onOpenChange={setIssuing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mine ? "Issue Baselinq's draft as your tax invoice" : "Issue on the contractor's behalf"}</DialogTitle>
            <DialogDescription>
              {mine
                ? "Issued in your name under your own invoice number. The amounts are the certificate's and cannot be changed."
                : `Issued in ${invoice?.supplier.name || "the contractor"}'s name under their own invoice number. Only do this if they have agreed that you issue tax invoices for them. The amounts are the certificate's and cannot be changed.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`ti-number-${certificateId}`}>{mine ? "Your invoice number" : "Contractor's invoice number"}</Label>
              <Input id={`ti-number-${certificateId}`} value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ti-date-${certificateId}`}>Invoice date</Label>
              <Input
                id={`ti-date-${certificateId}`}
                type="date"
                value={date}
                max={localToday()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {/* In the dialog, not behind it: a refusal leaves the dialog open. */}
          {missing.length > 0 && <MissingDetails missing={missing} />}
          {refusal && missing.length === 0 && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {refusal}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssuing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || !number.trim() || !date}
              onClick={async () => {
                if (
                  invoice &&
                  (await run(
                    `tax-invoices/${invoice.id}/issue/`,
                    { invoiceNumber: number.trim(), invoiceDate: date },
                    `Tax invoice ${number.trim()} issued`,
                  ))
                ) {
                  setIssuing(false);
                }
              }}
            >
              Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelling} onOpenChange={setCancelling}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{invoice?.status === "draft" ? "Discard the draft" : "Cancel by credit note"}</DialogTitle>
            <DialogDescription>
              {invoice?.status === "draft"
                ? "The draft is discarded and a new one can be prepared."
                : "An issued tax invoice is cancelled by the contractor's credit note (VAT Act s21). The record stays, and a corrected invoice can be prepared."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {invoice?.status === "issued" && (
              <div className="space-y-1.5">
                <Label htmlFor={`ti-cn-${certificateId}`}>Credit note number</Label>
                <Input id={`ti-cn-${certificateId}`} value={creditNote} onChange={(e) => setCreditNote(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`ti-reason-${certificateId}`}>Reason</Label>
              <Input id={`ti-reason-${certificateId}`} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(false)} disabled={busy}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !reason.trim() || (invoice?.status === "issued" && !creditNote.trim())}
              onClick={async () => {
                if (
                  invoice &&
                  (await run(
                    `tax-invoices/${invoice.id}/credit/`,
                    { creditNoteNumber: creditNote.trim(), reason: reason.trim() },
                    invoice.status === "draft" ? "Draft discarded" : "Tax invoice cancelled",
                  ))
                ) {
                  setCancelling(false);
                }
              }}
            >
              {invoice?.status === "draft" ? "Discard" : "Cancel invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
