/**
 * Review finding F11, 13 Nov 2026: `fetchData`, `deleteData`, `putData` and
 * `patchData` rethrow through `handleError`, which built a fresh Error with no
 * `.response`. Callers written against axios (`err.response.data.error`, the
 * certificate integrity verdict, DRF field errors) therefore always read
 * undefined, and a superuser refused a grace date, or a user refused a project
 * delete, saw a generic failure instead of the server's reason.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
}));
vi.mock("axios", () => ({ default: { create: () => http } }));

import { deleteData, fetchData, patchData, putData } from "../Api";

const refusal = (status: number, data: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: {}, config: {} },
  });

const caught = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as Error & { status?: number; code?: string; response?: { status: number; data: any } };
  }
  throw new Error("expected the call to reject");
};

beforeEach(() => vi.clearAllMocks());

describe("errors rethrown by the Api wrappers", () => {
  it("keep the server's response, so err.response.data.error is the refusal reason", async () => {
    http.patch.mockRejectedValueOnce(
      refusal(403, { error: "Only a superuser can hold off the lock.", code: "not_superuser" }),
    );
    const e = await caught(patchData({ url: "billing/admin/invoices/7/grace/", data: { graceUntil: null } }));

    expect(e.response?.status).toBe(403);
    expect(e.response?.data?.error).toBe("Only a superuser can hold off the lock.");
    // The existing contract is unchanged.
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("Only a superuser can hold off the lock.");
    expect(e.status).toBe(403);
    expect(e.code).toBe("not_superuser");
  });

  it("do so for delete, put and get too", async () => {
    http.delete.mockRejectedValueOnce(refusal(409, { error: "This project has posted certificates." }));
    http.put.mockRejectedValueOnce(refusal(400, { name: ["This field is required."] }));
    http.get.mockRejectedValueOnce(refusal(404, { detail: "Not found." }));

    expect((await caught(deleteData({ url: "projects/45/", data: undefined }))).response?.data?.error).toBe(
      "This project has posted certificates.",
    );
    // Structured bodies survive: a DRF field error has no single message.
    const put = await caught(putData({ url: "projects/45/", data: {} }));
    expect(put.response?.data).toEqual({ name: ["This field is required."] });
    expect(put.message).toBe("HTTP error! status: 400");
    expect((await caught(fetchData("projects/99/"))).response?.status).toBe(404);
  });

  it("leave the response out of a serialised error", async () => {
    http.patch.mockRejectedValueOnce(refusal(403, { error: "No." }));
    const e = await caught(patchData({ url: "x/", data: {} }));
    expect(Object.keys(e)).not.toContain("response");
  });

  it("have no response when the request never reached the server", async () => {
    http.patch.mockRejectedValueOnce(new Error("Network Error"));
    const e = await caught(patchData({ url: "x/", data: {} }));
    expect(e.response).toBeUndefined();
    expect(e.message).toBe("Network Error");
  });
});
