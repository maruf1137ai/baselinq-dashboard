import { describe, expect, it } from "vitest";

import { hasRetention, parseRetentionRate } from "../retention";

describe("parseRetentionRate", () => {
  it("treats blank, null and undefined as no retention", () => {
    expect(parseRetentionRate("")).toBe(0);
    expect(parseRetentionRate("   ")).toBe(0);
    expect(parseRetentionRate(null)).toBe(0);
    expect(parseRetentionRate(undefined)).toBe(0);
  });

  it("keeps a typed 0 as 0 — never the old hidden 5%", () => {
    expect(parseRetentionRate("0")).toBe(0);
    expect(parseRetentionRate(0)).toBe(0);
  });

  it("reads real rates from strings and numbers", () => {
    expect(parseRetentionRate("5")).toBe(5);
    expect(parseRetentionRate("7.5")).toBe(7.5);
    expect(parseRetentionRate("5.00")).toBe(5);
    expect(parseRetentionRate(10)).toBe(10);
  });

  it("refuses garbage and negatives", () => {
    expect(parseRetentionRate("abc")).toBe(0);
    expect(parseRetentionRate("-3")).toBe(0);
  });
});

describe("hasRetention", () => {
  it("is true only for a positive rate or amount", () => {
    expect(hasRetention(5)).toBe(true);
    expect(hasRetention("0.01")).toBe(true);
    expect(hasRetention(0)).toBe(false);
    expect(hasRetention("")).toBe(false);
    expect(hasRetention(null)).toBe(false);
  });
});
