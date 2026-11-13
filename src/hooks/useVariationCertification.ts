import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";
import {
  toCertificationMap,
  type CertificationStatus,
  type VariationCertification,
} from "@/lib/variationCertification";

/** Stable identity while loading, so memos keyed on the map do not re-run. */
const EMPTY: Record<string, VariationCertification> = {};

/**
 * Per-variation certified and remaining figures for one project.
 *
 * Enabled only for a viewer holding `finance.view` — the same gate as the
 * variation register it feeds and as the endpoint itself. Invalidated with the
 * other commercial reads by `invalidateProjectCommercials`, so posting a
 * certificate or signing a variation refreshes it.
 */
export function useVariationCertification(projectId: string | undefined, enabled: boolean) {
  const on = !!projectId && enabled;

  const query = useQuery({
    queryKey: ["variation-certification", projectId],
    enabled: on,
    staleTime: 60_000,
    queryFn: async () =>
      toCertificationMap(
        await fetchData(`projects/${encodeURIComponent(String(projectId))}/uncertified-variations/`),
      ),
  });

  const status: CertificationStatus = query.isError ? "error" : query.data ? "ready" : "loading";

  return { byNumber: query.data ?? EMPTY, status };
}
