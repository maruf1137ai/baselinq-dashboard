/**
 * Recording that the client's money arrived against one payment certificate.
 *
 * WHY THE WARNINGS ARE NOT TOASTS
 * -------------------------------
 * The server accepts the receipt and THEN reports what is odd about it — an
 * amount exceeding the certified total, or a near-duplicate of a receipt
 * already recorded. Both arrive on the 201, after the row is written.
 *
 * `paymentCertificate.tsx` renders server warnings as `toast.warning`, and
 * everywhere else that is right. Here it is not. "You may have just entered
 * R2.1m twice" is not a message to show for four seconds and then discard: by
 * the time the user reads it the row exists, and the recovery — reversing a
 * receipt — needs a different permission from the one that created it. So
 * these are kept on screen until dismissed, naming the receipt they clash
 * with. The departure from the house pattern is deliberate.
 */
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invalidateProjectCommercials } from "@/hooks/useProjectCommercials";
import { postData } from "@/lib/Api";
import { formatMoney } from "@/lib/formatCurrency";
import { parseMoneyInput } from "@/lib/money";
import { PayeeAccounts, type PayeeAccount } from "./BankChangeCheck";
import { UnverifiedNote } from "./UnverifiedMark";

/** Mirrors PROOF_EXTENSIONS / the 10 MB limit in tasks/payments.py. */
const PROOF_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const PROOF_MAX_BYTES = 10 * 1024 * 1024;

export function proofProblem(file: File): string | null {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (!PROOF_EXTENSIONS.includes(ext)) return "Proof of payment must be a PDF, JPG or PNG file.";
  if (file.size > PROOF_MAX_BYTES) return "Proof of payment must be 10 MB or smaller.";
  return null;
}

const METHODS = [
  { value: "eft", label: "EFT" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "set_off", label: "Set-off" },
  { value: "other", label: "Other" },
];

const money = (raw: unknown) => {
  const n = Number(raw);
  return Number.isFinite(n) ? formatMoney(n) : "—";
};

/** Today in the user's own timezone — `toISOString()` would shift the date. */
const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * The date to seed "Date received" with.
 *
 * Prefer the server's own today — the `asAt` the payments endpoint reports,
 * which is `timezone.localdate()` in Africa/Johannesburg. The browser's date is
 * only the fallback for when the payload has not loaded.
 *
 * This matters because the payment position counts receipts with
 * `received_on <= as_at`. A viewer east of SAST recording a payment in their
 * early hours would otherwise date it tomorrow in SAST terms, and their own
 * entry would not appear on the Payments tab until the next day. The server
 * warns about it now (`received_on_in_future`), but the default should not
 * walk the user into it in the first place.
 *
 * The field stays editable: back-dating a receipt to the day the money actually
 * arrived is the ordinary case, not an exception.
 */
