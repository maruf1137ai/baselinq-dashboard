/**
 * Baselinq's platform fee invoice as a document.
 *
 * WHY THIS FILE CHANGED SHAPE
 * ---------------------------
 * A payment certificate — the customer's own document — gets a full A4 page
 * and a server-rendered PDF. Baselinq's tax invoice to that same customer got
 * a `max-h-[300px]` scrolling box inside a modal, and dropped five fields the
 * server was already sending, two of them mandatory on a South African tax
 * invoice. A supplier that cannot produce its own invoice as a document is
 * asking to be paid on a screenshot.
 *
 * So `InvoiceDocument` is now the document, rendered identically for the
 * customer at /invoices/:id and for Baselinq staff in the admin panel — the
 * intent `billingShared.tsx` already stated and could not keep while the body
 * was a modal fragment. `InvoicePreview` is what a dialog shows instead: a
 * summary whose primary action opens the document.
 *
 * WHAT A TAX INVOICE MUST CARRY (VAT Act s20(4)) and where it comes from:
 *   the words "tax invoice"               → the document title
 *   the supplier's name, address, VAT no. → `supplierDetails`
 *   the recipient's name and address      → NOT ON THE MODEL. See below.
 *   an invoice number and a date          → `invoiceNumber`, `issuedAt`
 *   a description and the consideration   → `lines`, `subtotal`/`vatAmount`
 *
 * THE RECIPIENT GAP IS DELIBERATELY VISIBLE. `PlatformInvoice` holds
 * `billingContactName` and `billingContactEmail` — a person — and carries no
 * recipient legal name, registration number, VAT number or address at all.
 * Nothing here invents them, and nothing borrows them from the project: a
 * project's name is not its employer's registered name, and guessing one onto
 * a tax invoice is worse than leaving it blank. The block renders the contact
 * as "Attention" and states, where the company lines belong, that they are not
 * captured — so the gap is Baselinq's to see rather than the client auditor's
 * to discover. The model change is being handled separately.
 *
 * VAT is always its own line (client meeting, 28 Oct 2026: "make sure you are
 * displaying the VAT correctly, all the time"): every line shows fee and VAT,
 * and the totals read Platform fee → VAT (15%) → Total due.
 */
import React from "react";
import { AlertTriangle, ArrowUpRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/dateUtils";
import {
  INVOICE_STATUS,
  type Invoice,
  bankDetailLines,
  invoicePath,
  invoiceVatLabel,
  missingIssuerFields,
  money,
  ratePct,
} from "@/lib/platformBilling";

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, "displayStatus"> }) {
  const s = INVOICE_STATUS[invoice.displayStatus] ?? INVOICE_STATUS.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

/** A label over a value — the shape every block on the document uses. */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground mt-0.5">{children}</p>
  </div>
);

const BlockHeading = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{children}</p>
);

const Warning = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

const TH = "px-4 py-2.5 text-left text-xs font-normal text-muted-foreground whitespace-nowrap";
const TH_NUM = `${TH} !text-right`;
const TD = "px-4 py-3 text-sm text-foreground align-top";
const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

/**
 * The invoice, in full, as the document both the customer and Baselinq read.
 *
 * `isStaff` adds the sentence saying where to fix a gap. It never changes
 * WHICH gaps are shown: a missing VAT number is visible to the person being
 * billed either way, because it is their problem too.
 */
