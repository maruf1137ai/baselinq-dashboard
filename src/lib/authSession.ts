/**
 * Where the session's tokens live.
 *
 * Legacy mode (default): access and refresh tokens in localStorage, as before.
 *
 * Cookie mode (VITE_AUTH_REFRESH_COOKIE=true, with the backend's
 * AUTH_REFRESH_COOKIE on): the refresh token is a Secure HttpOnly cookie the
 * page's script can't read, and the 15-minute access token is kept in memory
 * only. localStorage holds just a "session" marker, so a reload knows to ask
 * for a new access token (bootstrapSession) instead of sending the user to
 * sign in.
 */

const SESSION_MARK = "session";
let memoryAccess: string | null = null;

/** Read at call time so tests can switch it with vi.stubEnv. */
export function cookieMode(): boolean {
  return import.meta.env.VITE_AUTH_REFRESH_COOKIE === "true";
}

/** The header and credentials a request needs to set or use the refresh cookie. */
export function refreshCookieRequestConfig(): { withCredentials?: boolean; headers?: Record<string, string> } {
  return cookieMode() ? { withCredentials: true, headers: { "X-Refresh-Cookie": "1" } } : {};
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return cookieMode() ? memoryAccess : localStorage.getItem("access");
}

export function getStoredRefreshToken(): string | null {
  return cookieMode() ? null : localStorage.getItem("refresh");
}

/** Save tokens from sign-in or refresh. In cookie mode a refresh token in a body is ignored. */
export function storeTokens(tokens: { access?: string; refresh?: string } | null | undefined): void {
  if (!tokens?.access) return;
  if (cookieMode()) {
    memoryAccess = tokens.access;
    localStorage.setItem(SESSION_MARK, "1");
    // Tokens a legacy build left behind must not linger.
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    return;
  }
  localStorage.setItem("access", tokens.access);
  if (tokens.refresh) localStorage.setItem("refresh", tokens.refresh);
}

/** Signed in, or (cookie mode) a session that a refresh can resume. */
export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  if (cookieMode()) return !!memoryAccess || localStorage.getItem(SESSION_MARK) === "1";
  return !!localStorage.getItem("access");
}

export function clearTokens(): void {
  memoryAccess = null;
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem(SESSION_MARK);
}
