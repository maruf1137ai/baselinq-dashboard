import { describe, expect, it } from "vitest";

import { fetchAllPages } from "../fetchAllPages";

/**
 * The defect this closes, stated as a fixture: DRF pages every router-
 * registered route in this backend at twenty (`PAGE_SIZE: 20`) with no
 * `page_size` parameter, and the homepage read `results` while never reading
 * `next`. Twenty-four monthly certificates arrived as twenty, ordered
 * `-updated_at`, and were summed into "Certified to date".
 */
function server(pages: unknown[][]) {
  const calls: string[] = [];
  const get = async (url: string) => {
    calls.push(url);
    const n = Number(new URL(url, "http://x").searchParams.get("page") ?? 1);
    const rows = pages[n - 1] ?? [];
    return {
      results: rows,
      next: n < pages.length ? `?page=${n + 1}` : null,
      count: pages.flat().length,
    };
  };
  return { get, calls };
}

const url = (page: number) => `/certs/?page=${page}`;

describe("fetchAllPages", () => {
  it("returns EVERY row, not the first page", async () => {
    const twentyFour = Array.from({ length: 24 }, (_, i) => ({ id: i + 1 }));
    const { get, calls } = server([twentyFour.slice(0, 20), twentyFour.slice(20)]);

    const out = await fetchAllPages<{ id: number }>(url, get);

    expect(out.rows).toHaveLength(24);
    expect(out.rows.map((r) => r.id)).toEqual(twentyFour.map((r) => r.id));
    expect(out.truncated).toBe(false);
    expect(calls).toEqual(["/certs/?page=1", "/certs/?page=2"]);
  });

  it("costs exactly one request on a project that fits in one page", async () => {
    // The common case, and the reason walking pages is affordable at all.
    const { get, calls } = server([[{ id: 1 }, { id: 2 }]]);
    const out = await fetchAllPages(url, get);
    expect(out.rows).toHaveLength(2);
    expect(calls).toHaveLength(1);
  });

  it("handles an endpoint that is not paginated at all", async () => {
    // Several routes here are plain APIViews returning a bare array.
    const calls: string[] = [];
    const get = async (u: string) => {
      calls.push(u);
      return [{ id: 1 }, { id: 2 }, { id: 3 }];
    };
    const out = await fetchAllPages(url, get);
    expect(out.rows).toHaveLength(3);
    expect(out.truncated).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it("stops at the limit and SAYS SO rather than looping", async () => {
    // A mis-paginating server is a worse failure than an incomplete count.
    // The disclosure is the fallback the caller renders as "May be short".
    const many = Array.from({ length: 10 }, () => [{ id: 1 }]);
    const { get, calls } = server(many);
    const out = await fetchAllPages(url, get, 3);
    expect(calls).toHaveLength(3);
    expect(out.rows).toHaveLength(3);
    expect(out.truncated).toBe(true);
  });

  it("stops on an empty page that still claims a next", async () => {
    const get = async () => ({ results: [], next: "?page=2" });
    const out = await fetchAllPages(url, get, 25);
    expect(out.rows).toHaveLength(0);
    expect(out.truncated).toBe(true);
  });

  it("reads `next` and not `count`, so a cursor paginator does not break it", async () => {
    // `count` is absent from a cursor-paginated response; `next` is not.
    const get = async (u: string) =>
      u.endsWith("page=1")
        ? { results: [{ id: 1 }], next: "?page=2" }
        : { results: [{ id: 2 }], next: null };
    const out = await fetchAllPages(url, get);
    expect(out.rows).toHaveLength(2);
  });
});
