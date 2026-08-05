import { describe, it, expect } from "vitest";

import { formatMoneyInput, parseMoneyInput } from "../money";

// Every case in the first block is a value the old currency input
// (`value.replace(/[^0-9]/g, "")`) got wrong, with the wrong answer named. If
// any of these regress, a certificate goes out with the wrong money on it.

describe("parseMoneyInput — the figures the old input corrupted", () => {
  it("reads a spreadsheet paste instead of multiplying it by 100", () => {
    // Was 125000000 — a hundredfold over-certification.
    expect(parseMoneyInput("1,250,000.00")).toBe(1250000);
  });

  it("keeps cents instead of folding them into the rand", () => {
    // Was 25075.
    expect(parseMoneyInput("250.75")).toBe(250.75);
  });

  it("refuses an exponent rather than reading it as its digits", () => {
    // Was 16.
    expect(parseMoneyInput("1e6")).toBeNull();
  });

  it("keeps the minus sign on a correcting entry", () => {
    // Was 5000 — the sign silently reversed.
    expect(parseMoneyInput("-5000")).toBe(-5000);
    expect(parseMoneyInput("-1 250 000,50")).toBe(-1250000.5);
    expect(parseMoneyInput("-R 500")).toBe(-500);
    expect(parseMoneyInput("R -500")).toBe(-500);
  });
});

describe("parseMoneyInput — separators", () => {
  it("reads the South African rendering the app itself produces", () => {
    expect(parseMoneyInput("1 250 000,00")).toBe(1250000);
    expect(parseMoneyInput("R 1 377 500,00")).toBe(1377500);
  });

  it("reads a comma decimal", () => {
    expect(parseMoneyInput("250,75")).toBe(250.75);
  });

  it("treats a lone comma before three digits as grouping, not a decimal", () => {
    expect(parseMoneyInput("1,250")).toBe(1250);
  });

  it("treats a lone full stop before three digits as grouping", () => {
    expect(parseMoneyInput("1.250")).toBe(1250);
  });

  it("resolves both separators by which comes last", () => {
    expect(parseMoneyInput("1,250,000.00")).toBe(1250000);
    expect(parseMoneyInput("1.250.000,00")).toBe(1250000);
  });

  it("accepts a non-breaking space and an apostrophe as grouping", () => {
    expect(parseMoneyInput("1 250 000,00")).toBe(1250000);
    expect(parseMoneyInput("1'250'000.00")).toBe(1250000);
  });

  it("accepts the R prefix in either case, with or without a space", () => {
    expect(parseMoneyInput("R250")).toBe(250);
    expect(parseMoneyInput("r 250")).toBe(250);
  });
});

describe("parseMoneyInput — what it refuses", () => {
  it("returns null rather than a guess for text", () => {
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("12abc")).toBeNull();
    // A foreign symbol is not silently dropped — the amount may not be rands.
    expect(parseMoneyInput("$1,250")).toBeNull();
    expect(parseMoneyInput("1 250 000,00 ZAR")).toBeNull();
  });

  it("returns null for a sign that is not yet a number", () => {
    expect(parseMoneyInput("-")).toBeNull();
    expect(parseMoneyInput("+")).toBeNull();
  });

  it("reads an empty field as zero, not as unreadable", () => {
    expect(parseMoneyInput("")).toBe(0);
    expect(parseMoneyInput("   ")).toBe(0);
  });

  it("tolerates a part-typed decimal so typing is not interrupted", () => {
    expect(parseMoneyInput("12.")).toBe(12);
    expect(parseMoneyInput("12,")).toBe(12);
  });
});

describe("formatMoneyInput", () => {
  it("shows cents, grouped, without the R the input draws itself", () => {
    expect(formatMoneyInput(1250000)).toBe("1 250 000,00");
    expect(formatMoneyInput(250.75)).toBe("250,75");
  });

  it("keeps the sign visible", () => {
    expect(formatMoneyInput(-5000)).toBe("-5 000,00");
  });

  it("round-trips through the parser", () => {
    for (const v of [0, 12.34, 250.75, 1250000, -1250000.5]) {
      expect(parseMoneyInput(formatMoneyInput(v))).toBe(v);
    }
  });
});
