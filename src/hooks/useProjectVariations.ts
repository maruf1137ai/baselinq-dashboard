/**
 * Every variation order on one project.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The homepage and `/finance` both read variations through
 * `tasks/tasks/?taskType=VO&project={id}`, which returns the ASSIGNMENT TASK
 * wrapping each variation. That has two consequences:
 *
 *  1. A variation with no assignment task is invisible. Tasks are created by
 *     `VariationOrderViewSet.perform_create`, so anything written by another
 *     path — a fixture, an import, a migration — has none, and both screens
 *     read "no variations" over a project that has five.
 *
 *  2. The status it returns is the TASK's lifecycle (todo / in review / done),
 *     not the variation's contractual status (Draft / Submitted / Under Review
 *     / Priced / Recommended / Approved / Rejected / Closed). "How many
 *     variations are awaiting a decision" is a question about the second.
 *
 * `tasks/variation-orders/` is the variation record itself and answers both.
 *
 * ── Permission ────────────────────────────────────────────────────────────
 *
 * Unchanged, and enforced twice. This hook is only ENABLED for a viewer
 * holding `finance.view`, exactly as the certificate and variation reads in
 * `useHomeData` already are — not requested, not merely hidden. The server
 * agrees independently: `VariationOrderViewSet.get_queryset` filters to
 * projects the caller has `finance.view` on, so a contractor calling this
 * route directly gets an empty list rather than the employer's variations.
 *
 * ── Paging ────────────────────────────────────────────────────────────────
 *
 * The route carries no project filter — `?project=45` is accepted and ignored,
 * because the viewset's only filter backends are search and ordering — and DRF
 * pages it at twenty with no `page_size` parameter. So the pages are walked and
 * filtered here. `PAGE_LIMIT` bounds that walk: a runaway loop against a
 * mis-paginating server is a worse failure than an incomplete count, and the
 * count is reported as incomplete when the limit is hit rather than being
 * presented as final.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";
import { toVariationRecord, type VariationRecord } from "@/lib/homeIndicators";

/** Twenty per page × 25 pages. Beyond that the walk stops and says so. */
const PAGE_LIMIT = 25;

/** Stable identity while loading, so memos keyed on `rows` do not re-run. */
const EMPTY_ROWS: any[] = [];

export interface ProjectVariations {
  records: VariationRecord[];
  /**
   * The variation rows as the API returned them. The Finance register and the
   * certificate drawer need fields `VariationRecord` does not carry (title,
   * wrapping task, creator); reading them from here shares this query's cache
   * rather than walking the same pages again.
   */
  rows: any[];
  /** True when `PAGE_LIMIT` was reached, so the list may be short. */
  truncated: boolean;
}

export function useProjectVariations(projectId: string | undefined, enabled: boolean) {
  const on = !!projectId && enabled;

  const query = useQuery<ProjectVariations>({
    queryKey: ["project-variation-orders", projectId],
    enabled: on,
    staleTime: 60_000,
    queryFn: async () => {
      const records: VariationRecord[] = [];
      const rows: any[] = [];
      let truncated = false;

      for (let page = 1; page <= PAGE_LIMIT; page += 1) {
        // `project` narrows server-side (backend PR #76); an older backend
        // ignores it, and the projectId check below still filters.
        const payload = await fetchData(
          `tasks/variation-orders/?project=${encodeURIComponent(String(projectId))}&page=${page}`,
        );
        const pageRows: any[] = Array.isArray(payload) ? payload : (payload?.results ?? []);

        for (const row of pageRows) {
          if (String(row?.projectId ?? "") !== String(projectId)) continue;
          rows.push(row);
          records.push(toVariationRecord(row));
        }

        // A bare array means the endpoint is not paginated at all.
        if (Array.isArray(payload) || !payload?.next) return { records, rows, truncated };
        if (page === PAGE_LIMIT) truncated = true;
      }

      return { records, rows, truncated };
    },
  });

  return {
    records: query.data?.records ?? [],
    rows: query.data?.rows ?? EMPTY_ROWS,
    truncated: query.data?.truncated ?? false,
    isLoading: on && query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
