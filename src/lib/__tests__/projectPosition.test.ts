import { describe, expect, it } from "vitest";

import {
  buildKeyIndicators,
  certificateAdjustments,
  financialOverview,
  worstPaymentDelay,
} from "../projectPosition";
import { summariseMoney } from "../homeSignals";

// Project 45's real shape, so the expectations below are the figures the page
// actually renders rather than a convenient fiction.
const PROJECT_45 = { contractValue: 10_000_000, retentionRate: 5 };
const CERTS_45 = [
  { id: 45, workflowState: "posted", claimAmount: 1_400_000, retentionAmount: 70_000 },
  { id: 46, workflowState: "posted", claimAmount: 1_850_000, retentionAmount: 92_500 },
  { id: 47, workflowState: "posted", claimAmount: 2_100_000, retentionAmount: 105_000 },
  { id: 48, workflowState: "posted", claimAmount: 1_600_000, retentionAmount: 80_000 },
  { id: 49, workflowState: "posted", claimAmount: 1_250_000, retentionAmount: 62_500 },
  { id: 50, workflowState: "submitted", claimAmount: 980_000, retentionAmount: 49_000 },
];
const VOS_45 = [
  { status: "Approved", grandTotal: 552_000 },
  { status: "Approved", grandTotal: 368_000 },
  { status: "Approved", grandTotal: 460_000 },
  { status: "Submitted", grandTotal: 207_000 },
  { status: "Under Review", grandTotal: 304_750 },
];

describe("financialOverview", () => {
  const money = summariseMoney(PROJECT_45, CERTS_45, VOS_45);
  const rows = financialOverview(money);
  const row = (k: string) => rows.find((r) => r.key === k)!;

  it("is the client's six fields in his order", () => {
    expect(rows.map((r) => r.key)).toEqual([
      "original",
      "variations",
      "revised",
      "certified",
      "retention",
      "balance",
    ]);
  });

  it("marks exactly the two rows the client marks auto-calculated", () => {
    expect(rows.filter((r) => r.derived).map((r) => r.key)).toEqual(["revised", "balance"]);
  });

  it("revises the contract sum by the approved variations only", () => {
    // 552 000 + 368 000 + 460 000. The Submitted and Under Review ones are out.
    expect(money.variations).toBe(1_380_000);
    expect(money.revisedContractSum).toBe(11_380_000);
    expect(row("revised").value).toBe("R 11 380 000,00");
  });

  it("derives the balance as revised − certified − retention", () => {
    // 11 380 000 − 8 200 000 − 410 000.
    expect(money.balance).toBe(2_770_000);
    expect(row("balance").value).toBe("R 2 770 000,00");
  });

  it("is not the old contract_value − certified figure", () => {
    // The formula this replaced gave 1 800 000 on exactly this data — light by
    // R 970 000, being the variations it ignored less the retention it ignored.
    expect(money.balance).not.toBe(1_800_000);
    expect(money.revisedContractSum! - money.certified! - money.retentionHeld!).toBe(2_770_000);
  });

  it("counts only posted certificates towards certified and retention", () => {
    // PC-006 is submitted: its R980 000 and R49 000 are in neither.
    expect(money.certified).toBe(8_200_000);
    expect(money.retentionHeld).toBe(410_000);
  });

  it("leaves a row blank rather than printing a zero it cannot support", () => {
    const empty = financialOverview(summariseMoney({}, [], []));
    expect(empty.find((r) => r.key === "original")!.value).toBeNull();
    expect(empty.find((r) => r.key === "revised")!.value).toBeNull();
    expect(empty.find((r) => r.key === "balance")!.value).toBeNull();
  });
});

describe("certificateAdjustments", () => {
  it("signs each component the way pc_integrity.recompute does", () => {
    const a = certificateAdjustments({
      penalties: 50_000,
      advanceRecovery: 30_000,
      retentionRelease: 20_000,
      escalationAmount: 5_000,
    })!;
    // subtotal = certified − penalties          →  penalties reduce
    // total    = subtotal + vat − advance       →  advance recovery reduces
    // certified= valuation − retention + release→  release increases
    // escalation is already signed              →  adds as given
    expect(a.total).toBe(-50_000 - 30_000 + 20_000 + 5_000);
    expect(a.total).toBe(-55_000);
  });

  it("carries a deflationary escalation through as the negative it is", () => {
    const a = certificateAdjustments({ escalationAmount: -12_000 })!;
    expect(a.total).toBe(-12_000);
    expect(a.components).toEqual([{ label: "Escalation", amount: -12_000 }]);
  });

  it("can be positive, and is not assumed to be a deduction", () => {
    // The client's mock draws this line negative and in red. It is signed.
    const a = certificateAdjustments({ retentionRelease: 400_000 })!;
    expect(a.total).toBe(400_000);
  });

  it("lists only the components that are actually non-zero", () => {
    const a = certificateAdjustments({ penalties: 1_000, advanceRecovery: 0 })!;
    expect(a.components).toEqual([{ label: "Penalties", amount: -1_000 }]);
  });

  it("is absent rather than zero when the certificate has no adjustments", () => {
    // Every certificate on project 45 is this case.
    expect(
      certificateAdjustments({
        claimAmount: 980_000,
        netAmount: 1_070_650,
        penalties: 0,
        advanceRecovery: 0,
        retentionRelease: 0,
        escalationAmount: null,
      }),
    ).toBeNull();
    expect(certificateAdjustments(null)).toBeNull();
  });
});

