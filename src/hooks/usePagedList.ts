/**
 * `useFetch`, for a list the server pages.
 *
 * Same surface as `useFetch` — `isLoading`, `isError`, `refetch` — plus the
 * two things a paged read has to report that a single read does not: the rows
 * from EVERY page, and whether the walk was cut short.
 *
 * See `src/lib/fetchAllPages.ts` for why the walk exists and why fetching all
 * pages was preferred to detecting and disclosing. This file is only the
 * react-query wrapper around it.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";
import { fetchAllPages, type PagedList } from "@/lib/fetchAllPages";

export interface PagedListResult<T> {
  rows: T[];
  /** True when the page walk hit its limit, so the rows may be short. */
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function usePagedList<T>(
  /**
   * The request for page N. Returns "" when there is nothing to ask for, which
   * — together with `enabled` — is how a permission gate stops the request
   * being MADE rather than merely hiding what came back.
   */
  url: (page: number) => string,
  enabled: boolean,
  /** Distinguishes this list in the cache. Keep it stable per project. */
  key: unknown[],
): PagedListResult<T> {
  const query = useQuery<PagedList<T>>({
    queryKey: key,
    enabled,
    staleTime: 60_000,
    queryFn: () => fetchAllPages<T>(url, fetchData),
  });

  return {
    rows: query.data?.rows ?? [],
    truncated: query.data?.truncated ?? false,
    // `isLoading` is true for a disabled query in react-query v5, which would
    // hold the whole page on a spinner for a viewer who was never going to be
    // sent this list. Gated on `enabled` for the same reason `useFetch`'s
    // call sites gate theirs.
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
