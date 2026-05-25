/**
 * Task-lock logic for the TaskDetails page.
 *
 * Werner spec — different task types lock at different points:
 *
 *   • VO    — locked the moment signed_at is set (contract amendment is final).
 *   • Claim — locked once status hits `Determination Made` (or later);
 *              signed_at is sufficient.
 *   • SI    — does NOT lock on Issued. The workflow continues
 *              `Issued → Acknowledged → Actioned → Verified`. We lock only
 *              when status is `Verified` (or one of the legacy terminal
 *              statuses `Completed` / `Closed`).
 *   • RFI / DC / GI / IC / CPI — fall back to the "task is on its last
 *              timeline stage" rule.
 *
 * Past replies / audit trail stay visible even when locked — the cert
 * paper trail is the whole point.
 */

export type LockableTask = {
  type?: string;
  status?: string;
  signedAt?: string | null;
  signed_at?: string | null;
  timeline?: {
    stages?: string[];
    current?: string;
  };
};

/** Types that lock immediately on signed_at (no further workflow). */
const SIGN_LOCK_TYPES = new Set(["VO", "DC", "CLAIM"]);

/** SI terminal statuses — Verified per Werner, plus legacy "done" values. */
const SI_TERMINAL_STATUSES = new Set(["Verified", "Completed", "Closed"]);

/**
 * True if the task is finalised and no further replies / edits / actions
 * should be possible.
 *
 * @param task     The transformed task object used in TaskDetails (`displayTask`).
 * @param rawTask  Optional raw API task object — checked as a fallback for
 *                 `signed_at` / `status` if the transformed task didn't
 *                 carry them through.
 */
export function isTaskLocked(
  task: LockableTask | null | undefined,
  rawTask?: any,
): boolean {
  if (!task) return false;

  const type = task.type;

  // VO + Claim — signed_at is the legal-final stamp. No further workflow.
  if (type && SIGN_LOCK_TYPES.has(type)) {
    const signedAt =
      task.signedAt ??
      task.signed_at ??
      rawTask?.signedAt ??
      rawTask?.signed_at;
    if (signedAt) return true;
  }

  // SI — DON'T lock on signed_at. Werner spec workflow continues through
  // Acknowledged / Actioned / Verified. Lock only at Verified (or the
  // legacy Completed / Closed statuses for existing data).
  if (type === "SI") {
    const status =
      task.status ??
      rawTask?.status ??
      rawTask?.task?.status;
    if (status && SI_TERMINAL_STATUSES.has(status)) return true;
    // Don't fall through to the timeline-stage rule — the timeline for an
    // SI lists every workflow stage, and `current = Issued` would NOT be
    // the last stage, so the fallback wouldn't trigger anyway. But we
    // short-circuit here for clarity.
    return false;
  }

  // Fallback (RFI, DC, GI, IC, CPI) — last-stage check.
  const stages = task.timeline?.stages ?? [];
  const current = task.timeline?.current ?? "";
  return stages.length > 0 && current === stages[stages.length - 1];
}
