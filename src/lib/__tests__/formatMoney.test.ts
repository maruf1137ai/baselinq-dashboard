/**
 * Contract money in the project's own currency (client meeting, 10 Nov 2026),
 * identical to formatZAR for a rand project.
 */
import { afterEach, describe, expect, it } from "vitest";

import { formatMoney, formatZAR, setActiveCurrency } from "../formatCurrency";

const NBSP = "\u00a0";

afterEach(() => setActiveCurrency("ZAR"));

describe("formatMoney", () => {
  it("is formatZAR for a rand project, so nothing changes there", () => {
    expect(formatMoney(1234567.89)).toBe(formatZAR(1234567.89));
    expect(formatMoney(-5)).toBe(formatZAR(-5));
  });

  it("follows the selected project's currency", () => {
    setActiveCurrency("usd");
    expect(formatMoney(1234567.89)).toBe(`US$${NBSP}1${NBSP}234${NBSP}567,89`);
  });

  it("prints Rwandan francs without cents, by code", () => {
    expect(formatMoney(1234567.4, "RWF")).toBe(`RWF${NBSP}1${NBSP}234${NBSP}567`);
  });

  it("an explicit currency beats the selected one", () => {
    setActiveCurrency("USD");
    expect(formatMoney(10, "ZAR")).toBe(formatZAR(10));
  });

  it("keeps the sign after the symbol, as formatZAR does", () => {
    expect(formatMoney(-1500, "EUR")).toBe(`€${NBSP}-1${NBSP}500,00`);
  });
});