describe("worstPaymentDelay", () => {
  const summary = {
    overdueCount: 2,
    certificates: [
      {
        pcNumber: "PC-004",
        isOverdue: true,
        daysPastDue: 47,
        due: { dueDate: "2026-07-02", basisIsContractual: false, warning: "counted from the certificate date" },
      },
      {
        pcNumber: "PC-005",
        isOverdue: true,
        daysPastDue: 16,
        due: { dueDate: "2026-08-01", basisIsContractual: true, warning: null },
      },
      { pcNumber: "PC-006", isOverdue: false, daysPastDue: 0, due: { dueDate: null, computable: false } },
    ],
  };

  it("reports the certificate furthest past its due date", () => {
    const d = worstPaymentDelay(summary)!;
    expect(d.ref).toBe("PC-004");
    expect(d.days).toBe(47);
    expect(d.overdueCount).toBe(2);
  });

  it("carries the server's basis flag through so a fallback is never silent", () => {
    expect(worstPaymentDelay(summary)!.basisIsContractual).toBe(false);
    expect(worstPaymentDelay(summary)!.warning).toBe("counted from the certificate date");
  });

  it("is null when nothing is overdue — not a zero-day delay", () => {
    expect(
      worstPaymentDelay({ overdueCount: 0, certificates: [{ pcNumber: "PC-001", isOverdue: false, daysPastDue: 0 }] }),
    ).toBeNull();
    expect(worstPaymentDelay(undefined)).toBeNull();
    expect(worstPaymentDelay({})).toBeNull();
  });
});

describe("buildKeyIndicators", () => {
  const money = summariseMoney(PROJECT_45, CERTS_45, VOS_45);
  const base = {
    variations: { total: 5, outstanding: 2, outstandingValue: 511_750, drafts: 0, settled: 3 },
    paymentDelay: {
      ref: "PC-005",
      days: 16,
      dueDate: "2026-08-01",
      overdueCount: 1,
      basisIsContractual: false,
      warning: "counted from the certificate date",
    },
    paymentsAnswered: true,
    retention: { held: money.retentionHeld, ratePct: 5 },
    riskCounts: { red: 8, orange: 2, total: 10 },
    riskUnavailable: false,
    canViewFinance: true,
  };

  it("builds the client's four indicators", () => {
    const out = buildKeyIndicators(base);
    expect(out.map((i) => i.key)).toEqual(["payment-delay", "risk", "variations", "retention"]);
  });

  it("states the payment delay as a real day count", () => {
    const d = buildKeyIndicators(base).find((i) => i.key === "payment-delay")!;
    expect(d.state).toBe("16 days overdue");
    expect(d.tone).toBe("red");
  });

  it("colours only what has breached something", () => {
    const out = buildKeyIndicators(base);
    const tone = (k: string) => out.find((i) => i.key === k)!.tone;
    // A due date has passed, and risk rules have fired: both are breaches.
    expect(tone("payment-delay")).toBe("red");
    expect(tone("risk")).toBe("red");
    // A pending variation is work in progress, and retention held is simply a
    // fact about the contract. Neither is a breach, so neither is coloured.
    expect(tone("variations")).toBe("neutral");
    expect(tone("retention")).toBe("neutral");
  });

  it("says nothing about a retention limit, because none is recorded", () => {
    const r = buildKeyIndicators(base).find((i) => i.key === "retention")!;
    expect(r.state).toBe("R 410 000,00");
    expect(`${r.state} ${r.detail} ${r.caveat}`.toLowerCase()).not.toContain("at limit");
  });

  it("never renders a risk outage as clear", () => {
    const out = buildKeyIndicators({ ...base, riskUnavailable: true, riskCounts: null });
    const r = out.find((i) => i.key === "risk")!;
    expect(r.state).toBe("Unknown");
    expect(r.state).not.toBe("Clear");
  });

  it("drops every finance indicator for a viewer without finance.view", () => {
    const out = buildKeyIndicators({ ...base, canViewFinance: false });
    expect(out.map((i) => i.key)).toEqual(["risk"]);
    const text = JSON.stringify(out).toLowerCase();
    expect(text).not.toContain("retention");
    expect(text).not.toContain("variation");
    expect(text).not.toContain("overdue");
    expect(text).not.toMatch(/r\s?\d/);
  });

  it("drops an indicator with nothing behind it rather than printing a zero", () => {
    const out = buildKeyIndicators({
      ...base,
      // A project with no variations at all, and nothing overdue.
      variations: { total: 0, outstanding: 0, outstandingValue: null, drafts: 0, settled: 0 },
      paymentDelay: null,
      retention: { held: null, ratePct: 5 },
    });
    expect(out.map((i) => i.key)).toEqual(["risk"]);
  });

  it("reads a clear project as clear and in no colour", () => {
    const out = buildKeyIndicators({
      ...base,
      riskCounts: { red: 0, orange: 0, total: 0 },
    });
    const r = out.find((i) => i.key === "risk")!;
    expect(r.state).toBe("Clear");
    expect(r.tone).toBe("neutral");
  });
});
