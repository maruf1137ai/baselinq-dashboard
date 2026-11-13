import { describe, expect, it } from "vitest";

import { invoiceVatLabel } from "../platformBilling";

describe("invoiceVatLabel", () => {
  it("reads the rate the lines were charged at", () => {
    expect(invoiceVatLabel([{ vatRatePct: "15.00" }, { vatRatePct: "15.00" }])).toBe("VAT (15%)");
  });

  it("says only VAT when lines carry different rates", () => {
    expect(invoiceVatLabel([{ vatRatePct: "15.00" }, { vatRatePct: "7.50" }])).toBe("VAT");
  });

  it("falls back to the fixed platform rate with no lines", () => {
    expect(invoiceVatLabel([])).toBe("VAT (15%)");
    expect(invoiceVatLabel(undefined)).toBe("VAT (15%)");
  });
});
