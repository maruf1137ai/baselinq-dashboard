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
 * Format a currency value with the project's currency code.
 * Falls back to no symbol when the value is missing.
 */
export function formatCertCurrency(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(num)) return String(amount);
  const formatted = num.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${formatted}` : formatted;
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
