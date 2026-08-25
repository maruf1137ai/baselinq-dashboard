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
import { usePagedList } from "@/hooks/usePagedList";
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

  /**
   * PAGED, and it has to be: `PaymentCertificateViewSet` is router-registered
   * and DRF pages every such route at twenty with no `page_size` parameter
   * (`baselink_server/settings.py:268`). A single read returned the twenty most
   * recently TOUCHED certificates and this page summed them into "Certified to
   * date" and "Retention held" as though they were the whole set.
   *
   * Home was corrected first. Leaving this one short would have recreated the
   * exact defect that correction closed — the same figure differing between
   * two screens one click apart — so both now walk the pages. See
   * `src/lib/fetchAllPages.ts`.
   */
  const certificates = usePagedList<CertificateLike>(
    (page) => `tasks/payment-certificates/?projectId=${projectId}&page=${page}`,
    wants,
    ["commercials-certificates", projectId],
  );

  // The VO assignment tasks, merged with the variation RECORDS below — neither
  // route sees everything on its own. See `useProjectVariations`. PAGED for
  // the same reason as the certificates above: `TaskViewSet` is router-
  // registered and stops at twenty.
  const variationTasks = usePagedList<any>(
    (page) => `tasks/tasks/?taskType=VO&project=${projectId}&page=${page}`,
    wants,
    ["commercials-vo-tasks", projectId],
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

  const certificateList = certificates.rows;

  const variationList = useMemo(() => {
    const merged = [...variationRecords.records];
    const seen = new Set(merged.map((v) => v.ref).filter(Boolean) as string[]);
    for (const raw of variationTasks.rows) {
      const rec = toVariationRecord(raw);
      if (rec.ref && seen.has(rec.ref)) continue;
      if (rec.ref) seen.add(rec.ref);
      merged.push(rec);
    }
    return merged;
  }, [variationRecords.records, variationTasks.rows]);

  /**
   * NULL, not `[]`, when a list could not be read.
   *
   * `summariseMoney` distinguishes "the project has none" from "we were not
   * told", and every figure it derives depends on it — see its header. Handing
   * it an empty array on a failed request is what let the homepage print a
   * balance and a 0% certified share over a job that is 82% certified. This
   * page shows the same figures off the same function and inherits the same
   * guard rather than repeating the mistake in a second place.
   */
  const money = useMemo(
    () =>
      summariseMoney(
        project,
        certificates.isError ? null : certificateList,
        variationTasks.isError || variationRecords.isError || variationRecords.truncated
          ? null
          : variationList.map((v) => ({
              status: v.status ?? undefined,
              grandTotal: v.value,
              signedAt: v.signedAt,
            })),
      ),
    [
      project,
      certificateList,
      variationList,
      certificates.isError,
      variationTasks.isError,
      variationRecords.isError,
      variationRecords.truncated,
    ],
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
    certificatesFailed: certificates.isError || certificates.truncated,
    variationsFailed: variationTasks.isError || variationRecords.isError,
    paymentsFailed: payments.isError,
    variationsTruncated: variationRecords.truncated || variationTasks.truncated,
    /** True when the certificate page walk was cut short, so the totals are short. */
    certificatesTruncated: certificates.truncated,
  };
}

export type ProjectCommercials = ReturnType<typeof useProjectCommercials>;
