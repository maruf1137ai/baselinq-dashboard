/**
 * QA BUG-22: a missing or forbidden task spun ~8 s through four identical
 * 404s, because every query failure was retried three times with backoff.
 */
import { describe, expect, it } from "vitest";

import { retryUnlessRefused } from "@/lib/queryRetry";

const err = (status?: number) => Object.assign(new Error("x"), status ? { status } : {});

describe("retryUnlessRefused", () => {
  it("never retries a refusal or a missing record", () => {
    for (const s of [400, 401, 403, 404, 409, 422]) expect(retryUnlessRefused(0, err(s))).toBe(false);
  });

  it("retries a timeout and rate limiting", () => {
    expect(retryUnlessRefused(0, err(408))).toBe(true);
    expect(retryUnlessRefused(0, err(429))).toBe(true);
  });

  it("keeps the default three retries for outages and network failures", () => {
    expect(retryUnlessRefused(0, err(500))).toBe(true);
    expect(retryUnlessRefused(2, err(503))).toBe(true);
    expect(retryUnlessRefused(3, err(503))).toBe(false);
    expect(retryUnlessRefused(0, err())).toBe(true);
    expect(retryUnlessRefused(0, null)).toBe(true);
  });
});
