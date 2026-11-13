/**
 * Links the API hands out as a path ("/api/payment-receipts/7/proof/?sig=…")
 * belong to the API's host, not to this app's.
 *
 * In every deployed environment the API is a different origin
 * (VITE_API_BASE_URL), and vercel.json sends every path on the app's own
 * origin to index.html. So <a href="/api/…"> opens the app instead of the
 * file. It only works locally because vite.config.ts proxies /api to the
 * backend. CertificatePage and EvidenceTab work around the same thing by
 * building their URLs from VITE_API_BASE_URL.
 *
 * Resolves such a path against the API's origin. Absolute links (presigned
 * S3 URLs, links the API already made absolute) and empty values are
 * returned unchanged.
 */
export function resolveApiUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Only an origin-relative path. "//host/x" is protocol-relative: leave it.
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  try {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/";
    return `${new URL(apiBase, window.location.origin).origin}${url}`;
  } catch {
    return url;
  }
}
