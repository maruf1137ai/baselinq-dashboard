/**
 * Links the API hands out as "/api/..." paths must open on the API's host.
 *
 * Deployed, the app and the API are different origins, and the app's host
 * answers every path with index.html. A proof of payment or tax invoice link
 * left relative opens the app, not the file.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveApiUrl } from "@/lib/apiUrl";

const PROOF = "/api/payment-receipts/7/proof/?sig=abc:def";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveApiUrl", () => {
  it("puts an API path on the API's host, keeping the path and the token", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api");
    expect(resolveApiUrl(PROOF)).toBe(`https://api.example.test${PROOF}`);
  });

  it("does not double the /api prefix when the base ends with /api/", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/api/");
    expect(resolveApiUrl("/api/tax-invoices/3/document/?sig=x")).toBe(
      "http://localhost:8000/api/tax-invoices/3/document/?sig=x",
    );
  });

  it("stays on this app's origin when the API is same-origin or unset", () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    expect(resolveApiUrl(PROOF)).toBe(`${window.location.origin}${PROOF}`);
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(resolveApiUrl(PROOF)).toBe(`${window.location.origin}${PROOF}`);
  });

  it("leaves absolute and protocol-relative links alone", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api");
    const presigned = "https://bucket.s3.amazonaws.com/proofs/a.pdf?X-Amz-Signature=1";
    expect(resolveApiUrl(presigned)).toBe(presigned);
    expect(resolveApiUrl("//cdn.example.test/a.pdf")).toBe("//cdn.example.test/a.pdf");
  });

  it("returns an empty string for no link", () => {
    expect(resolveApiUrl(undefined)).toBe("");
    expect(resolveApiUrl(null)).toBe("");
    expect(resolveApiUrl("")).toBe("");
  });
});