export function InvoiceDocument({ invoice, isStaff }: { invoice: Invoice; isStaff?: boolean }) {
  const lines = invoice.lines ?? [];
  const supplier = invoice.supplierDetails ?? {};
  const bank = bankDetailLines(supplier, invoice.invoiceNumber);
  const owed = invoice.displayStatus === "unpaid" || invoice.displayStatus === "overdue";
  const isDraft = invoice.status === "draft";
  const issuerGaps = missingIssuerFields(supplier);
  const recipient = invoice.recipient ?? {};
  const recipientGaps = recipient.missing ?? ["registered name", "physical address", "VAT number"];

  return (
    <article className="relative">
      {isDraft && (
        <>
          {/*
            A draft has no invoice number, so it is not a tax invoice and must
            never be mistaken for one — including by somebody holding a printout
            of it. Hence BOTH a diagonal watermark, which survives printing, and
            a banner in words: the rotated text is decorative and a screen
            reader skips it, which is why the banner carries the statement.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            <span className="-rotate-[30deg] select-none whitespace-nowrap text-[64px] font-medium uppercase tracking-[0.2em] text-destructive/10">
              Draft
            </span>
          </div>
          <div className="relative mb-6">
            <Warning>
              <span>
                <span className="font-medium">Draft — not a valid tax invoice.</span> It carries no
                invoice number and has not been issued. Nothing is payable on it.
              </span>
            </Warning>
          </div>
        </>
      )}

      {/* ── Masthead ───────────────────────────────────────────────────── */}
      <header className="relative border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-normal tracking-tight text-foreground">TAX INVOICE</h1>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {invoice.invoiceNumber || "Not yet numbered"}
            </p>
          </div>
          <InvoiceStatusBadge invoice={invoice} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {/*
            Invoice date is `issuedAt` and nothing else. It was never rendered
            anywhere in the product, on a document whose date is mandatory — and
            it is NOT `createdAt`: a draft built on the 29th and issued on the
            2nd is dated the 2nd. An unissued invoice has no date, which is
            stated rather than filled in with today.
          */}
          <Field label="Invoice date">
            {invoice.issuedAt ? formatDate(invoice.issuedAt, "long") : "Not issued"}
          </Field>
          <Field label="Payment due">
            {invoice.dueOn ? formatDate(invoice.dueOn, "long") : "On issue"}
          </Field>
          {/*
            A RANGE. `periodStart` was sent all along and dropped, so the
            document said "fees up to 31 October" without saying from when,
            which on a supply period is half the statement.
          */}
          <Field label="Supply period">
            {formatDate(invoice.periodStart, "long")} – {formatDate(invoice.periodEnd, "long")}
          </Field>
        </div>
      </header>

      {/* ── Billed by / Billed to ──────────────────────────────────────── */}
      <div className="relative grid gap-6 border-b border-border py-6 sm:grid-cols-2">
        <section>
          <BlockHeading>Billed by</BlockHeading>
          <div className="space-y-0.5 text-sm text-foreground">
            <p className="font-medium">{supplier.legalName || "Supplier name not captured"}</p>
            {supplier.registrationNumber && (
              <p className="tabular-nums">Reg. no. {supplier.registrationNumber}</p>
            )}
            {supplier.vatNumber && <p className="tabular-nums">VAT no. {supplier.vatNumber}</p>}
            {supplier.address && <p className="whitespace-pre-line">{supplier.address}</p>}
            {supplier.billingEmail && (
              <p className="break-all text-muted-foreground">{supplier.billingEmail}</p>
            )}
          </div>
          {issuerGaps.length > 0 && (
            <div className="mt-2">
              <Warning>
                This invoice does not carry the supplier's {issuerGaps.join(", ")}. A tax invoice is
                not valid without them.
                {isStaff ? " Capture them in Admin Panel → Billing → Settings." : ""}
              </Warning>
            </div>
          )}
        </section>

        <section>
          <BlockHeading>Billed to</BlockHeading>
          <div className="space-y-0.5 text-sm text-foreground">
            {recipient.name && <p className="font-medium">{recipient.name}</p>}
            {recipient.registrationNumber && (
              <p className="tabular-nums">Reg. no. {recipient.registrationNumber}</p>
            )}
            {recipient.vatNumber && <p className="tabular-nums">VAT no. {recipient.vatNumber}</p>}
            {recipient.address && <p className="whitespace-pre-line">{recipient.address}</p>}
            {/*
              "Attention", not a company line, because that is what the field
              is: `billingContactName` is a person.
            */}
            <p>
              <span className="text-muted-foreground">Attention: </span>
              {invoice.billingContactName || "No billing contact set"}
            </p>
            {invoice.billingContactEmail && (
              <p className="break-all text-muted-foreground">{invoice.billingContactEmail}</p>
            )}
          </div>
          {recipientGaps.length > 0 && (
            <div className="mt-2">
              <Warning>
                This invoice does not carry the employer's {recipientGaps.join(", ")}. Capture them
                in the project's client details.
              </Warning>
            </div>
          )}
        </section>
      </div>

      {/* ── What it is for ─────────────────────────────────────────────── */}
      <div className="relative grid gap-4 border-b border-border py-6 sm:grid-cols-2">
        <Field label="Project">
          {invoice.projectName}
          {/* The project NUMBER is what a client's accounts department codes
              against, and it was sent and never shown. */}
          {invoice.projectNumber ? (
            <span className="tabular-nums text-muted-foreground"> · {invoice.projectNumber}</span>
          ) : null}
        </Field>
        <Field label="For">Baselinq platform fee on certified commercial flow</Field>
      </div>

      {/* ── Lines ──────────────────────────────────────────────────────── */}
      <div className="relative py-6">
        {/* No inner scroll. A document shows every line it charges for; a 300px
            window over them meant an invoice could be paid without its last
            line ever having been on screen. */}
        {lines.length === 0 ? (
          <EmptyState variant="plain" size="sm" icon={FileText} title="No lines loaded" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className={TH}>Charge</th>
                  <th className={TH_NUM}>Fee base excl. VAT</th>
                  <th className={TH_NUM}>Rate</th>
                  <th className={TH_NUM}>Fee</th>
                  <th className={TH_NUM}>VAT</th>
                  <th className={TH_NUM}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className={TD}>
                      {/*
                        `sourceRef` is TEXT, not a link, and has to stay text
                        for now: the invoice line payload carries `feeChargeId`
                        and `sourceRef` only. `FeeCharge` itself holds
                        `sourcePcId` and `sourceVoId` — the Platform Fees tab
                        reads both — but `serialize_invoice`
                        (billing/invoicing.py:528) does not serialise them onto
                        the line, so there is no id here to link to. Add
                        sourcePcId/sourceVoId to that serializer and this
                        becomes a deep link to the certificate or contract
                        instruction the fee was raised on.
                      */}
                      <span className="text-foreground">{l.sourceRef || "Platform fee"}</span>
                      {l.description && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {l.description}
                        </span>
                      )}
                      {(l.isCredit || !l.isLive) && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {l.isCredit ? "Credit" : ""}
                          {l.isCredit && !l.isLive ? " · " : ""}
                          {!l.isLive ? "Released, will be re-billed" : ""}
                        </span>
                      )}
                    </td>
                    {/* Direction is carried by `isCredit`, never by the sign of
                        the figure: every amount on the payload is positive. */}
                    <td className={TD_NUM}>{money(l.baseAmount, { signed: l.isCredit })}</td>
                    <td className={TD_NUM}>{ratePct(l.feeRatePct)}</td>
                    <td className={TD_NUM}>{money(l.feeAmount, { signed: l.isCredit })}</td>
                    <td className={TD_NUM}>{money(l.vatAmount, { signed: l.isCredit })}</td>
                    <td className={TD_NUM}>{money(l.totalAmount, { signed: l.isCredit })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm tabular-nums">
            <div className="flex justify-between text-muted-foreground">
              <span>Platform fee</span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{invoiceVatLabel(lines)}</span>
              <span>{money(invoice.vatAmount)}</span>
            </div>
            {Number(invoice.vatRounding || 0) !== 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Includes VAT rounding of {money(invoice.vatRounding)} — VAT is charged once on the
                fee total
              </p>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-medium text-foreground">
              <span>{owed ? "Total due" : "Total"}</span>
              <span>{money(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── How it is payable ──────────────────────────────────────────── */}
      {bank.length > 0 && (
        <div className="relative rounded-lg border border-border bg-muted/50 p-4 text-sm">
          {/*
            Rendered whatever the status. These used to appear only while money
            was owed, so a settled invoice — the copy that gets filed, audited
            and queried a year later — showed no account it had ever been
            payable to. The urgency belongs to the status badge and the paid
            stamp, not to whether the banking block exists at all.
          */}
          <p className="mb-2 text-xs text-muted-foreground">
            {owed ? "Pay by bank transfer" : "Payable to"}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {bank.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-all text-foreground tabular-nums">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}

      {/* ── Notes, and what has happened to this invoice ───────────────── */}
      {invoice.notes && (
        <div className="relative mt-6 border-t border-border pt-4">
          {/* Staff can type notes on an invoice and they went nowhere at all —
              neither screen rendered the field. */}
          <BlockHeading>Notes</BlockHeading>
          <p className="whitespace-pre-line text-sm text-foreground">{invoice.notes}</p>
        </div>
      )}

      {invoice.status === "settled" && (
        <div className="relative mt-6 inline-flex flex-col rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <span className="text-sm font-medium text-green-900">
            Paid{invoice.settledOn ? ` on ${formatDate(invoice.settledOn, "long")}` : ""}
          </span>
          {invoice.settledReference && (
            <span className="text-xs text-green-800">Reference {invoice.settledReference}</span>
          )}
        </div>
      )}

      {invoice.status === "cancelled" && (
        <div className="relative mt-6 border-t border-border pt-4">
          <BlockHeading>Cancelled</BlockHeading>
          <p className="text-sm text-foreground">
            {invoice.cancellationReason || "No reason was recorded."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Its fees return to uninvoiced and appear on a later invoice.
          </p>
        </div>
      )}
    </article>
  );
}

/**
 * The dialog's version: enough to recognise the invoice and see what it comes
 * to, plus the way to the document itself.
 *
 * It is deliberately NOT the document. A tax invoice read through a 300px
 * scrolling window is the defect this file was opened to fix, and reproducing
 * the whole thing in a modal would reintroduce it one viewport at a time.
 */
export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const lines = invoice.lines ?? [];
  const owed = invoice.displayStatus === "unpaid" || invoice.displayStatus === "overdue";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-foreground tabular-nums">
          {invoice.invoiceNumber || "Draft — not yet numbered"}
        </span>
        <InvoiceStatusBadge invoice={invoice} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Invoice date</dt>
          <dd className="text-foreground">
            {invoice.issuedAt ? formatDate(invoice.issuedAt, "long") : "Not issued"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Payment due</dt>
          <dd className="text-foreground">
            {invoice.dueOn ? formatDate(invoice.dueOn, "long") : "On issue"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Supply period</dt>
          <dd className="text-foreground">
            {formatDate(invoice.periodStart, "long")} – {formatDate(invoice.periodEnd, "long")}
          </dd>
        </div>
      </dl>

      <div className="space-y-1 border-t border-border pt-3 text-sm tabular-nums">
        <div className="flex justify-between text-muted-foreground">
          <span>Platform fee</span>
          <span>{money(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{invoiceVatLabel(lines)}</span>
          <span>{money(invoice.vatAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-medium text-foreground">
          <span>{owed ? "Total due" : "Total"}</span>
          <span>{money(invoice.totalAmount)}</span>
        </div>
      </div>

      <Button asChild size="sm" className="w-full sm:w-auto">
        <Link to={invoicePath(invoice.id)}>
          Open the full tax invoice
          <ArrowUpRight className="ml-1.5 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * The name both dialogs already import. It is the PREVIEW — the document lives
 * at /invoices/:id, which is where this sends the reader.
 */
export const InvoiceDetail = InvoicePreview;
