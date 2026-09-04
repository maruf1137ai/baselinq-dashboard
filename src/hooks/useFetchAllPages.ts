import { fetchData } from '@/lib/Api';
import { useQuery } from '@tanstack/react-query';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Follows a DRF PageNumberPagination endpoint to the end and concatenates
 * every page's `results`, instead of returning just the first page (the
 * global default is PAGE_SIZE=20 — see backend/baselink_server/settings.py).
 *
 * Pages by incrementing `&page=N` on the ORIGINAL url rather than following
 * the response's own `next` (an absolute URL) — sidesteps any host/proxy
 * mismatch between environments and keeps every request going through the
 * same axios instance (auth header, baseURL) `fetchData` already sets up.
 */
export async function fetchAllPages<T>(url: string): Promise<{ count: number; results: T[] }> {
  if (!url) return { count: 0, results: [] };

  const results: T[] = [];
  let count = 0;
  const MAX_PAGES = 200; // a page that never runs dry can't spin this forever

  for (let page = 1; page <= MAX_PAGES; page++) {
    const sep = url.includes('?') ? '&' : '?';
    const data: PaginatedResponse<T> = await fetchData(`${url}${sep}page=${page}`);
    if (!data) break;
    count = typeof data.count === 'number' ? data.count : results.length;
    const pageResults = Array.isArray(data.results) ? data.results : [];
    results.push(...pageResults);
    if (!data.next || pageResults.length === 0) break;
  }

  return { count, results };
}

/**
 * Same shape as useFetch — {data, isLoading, error, isError, refetch,
 * isPending} — but `data` is the FULL result set, not one capped page. Drop-in
 * replacement wherever a list is paginated client-side (search-as-you-type,
 * deep-link "jump to page") and therefore needs the complete array anyway.
 */
const useFetchAllPages = <T = any>(url: string, options: any = {}) => {
  const { data, isLoading, error, isError, refetch, isPending } = useQuery<{
    count: number;
    results: T[];
  }>({
    queryKey: [url, 'all-pages'],
    queryFn: () => fetchAllPages<T>(url),
    enabled: options.enabled !== false,
    ...options,
  });

  return {
    data,
    isLoading,
    error,
    isError,
    refetch,
    isPending,
  };
};

export default useFetchAllPages;
