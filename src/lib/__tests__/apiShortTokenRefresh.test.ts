import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The access token now lives 15 minutes (backend S10), so refreshes happen
 * all day. Refresh tokens rotate and the old one is blacklisted, and tabs
 * share localStorage: when two tabs refreshed at once, the loser's refresh
 * was refused and the user was signed out of every tab.
 */

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown } | Promise<{ status: number; data: unknown }>;

let api: AxiosInstance;
let mod: typeof import("../Api");
let handler: Handler;
const calls: { url: string; auth?: string }[] = [];

const respond = async (config: InternalAxiosRequestConfig) => {
  calls.push({ url: config.url || "", auth: config.headers?.["Authorization"] as string | undefined });
  const { status, data } = await handler(config);
  const response = { status, data, statusText: "", headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(`status ${status}`, "ERR_BAD_REQUEST", config, null, response);
  }
  return response;
};

beforeAll(async () => {
  const create = vi.spyOn(axios, "create");
  mod = await import("../Api");
  api = create.mock.results[0].value as AxiosInstance;
  api.defaults.adapter = respond;
});

beforeEach(() => {
  calls.length = 0;
  localStorage.clear();
  localStorage.setItem("access", "A1");
  localStorage.setItem("refresh", "R1");
});

afterEach(() => {
  vi.restoreAllMocks();
});

const expired = { status: 401, data: { detail: "Given token not valid", code: "token_not_valid" } };

describe("refresh with short-lived access tokens", () => {
  it("refreshes once for several requests that expire together, and replays them all", async () => {
    let refreshes = 0;
    handler = (config) => {
      if (config.url?.includes("auth/token/refresh/")) {
        refreshes += 1;
        return { status: 200, data: { access: "A2", refresh: "R2" } };
      }
      return config.headers?.["Authorization"] === "Bearer A2" ? { status: 200, data: { ok: true } } : expired;
    };
    const [a, b] = await Promise.all([api.get("projects/"), api.get("tasks/")]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(refreshes).toBe(1);
    expect(localStorage.getItem("access")).toBe("A2");
    expect(localStorage.getItem("refresh")).toBe("R2");
  });

  it("uses the other tab's new token when it rotated the refresh token first", async () => {
    handler = (config) => {
      if (config.url?.includes("auth/token/refresh/")) {
        // Another tab refreshed with R1 a moment earlier: R1 is now blacklisted.
        localStorage.setItem("access", "A2");
        localStorage.setItem("refresh", "R2");
        return { status: 401, data: { detail: "Token is blacklisted", code: "token_not_valid" } };
      }
      return config.headers?.["Authorization"] === "Bearer A2" ? { status: 200, data: { ok: true } } : expired;
    };
    const res = await api.get("projects/");
    expect(res.data).toEqual({ ok: true });
    // Still signed in.
    expect(localStorage.getItem("refresh")).toBe("R2");
  });

  it("replays with the stored token, without refreshing, when it changed since the request was sent", async () => {
    handler = (config) => {
      if (config.url?.includes("auth/token/refresh/")) throw new Error("should not refresh");
      if (config.headers?.["Authorization"] === "Bearer A1") {
        localStorage.setItem("access", "A2"); // refreshed elsewhere meanwhile
        return expired;
      }
      return { status: 200, data: { ok: true } };
    };
    const res = await api.get("projects/");
    expect(res.data).toEqual({ ok: true });
    expect(calls.filter((c) => c.url.includes("auth/token/refresh/"))).toHaveLength(0);
  });

  it("signs out when the refresh is refused and no other tab refreshed", async () => {
    handler = (config) =>
      config.url?.includes("auth/token/refresh/")
        ? { status: 401, data: { error: "Your company's Baselinq account is suspended.", code: "company_suspended" } }
        : { status: 401, data: { detail: "suspended", code: "company_suspended" } };
    await expect(api.get("projects/")).rejects.toBeTruthy();
    expect(localStorage.getItem("access")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
  });

  it("exports the cost ledger through the refreshing client", async () => {
    handler = (config) => {
      if (config.url?.includes("auth/token/refresh/")) return { status: 200, data: { access: "A2" } };
      return config.headers?.["Authorization"] === "Bearer A2"
        ? { status: 200, data: new Blob(["a,b"]) }
        : expired;
    };
    const blob = await mod.downloadCostLedgerExport(7);
    expect(blob).toBeInstanceOf(Blob);
    expect(calls[0].url).toBe("cost-ledger/export/");
  });
});