const seedDate = (serverToday?: string) =>
  serverToday && /^\d{4}-\d{2}-\d{2}$/.test(serverToday) ? serverToday : today();

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  certificateId,
  projectId,
  pcNumber,
  outstanding,
  serverToday,
  unverified = false,
  payeeAccounts,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  certificateId: number;
  projectId: number;
  pcNumber: string;
  outstanding: string;
  /** The payments endpoint's `asAt` — the date in the project's timezone. */
  serverToday?: string;
  /** The certified amount predates stored totals and may exclude VAT (see UnverifiedMark). */
  unverified?: boolean;
  /**
   * The contractor's account the payment should have gone to, and whether it
   * can be trusted (backend tasks/bank_details.py::payee_accounts). Absent
   * until the payment position has loaded.
   */
  payeeAccounts?: PayeeAccount[];
  onRecorded?: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [receivedOn, setReceivedOn] = useState(seedDate(serverToday));
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("eft");
  const [notes, setNotes] = useState("");
  // The employer's proof of payment (client decision, 10 Nov 2026). The
  // contractor then confirms the money arrived — money does get paid into the
  // wrong account.
  const [proof, setProof] = useState<File | null>(null);
  // Checked as soon as a file is picked, with the same limits the server
  // applies (tasks/payments.validate_proof_file), so a wrong file is caught
  // here rather than after the upload.
  const proofError = proof ? proofProblem(proof) : null;
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<{ code?: string; message: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    // Default to the full outstanding balance: paying a certificate in full is
    // the ordinary case, and a part payment is a deliberate edit rather than
    // something the user has to type out every time.
    // Prefilled the way it is DISPLAYED, not as a raw decimal string:
    // "1248000.00" reads to a South African eye as a grouping error.
    setAmount(Number.isFinite(Number(outstanding)) ? formatMoney(Number(outstanding)) : "");
    setReceivedOn(seedDate(serverToday));
    setReference("");
    setMethod("eft");
    setNotes("");
    setProof(null);
    setWarnings([]);
  }, [open, outstanding, serverToday]);

  /*
    `parseMoneyInput`, not `Number`.

    The description directly above this field prints "R 1 248 000,00" through
    `formatZAR`, with NON-BREAKING spaces. `Number("R 1 248 000,00")` is NaN —
    so selecting the figure the dialog itself displays and pasting it into the
    dialog's own box produced a silently disabled button and no message. The
    shared parser accepts NBSP, space, comma and apostrophe grouping and
    either decimal separator, which is how the rest of Finance reads money.
  */
  const parsed = parseMoneyInput(amount);
  const unreadable = amount.trim() !== "" && parsed === null;
  // A set-off moves no money, so there is no bank proof to attach.
  const proofNeeded = method !== "set_off";
  const valid = parsed !== null && parsed > 0 && !!receivedOn && (!!proof || !proofNeeded) && !proofError;
  const proofMissing = parsed !== null && parsed > 0 && !!receivedOn && proofNeeded && !proof;
  const overOutstanding =
    parsed !== null && Number.isFinite(Number(outstanding)) && parsed > Number(outstanding);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("amount", String(parsed));
      form.append("receivedOn", receivedOn);
      form.append("reference", reference.trim());
      form.append("method", method);
      form.append("notes", notes.trim());
      if (proof) form.append("proof", proof);
      const res: any = await postData({
        url: `payment-certificates/${certificateId}/receipts/`,
        data: form,
      });
      toast.success(`Payment recorded against ${pcNumber}`);

      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" &&
          (q.queryKey[0].startsWith("payment-certificates") ||
            q.queryKey[0].startsWith("tasks/payment-certificates") ||
            q.queryKey[0].startsWith("projects/")),
      });
      // The Home overdue queue reads the project commercials, not this URL.
      // Skipping it leaves a settled certificate on the queue — the bug the
      // comment on this helper in paymentCertificateTable.tsx documents.
      invalidateProjectCommercials(queryClient, String(projectId));
      onRecorded?.();

      const w = res?.warnings ?? res?.data?.warnings ?? [];
      if (Array.isArray(w) && w.length) {
        // Held, not toasted. See the module docstring.
        setWarnings(w.map((x: any) => (typeof x === "string" ? { message: x } : x)));
      } else {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error || e?.message || "Could not record the payment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment on {pcNumber}</DialogTitle>
          <DialogDescription>
            {money(outstanding)} outstanding. This records a payment that has been
            made, with its proof — it does not make a payment.
          </DialogDescription>
        </DialogHeader>

        {/* Where the money should have gone, before anything is typed: an
            unverified change of bank details is how payments are diverted. */}
        {payeeAccounts && warnings.length === 0 && <PayeeAccounts accounts={payeeAccounts} />}

        {unverified && (
          <UnverifiedNote>
            This certificate was saved before VAT and the total were stored, so the outstanding
            amount may exclude VAT. Record what actually arrived, not the pre-filled figure, if they
            differ.
          </UnverifiedNote>
        )}

        {warnings.length > 0 ? (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              The payment was recorded. If it is wrong, reverse it from the
              Receipts list — reversing keeps both rows so the trail stays
              readable, and needs the Approve payments permission.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Amount received</span>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  className="tabular-nums"
                  aria-invalid={unreadable || undefined}
                />
                {unreadable ? (
                  <span className="block text-xs text-destructive">
                    That is not a readable amount.
                  </span>
                ) : overOutstanding ? (
                  /* Before the write, not after. The server flags this on the
                     201 too, but by then the row exists and undoing it needs
                     a permission the person recording may not hold. */
                  <span className="block text-xs text-amber-700">
                    More than the {money(outstanding)} outstanding.
                  </span>
                ) : (
                  <span className="block text-xs text-muted-foreground">
                    The full outstanding balance. Change it for a part payment.
                  </span>
                )}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Date received</span>
                <Input type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Method</span>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Reference</span>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference" />
              </label>
            </div>
            <label className="space-y-1.5 block">
              <span className="text-xs text-muted-foreground">
                Proof of payment{proofNeeded ? " (required)" : " (optional for a set-off)"}
              </span>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                aria-invalid={proofError || proofMissing ? true : undefined}
                onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              />
              {proofError && (
                <span role="alert" className="block text-xs text-destructive">
                  {proofError}
                </span>
              )}
              {proofMissing ? (
                /* Says why Record payment is still disabled, once the rest is filled in. */
                <span className="block text-xs text-destructive">
                  Attach the bank's confirmation to record this payment.
                </span>
              ) : (
                <span className="block text-xs text-muted-foreground">
                  The bank's confirmation or remittance advice. The contractor is asked to confirm the money arrived.
                </span>
              )}
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs text-muted-foreground">Notes</span>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </label>
          </div>
        )}

        <DialogFooter>
          {warnings.length > 0 ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!valid || busy}>
                {busy ? "Recording…" : "Record payment"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
