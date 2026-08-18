/**
 * The commercial position of one project — every read behind Project Health's
 * Financial Overview, Current Certificate and the money half of Key Indicators.
 *
 * ── Permission ────────────────────────────────────────────────────────────
 *
 * The same discipline `useHomeData` established, for the same reason: a viewer
 * without `finance.view` is not merely shown nothing, they are not REQUESTED
 * anything. `enabled` is false for them and every query below is disabled, so
 * a contractor's browser never holds the employer's contract sum, certified
 * value or retention in memory at all.
 *
 * The gate fails CLOSED while the permission map is in flight —
 * `resolveFinanceAccess` is the shared helper that does this, and it is used
 * here rather than reading `perms.canViewFinance` directly, because the raw
 * flag defaults to permissive during loading and would flash the contract sum
 * at a contractor.
 *
 * The server agrees independently on all three routes: `ProjectPaymentsView`
 * refuses without `finance.view` (tasks/views_payments.py:386),
 * `VariationOrderViewSet.get_queryset` filters to projects the caller holds it
 * on, and the certificate viewset does the same. This hook is the first of two
 * locks, not the only one.
 *
 * ── Why not useHomeData ───────────────────────────────────────────────────
 *
 * `useHomeData` also fetches tasks, meetings, time bars, obligations and a
 * detail request per meeting with notes — none of which this page's commercial
 * blocks use. Reusing it would put a dozen requests behind three panels. The
 * derivations ARE reused: `summariseMoney`, `summariseVariations` and
 * `retentionPosition` are the same functions the homepage calls, so the two
 * pages cannot drift on what a balance or a retention figure means.
 */
import { useMemo } from "react";

import useFetch from "@/hooks/useFetch";
import { usePermissions } from "@/hooks/usePermissions";
import { useProject } from "@/hooks/useProjects";
import { useProjectVariations } from "@/hooks/useProjectVariations";
import { resolveFinanceAccess, summariseMoney, type CertificateLike } from "@/lib/homeSignals";
import { retentionPosition, summariseVariations, toVariationRecord } from "@/lib/homeIndicators";
import {
  netRetentionHeld,
  summariseCertificateBasis,
  worstPaymentDelay,
  type ProjectPaymentSummaryLike,
} from "@/lib/projectPosition";

const listOf = <T,>(payload: any): T[] =>
  Array.isArray(payload) ? payload : (payload?.results ?? []);

/**
 * The certificate the project is currently working on — the client's "Current
 * Certificate". Same ranking as the homepage: whatever is waiting on a human
 * first, and the most recently touched among equals.
 */
const STATE_RANK: Record<string, number> = {
  submitted: 0,
  approved: 1,
  rejected: 2,
  draft: 3,
  posted: 4,
};

export function useProjectCommercials(projectId: string | undefined) {
  const perms = usePermissions();
  const { canViewFinance } = resolveFinanceAccess(perms);

  const wants = !!projectId && canViewFinance;

  const { data: project, isLoading: projectLoading } = useProject(wants ? projectId : undefined);

  const certificates = useFetch<{ results: CertificateLike[] }>(
    wants ? `tasks/payment-certificates/?projectId=${projectId}` : "",
    { enabled: wants },
  );

  // The VO assignment tasks, merged with the variation RECORDS below — neither
  // route sees everything on its own. See `useProjectVariations`.
  const variationTasks = useFetch<{ results: any[] }>(
    wants ? `tasks/tasks/?taskType=VO&project=${projectId}` : "",
    { enabled: wants },
  );
  const variationRecords = useProjectVariations(projectId, wants);

  // The server's own payment-due derivation. Not recomputed in the browser:
  // `tasks/payment_terms.py` resolves the contractual period, applies the SA
  // working-day calendar where the period is in working days, and reports the
  // basis it counted from.
  const payments = useFetch<ProjectPaymentSummaryLike>(
    wants ? `projects/${projectId}/payments/` : "",
    { enabled: wants },
  );

  const certificateList = useMemo(
    () => listOf<CertificateLike>(certificates.data),
    [certificates.data],
  );

  const variationList = useMemo(() => {
    const merged = [...variationRecords.records];
    const seen = new Set(merged.map((v) => v.ref).filter(Boolean) as string[]);
    for (const raw of listOf<any>(variationTasks.data)) {
      const rec = toVariationRecord(raw);
      if (rec.ref && seen.has(rec.ref)) continue;
      if (rec.ref) seen.add(rec.ref);
      merged.push(rec);
    }
    return merged;
  }, [variationRecords.records, variationTasks.data]);

  const money = useMemo(
    () =>
      summariseMoney(
        project,
        certificateList,
        variationList.map((v) => ({ status: v.status ?? undefined, grandTotal: v.value })),
      ),
    [project, certificateList, variationList],
  );

  const variations = useMemo(() => summariseVariations(variationList), [variationList]);

  /**
   * Two facts about the certificate rows that `summariseMoney` does not report
   * and that this page must not present a figure without.
   *
   * Derived HERE rather than in `homeSignals.ts` because `summariseMoney` is
   * the homepage's function too and changing what it returns is not this
   * page's decision to take. Both are read off the same rows it read.
   */
  const certificateBasis = useMemo(
    () => summariseCertificateBasis(certificateList),
    [certificateList],
  );

  /**
   * Retention held, NET OF RELEASES.
   *
   * `money.retentionHeld` is Σ `retentionAmount` over posted certificates with
   * nothing subtracted, so from the first release at practical completion it
   * is permanently overstated — it reports money the employer no longer holds.
   * `retention_release` is a real column on the certificate, is the same field
   * `certificateAdjustments` already reads with the same sign, and is
   * subtracted here.
   *
   * Where NO posted certificate carries the field at all, `released` is null
   * and the gross figure is shown with that stated — an absent field is not a
   * zero release.
   */
  const retention = useMemo(
    () =>
      retentionPosition(
        project,
        netRetentionHeld(money.retentionHeld, certificateBasis.retentionReleased),
      ),
    [project, money.retentionHeld, certificateBasis.retentionReleased],
  );

  const currentCertificate = useMemo(
    () =>
      [...certificateList].sort((a, b) => {
        const ra = STATE_RANK[a.workflowState ?? "draft"] ?? 9;
        const rb = STATE_RANK[b.workflowState ?? "draft"] ?? 9;
        if (ra !== rb) return ra - rb;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      })[0] ?? null,
    [certificateList],
  );

  const paymentDelay = useMemo(() => worstPaymentDelay(payments.data), [payments.data]);

  return {
    canViewFinance,
    money,
    /** Σ retention_release, and whether the certified total mixed VAT bases. */
    certificateBasis,
    variations,
    retention,
    currentCertificate,
    paymentDelay,
    /** So an unanswered endpoint can be told from a project with nothing overdue. */
    paymentsAnswered: !!payments.data && !payments.isError,
    isLoading:
      wants &&
      (perms.isLoading ||
        projectLoading ||
        certificates.isLoading ||
        variationRecords.isLoading ||
        payments.isLoading),
    /**
     * Reported per source rather than collapsed into one flag: a failed
     * variation read makes the revised contract sum incomplete, and the page
     * must say so rather than rendering a short figure as though it were final.
     */
    certificatesFailed: certificates.isError,
    variationsFailed: variationTasks.isError || variationRecords.isError,
    paymentsFailed: payments.isError,
    variationsTruncated: variationRecords.truncated,
  };
}

export type ProjectCommercials = ReturnType<typeof useProjectCommercials>;
