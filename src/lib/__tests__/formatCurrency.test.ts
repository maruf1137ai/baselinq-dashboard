import { describe, expect, it } from "vitest";

import { formatZAR } from "../formatCurrency";
import { parseMoneyInput } from "../money";

/** U+00A0 NO-BREAK SPACE, written as an escape so the intent is visible. */
const NBSP = "\u00a0";

describe("formatZAR", () => {
  it("groups thousands with a NON-BREAKING space", () => {
    // The defect: `Figure` in `components/home/blocks.tsx` sets
    // `tabular-nums break-words`, and `overflow-wrap: break-word` breaks at a
    // space before it breaks anywhere else. With ordinary spaces
    // "R 108 500 000,00" wrapped in a narrow cell to
    //
    //     R 108 500
    //     000,00
    //
    // and the first line is a syntactically complete, plausible, WRONG number
    // — worse than the ellipsis it replaced, because an ellipsis at least
    // signals that something was lost.
    expect(formatZAR(108_500_000)).toBe(`R${NBSP}108${NBSP}500${NBSP}000,00`);
    expect(formatZAR(108_500_000)).not.toContain(" ");
  });

  it("uses a non-breaking space after the R as well", () => {
    expect(formatZAR(250)).toBe(`R${NBSP}250,00`);
  });

  it("keeps a comma decimal and two places, as the SA convention has it", () => {
    expect(formatZAR(250.75)).toBe(`R${NBSP}250,75`);
    expect(formatZAR(0)).toBe(`R${NBSP}0,00`);
  });

  it("keeps the sign visible on a negative", () => {
    expect(formatZAR(-1_250_000)).toBe(`R${NBSP}-1${NBSP}250${NBSP}000,00`);
  });

  it("round-trips through the app's own money input", () => {
    // `parseMoneyInput` already accepts U+00A0 as grouping, so a figure this
    // function renders can be pasted back into a certificate field.
    expect(parseMoneyInput(formatZAR(1_377_500))).toBe(1_377_500);
    expect(parseMoneyInput(formatZAR(-500))).toBe(-500);
  });
});
