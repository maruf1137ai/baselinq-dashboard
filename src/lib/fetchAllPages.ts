/**
 * Walk a DRF-paginated list to the end.
 *
 * ── The defect this exists to close ───────────────────────────────────────
 *
 * `baselink_server/settings.py` sets `DEFAULT_PAGINATION_CLASS` to
 * `PageNumberPagination` with `PAGE_SIZE: 20`, and there is no
 * `page_size_query_param`, so **every router-registered viewset in this
 * backend returns at most twenty rows and no client can ask for more in one
 * request.** Only `TaskAuditViewSet` sets `pagination_class = None`.
 *
 * The homepage read those responses as `payload.results` and never looked at
 * `payload.next`. So on a twenty-four-month job with twenty-four monthly
 * payment certificates, "Certified to date", "Retention held", the balance and
 * the certified percentage were all summed over **the twenty most recently
 * touched certificates** — `PaymentCertificateViewSet` orders by
 * `-updated_at`, so which twenty depends on who edited what last — and the
 * page printed the result as a total, with no badge and no caveat.
 *
 * ── Fetch all pages, rather than detect and disclose ──────────────────────
 *
 * Both were on the table. Fetching all pages is what this does, for three
 * reasons:
 *
 *  1. **A money total must not be built from a partial list at all.** A
 *     disclosed wrong total is still a wrong total on the page; the badge only
 *     moves the blame. "Certified to date" is a figure a QS reconciles against
 *     their own books, and being short by four certificates is not a caveat,
 *     it is an error.
 *
 *  2. **The cost is small and bounded.** Twenty rows a page means one extra
 *     request per twenty certificates; the projects on this platform run to a
 *     few dozen. The walk is sequential and stops at the first page with no
 *     `next`, so the common project — under twenty of everything — costs
 *     exactly the one request it costs today.
 *
 *  3. **The precedent is already in this codebase and is the same shape.**
 *     `useProjectVariations` walks `tasks/variation-orders/` page by page,
 *     bounds the walk, and exposes `truncated`. This is that function,
 *     generalised, so there is one implementation rather than five.
 *
 * Disclosure is kept as the FALLBACK, not the strategy: if the walk hits
 * `PAGE_LIMIT` the result says `truncated`, the caller treats the figures as
 * short, and the page says so. A runaway loop against a mis-paginating server
 * is a worse failure than an incomplete count that admits it is incomplete.
 */

/** Twenty per page × 25 pages = 500 rows. Beyond that the walk stops and says so. */
export const PAGE_LIMIT = 25;

export interface PagedList<T> {
  rows: T[];
  /** True when `PAGE_LIMIT` was reached, so the list may be short. */
  truncated: boolean;
}

/**
 * @param url   builds the request for page N. The caller owns the query
 *              string, because a filter that the server applies is worth far
 *              more than a page walk that fetches everything and drops most
 *              of it in the browser.
 * @param get   the fetcher — `fetchData` from `src/lib/Api.ts` at every call
 *              site, passed in so this stays testable without a network.
 */
export async function fetchAllPages<T>(
  url: (page: number) => string,
  get: (u: string) => Promise<any>,
  limit: number = PAGE_LIMIT,
): Promise<PagedList<T>> {
  const rows: T[] = [];

  for (let page = 1; page <= limit; page += 1) {
    const payload = await get(url(page));

    // A bare array means this endpoint is not paginated at all — several of
    // this backend's routes are plain `APIView`s that return a list or a
    // wrapper object. One request, done.
    if (Array.isArray(payload)) {
      rows.push(...(payload as T[]));
      return { rows, truncated: false };
    }

    const batch: T[] = payload?.results ?? [];
    rows.push(...batch);

    // `next` is the only field that distinguishes "that was the last page"
    // from "there are more and you were not told". Reading `count` instead
    // would work today and break the moment a viewset returns a cursor
    // paginator, which reports no count at all.
    if (!payload?.next) return { rows, truncated: false };

    // An empty page with a `next` is a server that will never stop. Stop here
    // rather than spend the whole limit on it.
    if (batch.length === 0) return { rows, truncated: true };
  }

  return { rows, truncated: true };
}
