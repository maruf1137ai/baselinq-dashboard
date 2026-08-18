import { describe, expect, it } from "vitest";

import {
  buildKeyIndicators,
  certificateAdjustments,
  financialOverview,
  netRetentionHeld,
  summariseCertificateBasis,
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
    expect(row("revised").value).toBe("R\u00a011\u00a0380\u00a0000,00");
  });

  it("derives the balance as revised − certified, and does NOT deduct retention", () => {
    // 11 380 000 − 8 200 000. Retention is withheld out of value that has
    // already been certified — `claim_amount` is gross of it per
    // pc_integrity.recompute — so it is inside the certified figure and
    // taking it off again removes the same R410 000 twice.
    expect(row("balance").value).toBe("R\u00a03\u00a0180\u00a0000,00");
    expect(row("balance").label).toBe("Balance still to certify");
    expect(row("balance").formula).toBe("revised sum − certified to date");
  });

  it("is the SAME figure the shared derivation returns — no local rebuild", () => {
    // This test used to assert the opposite: that `summariseMoney` still
    // returned the double-deducted R 2 770 000 and that this page quietly
    // rendered a different number. It existed to keep the defect visible.
    //
    // The defect is fixed at the source. `summariseMoney.balance` no longer
    // deducts retention, `financialOverview` no longer rebuilds it locally,
    // and Home and Project Health print one number under one name. The gap
    // this asserted — exactly the retention balance, R 410 000 — is gone.
    expect(money.balance).toBe(3_180_000);
    expect(row("balance").value).toBe("R\u00a03\u00a0180\u00a0000,00");
    expect(money.retentionHeld).toBe(410_000);
  });

  it("does not claim a checkable derivation for the revised sum", () => {
    // `original + approved variations` is how it is computed and is not
    // reliably TRUE of it: _apply_vo_to_project puts a signed variation into
    // both operands. Wrong working is worse than none.
    expect(row("revised").formula).toBeUndefined();
    expect(row("revised").warning).toMatch(/double-count/i);
  });

  it("does not call certified value a payment", () => {
    // Nothing here has been paid; posted means certified.
    expect(row("certified").label).toBe("Certified to date");
    expect(rows.some((r) => /payment/i.test(r.label))).toBe(false);
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
    // A due date has passed. That is a breach that has already happened, and
    // it is the only indicator that carries colour.
    expect(tone("payment-delay")).toBe("red");
    // A COUNT is not a breach. "12" in red says nothing about what the twelve
    // are; the twelve are drawn in the feed, under a tier heading that names
    // them in words. Colouring the tally too spends the ink twice, on the less
    // informative of the two.
    expect(tone("risk")).toBe("neutral");
    // A pending variation is work in progress, and retention held is simply a
    // fact about the contract. Neither is a breach, so neither is coloured.
    expect(tone("variations")).toBe("neutral");
    expect(tone("retention")).toBe("neutral");
  });

  it("says nothing about a retention limit, because none is recorded", () => {
    const r = buildKeyIndicators(base).find((i) => i.key === "retention")!;
    expect(r.state).toBe("R\u00a0410\u00a0000,00");
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

  it("does not read an empty result as a clear project", () => {
    // "Clear" is a claim about the works. A project with no milestones loaded
    // produces the same zero as one being run immaculately.
    const out = buildKeyIndicators({
      ...base,
      riskCounts: { red: 0, orange: 0, total: 0 },
    });
    const r = out.find((i) => i.key === "risk")!;
    expect(r.state).toBe("None detected");
    expect(r.detail).toMatch(/not the same as nothing being there/);
    expect(r.tone).toBe("neutral");
  });
});

// ── The basis the certificate rows are on ─────────────────────────────────

describe("summariseCertificateBasis", () => {
  it("sums retention released across posted certificates only", () => {
    const b = summariseCertificateBasis([
      { id: 1, workflowState: "posted", claimAmount: 100, retentionRelease: 40 },
      { id: 2, workflowState: "posted", claimAmount: 100, retentionRelease: 10 },
      { id: 3, workflowState: "submitted", claimAmount: 100, retentionRelease: 999 },
    ]);
    expect(b.retentionReleased).toBe(50);
    expect(b.certifiedRows).toBe(2);
  });

  it("reports null, not zero, when no certificate carries a release figure", () => {
    // An absent column is not a statement that nothing was released.
    const b = summariseCertificateBasis([
      { id: 1, workflowState: "posted", claimAmount: 100 },
    ]);
    expect(b.retentionReleased).toBeNull();
  });

  it("counts the rows that put a VAT-inclusive figure into the certified total", () => {
    // certifiedValueOf falls back to totalPayable / netAmount, both of which
    // are VAT-inclusive, on legacy rows with no claimAmount.
    const b = summariseCertificateBasis([
      { id: 1, workflowState: "posted", claimAmount: 100 },
      { id: 2, workflowState: "posted", netAmount: 115 },
      { id: 3, workflowState: "posted", totalPayable: 115 },
    ]);
    expect(b.vatInclusiveRows).toBe(2);
    expect(b.certifiedRows).toBe(3);
  });
});

describe("netRetentionHeld", () => {
  it("takes releases off the held balance", () => {
    expect(netRetentionHeld(410_000, 150_000)).toBe(260_000);
  });

  it("returns the gross figure unchanged when releases could not be read", () => {
    expect(netRetentionHeld(410_000, null)).toBe(410_000);
  });

  it("never reports negative security held", () => {
    expect(netRetentionHeld(100, 250)).toBe(0);
  });

  it("stays null when nothing is held", () => {
    expect(netRetentionHeld(null, 50)).toBeNull();
  });
});

describe("financialOverview — retention releases", () => {
  const money = summariseMoney(PROJECT_45, CERTS_45, VOS_45);

  it("subtracts released retention and states the working", () => {
    const basis = summariseCertificateBasis([
      ...CERTS_45.map((c) => ({ ...c, retentionRelease: 0 })),
      { id: 99, workflowState: "posted", claimAmount: 0, retentionRelease: 110_000 },
    ]);
    const row = financialOverview(money, basis).find((r) => r.key === "retention")!;
    // 410 000 held less 110 000 released.
    expect(row.value).toBe("R\u00a0300\u00a0000,00");
    expect(row.formula).toBe("withheld − released");
    expect(row.warning).toBeUndefined();
  });

  it("warns rather than silently showing a gross figure as net", () => {
    const basis = summariseCertificateBasis(CERTS_45);
    const row = financialOverview(money, basis).find((r) => r.key === "retention")!;
    expect(row.value).toBe("R\u00a0410\u00a0000,00");
    expect(row.warning).toMatch(/retention-release/i);
  });

  it("warns when the certified total mixed VAT bases", () => {
    const basis = summariseCertificateBasis([
      { id: 1, workflowState: "posted", claimAmount: 100 },
      { id: 2, workflowState: "posted", netAmount: 115 },
    ]);
    const row = financialOverview(money, basis).find((r) => r.key === "certified")!;
    expect(row.warning).toMatch(/VAT-inclusive/i);
  });
});
