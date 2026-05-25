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
  // The helper uses Intl en-ZA (South African) — space thousands separator,
  // comma decimal. That's deliberate (this is a JBCC / ZAR product).
  it("formats a string amount with currency prefix", () => {
    expect(formatCertCurrency("250000", "ZAR")).toBe("ZAR 250 000,00");
  });

  it("formats a numeric amount", () => {
    expect(formatCertCurrency(250000, "ZAR")).toBe("ZAR 250 000,00");
  });

  it("preserves cents", () => {
    expect(formatCertCurrency("250000.5", "ZAR")).toBe("ZAR 250 000,50");
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
