/**
 * Helpers for Werner-spec claim submission timestamps.
 *
 * Two new datetime fields live in the backend (see
 * tasks/migrations/0051_add_claim_submission_timestamps.py):
 *   • intention_at    — set when contractor submits the Intention to Claim
 *   • formal_claim_at — set when contractor escalates to the formal Claim
 *
 * These are legal-record timestamps — pair them to derive the notice-gap
 * (days the contractor waited before escalating), which proves the
 * contractual notice period was honoured.
 */

import { format, parseISO, differenceInCalendarDays } from "date-fns";

/** Pull intention_at off a task object (camelCase or snake_case) and
 *  format it with date-fns "PPP" (e.g. "Mar 14, 2026"). Returns "" if
 *  missing or unparseable. */
export function getIntentionAtDisplay(task: any): string {
  const raw =
    task?.intentionAt ??
    task?.intention_at ??
    task?.task?.intentionAt ??
    task?.task?.intention_at;
  return _formatDate(raw);
}

/** Pull formal_claim_at off a task object. Same shape rules as
 *  getIntentionAtDisplay. */
export function getFormalClaimAtDisplay(task: any): string {
  const raw =
    task?.formalClaimAt ??
    task?.formal_claim_at ??
    task?.task?.formalClaimAt ??
    task?.task?.formal_claim_at;
  return _formatDate(raw);
}

/**
 * Calendar days between intention_at and formal_claim_at. Useful for
 * showing the user "lodged 28 days ago" or proving the notice gap on the
 * certificate page. Returns null if either date is missing/invalid.
 */
export function getNoticeGapDays(
  intentionAt: string | null | undefined,
  formalClaimAt: string | null | undefined,
): number | null {
  if (!intentionAt || !formalClaimAt) return null;
  try {
    const a = parseISO(intentionAt);
    const b = parseISO(formalClaimAt);
    const days = differenceInCalendarDays(b, a);
    return Number.isFinite(days) ? days : null;
  } catch {
    return null;
  }
}

function _formatDate(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    return format(parseISO(raw), "PPP");
  } catch {
    return String(raw);
  }
}
