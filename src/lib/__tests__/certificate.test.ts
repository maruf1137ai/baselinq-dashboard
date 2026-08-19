import { describe, it, expect } from "vitest";

import {
  buildCertificateUrl,
  formatCertCurrency,
  formatCertDate,
  getCertificateTypeLabel,
} from "../certificate";

// ── getCertificateTypeLabel ────────────────────────────────────────────────

describe("getCertificateTypeLabel", () => {
  it("maps each Werner type to the human label", () => {
    expect(getCertificateTypeLabel("si")).toBe("Site Instruction");
    expect(getCertificateTypeLabel("vo")).toBe("Variation Order");
    expect(getCertificateTypeLabel("claim")).toBe("Formal Claim");
    expect(getCertificateTypeLabel("ic")).toBe("Intention to Claim");
  });

  it("is case-insensitive on the input", () => {
    expect(getCertificateTypeLabel("VO")).toBe("Variation Order");
    expect(getCertificateTypeLabel("Si")).toBe("Site Instruction");
  });

  it("returns a generic fallback for unknown types", () => {
    expect(getCertificateTypeLabel("nope")).toBe("Certificate");
    expect(getCertificateTypeLabel(null)).toBe("Certificate");
    expect(getCertificateTypeLabel(undefined)).toBe("Certificate");
  });
});

// ── formatCertDate ─────────────────────────────────────────────────────────

describe("formatCertDate", () => {
  it("formats an ISO datetime in human form", () => {
    const out = formatCertDate("2026-05-21T10:30:00Z");
    expect(out).toMatch(/May/);
    expect(out).toMatch(/2026/);
  });

  it('returns "—" for null/undefined (so the cert never has blanks)', () => {
    expect(formatCertDate(null)).toBe("—");
    expect(formatCertDate(undefined)).toBe("—");
  });

  it("returns the raw string when unparseable", () => {
    expect(formatCertDate("garbage")).toBe("garbage");
  });
});

// ── formatCertCurrency ─────────────────────────────────────────────────────

describe("formatCertCurrency", () => {
  // South African convention: space thousands separator, comma decimal. The
  // format is pinned in the helper rather than taken from the reader's ICU
  // locale data — a certificate has to read the same on every machine, and
  // `250,000.00` on a ZAR certificate can be read as a thousandth of itself.
  //
  // Every space here is U+00A0, INCLUDING the one after the currency code.
  // These assertions are the record of that: an ASCII space would let the
  // figure wrap at a thousands separator, leaving a complete, plausible,
  // wrong number on one line.
  it("formats a string amount with currency prefix", () => {
    expect(formatCertCurrency("250000", "ZAR")).toBe("ZAR 250 000,00");
  });

  it("formats a numeric amount", () => {
    expect(formatCertCurrency(250000, "ZAR")).toBe("ZAR 250 000,00");
  });

  it("uses no-break spaces throughout, so a figure never wraps mid-number", () => {
    const out = formatCertCurrency(108500000, "ZAR");
    expect(out).toBe("ZAR 108 500 000,00");
    expect(out).not.toMatch(/ /); // no ASCII space anywhere
    expect([...out].filter(c => c === " ")).toHaveLength(3); // one after ZAR, two grouping
  });

  it("preserves cents", () => {
    expect(formatCertCurrency("250000.5", "ZAR")).toBe("ZAR 250 000,50");
  });

  it("keeps the sign on a negative amount", () => {
    expect(formatCertCurrency(-1500.25, "ZAR")).toBe("ZAR -1 500,25");
  });

  it("does not group below a thousand", () => {
    expect(formatCertCurrency(999.99, "ZAR")).toBe("ZAR 999,99");
  });

  it("falls back to no symbol when currency is missing", () => {
    expect(formatCertCurrency(1000, null)).toBe("1 000,00");
    expect(formatCertCurrency(1000, undefined)).toBe("1 000,00");
  });

  it('returns "—" when the amount is missing', () => {
    expect(formatCertCurrency(null, "ZAR")).toBe("—");
    expect(formatCertCurrency(undefined, "ZAR")).toBe("—");
    expect(formatCertCurrency("", "ZAR")).toBe("—");
  });

  it("returns the raw string for non-numeric input", () => {
    expect(formatCertCurrency("not-a-number", "ZAR")).toBe("not-a-number");
  });
});

// ── buildCertificateUrl ────────────────────────────────────────────────────

describe("buildCertificateUrl", () => {
  it("builds the public URL with a given origin", () => {
    const url = buildCertificateUrl("vo", "abc-123", "https://app.baselinq.com");
    expect(url).toBe("https://app.baselinq.com/certificates/vo/abc-123");
  });

  it("lowercases the type for URL consistency", () => {
    const url = buildCertificateUrl("VO", "abc-123", "https://x.test");
    expect(url).toBe("https://x.test/certificates/vo/abc-123");
  });

  it("returns empty string when type or token is missing", () => {
    expect(buildCertificateUrl(null, "abc", "https://x.test")).toBe("");
    expect(buildCertificateUrl("vo", null, "https://x.test")).toBe("");
    expect(buildCertificateUrl(undefined, undefined, "https://x.test")).toBe("");
  });
});
