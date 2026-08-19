/**
 * Helpers for the Werner spec certificate page (Task 5).
 *
 * Pure functions only — easy to unit-test, no React, no API calls.
 * Certificate data is fetched separately and passed in.
 */

import { format, parseISO } from "date-fns";

export type CertificateType = "si" | "vo" | "claim" | "ic";

export type CertificateData = {
  type: CertificateType;
  number: string;
  title: string;
  description: string;
  project: { id?: number; name: string; project_number?: string };
  signed_at: string | null;
  issued_at: string | null;
  signed_by: { name: string; email: string; role: string } | null;
  audit_trail: Array<{ description: string; actor: string; at: string | null }>;
  // type-specific
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
};

const TYPE_LABEL: Record<CertificateType, string> = {
  si: "Site Instruction",
  vo: "Variation Order",
  claim: "Formal Claim",
  ic: "Intention to Claim",
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
