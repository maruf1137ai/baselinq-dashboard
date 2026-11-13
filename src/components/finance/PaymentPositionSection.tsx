/**
 * What the client still owes on one payment certificate, and the button that
 * records it when they pay.
 *
 * WHY THIS EXISTS
 * ---------------
 * The backend has carried a complete payment loop for some time — due dates
 * off the contract form, receipts, partial payments, late-payment interest at
 * the repo rate plus a margin, and reversal. Six route groups. Five of them
 * had no caller anywhere in the frontend, on any branch.
 *
 * The consequence was not merely a missing feature. `lib/homeSignals.ts`
 * builds an overdue-certificate queue row whose call to action reads
 * "Open to record payment" and whose href is this certificate — a screen on
 * which recording a payment was impossible. The product was instructing a
 * live customer to do something it had never been able to do. That is the
 * reason this section exists, and the reason it lives inside the Details
 * dialog rather than on a new tab: it is the end of a journey the product
 * already sends people on.
 *
 * THE RULE THAT SHAPES EVERY FIGURE BELOW
 * ---------------------------------------
 * JBCC counts payment from the date FOR issue, not the date of issue. That
 * field is captured nowhere in the UI today, so `basisIsContractual` is false
 * on effectively every certificate in the product and the server falls back
 * to the certificate date. The fallback can only ever run LATE — in the
 * employer's favour.
 *
 * So "123 days overdue" is never printed on its own. Where the basis is not
 * contractual the server's own warning is rendered verbatim beside it. A
 * contractor who demands interest from a date the contract does not support
 * is in a worse position than one who was never given the number, and this
 * screen is the last place that distinction can be made.
 */
