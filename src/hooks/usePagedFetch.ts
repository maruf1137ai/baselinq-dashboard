import { useEffect } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";

/** The server's paged-list shape: {count, page, pageSize, totalPages, results}. */
export interface Paged<T> {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: T[];
}

/** How long a fetched page is served from cache before it is re-read in the background. */
const STALE_MS = 60_000;

const withPage = (url: string, page: number, pageSize: number) =>
  `${url}${url.includes("?") ? "&" : "?"}page=${page}&pageSize=${pageSize}`;

/**
 * One page of a server-paged list, cached.
 *
 * - Each page is its own query (key = full URL), so going back to a page you
 *   have seen is instant, and any `invalidateQueries` keyed on the URL prefix
 *   (useRefreshBilling) still clears every page after a write.
 * - The previous page stays on screen while the next loads (no flash to a spinner).
 * - The next page is prefetched, so "Next" is usually instant too.
 *
 * `T` is the full response type: endpoints such as the forecast add their own
 * fields (totals, series) beside the paging ones.
 */
export function usePagedFetch<T extends { page: number; totalPages: number }>(
  url: string,
  page: number,
  pageSize: number,
  options: { enabled?: boolean } = {},
) {
  const qc = useQueryClient();
  const key = withPage(url, page, pageSize);
  const query = useQuery<T>({
    queryKey: [key],
    queryFn: () => fetchData(key),
    enabled: options.enabled !== false,
    placeholderData: keepPreviousData,
    staleTime: STALE_MS,
  });

  const totalPages = query.data?.totalPages ?? 1;
  useEffect(() => {
    if (options.enabled === false || page >= totalPages) return;
    const next = withPage(url, page + 1, pageSize);
    qc.prefetchQuery({ queryKey: [next], queryFn: () => fetchData(next), staleTime: STALE_MS });
  }, [qc, url, page, pageSize, totalPages, options.enabled]);

  return { ...query, isPaging: query.isFetching && query.isPlaceholderData };
}
