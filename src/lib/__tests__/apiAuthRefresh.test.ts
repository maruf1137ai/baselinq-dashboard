import { describe, expect, it } from "vitest";

import { isPublicAuthRequest, shouldRefreshOn401 } from "../Api";

/**
 * QA BUG-09: a wrong signing PIN came back as 401 {error: "Invalid PIN."}.
 * The interceptor read every 401 as an expired session, refreshed the token
 * and replayed the POST — the same wrong PIN, tried twice per click. A real
 * expired session (SimpleJWT: {detail, code: "token_not_valid"}) must still
 * refresh exactly once.
 */
const err = (status: number, data: unknown, config: Record<string, unknown> = {}) => ({
  response: { status, data },
  config: { url: "tasks/sign-and-issue/", ...config },
});

describe("shouldRefreshOn401", () => {
  it("refreshes an expired session", () => {
    expect(shouldRefreshOn401(err(401, { detail: "Given token not valid", code: "token_not_valid" }))).toBe(true);
  });

  it("does not replay a business refusal that carries an error message", () => {
    expect(shouldRefreshOn401(err(401, { error: "Invalid PIN." }))).toBe(false);
  });

  it("honours an explicit opt-out", () => {
    expect(shouldRefreshOn401(err(401, { detail: "x" }, { skipAuthRefresh: true }))).toBe(false);
  });

  it("refreshes only once", () => {
    expect(shouldRefreshOn401(err(401, { detail: "x" }, { _retry: true }))).toBe(false);
  });

  it("never refreshes a login attempt or a non-401", () => {
    expect(shouldRefreshOn401(err(401, { detail: "x" }, { url: "auth/login/" }))).toBe(false);
    expect(shouldRefreshOn401(err(403, { code: "invalid_pin" }))).toBe(false);
  });
});

/**
 * A stale access token left in localStorage was sent with the login request,
 * and the backend rejected the header (401 token_not_valid) before checking
 * the password — so nobody holding an old token could sign in.
 */
describe("isPublicAuthRequest", () => {
  it("leaves the token off signed-out endpoints", () => {
    expect(isPublicAuthRequest("auth/login/")).toBe(true);
    expect(isPublicAuthRequest("auth/register/")).toBe(true);
    expect(isPublicAuthRequest("auth/check-email/?email=a%40b.com")).toBe(true);
    expect(isPublicAuthRequest("auth/password/reset/otp/verify/")).toBe(true);
  });

  it("keeps the token on everything else", () => {
    expect(isPublicAuthRequest("auth/profile/")).toBe(false);
    expect(isPublicAuthRequest("auth/password/change/")).toBe(false);
    expect(isPublicAuthRequest("tasks/sign-and-issue/")).toBe(false);
    expect(isPublicAuthRequest(undefined)).toBe(false);
  });
});
