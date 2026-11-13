/**
 * The original contract sum is the sum agreed (total_budget), the revised sum
 * is the server's amended contract value, and signed variations are their
 * difference — so nothing is counted twice (client decision, 10 Nov 2026).
 */
import { describe, expect, it } from "vitest";

import { summariseMoney } from "../homeSignals";
import { financialOverview } from "../projectPosition";

const signedVo = { status: "Approved", signedAt: "2026-10-03T10:00:00Z", grandTotal: 3_737_500 };

describe("original vs revised contract sum", () => {
  const money = summariseMoney(
    { totalBudget: 42_750_000, contractValue: 46_000_000 },
    [],
    [signedVo],
  );

  it("shows the agreed original, not the amended contract value", () => {
    expect(money.contractSum).toBe(42_750_000);
  });

  it("takes the revised sum from the server and does not add variations a second time", () => {
    expect(money.revisedContractSum).toBe(46_000_000);
    expect(money.variations).toBe(3_250_000);
  });

  it("states the working on the revised row only when it holds", () => {
    const revised = financialOverview(money).find((r) => r.key === "revised");
    expect(revised?.formula).toBe("original contract sum + signed variations");
    const original = financialOverview(money).find((r) => r.key === "original");
    expect(original?.note).toMatch(/As agreed/);
  });
});
