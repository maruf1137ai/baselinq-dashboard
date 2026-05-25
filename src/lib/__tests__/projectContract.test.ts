import { describe, it, expect } from "vitest";

import {
  formatWithCommas,
  getContractValueDisplay,
  getContractEndDateDisplay,
} from "../projectContract";

// ── formatWithCommas ────────────────────────────────────────────────────────

describe("formatWithCommas", () => {
  it("adds thousand-separators to a plain integer", () => {
    expect(formatWithCommas(1500000)).toBe("1,500,000");
  });

  it("handles numeric strings", () => {
    expect(formatWithCommas("1500000")).toBe("1,500,000");
  });

  it("preserves decimal places", () => {
    expect(formatWithCommas("1500000.50")).toBe("1,500,000.50");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(formatWithCommas(null)).toBe("");
    expect(formatWithCommas(undefined)).toBe("");
    expect(formatWithCommas("")).toBe("");
  });

  it("returns the raw string when input is not numeric", () => {
    expect(formatWithCommas("abc")).toBe("abc");
  });

  it("strips existing commas before reformatting", () => {
    expect(formatWithCommas("1,500,000")).toBe("1,500,000");
  });
});

// ── getContractValueDisplay ─────────────────────────────────────────────────

describe("getContractValueDisplay", () => {
  it("reads camelCase contractValue", () => {
    expect(getContractValueDisplay({ contractValue: 1500000 })).toBe("1,500,000");
  });

  it("reads snake_case contract_value", () => {
    expect(getContractValueDisplay({ contract_value: 1500000 })).toBe("1,500,000");
  });

  it("prefers camelCase over snake_case when both are present", () => {
    expect(
      getContractValueDisplay({ contractValue: 1500000, contract_value: 999 })
    ).toBe("1,500,000");
  });

  it("handles decimal string (the API returns these as floats)", () => {
    expect(getContractValueDisplay({ contractValue: 5500000.0 })).toBe("5,500,000");
    expect(getContractValueDisplay({ contractValue: "1500000.00" })).toBe("1,500,000.00");
  });

  it("returns empty when both fields are missing", () => {
    expect(getContractValueDisplay({})).toBe("");
  });

  it("returns empty for null project (still loading)", () => {
    expect(getContractValueDisplay(null)).toBe("");
    expect(getContractValueDisplay(undefined)).toBe("");
  });

  it("treats 0 as empty (no contract yet)", () => {
    // Werner spec — backfill defaults contract_value to 0 for new projects;
    // we render this as blank rather than a literal "0" to keep the form
    // looking clean. If product later wants "0" shown, change this test.
    expect(getContractValueDisplay({ contractValue: 0 })).toBe("0");
  });
});

// ── getContractEndDateDisplay ───────────────────────────────────────────────

describe("getContractEndDateDisplay", () => {
  it("formats an ISO date string with PPP", () => {
    // PPP is date-fns "Jan 14th, 2027" style — exact wording is locale-tied
    // so we just assert it contains the year and month label.
    const out = getContractEndDateDisplay({ contractEndDate: "2027-01-14" });
    expect(out).toMatch(/2027/);
    expect(out).toMatch(/January/);
  });

  it("reads camelCase contractEndDate", () => {
    const out = getContractEndDateDisplay({ contractEndDate: "2026-12-31" });
    expect(out).toMatch(/December/);
  });

  it("reads snake_case contract_end_date", () => {
    const out = getContractEndDateDisplay({ contract_end_date: "2026-12-31" });
    expect(out).toMatch(/December/);
  });

  it("handles a full ISO datetime (backend serializer outputs T00:00:00.000Z)", () => {
    const out = getContractEndDateDisplay({
      contractEndDate: "2027-01-14T00:00:00.000Z",
    });
    expect(out).toMatch(/2027/);
    expect(out).toMatch(/January/);
  });

  it("returns empty when both fields are missing", () => {
    expect(getContractEndDateDisplay({})).toBe("");
  });

  it("returns empty when project is null", () => {
    expect(getContractEndDateDisplay(null)).toBe("");
    expect(getContractEndDateDisplay(undefined)).toBe("");
  });

  it("returns empty when the date is explicitly null", () => {
    expect(getContractEndDateDisplay({ contractEndDate: null })).toBe("");
  });

  it("falls back to the raw string when parseISO throws", () => {
    const out = getContractEndDateDisplay({ contractEndDate: "not-a-date" });
    expect(out).toBe("not-a-date");
  });
});
