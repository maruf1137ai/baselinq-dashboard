/**
 * When a failed query is worth retrying.
 *
 * React Query retries every failure three times with backoff by default — so
 * a task that does not exist, or one the viewer may not see, spun its loader
 * for ~8 s through four identical 404s before saying anything (QA BUG-22), and
 * a refused billing read looked like a page that never loaded (QA BUG-11).
 *
 * A 4xx is an answer, not an outage: retrying it only delays saying so. The
 * two exceptions are a request timeout (408) and rate limiting (429), which
 * are worth another try. Network failures and 5xx keep the default three.
 *
 * The status comes from `lib/Api.ts::handleError`, which attaches it to the
 * Error it throws.
 */
export function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  const status = Number((error as { status?: unknown } | null)?.status);
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  return failureCount < 3;
}
