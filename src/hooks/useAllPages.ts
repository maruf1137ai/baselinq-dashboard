/**
 * Every row of a paged list, for a screen that needs the whole list.
 *
 * `projects/`, `auth/users/` and `tasks/tasks/` are paged by the server at
 * twenty rows. Screens that read one response through `useFetch` showed the
 * first twenty and nothing else: a user's 21st project never appeared in the
 * sidebar or the project picker, and the 21st user could not be added to a
 * project team. This walks the pages with `fetchAllPages` (a bounded walk that
 * reports `truncated` if it ever hits its limit) and asks for the server's
 * maximum page size, so most lists still cost one request. A server that
 * ignores `page_size` is walked twenty at a time instead.
 *
 * The query key starts with `url`, so every existing invalidation keyed on the
 * list URL (after creating, deleting or editing a project, say) still refreshes
 * it.
 */
import { useQuery } from "@tanstack/react-query";

import { fetchData } from "@/lib/Api";
import { fetchAllPages, type PagedList } from "@/lib/fetchAllPages";

/** The server's maximum (baselink_server/pagination.py). */
export const ALL_PAGES_PAGE_SIZE = 200;

/** `url` with the paging parameters for page N, whether or not it has a query string. */
export const pageUrl = (url: string, page: number, pageSize = ALL_PAGES_PAGE_SIZE) =>
  `${url}${url.includes("?") ? "&" : "?"}page_size=${pageSize}&page=${page}`;

export function useAllPages<T>(url: string | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<PagedList<T>>({
    queryKey: [url ?? "", "all-pages"],
    enabled: !!url && options.enabled !== false,
    queryFn: () => fetchAllPages<T>((page) => pageUrl(url as string, page), fetchData),
  });
}
