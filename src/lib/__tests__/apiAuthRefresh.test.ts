import { describe, expect, it } from "vitest";

import { shouldRefreshOn401 } from "../Api";

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
