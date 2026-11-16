/**
 * An invitation link opened in a browser holding a stale session.
 *
 * The invitation page read its invitation through the shared client, which
 * attached the stale token. The server rejected the header (401) before the
 * view ran, the refresh failed, the session was cleared and the invitee was
 * sent to /login with no way back to the invitation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: { url?: string; authorization?: string }[] = [];

// Every request the shared client makes is answered here, so the test sees
// exactly which headers the interceptors attached.
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  const create = (config: Record<string, unknown> = {}) =>
    actual.default.create({
      ...config,
      adapter: async (req) => {
        const headers = req.headers as unknown as { get?: (k: string) => unknown; Authorization?: unknown };
        const authorization = (headers.get?.("Authorization") ?? headers.Authorization) as string | undefined;
        sent.push({ url: req.url, authorization: authorization || undefined });
        return { data: {}, status: 200, statusText: "OK", headers: {}, config: req };
      },
    });
  return { ...actual, default: { ...actual.default, create } };
});

import {
  acceptInvitation,
  fetchData,
  fetchInvitation,
  forcedLoginUrl,
  isPublicAuthRequest,
} from "../Api";

beforeEach(() => {
  sent.length = 0;
  localStorage.setItem("access", "stale-token");
});
afterEach(() => localStorage.clear());

describe("invitation requests", () => {
  it("read the invitation without the stored session", async () => {
    await fetchInvitation("Abc_123");
    expect(sent.at(-1)).toEqual({ url: "auth/invitations/Abc_123/", authorization: undefined });
  });

  it("accept for a new account without the stored session", async () => {
    await acceptInvitation("Abc_123", { name: "N", password: "p", password_confirm: "p" });
    expect(sent.at(-1)?.authorization).toBeUndefined();
  });

  it("accept for an existing account with its session, which the server requires", async () => {
    await acceptInvitation("Abc_123", { name: "", password: "", password_confirm: "" }, { asSignedInUser: true });
    expect(sent.at(-1)?.authorization).toBe("Bearer stale-token");
  });

  it("leave every other request carrying the session", async () => {
    await fetchData("auth/profile/");
    expect(sent.at(-1)?.authorization).toBe("Bearer stale-token");
  });

  it("are matched exactly, so signed-in invitation endpoints keep the session", () => {
    expect(isPublicAuthRequest("auth/invitations/Abc_123/")).toBe(true);
    expect(isPublicAuthRequest("auth/invitations/Abc_123/accept/")).toBe(true);
    expect(isPublicAuthRequest("auth/organization/invitations/4/")).toBe(false);
    expect(isPublicAuthRequest("auth/admin-panel/invitations/4/resend/")).toBe(false);
    expect(isPublicAuthRequest("auth/organization/members/invite/")).toBe(false);
    expect(isPublicAuthRequest("auth/accept-appointed-invitation/Abc_123/")).toBe(false);
  });
});

describe("the sign-in page a dead session is sent to", () => {
  it("comes back to an invitation", () => {
    expect(forcedLoginUrl("/accept-invitation/Abc_123")).toBe("/login?next=%2Faccept-invitation%2FAbc_123");
    expect(forcedLoginUrl("/accept-appointed-invitation/Abc_123")).toBe(
      "/login?next=%2Faccept-appointed-invitation%2FAbc_123",
    );
  });

  it("comes back to nowhere else, so it cannot be used to redirect", () => {
    expect(forcedLoginUrl("/finance")).toBe("/login");
    expect(forcedLoginUrl("//evil.example/accept-invitation/Abc_123")).toBe("/login");
    expect(forcedLoginUrl("/accept-invitation/Abc_123/../../evil")).toBe("/login");
    expect(forcedLoginUrl("https://evil.example/accept-invitation/Abc_123")).toBe("/login");
    expect(forcedLoginUrl("")).toBe("/login");
  });
});
