/**
 * The document list, a page at a time, with the server's total.
 *
 * `documents/` is paged by the server (twenty rows unless `page_size` is
 * sent, at most 200). The Documents page used to read the first response
 * only, so its folder tree, tab counts and header all stopped at twenty
 * documents without saying so. This reads page one, reports `count` — the
 * number of documents that match, not the number on screen — and loads the
 * next page only when the user asks ("Load more").
 *
 * The query key starts `['documents', projectId]`, so every existing
 * invalidation after an upload, move, rename or delete still refreshes it.
 */
import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";

/** The server's maximum, so most projects' tabs need one request. */
export const DOCUMENT_PAGE_SIZE = 200;

interface DocumentPage<T> {
  rows: T[];
  count: number;
  hasNext: boolean;
}

/** One response, in either shape: a DRF page, or (older servers) a bare list. */
export function readDocumentPage<T>(payload: unknown): DocumentPage<T> {
  if (Array.isArray(payload)) return { rows: payload as T[], count: payload.length, hasNext: false };
  const page = (payload ?? {}) as { results?: unknown; count?: unknown; next?: unknown };
  const rows = Array.isArray(page.results) ? (page.results as T[]) : [];
  return {
    rows,
    count: typeof page.count === "number" ? page.count : rows.length,
    hasNext: Boolean(page.next) && rows.length > 0,
  };
}

export function useDocumentPages<T>(
  projectId: string | null,
  /** The query string without paging, e.g. `project_id=9&category=drawings`. */
  params: string,
  /** Distinguishes this list in the cache (e.g. the tab), after the project. */
  scope: string,
) {
  const query = useInfiniteQuery({
    queryKey: ["documents", projectId, "paged", scope, params],
    enabled: !!projectId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      readDocumentPage<T>(
        await fetchData(`documents/?${params}&page_size=${DOCUMENT_PAGE_SIZE}&page=${pageParam}`),
      ),
    getNextPageParam: (last, all) => (last.hasNext ? all.length + 1 : undefined),
  });

  const pages = query.data?.pages ?? [];
  const rows = pages.flatMap((p) => p.rows);
  return {
    rows,
    // The latest page's count: the freshest answer to "how many match".
    total: pages.length ? pages[pages.length - 1].count : 0,
    hasMore: !!query.hasNextPage,
    loadMore: () => {
      void query.fetchNextPage();
    },
    isLoadingMore: query.isFetchingNextPage,
    /** "Load more" failed; the pages already on screen stay. */
    loadMoreFailed: query.isFetchNextPageError,
    isLoading: !!projectId && query.isLoading,
    /** The first page failed, so there is nothing to show. */
    isError: query.isError && !query.isFetchNextPageError,
    refetch: () => {
      void query.refetch();
    },
  };
}
