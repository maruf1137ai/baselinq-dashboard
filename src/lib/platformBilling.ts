/**
 * Baselinq's platform fee billing — shapes and helpers shared by the admin
 * panel (where superusers manage it) and a project's Finance page (where the
 * customer reads it).
 *
 * Shapes mirror billing/invoicing.py::serialize_invoice and
 * billing/serializers.py. Invoice amounts arrive as STRINGS and stay strings
 * until rendered: they are money, and parsing early is how a cent goes missing.
 */
import { formatZAR } from "@/lib/formatCurrency";

export interface InvoiceLine {
  id: number;
  feeChargeId: number | null;
  isCredit: boolean;
  /** False once the invoice was cancelled and the charge released for re-billing. */
  isLive: boolean;
  description: string;
  sourceRef: string;
  baseAmount: string;
  feeRatePct: string;
  feeAmount: string;
  vatRatePct: string;
  vatAmount: string;
  totalAmount: string;
}

export type InvoiceStatus = "draft" | "issued" | "settled" | "cancelled";
/** What a person reads — `issued` splits into unpaid / overdue by due date. */
export type InvoiceDisplayStatus = "draft" | "unpaid" | "overdue" | "paid" | "cancelled";

export interface SupplierDetails {
  legalName?: string;
  vatNumber?: string;
  registrationNumber?: string;
  address?: string;
  billingEmail?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  bankSwiftCode?: string;
}

export interface RecipientDetails {
  name?: string;
  address?: string;
  vatNumber?: string;
  registrationNumber?: string;
  missing?: string[];
}

export interface Invoice {
  id: number;
  projectId: number;
  projectName: string;
  projectNumber: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  displayStatus: InvoiceDisplayStatus;
  isSettled: boolean;
  isOutstanding: boolean;
  isOverdue: boolean;
  dueOn: string | null;
  supplierDetails: SupplierDetails;
  /** The employer, frozen at build/issue (VAT Act s20(4)). */
  recipient?: RecipientDetails;
  /** Baselinq staff can hold off the 30-day read-only lock until this date. */
  graceUntil?: string | null;
  periodStart: string;
  periodEnd: string;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  billingContactName: string;
  billingContactEmail: string;
  notes: string;
  issuedAt: string | null;
  settledAt: string | null;
  settledOn: string | null;
  settledReference: string;
  cancelledAt: string | null;
  cancellationReason: string;
  createdAt: string;
  lines?: InvoiceLine[];
  /**
   * Invoice VAT less the sum of its lines' own VAT. The invoice charges VAT
   * once on its fee total, so this is a cent or two, or "0.00".
   */
  vatRounding?: string;
}

/** Where a fee stands — derived server-side from its invoice (charge_billing_state). */
export type ChargeBillingState =
  | "not_invoiced"
  | "draft"
  | "invoiced"
  | "overdue"
  | "paid"
  | "reversed"
  | "credit";

export interface FeeChargeRow {
  id: number;
  status: "active" | "reversed" | "reversal";
  eventType: "pc_posted" | "vo_approved";
  sourceRef: string;
  baseAmount: number;
  feeRatePct: number;
  feeAmount: number;
  vatRatePct: number;
  vatAmount: number;
  totalAmount: number;
  capReached: boolean;
  reversalReason: string;
  createdAt: string | null;
  billingState: ChargeBillingState;
  invoiceId: number | null;
  invoiceNumber: string | null;
  projectId?: number;
  projectName?: string;
}

type BadgeVariant = "success" | "warning" | "neutral" | "danger";

export const INVOICE_STATUS: Record<InvoiceDisplayStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Draft", variant: "neutral" },
  unpaid: { label: "Unpaid", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  paid: { label: "Paid", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

export const CHARGE_STATE: Record<ChargeBillingState, { label: string; variant: BadgeVariant }> = {
  not_invoiced: { label: "Not invoiced", variant: "neutral" },
  draft: { label: "On draft", variant: "neutral" },
  invoiced: { label: "Invoiced", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  paid: { label: "Paid", variant: "success" },
  reversed: { label: "Reversed", variant: "neutral" },
  credit: { label: "Credit", variant: "neutral" },
};

/** VAT on Baselinq's fee: 15%, fixed by law — never a setting. */
export const VAT_RATE_PCT = 15;

/**
 * Rand through the app's single formatter. `signed` renders a credit with an
 * explicit minus: the server carries direction as a flag, not a sign.
 */
export function money(raw: string | number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  return formatZAR(opts.signed ? -Math.abs(n) : n);
}

/** "1%" / "0.75%" — no trailing zeros on a rate. */
export function ratePct(value: number | string | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${Number(n.toFixed(3))}%` : "—";
}

/**
 * The VAT label for an invoice, from the rate its lines were charged at —
 * "VAT (15%)" — rather than assumed. Mixed rates read "VAT"; an invoice with
 * no lines loaded falls back to the fixed platform rate.
 */
export function invoiceVatLabel(lines: Pick<InvoiceLine, "vatRatePct">[] | undefined): string {
  const rates = new Set((lines ?? []).map((l) => ratePct(l.vatRatePct)));
  if (rates.size === 0) return `VAT (${VAT_RATE_PCT}%)`;
  return rates.size === 1 ? `VAT (${[...rates][0]})` : "VAT";
}

/** The server's refusal reason — billing endpoints send `{error, code}`. */
export function serverReason(e: unknown, fallback: string): string {
  const err = e as { message?: string; response?: { data?: Record<string, string> } } | null;
  const d = err?.response?.data;
  return d?.error || d?.detail || d?.message || err?.message || fallback;
}

/** The supplier block, as printable lines. Empty values are skipped. */
export function bankDetailLines(s: SupplierDetails, reference?: string | null): [string, string][] {
  const rows: [string, string | undefined | null][] = [
    ["Bank", s.bankName],
    ["Account name", s.bankAccountName],
    ["Account number", s.bankAccountNumber],
    ["Branch code", s.bankBranchCode],
    ["SWIFT", s.bankSwiftCode],
    ["Payment reference", reference],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

/** The route that shows one invoice as a printable document. */
export const invoicePath = (id: number) => `/invoices/${id}`;

/**
 * The issuer fields a tax invoice cannot be valid without.
 *
 * Reported as a list of what is MISSING rather than as a boolean, so the
 * warning on the document can name them — "incomplete" tells a staff member
 * nothing they can act on. `InvoiceDetail` used to ask the same question as a
 * boolean and use it to decide whether to render the issuer block AT ALL,
 * which meant an invoice missing its VAT number quietly went out with no
 * supplier on it whatsoever.
 */
export function missingIssuerFields(s: SupplierDetails): string[] {
  const required: [string, string | undefined][] = [
    ["registered name", s.legalName],
    ["VAT number", s.vatNumber],
    ["registration number", s.registrationNumber],
    ["address", s.address],
  ];
  return required.filter(([, v]) => !v || !v.trim()).map(([label]) => label);
}
