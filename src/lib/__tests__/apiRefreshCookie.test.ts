import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cookie mode (VITE_AUTH_REFRESH_COOKIE=true): the refresh token is an
 * HttpOnly cookie script can't read, and the access token lives in memory.
 * Auth calls carry credentials and the X-Refresh-Cookie header the backend
 * requires before it will read the cookie.
 */

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

let api: AxiosInstance;
let mod: typeof import("../Api");
let session: typeof import("../authSession");
let handler: Handler;
const calls: { url: string; auth?: string; credentials?: boolean; cookieHeader?: string; body?: unknown }[] = [];

const respond = async (config: InternalAxiosRequestConfig) => {
  calls.push({
    url: config.url || "",
    auth: config.headers?.["Authorization"] as string | undefined,
    credentials: config.withCredentials,
    cookieHeader: config.headers?.["X-Refresh-Cookie"] as string | undefined,
    body: config.data,
  });
  const { status, data } = handler(config);
  const response = { status, data, statusText: "", headers: {}, config };
  if (status >= 400) throw new AxiosError(`status ${status}`, "ERR_BAD_REQUEST", config, null, response);
  return response;
};

const expired = { status: 401, data: { detail: "Given token not valid", code: "token_not_valid" } };
const isRefresh = (c: InternalAxiosRequestConfig) => !!c.url?.includes("auth/token/refresh/");

beforeAll(async () => {
  vi.stubEnv("VITE_AUTH_REFRESH_COOKIE", "true");
  const create = vi.spyOn(axios, "create");
  mod = await import("../Api");
  session = await import("../authSession");
  api = create.mock.results[0].value as AxiosInstance;
  api.defaults.adapter = respond;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  calls.length = 0;
  localStorage.clear();
  session.clearTokens();
});

describe("token storage in cookie mode", () => {
  it("keeps the access token in memory only and never stores a refresh token", () => {
    localStorage.setItem("refresh", "left-by-an-old-build");
    session.storeTokens({ access: "A1", refresh: "R1" });
    expect(session.getAccessToken()).toBe("A1");
    expect(localStorage.getItem("access")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(session.hasSession()).toBe(true);
    session.clearTokens();
    expect(session.hasSession()).toBe(false);
  });
});

describe("requests in cookie mode", () => {
  it("sends credentials and the header on auth calls only", async () => {
    session.storeTokens({ access: "A1" });
    handler = () => ({ status: 200, data: {} });
    await api.post("auth/login/", { email: "a", password: "b" });
    await api.get("projects/");
    expect(calls[0]).toMatchObject({ credentials: true, cookieHeader: "1" });
    expect(calls[0].auth).toBeUndefined(); // sign-in never carries a token
    expect(calls[1].credentials).toBeFalsy();
    expect(calls[1].cookieHeader).toBeUndefined();
    expect(calls[1].auth).toBe("Bearer A1");
  });

  it("refreshes from the cookie once for several expired requests and replays them", async () => {
    session.storeTokens({ access: "A1" });
    let refreshes = 0;
    handler = (config) => {
      if (isRefresh(config)) {
        refreshes += 1;
        return { status: 200, data: { access: "A2", refreshInCookie: true } };
      }
      return config.headers?.["Authorization"] === "Bearer A2" ? { status: 200, data: { ok: true } } : expired;
    };
    const [a, b] = await Promise.all([api.get("projects/"), api.get("tasks/")]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(refreshes).toBe(1);
    const refresh = calls.find((c) => c.url.includes("auth/token/refresh/"))!;
    expect(refresh).toMatchObject({ credentials: true, cookieHeader: "1" });
    expect(refresh.body).toBe("{}"); // no token in the body: it's the cookie's
    expect(session.getAccessToken()).toBe("A2");
    expect(localStorage.getItem("access")).toBeNull();
  });

  it("tries once more when another tab rotated the cookie first", async () => {
    session.storeTokens({ access: "A1" });
    let refreshes = 0;
    handler = (config) => {
      if (isRefresh(config)) {
        refreshes += 1;
        return refreshes === 1
          ? { status: 401, data: { detail: "Token is blacklisted", code: "token_not_valid" } }
          : { status: 200, data: { access: "A2" } };
      }
      return config.headers?.["Authorization"] === "Bearer A2" ? { status: 200, data: { ok: true } } : expired;
    };
    const res = await api.get("projects/");
    expect(res.data).toEqual({ ok: true });
    expect(refreshes).toBe(2);
  });

  it("takes turns with other tabs through a Web Lock when the browser has one", async () => {
    const request = vi.fn((_name: string, cb: () => Promise<string>) => cb());
    Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
    try {
      session.storeTokens({ access: "A1" });
      handler = (config) =>
        isRefresh(config)
          ? { status: 200, data: { access: "A2" } }
          : config.headers?.["Authorization"] === "Bearer A2" ? { status: 200, data: { ok: true } } : expired;
      await api.get("projects/");
      expect(request).toHaveBeenCalledWith("baselinq-token-refresh", expect.any(Function));
    } finally {
      delete (navigator as any).locks;
    }
  });
});

describe("bootstrapSession", () => {
  it("resumes a session after a reload from the cookie", async () => {
    localStorage.setItem("session", "1"); // memory was lost on reload
    handler = (config) => (isRefresh(config) ? { status: 200, data: { access: "A9" } } : { status: 200, data: {} });
    await mod.bootstrapSession();
    expect(session.getAccessToken()).toBe("A9");
  });

  it("clears a dead session so sign-in is shown", async () => {
    localStorage.setItem("session", "1");
    handler = () => ({ status: 401, data: { detail: "no cookie", code: "no_refresh_cookie" } });
    await mod.bootstrapSession();
    expect(session.hasSession()).toBe(false);
  });

  it("moves a session the old build left in localStorage into the cookie", async () => {
    localStorage.setItem("access", "OLD-A");
    localStorage.setItem("refresh", "OLD-R");
    handler = (config) => (isRefresh(config) ? { status: 200, data: { access: "A5", refreshInCookie: true } } : { status: 200, data: {} });
    await mod.bootstrapSession();
    const refresh = calls.find((c) => c.url.includes("auth/token/refresh/"))!;
    expect(JSON.parse(refresh.body as string)).toEqual({ refresh: "OLD-R" });
    expect(refresh).toMatchObject({ credentials: true, cookieHeader: "1" });
    expect(session.getAccessToken()).toBe("A5");
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(localStorage.getItem("access")).toBeNull();
  });

  it("does nothing without a session", async () => {
    handler = () => {
      throw new Error("should not be called");
    };
    await mod.bootstrapSession();
    expect(calls).toHaveLength(0);
  });
});
