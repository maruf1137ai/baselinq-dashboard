import { afterEach, describe, expect, it } from "vitest";

import { isSignedInAs, loginUrlFor, safeNextPath, signedInEmail } from "@/lib/invitationSignIn";

describe("safeNextPath", () => {
  it("keeps an invitation page on this site", () => {
    expect(safeNextPath("/accept-invitation/abc_DEF-123")).toBe("/accept-invitation/abc_DEF-123");
    expect(safeNextPath("/accept-appointed-invitation/abc123/")).toBe("/accept-appointed-invitation/abc123/");
  });

  it.each([
    null,
    "",
    "https://evil.example/accept-invitation/abc",
    "//evil.example/accept-invitation/abc",
    "/\\evil.example",
    "/settings",
    "/accept-invitation/abc/../../settings",
    "/accept-invitation/abc?x=1",
    "javascript:alert(1)",
  ])("drops %s", (raw) => {
    expect(safeNextPath(raw)).toBeNull();
  });

  it("round-trips through the login URL", () => {
    const url = new URL(loginUrlFor("/accept-invitation/tok123"), "https://app.example");
    expect(url.pathname).toBe("/login");
    expect(safeNextPath(url.searchParams.get("next"))).toBe("/accept-invitation/tok123");
  });
});

describe("isSignedInAs", () => {
  afterEach(() => localStorage.clear());

  it("is false when nobody is signed in", () => {
    expect(signedInEmail()).toBeNull();
    expect(isSignedInAs("someone@example.com")).toBe(false);
  });

  it("matches the signed-in account regardless of case", () => {
    localStorage.setItem("access", "token");
    localStorage.setItem("user", JSON.stringify({ email: "Pat@Example.com" }));
    expect(isSignedInAs("pat@example.COM")).toBe(true);
  });

  it("is false for a different account", () => {
    localStorage.setItem("access", "token");
    localStorage.setItem("user", JSON.stringify({ email: "pat@example.com" }));
    expect(isSignedInAs("sam@example.com")).toBe(false);
  });

  it("is false when a stored user has no session token", () => {
    localStorage.setItem("user", JSON.stringify({ email: "pat@example.com" }));
    expect(isSignedInAs("pat@example.com")).toBe(false);
  });

  it("survives a corrupt stored user", () => {
    localStorage.setItem("access", "token");
    localStorage.setItem("user", "{not json");
    expect(isSignedInAs("pat@example.com")).toBe(false);
  });
});
