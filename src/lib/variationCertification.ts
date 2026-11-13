/**
 * What each variation has had certified, and what is left to claim.
 *
 * Read from `projects/{id}/uncertified-variations/` — the same ledger
 * `pc_integrity.check` enforces when a certificate is saved — so the register
 * cannot offer a figure the certificate drawer would then refuse. Nothing here
 * recomputes a rand; it only decides what a register cell may say.
 *
 * Certified means POSTED. Value on a draft, submitted or approved certificate
 * is claimed (it reduces Remaining) but not certified, and is shown as such.
 *
 * Figures are excl. VAT, the basis of the register's Value column.
 */

export interface VariationCertification {
  approved: number;
  /** On posted certificates. */
  certified: number;
  /** On certificates that are live but not yet posted. */
  unposted: number;
  /** Not yet on any certificate. Never negative. */
  remaining: number;
  /** How far the certificates exceed the approved value; 0 when they don't. */
  over: number;
}

export type CertificationCell =
  /** Not approved, so nothing about it can be certified yet. */
  | { kind: "not-certifiable" }
  /** An omission or zero-value variation: the ledger values these at zero. */
  | { kind: "not-tracked" }
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "figures"; figures: VariationCertification };

export type CertificationStatus = "loading" | "error" | "ready";

const money = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Keys the payload's rows by VO number. Rows without one are dropped. */
export function toCertificationMap(payload: any): Record<string, VariationCertification> {
  const out: Record<string, VariationCertification> = {};
  for (const row of payload?.variations ?? []) {
    const number = row?.voNumber;
    if (!number) continue;
    // A backend older than the posted/unposted split has no certifiedPosted.
    // Absent is not zero: leave the row out, so the register says
    // "Unavailable" rather than "R 0,00 certified" on a fully certified
    // variation. Lets this frontend deploy ahead of the backend safely.
    if (row.certifiedPosted === undefined) continue;
    const approved = money(row.approvedValue);
    const claimed = money(row.certifiedToDate);
    out[number] = {
      approved,
      certified: money(row.certifiedPosted),
      unposted: money(row.onUnpostedCertificates),
      remaining: money(row.remaining),
      over: row.overCertified ? Math.max(claimed - approved, 0) : 0,
    };
  }
  return out;
}

/**
 * What one register row's Certified and Remaining cells should say.
 *
 * `approved` is whether the variation's status is Approved or Closed — the two
 * the server treats as certifiable. `value` is the register's own excl. VAT
 * value, used only to recognise an omission.
 */
export function certificationCell(
  voNumber: string | null | undefined,
  approved: boolean,
  value: number,
  byNumber: Record<string, VariationCertification>,
  status: CertificationStatus,
): CertificationCell {
  if (!approved) return { kind: "not-certifiable" };
  if (value <= 0) return { kind: "not-tracked" };
  if (status === "loading") return { kind: "loading" };
  if (status === "error") return { kind: "unavailable" };
  const figures = voNumber ? byNumber[voNumber] : undefined;
  // Approved here but absent there: the two reads disagree about this
  // variation (it was approved after the ledger was read, or carries no VO
  // number). Unknown, not zero.
  if (!figures) return { kind: "unavailable" };
  return { kind: "figures", figures };
}
