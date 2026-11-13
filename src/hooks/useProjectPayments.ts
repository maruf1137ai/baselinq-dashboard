/**
 * `GET projects/{id}/payments/` — the one place this endpoint is read.
 *
 * WHY A HOOK FOR A SINGLE `useFetch`
 * ----------------------------------
 * Three screens now want the project's payment position: Home's overdue
 * queue, Project Health's payment-delay indicator, and Finance → Payments.
 * The first two each built the URL themselves, with their own copy of the
 * permission reasoning in a comment beside it. A third copy is how the
 * string, the gate and the understanding of what the endpoint returns start
 * to drift — and this is the endpoint that decides whether a contractor is
 * told they are owed money.
 *
 * So the URL and the gate live here. `useFetch` keys its query on the URL, so
 * every caller shares one cache entry and one request per project either way;
 * what this adds is a single declaration of what is being asked for and under
 * what conditions it may be asked.
 *
 * ── Permission ────────────────────────────────────────────────────────────
 *
 * `enabled` is the caller's `finance.view` decision, and it is a decision to
 * REQUEST, not merely to render: a contractor's browser must never hold the
 * employer's certified and outstanding figures in memory. Callers resolve it
 * through `resolveFinanceAccess` so the gate fails closed while the
 * permission map is in flight. The server agrees independently —
 * `ProjectPaymentsView` refuses without `finance.view`
 * (tasks/views_payments.py:386).
 *
 * ── Generic, deliberately ─────────────────────────────────────────────────
 *
 * `homeSignals.ts` and `projectPosition.ts` each model the part of this
 * payload their own derivations need, and unifying those two shapes is not
 * this hook's business. The type parameter lets each caller name the shape it
 * reads while the URL stays declared once. The default is the full payload.
 */
import useFetch from "@/hooks/useFetch";
import type { ProjectPaymentSummaryLike } from "@/lib/projectPosition";

export function useProjectPayments<T = ProjectPaymentSummaryLike>(
  projectId: string | number | undefined | null,
  enabled: boolean,
) {
  const wants = !!projectId && enabled;
  return useFetch<T>(wants ? `projects/${projectId}/payments/` : "", { enabled: wants });
}

export default useProjectPayments;
