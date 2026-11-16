/**
 * Baselinq's fee is invoiced in rand, so it reads in rand on every screen,
 * not in the selected project's currency.
 */
import { afterEach, describe, expect, it } from "vitest";

import { setActiveCurrency } from "../formatCurrency";
import { formatFee, platformFeeSummary } from "../platformFee";

afterEach(() => setActiveCurrency("ZAR"));

describe("platform fee formatting", () => {
  it("is in rand on a project in another currency", () => {
    setActiveCurrency("USD");
    expect(formatFee(1000)).toBe("R 1 000,00");
    expect(formatFee("150.00")).toBe("R 150,00");
  });

  it("summarises a fee and its VAT in rand", () => {
    setActiveCurrency("RWF");
    expect(platformFeeSummary({ feeAmount: 1000, vatAmount: "150.00" })).toBe(
      "Baselinq platform fee R 1 000,00 + VAT R 150,00",
    );
  });
});
