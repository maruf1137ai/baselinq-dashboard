/**
 * How much of each variation earlier certificates have already consumed.
 *
 * The drawer sums this to work out what is left on a variation, and clamps the
 * operator's entry to it. That sum used to include *every* prior certificate
 * regardless of its status — so a certificate that was rejected, or one still
 * sitting in draft and never issued, ate into the remainder as if it had been
 * paid. The variation then showed nothing left to certify and the clamp forced
 * the entry to zero.
 *
 * Kept out of the component because it decides what a user is allowed to type.
 */
import { formatZAR } from "./formatCurrency";

/**
 * Statuses that mean a certificate never took effect, so it consumes nothing.
 *
 * Everything else consumes — pending, partial, approved, submitted, posted and
 * anything a future workflow adds. That default is the safe direction: a
 * certificate we fail to recognise still counts against the remainder, so an
 * unknown status can under-certify but can never let the same variation be
 * certified twice.
 */
const NON_CONSUMING = new Set([
  "draft",
  "rejected",
  "cancelled",
  "canceled",
  "void",
  "voided",
]);

/** Anything the certificate list endpoint can hand back for one row. */
export interface PriorCertificate {
  approvalStatus?: string;
  approval_status?: string;
  workflowState?: string;
  workflow_state?: string;
  voItems?: unknown;
  vo_items?: unknown;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/**
 * Does this certificate reduce what is left to certify on a variation?
 *
 * A certificate is discounted when *either* its approval status or its
 * workflow state says it never took effect — a row can be `approvalStatus:
 * "pending"` while its workflow state is already `rejected`.
 */
export function certificateConsumesRemainder(pc: PriorCertificate): boolean {
  const approval = norm(pc?.approvalStatus ?? pc?.approval_status);
  const workflow = norm(pc?.workflowState ?? pc?.workflow_state);
  if (approval && NON_CONSUMING.has(approval)) return false;
  if (workflow && NON_CONSUMING.has(workflow)) return false;
  return true;
}

/**
 * Total certified per variation number across the certificates that count.
 *
 * Keyed on the variation reference because that is the only stable link
 * between the same line of work on two certificates.
 */
export function sumCertifiedByVo(
  priorCertificates: PriorCertificate[] | undefined,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const pc of priorCertificates || []) {
    if (!certificateConsumesRemainder(pc)) continue;
    const rows = (pc?.voItems ?? pc?.vo_items) as any[] | undefined;
    for (const row of Array.isArray(rows) ? rows : []) {
      const ref = String(row?.voNumber ?? row?.vo_number ?? "").trim();
      if (!ref) continue;
      const amount = Number(row?.thisPeriod ?? row?.this_period);
      if (!Number.isFinite(amount)) continue;
      totals[ref] = (totals[ref] || 0) + amount;
    }
  }
  return totals;
}

export interface ClampResult {
  value: number;
  /** Set when the typed figure was reduced — never rewrite money silently. */
  note?: string;
}

/**
 * Hold an entry to what is actually left on the variation, and say so.
 *
 * The clamp existed already and gave no feedback of any kind; the operator saw
 * their figure replaced with a smaller one, or with zero, and was told nothing.
 *
 * Negative entries pass through untouched. Correcting an earlier certificate
 * downwards is legitimate and the server treats it as a warning rather than an
 * error — with the input layer now reading a minus sign, that is finally true.
 */
export function clampToRemaining(
  voNumber: string,
  value: number,
  remaining: number | undefined,
): ClampResult {
  if (!Number.isFinite(value)) return { value: 0 };
  if (value <= 0 || remaining === undefined || !Number.isFinite(remaining)) {
    return { value };
  }
  if (value <= remaining) return { value };

  if (remaining <= 0) {
    return {
      value: 0,
      note: `${voNumber} is fully certified on earlier certificates — nothing remains to certify.`,
    };
  }
  return {
    value: remaining,
    note: `Reduced to the ${formatZAR(remaining)} still outstanding on ${voNumber}.`,
  };
}
