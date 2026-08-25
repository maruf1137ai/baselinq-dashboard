/**
 * Helpers for the Werner spec certificate page (Task 5).
 *
 * Pure functions only — easy to unit-test, no React, no API calls.
 * Certificate data is fetched separately and passed in.
 */

import { format, parseISO } from "date-fns";

export type CertificateType = "si" | "vo" | "claim" | "ic" | "pc" | "rfi" | "gi" | "cpi";

/** One row of the JBCC form — mirrors tasks/pc_jbcc.py::build_form()'s "lines" entries.
 *  Money values are fixed-2dp strings straight from the backend, or null for a cell the
 *  form has no box for (never coerced to "0.00" — see pc_jbcc.py's own module docstring
 *  on why an unmodelled cell must stay empty rather than asserted as nil). */
export type JbccFormLine = {
  line: string;
  direction: "Less" | "Add" | null;
  label: string;
  cells: string[];
  columns: { A: string | null; B: string | null; C: string | null; D: string | null };
  percentage?: string;
  receiving_party?: "employer" | "contractor";
  note?: string;
};

export type JbccForm = {
  contract_form: string;
  form_revision: string;
  currency: string;
  retention_rate_pct: string;
  tax_rate_pct: string;
  lines: JbccFormLine[];
  security_status: {
    d17_under_50: boolean | null;
    d17_over_50: boolean | null;
    practical_completion: boolean | null;
    final_completion: boolean | null;
  };
  security_held: string;
  omissions: Array<{ line: string; column: string; reason: string }>;
  totals: {
    valuation: string;
    retention: string;
    net_certified: string;
    subtotal_before_tax: string;
    tax: string;
    certified_amount_due: string;
    receiving_party: "employer" | "contractor";
  };
};

export type CertificateData = {
  type: CertificateType;
  number: string;
  title: string;
  description: string;
  project: { id?: number; name: string; project_number?: string };
  signed_at: string | null;
  issued_at: string | null;
  signed_by: { name: string; email: string; role: string } | null;
  claimed_by?: { name: string; email?: string; role: string } | null;
  audit_trail: Array<{ description: string; actor: string; at: string | null }>;
  // type-specific
  // Site Instruction
  discipline?: string;
  location?: string;
  urgency?: string;
  vo_reference?: string;
  // Request for Information
  question?: string;
  response_answer?: string;
  responded_by?: string | null;
  responded_at?: string | null;
  // General Instruction
  direction?: string;
  // Critical Path Item
  duration?: string;
  start_date?: string | null;
  finish_date?: string | null;
  predecessors?: string;
  successors?: string;
  approved_amount?: string;
  time_extension_approved?: number | null;
  currency?: string;
  intention_at?: string | null;
  risk_level?: string | null;
  raised_by?: string | null;
  respondent?: string | null;
  time_days_claimed?: number | null;
  cost_amount_claimed?: string;
  formal_claim_at?: string | null;
  // Payment Certificate
  period?: string;
  certificate_date?: string | null;
  claim_received_at?: string | null;
  jbcc_form?: JbccForm | null;
  jbcc_form_error?: string;
};

const TYPE_LABEL: Record<CertificateType, string> = {
  si: "Site Instruction",
  vo: "Variation Order",
  claim: "Formal Claim",
  ic: "Intention to Claim",
  rfi: "Request for Information",
  gi: "General Instruction",
  cpi: "Critical Path Item",
  // Bare noun, same convention as the others above — CertificatePage.tsx appends
  // " Certificate" itself, so this must NOT already contain the word "Certificate"
  // (that produced the literal "CERTIFICATE CERTIFICATE" header bug this fixes).
  pc: "Payment",
};

/** Human title for the certificate header. */
export function getCertificateTypeLabel(type: string | undefined | null): string {
  if (!type) return "Certificate";
  const t = type.toLowerCase() as CertificateType;
  return TYPE_LABEL[t] ?? "Certificate";
}

/** Format an ISO date for display. Returns "—" for nulls so the cert
 *  never has a blank cell. */
export function formatCertDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "PPP 'at' p");
  } catch {
    return String(iso);
  }
}

/**
 * U+00A0 NO-BREAK SPACE. Named so the intent survives an editor that eats the
 * glyph, and so a reviewer can see which of the two spaces this is.
 */
const NBSP = "\u00a0";

/**
 * A number as South African convention writes it: `250\u00a0000,00` — space
 * grouping, comma decimal.
 *
 * Written out rather than delegated to `toLocaleString("en-ZA", …)`.
 *
 * The separator `toLocaleString` emits under ICU is already U+00A0 — that was
 * checked by codepoint, and `certificate.test.ts` asserts the byte pair. So
 * this is NOT the ASCII-space defect that was reported against this function;
 * that report was wrong, and the note in `src/lib/formatCurrency.ts` repeating
 * it should be corrected.
 *
 * The real exposure is that the output depends on the ICU locale data of
 * whatever engine renders it. A build without `en-ZA` falls back to the
 * default locale, and `250,000.00` on a ZAR certificate is not a typographic
 * difference — comma and full stop swap roles between conventions, so the
 * figure can be read as a thousandth of itself. A certificate is a document
 * someone relies on; it has to render the same everywhere, so the format is
 * pinned here instead of inherited from the reader's browser.
 */
function formatAmountZA(num: number): string {
  const [whole, cents] = Math.abs(num).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${num < 0 ? "-" : ""}${grouped},${cents}`;
}

/**
 * Format a currency value with the project's currency code.
 * Falls back to no symbol when the value is missing.
 *
 * The space between the code and the amount is non-breaking for the same
 * reason the grouping spaces are: a `ZAR` orphaned onto the line above its
 * figure, or a figure that wraps at a thousands separator, both leave a
 * syntactically complete and wrong number on one line of a certificate.
 */
export function formatCertCurrency(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(num)) return String(amount);
  const formatted = formatAmountZA(num);
  return currency ? `${currency}${NBSP}${formatted}` : formatted;
}

/** Build the public certificate URL the user can share. */
export function buildCertificateUrl(
  type: string | null | undefined,
  token: string | null | undefined,
  origin: string = (typeof window !== "undefined" ? window.location.origin : ""),
): string {
  if (!type || !token) return "";
  return `${origin}/certificates/${type.toLowerCase()}/${token}`;
}
