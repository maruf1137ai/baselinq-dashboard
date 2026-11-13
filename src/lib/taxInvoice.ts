/**
 * The contractor's tax invoice, as tasks/tax_invoices.py::to_payload sends it.
 * Money arrives as strings (Decimal on the server) and is formatted, never
 * re-computed, on the client.
 */
export type TaxInvoiceStatus = "draft" | "issued" | "credited" | "void";

export interface TaxInvoiceParty {
  name?: string;
  registrationNumber?: string;
  vatNumber?: string;
  address?: string;
  email?: string;
}

export interface TaxInvoice {
  id: number;
  paymentCertificateId: number;
  pcNumber: string;
  status: TaxInvoiceStatus;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  supplier: TaxInvoiceParty;
  recipient: TaxInvoiceParty;
  description: string;
  amountExclVat: string;
  vatRatePct: string;
  vatAmount: string;
  totalInclVat: string;
  advanceRecovery: string;
  issuedAt: string | null;
  issuedBy: string | null;
  creditNoteNumber: string | null;
  creditedAt: string | null;
  reason: string | null;
  projectName?: string;
  /** "uploaded": the contractor's own document, matched to the certificate. */
  source?: "drafted" | "uploaded";
  /** The project's currency (project/currency.py). */
  currency?: string;
  documentUrl?: string | null;
  documentName?: string | null;
}

export const TAX_INVOICE_STATUS_LABEL: Record<TaxInvoiceStatus, string> = {
  draft: "Draft — not issued",
  issued: "Issued",
  credited: "Cancelled by credit note",
  void: "Discarded",
};
