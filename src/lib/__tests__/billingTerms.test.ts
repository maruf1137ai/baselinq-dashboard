/**
 * Settings → Billing validation (QA BUG-12 / BUG-13).
 *
 * A cleared fee-rate field became `Number("") === 0` and saved a 0% rate on a
 * project still marked Active. The form now holds text and refuses to save
 * anything the server would refuse.
 */
import { describe, expect, it } from "vitest";

import { billingDraftErrors } from "@/lib/billingTerms";

const draft = (over: Partial<{ rate: string; vat: string; cap: string }> = {}) => ({
  rate: "1",
  vat: "15",
  cap: "",
  ...over,
});

describe("billingDraftErrors", () => {
  it("accepts ordinary terms", () => {
    expect(billingDraftErrors(draft(), true)).toEqual({});
    expect(billingDraftErrors(draft({ cap: "50000" }), true)).toEqual({});
  });

  it("refuses an emptied fee rate instead of saving 0%", () => {
    expect(billingDraftErrors(draft({ rate: "" }), true).rate).toMatch(/Enter a fee rate/);
    expect(billingDraftErrors(draft({ rate: "   " }), false).rate).toMatch(/Enter a fee rate/);
  });

  it("refuses an emptied VAT rate", () => {
    expect(billingDraftErrors(draft({ vat: "" }), true).vat).toMatch(/Enter a VAT rate/);
  });

  it("refuses 0% while billing is on, and allows it once switched off", () => {
    expect(billingDraftErrors(draft({ rate: "0" }), true).rate).toMatch(/above 0%/);
    expect(billingDraftErrors(draft({ rate: "0" }), false)).toEqual({});
  });

  it("refuses percentages outside 0–100", () => {
    expect(billingDraftErrors(draft({ vat: "150" }), true).vat).toMatch(/between 0 and 100/);
    expect(billingDraftErrors(draft({ rate: "-1" }), true).rate).toMatch(/between 0 and 100/);
  });

  it("refuses a negative cap, and treats an empty cap as uncapped", () => {
    expect(billingDraftErrors(draft({ cap: "-5" }), true).cap).toMatch(/negative/);
    expect(billingDraftErrors(draft({ cap: "" }), true).cap).toBeUndefined();
  });
});