import React, { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, FileText, Info, Undo2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { invalidateProjectCommercials } from "@/hooks/useProjectCommercials";
import { postData } from "@/lib/Api";
import useFetch from "@/hooks/useFetch";
import { usePermission } from "@/hooks/usePermission";
import { formatDate as formatDateCanonical } from "@/lib/dateUtils";
import { formatMoney } from "@/lib/formatCurrency";
import { resolveApiUrl } from "@/lib/apiUrl";
import { UnverifiedNote } from "./UnverifiedMark";

import { type PayeeAccount } from "./BankChangeCheck";
import RecordPaymentDialog from "./RecordPaymentDialog";

/** Money arrives as a decimal STRING. `formatZAR` takes a number. */
const money = (raw: unknown): string => {
  const n = Number(raw);
  return Number.isFinite(n) ? formatMoney(n) : "—";
};
const day = (iso?: string | null) => (iso ? formatDateCanonical(iso, "short", "—") : "—");

export interface PaymentReceiptRow {
  id: number;
  amount: string;
  receivedOn: string;
  method?: string;
  reference?: string;
  notes?: string;
  /*
    The server's own values, read from `tasks.models_payment.ReceiptStatus`,
    not guessed: "recorded" is a live receipt, "reversed" is an original that
    has been withdrawn, "reversal" is the offsetting row itself. An earlier
    revision of this file assumed "active" for the first, which silently hid
    the Reverse control on every receipt — the predicate was simply never
    true.
  */
  status: "recorded" | "reversed" | "reversal";
  /** Whether this row counts toward the amount received. */
  counts?: boolean;
  reversalReason?: string;
  reversesId?: number | null;
  reversedAt?: string | null;
  /** The employer's proof of payment, where one was attached. */
  proofUrl?: string | null;
  proofName?: string | null;
  /**
   * The contractor's answer: null on a receipt recorded before confirmation
   * existed (never asked, not shown as confirmed).
   */
  confirmation?: "pending" | "confirmed" | "not_received" | null;
  confirmationNote?: string;
  confirmedAt?: string | null;
  /** This viewer may answer: the contractor side, or an assigned party who did not record it. */
  canConfirm?: boolean;
  /** A "received" pressed in error may be corrected, with a reason, until correctableUntil. */
  canCorrectConfirmation?: boolean;
  correctableUntil?: string | null;
}

/** "R 500 000,00 paid 1 Oct 2026 · ref EFT-1" — the payment restated before anyone answers for it. */
const restate = (r: PaymentReceiptRow) =>
  `${money(r.amount)} paid ${day(r.receivedOn)}${r.reference ? ` · reference ${r.reference}` : " · no reference given"}`;

const CONFIRMATION_BADGE = {
  pending: { label: "Awaiting contractor", variant: "warning" },
  confirmed: { label: "Receipt confirmed", variant: "success" },
  not_received: { label: "Not received", variant: "danger" },
} as const;

export interface PaymentPosition {
  paymentCertificateId: number;
  pcNumber: string;
  isPayable: boolean;
  asAt: string;
  certifiedAmount: string;
  receivedAmount: string;
  outstandingAmount: string;
  certifiedBasis?: string;
  isFullySettled: boolean;
  isPartlyPaid: boolean;
  isOverdue: boolean;
  daysPastDue: number;
  statement?: string;
  due?: {
    dueDate?: string | null;
    computable: boolean;
    reason?: string;
    basis?: string;
    basisIsContractual?: boolean;
    calculation?: string;
    warning?: string;
    terms?: { provenance?: string; configured?: boolean };
  };
  receipts?: PaymentReceiptRow[];
  /** finance.edit, or the Employer role — tasks/payments.py::may_record_payment. */
  canRecordPayment?: boolean;
  /** The contractor's account and whether it can be paid (tasks/bank_details.py::payee_accounts). */
  payeeAccounts?: PayeeAccount[];
  interest?: {
    applicable: boolean;
    complete?: boolean;
    reason?: string;
    totalInterest?: string;
    statement?: string;
    segments?: {
      from: string;
      to: string;
      days?: number;
      /** The server's name for the balance the period ran on. */
      outstanding: string;
      rateAvailable: boolean;
      unavailableReason?: string;
      interest?: string | null;
      repoRatePct?: string | null;
      marginPct?: string | null;
    }[];
  };
}

const Figure = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm tabular-nums ${strong ? "font-medium text-foreground" : ""}`}>{value}</span>
  </div>
);

/*
  Two tones, and the split matters more than it looks.

  `basisIsContractual` is false on EFFECTIVELY EVERY certificate in the
  product, because the date for issue is captured nowhere. An amber block
  that is always on is not a warning, it is a label — and it trains the eye
  to skip the amber that does mean "act". So the always-true caveat is
  neutral, and amber is reserved for the one thing somebody can fix: missing
  repo rates.

  Both still render the server's wording verbatim. The requirement was
  verbatim, not amber.
*/
const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-2 flex gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

/** The server's own wording, never paraphrased. */
const Caution = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-2 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

function InterestBlock({ interest }: { interest: NonNullable<PaymentPosition["interest"]> }) {
  /*
    Four distinct "no interest" states, and collapsing any two of them
    misstates the contract:

      not applicable, basis "none"  → organ of state. The contract gives no
                                      interest. A FACT, stated neutrally —
                                      styling it as a warning tells a
                                      state-sector contractor something is
                                      wrong when nothing is.
      not applicable, no due date   → a data gap. A warning.
      not yet past due              → neutral.
      applicable but incomplete     → understated, and actionable.
  */
  if (!interest.applicable) {
    return (
      <p className="text-xs text-muted-foreground">{interest.reason || "No interest is running."}</p>
    );
  }

  const incomplete = interest.complete === false;
  const unratedSegments = (interest.segments ?? []).filter((s) => !s.rateAvailable);
  const unrated = unratedSegments.length;
  const firstUnavailable = unratedSegments.find((s) => s.unavailableReason)?.unavailableReason;

  return (
    <div className="space-y-2">
      {incomplete ? (
        /*
          The total EXCLUDES unrated periods, so it must not sit in the slot a
          complete total would occupy. Prefixed and in the warning tone, never
          presented as the answer.

          And when NOTHING could be rated the total is 0.00, where "at least
          R 0,00" is both true and useless — it reads as "almost nothing is
          owed" when the real meaning is "no repo rates have been captured, so
          this cannot be worked out at all". That case gets its own sentence.
        */
        /*
          Plain words first. The server's statement and the per-month reasons
          are the working, and sit behind the disclosure below; leading with
          "PARTIAL: 8 of 8 period(s) could not be rated" read as an error code.
        */
        <Caution>
          <span>
            {Number(interest.totalInterest) > 0 ? (
              <>
                <span className="font-medium">At least {money(interest.totalInterest)}</span>, but{" "}
                {unrated} month{unrated === 1 ? "" : "s"} could not be calculated yet.
              </>
            ) : (
              <span className="font-medium">Late-payment interest is not available yet.</span>
            )}{" "}
            The repo rate for {unrated === 1 ? "that month" : "those months"} has not been recorded
            in Baselinq.
          </span>
        </Caution>
      ) : (
        <Figure label="Late-payment interest" value={money(interest.totalInterest)} strong />
      )}

      {(interest.segments ?? []).length > 0 && (
        <details open={!incomplete} className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none py-1 hover:text-foreground">
          How this is calculated
        </summary>
        {incomplete && (interest.statement || firstUnavailable) && (
          <p className="mb-1.5">
            {interest.statement} {firstUnavailable}
          </p>
        )}
        <ul className="space-y-1">
          {interest.segments!.map((s, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <span>
                {day(s.from)} – {day(s.to)}
                {typeof s.days === "number" && ` (${s.days}d)`} on {money(s.outstanding)}
                {s.rateAvailable && s.repoRatePct && (
                  <span className="ml-1">
                    @ {s.repoRatePct}% + {s.marginPct}%
                  </span>
                )}
              </span>
              <span className="tabular-nums shrink-0">
                {s.rateAvailable ? (
                  money(s.interest)
                ) : (
                  /*
                    NOT "—" and NOT R 0,00. `money()` maps null to "—"
                    everywhere else in this table, so "—" would read as nil;
                    zero would read as "no interest accrued". Neither is true:
                    the rate for this month was never captured.
                  */
                  <span className="text-amber-700" title={s.unavailableReason}>
                    Not rated
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        </details>
      )}
    </div>
  );
}

export default function PaymentPositionSection({
  certificateId,
  projectId,
  open,
}: {
  certificateId: number;
  projectId: number;
  open: boolean;
}) {
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [reversing, setReversing] = useState<PaymentReceiptRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [denying, setDenying] = useState<PaymentReceiptRow | null>(null);
  const [denyNote, setDenyNote] = useState("");
  // "Yes, received" asks once more, restating the payment: it is the
  // contractor's word that the money is in their account.
  const [confirming, setConfirming] = useState<PaymentReceiptRow | null>(null);
  const [correcting, setCorrecting] = useState<PaymentReceiptRow | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  // Lazily, like the workflow popover in this same file: the dialog is opened
  // far more often than this section is read.
  const { data, isLoading, isError, refetch } = useFetch<PaymentPosition>(
    open && certificateId ? `payment-certificates/${certificateId}/payment/` : "",
    { enabled: open && !!certificateId },
  );

  /*
    Reversal is gated harder than recording, as the backend gates it: recording
    is data entry, reversal WITHDRAWS an assertion that money arrived. It moves
    an outstanding balance and the interest running on it, and it is the
    operation somebody would reach for to make a late payment look on time.
  */
  const canReverse = usePermission("finance.approve_payment", projectId);

  const reverse = async () => {
    if (!reversing || !reason.trim()) return;
    setBusy(true);
    try {
      await postData({
        url: `payment-receipts/${reversing.id}/reverse/`,
        data: { reason: reason.trim() },
      });
      toast.success("Payment reversed — both rows stay on the record");
      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" &&
          (q.queryKey[0].startsWith("payment-certificates") ||
            q.queryKey[0].startsWith("projects/")),
      });
      invalidateProjectCommercials(queryClient, String(projectId));
      refetch?.();
      setReversing(null);
      setReason("");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || "Could not reverse the payment.");
    } finally {
      setBusy(false);
    }
  };

  const refreshAfterPayment = () => {
    queryClient.invalidateQueries({
      predicate: (q) =>
        typeof q.queryKey[0] === "string" &&
        (q.queryKey[0].startsWith("payment-certificates") || q.queryKey[0].startsWith("projects/")),
    });
    invalidateProjectCommercials(queryClient, String(projectId));
    refetch?.();
  };

  const answer = async (receipt: PaymentReceiptRow, received: boolean, note = "") => {
    setBusy(true);
    try {
      await postData({ url: `payment-receipts/${receipt.id}/confirm/`, data: { received, note } });
      toast.success(received ? "Receipt confirmed" : "Reported not received — the payment is reversed");
      refreshAfterPayment();
      setConfirming(null);
      setDenying(null);
      setDenyNote("");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || "Could not record your answer.");
    } finally {
      setBusy(false);
    }
  };

  const correct = async () => {
    if (!correcting || !correctionReason.trim()) return;
    setBusy(true);
    try {
      await postData({
        url: `payment-receipts/${correcting.id}/correct-confirmation/`,
        data: { reason: correctionReason.trim() },
      });
      toast.success("Corrected — the payment is reversed and the employer is told");
      refreshAfterPayment();
      setCorrecting(null);
      setCorrectionReason("");
    } catch (e: unknown) {
      const server = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(server || "Could not correct your confirmation.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading the payment position…</p>;
  if (isError || !data) {
    // "Nothing outstanding" over a failed read is an all-clear nobody can check.
    return <p className="text-sm text-muted-foreground">The payment position could not be loaded.</p>;
  }
  if (!data.isPayable) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is payable until this certificate is posted.
      </p>
    );
  }

  const due = data.due;
  const receipts = data.receipts ?? [];
  // The server decides who records a payment (finance.edit, or the Employer
  // role); a missing flag is a no, never a guess from finance.edit.
  const canRecord = data.canRecordPayment === true;
  const vatUnverified = data.certifiedBasis === "net_amount_unverified";

  return (
    <div className="space-y-3">
      {/* Outstanding is the number the user came for, so it is the one large
          figure — and "Record payment" sits beside it rather than below the
          receipts and the as-at footnote, where it was the quietest control
          on a screen the product deep-links people to in order to use it. */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-xs text-muted-foreground">Outstanding</span>
          <div className="text-2xl tabular-nums text-foreground">
            {money(data.outstandingAmount)}
          </div>
        </div>
        {canRecord && !data.isFullySettled && (
          <Button size="sm" onClick={() => setRecording(true)}>
            Record payment
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Figure
          label={vatUnverified ? "Payable (VAT basis unverified)" : "Payable incl. VAT"}
          value={money(data.certifiedAmount)}
        />
        <Figure label="Received" value={money(data.receivedAmount)} />
        {vatUnverified && <UnverifiedNote count={1} />}
      </div>

      <div className="border-t border-border pt-2.5">
        {due?.computable === false ? (
          /* No date at all — not "—", which would read as a missing value
             rather than as a figure the contract cannot yet supply. */
          <p className="text-xs text-muted-foreground">{due.reason || "The due date cannot be computed."}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Due</span>
              <span className="flex items-center gap-2 text-sm tabular-nums">
                {day(due?.dueDate)}
                {data.isOverdue && (
                  <Badge variant="danger">
                    {data.daysPastDue} day{data.daysPastDue === 1 ? "" : "s"} past due
                  </Badge>
                )}
              </span>
            </div>
            {due?.calculation && (
              <p className="mt-1 text-xs text-muted-foreground">{due.calculation}</p>
            )}
            {/* Verbatim. See the module docstring: an overdue count on a
                fallback basis must never travel without it. */}
            {due?.basisIsContractual === false && due?.warning && <Note>{due.warning}</Note>}
            {due?.terms?.configured === false && due?.terms?.provenance && (
              /* The provenance sentence as the server wrote it. It previously
                 had `provenance.split(":")[0]` spliced into copy — a raw
                 token, lowercase and unpredictable, mid-sentence. */
              <p className="mt-1 text-xs text-muted-foreground">
                No payment terms are set for this project. {due.terms.provenance}
              </p>
            )}
          </>
        )}
      </div>

      {data.interest && (
        <div className="border-t border-border pt-2.5">
          <InterestBlock interest={data.interest} />
        </div>
      )}

      <div className="border-t border-border pt-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Receipts
        </p>
        {receipts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing received yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {receipts.map((r) => {
              /*
                A reversal is not a delete. The original stays, marked; the
                offsetting row is its own receipt. Hide either and the
                received total stops reconciling with the visible rows.
              */
              const withdrawn = r.status === "reversed";
              return (
                <li key={r.id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    {/* Only the date and reference are struck through: a struck
                        reason or badge cannot be read, and the reason is the point. */}
                    <span className={withdrawn ? "text-muted-foreground" : ""}>
                      <span className={withdrawn ? "line-through" : ""}>
                        {day(r.receivedOn)}
                        {r.reference && <span className="text-muted-foreground"> · {r.reference}</span>}
                      </span>
                      {r.status === "reversal" && (
                        <Badge variant="neutral" className="ml-2">
                          <Undo2 className="h-3 w-3 mr-1" />
                          Reversal
                        </Badge>
                      )}
                      {withdrawn && (
                        <Badge variant="neutral" className="ml-2">
                          Reversed
                        </Badge>
                      )}
                      {withdrawn && r.reversalReason && (
                        <span className="block text-xs text-muted-foreground">{r.reversalReason}</span>
                      )}
                      {(r.proofUrl || (r.confirmation && r.status !== "reversal")) && (
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                          {r.confirmation && r.status !== "reversal" && (
                            <Badge variant={CONFIRMATION_BADGE[r.confirmation].variant}>
                              {CONFIRMATION_BADGE[r.confirmation].label}
                            </Badge>
                          )}
                          {r.proofUrl && (
                            <a href={resolveApiUrl(r.proofUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10 hover:underline">
                              <FileText className="h-3 w-3" aria-hidden="true" />
                              Proof of payment
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`tabular-nums ${withdrawn ? "text-muted-foreground line-through" : ""}`}>
                        {money(r.amount)}
                      </span>
                      {r.canCorrectConfirmation && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={busy} onClick={() => setCorrecting(r)}>
                          Correct…
                        </Button>
                      )}
                      {canReverse && r.status === "recorded" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                          onClick={() => setReversing(r)}
                        >
                          Reverse
                        </Button>
                      )}
                    </span>
                  </div>
                  {r.canConfirm && (
                    /* A question, not a status: "Received" beside an amount
                       read as a label, and one click confirmed it. */
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                      <span className="text-xs text-foreground">Did {money(r.amount)} arrive in your account?</span>
                      <span className="flex gap-1.5">
                        <Button size="sm" className="h-7 px-2.5 text-xs" disabled={busy} onClick={() => setConfirming(r)}>
                          Yes, received…
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy}
                          onClick={() => setDenying(r)}
                        >
                          No, not received…
                        </Button>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {/* A screenshot of these figures pasted into a dispute must carry its
            own date — every one of them is "as at" a day. */}
        As at {day(data.asAt)}.
      </p>

      {/*
        Reversal, not deletion. The reason is mandatory server-side and the
        wording here says why rather than just demanding one: this moves a
        balance and the interest computed from it.
      */}
      <Dialog open={!!reversing} onOpenChange={(v) => !busy && !v && setReversing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse this payment?</DialogTitle>
            <DialogDescription>
              {reversing && `${money(reversing.amount)} received ${day(reversing.receivedOn)}`}
              {reversing?.reference ? ` · ${reversing.reference}` : ""}. The receipt
              stays on the record and an offsetting row is written beside it, so
              the trail shows both. The outstanding balance goes back up and
              interest resumes running on it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Why it is being reversed"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is it being reversed?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reverse} disabled={!reason.trim() || busy}>
              {busy ? "Reversing…" : "Reverse payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The contractor's word that the money is in their account: restated, then confirmed. */}
      <Dialog open={!!confirming} onOpenChange={(v) => !busy && !v && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm the money is in your account</DialogTitle>
            <DialogDescription>
              Check your bank statement first. Confirming tells the employer this payment arrived.
            </DialogDescription>
          </DialogHeader>
          {confirming && (
            <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium tabular-nums">{money(confirming.amount)}</dd>
              <dt className="text-muted-foreground">Paid on</dt>
              <dd className="tabular-nums">{day(confirming.receivedOn)}</dd>
              <dt className="text-muted-foreground">Payer reference</dt>
              <dd>{confirming.reference || "None given"}</dd>
              {confirming.proofUrl && (
                <>
                  <dt className="text-muted-foreground">Proof</dt>
                  <dd>
                    <a href={resolveApiUrl(confirming.proofUrl)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {confirming.proofName || "Proof of payment"}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          )}
          <p className="text-xs text-muted-foreground">
            Pressed in error? You can correct it, with a reason, for 14 days after confirming.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>
              Back
            </Button>
            <Button onClick={() => confirming && answer(confirming, true)} disabled={busy}>
              {busy ? "Saving…" : "Yes, it arrived"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* "Not received" reverses the payment, so it asks what went wrong. */}
      <Dialog open={!!denying} onOpenChange={(v) => !busy && !v && setDenying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>The payment did not arrive?</DialogTitle>
            <DialogDescription>
              {denying && restate(denying)}. Saying it did not arrive reverses it, so the certificate is owed again,
              and the employer is told why. If you press this in error, the employer has to record the payment again.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="What is wrong"
            value={denyNote}
            onChange={(e) => setDenyNote(e.target.value)}
            rows={3}
            placeholder="What is wrong — for example, the account it was paid into"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenying(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => denying && answer(denying, false, denyNote.trim())} disabled={!denyNote.trim() || busy}>
              {busy ? "Saving…" : "Not received"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* A "received" pressed in error: guarded by a reason, and kept on the record. */}
      <Dialog open={!!correcting} onOpenChange={(v) => !busy && !v && setCorrecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct your confirmation?</DialogTitle>
            <DialogDescription>
              {correcting && `You confirmed ${restate(correcting)} arrived.`} If it did not, say why. The payment is
              reversed, so the certificate is owed again, and the employer is told. Your original confirmation stays
              on the record.
              {correcting?.correctableUntil ? ` You can do this until ${day(correcting.correctableUntil)}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Why you are correcting it"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            rows={3}
            placeholder="For example: pressed in error; it is not on our bank statement"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrecting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={correct} disabled={!correctionReason.trim() || busy}>
              {busy ? "Saving…" : "It did not arrive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog
        open={recording}
        onOpenChange={setRecording}
        certificateId={certificateId}
        projectId={projectId}
        pcNumber={data.pcNumber}
        outstanding={data.outstandingAmount}
        serverToday={data.asAt}
        unverified={data.certifiedBasis === "net_amount_unverified"}
        payeeAccounts={data.payeeAccounts}
        onRecorded={() => refetch?.()}
      />
    </div>
  );
}
