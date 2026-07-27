import { describe, expect, it } from "vitest";

import {
  assumptionStatements,
  baseNarrative,
  basisShape,
  buildBasisFigures,
  capView,
  dedupeView,
  statementPeriod,
  strategyLabel,
  toNum,
} from "../feeBasis";

/**
 * `basisDetail` is three schemas, not one. These fixtures mirror what
 * billing/fee_base.py and billing/accrual.py actually store — note that every
 * value inside the blob is a STRING, because a JSONField cannot hold a
 * Decimal and a float cannot hold cents.
 */
const PC_DETAIL = {
  base: "400000.00",
  claim_amount: "500000.00",
  materials_on_site: "50000.00",
  retention_base: "500000.00",
  retention_rate_pct: "10.00",
  retention_amount: "50000.00",
  retention_release: "0.00",
  net_excluding_vat: "450000.00",
  strategy: "both",
  assumptions: {
    retention_includes_materials_on_site: true,
    fee_base_is_vat_exclusive: true,
    source: "recomputed server-side from project.retention_rate",
  },
  vo_deduplication: {
    deduction: "50000.00",
    matched: [{ voNumber: "VO-001", thisPeriod: "50000.00" }],
    unmatched: [{ voNumber: "VO-007", thisPeriod: "12000.00" }],
    why: "FeeBase.BOTH charges VOs at approval; the value of those VOs certified in this certificate is deducted.",
  },
  cap: {
    cap_amount: "50000.00",
    running_total_before: "1000.00",
    uncapped_fee: "4000.00",
    charged_fee: "4000.00",
    cap_reached: false,
  },
};

const VO_DETAIL = {
  base: "100000.00",
  sub_total: "100000.00",
  grand_total: "115000.00",
  approved_amount: null,
  derivation: "sub_total",
  strategy: "both",
  assumptions: { fee_base_is_vat_exclusive: true, partial_approval_is_pro_rata: true },
  cap: {
    cap_amount: null,
    running_total_before: "0.00",
    uncapped_fee: "1000.00",
    charged_fee: "1000.00",
    cap_reached: false,
  },
};

/** No `base`. No `cap`. No `assumptions`. This is the row that breaks naive code. */
const REVERSAL_DETAIL = {
  reverses_charge_id: 41,
  reverses_dedupe_key: "PC_POSTED:412",
  reason: "Certificate un-posted for re-measurement",
  original_basis: PC_DETAIL,
};

describe("basisShape", () => {
  it("trusts status first", () => {
    expect(basisShape(PC_DETAIL, "pc_posted", "reversal")).toBe("reversal");
  });

  it("identifies each shape from its keys alone", () => {
    expect(basisShape(PC_DETAIL)).toBe("pc");
    expect(basisShape(VO_DETAIL)).toBe("vo");
    expect(basisShape(REVERSAL_DETAIL)).toBe("reversal");
  });

  it("falls back to eventType, then to unknown", () => {
    expect(basisShape({}, "pc_posted")).toBe("pc");
    expect(basisShape({}, "vo_approved")).toBe("vo");
    expect(basisShape(null)).toBe("unknown");
    expect(basisShape(undefined)).toBe("unknown");
  });
});

describe("string decimals", () => {
  it("coerces without losing cents, and never yields NaN", () => {
    expect(toNum("400000.55")).toBe(400000.55);
    expect(toNum(null)).toBe(0);
    expect(toNum("")).toBe(0);
    expect(toNum("not a number")).toBe(0);
  });
});

describe("buildBasisFigures", () => {
  it("labels PC keys and puts the fee base last", () => {
    const figures = buildBasisFigures(PC_DETAIL);
    const labels = figures.map((f) => f.label);
    expect(labels[0]).toBe("Valuation claimed");
    expect(labels[labels.length - 1]).toBe("Fee base");
    expect(figures.find((f) => f.key === "retention_rate_pct")?.value).toBe("10.00%");
    expect(figures.find((f) => f.key === "base")?.emphasis).toBe(true);
  });

  it("hides nested blocks and plumbing rather than dumping them", () => {
    const keys = buildBasisFigures(PC_DETAIL).map((f) => f.key);
    expect(keys).not.toContain("assumptions");
    expect(keys).not.toContain("cap");
    expect(keys).not.toContain("vo_deduplication");
    expect(keys).not.toContain("strategy");
  });

  it("drops null approved_amount rather than rendering an empty row", () => {
    expect(buildBasisFigures(VO_DETAIL).map((f) => f.key)).not.toContain("approved_amount");
  });

  it("survives a reversal blob, which has none of the expected keys", () => {
    expect(() => buildBasisFigures(REVERSAL_DETAIL)).not.toThrow();
    const keys = buildBasisFigures(REVERSAL_DETAIL).map((f) => f.key);
    expect(keys).not.toContain("reverses_dedupe_key");
    expect(keys).not.toContain("original_basis");
  });
});

describe("baseNarrative", () => {
  it("spells out the certificate arithmetic so it can be checked", () => {
    const lines = baseNarrative(PC_DETAIL, "pc");
    expect(lines[0]).toContain("R 500 000,00");
    expect(lines[0]).toContain("R 450 000,00");
    expect(lines[lines.length - 1]).toContain("R 400 000,00");
  });

  it("explains a pro-rata partial approval", () => {
    const lines = baseNarrative(
      { ...VO_DETAIL, derivation: "approved_amount_pro_rata_of_sub_total", approved_amount: "57500.00", base: "50000.00" },
      "vo"
    );
    expect(lines.join(" ")).toContain("pro-rata");
  });

  it("returns nothing for a reversal instead of reading a missing base", () => {
    expect(baseNarrative(REVERSAL_DETAIL, "reversal")).toEqual([]);
    expect(baseNarrative(null, "unknown")).toEqual([]);
  });
});

describe("dedupeView / capView", () => {
  it("reads the deduction and both VO lists", () => {
    const d = dedupeView(PC_DETAIL)!;
    expect(d.deduction).toBe(50000);
    expect(d.matched).toHaveLength(1);
    expect(d.unmatched).toHaveLength(1);
  });

  it("returns null where the shape carries no such block", () => {
    expect(dedupeView(VO_DETAIL)).toBeNull();
    expect(dedupeView(REVERSAL_DETAIL)).toBeNull();
    expect(capView(REVERSAL_DETAIL)).toBeNull();
    expect(capView(null)).toBeNull();
  });

  it("distinguishes no cap from a cap not yet reached", () => {
    expect(capView(VO_DETAIL)!.capAmount).toBeNull();
    expect(capView(VO_DETAIL)!.narrative).toContain("No fee cap");
    expect(capView(PC_DETAIL)!.capAmount).toBe(50000);
    expect(capView(PC_DETAIL)!.narrative).toContain("full");
  });

  it("explains a capped charge with the headroom that was left", () => {
    const capped = capView({
      cap: {
        cap_amount: "50000.00",
        running_total_before: "49000.00",
        uncapped_fee: "4000.00",
        charged_fee: "1000.00",
        cap_reached: true,
      },
    })!;
    expect(capped.capReached).toBe(true);
    expect(capped.narrative).toContain("R 1 000,00");
    expect(capped.narrative).toContain("cap is now reached");
  });
});

describe("assumptionStatements", () => {
  it("turns booleans into statements a quantity surveyor can read", () => {
    const s = assumptionStatements(PC_DETAIL);
    expect(s).toContain("Retention is calculated on the full valuation, materials on site included.");
    expect(s.some((x) => x.includes("no fee is charged on VAT"))).toBe(true);
    expect(s.some((x) => x.startsWith("Recomputed server-side"))).toBe(true);
  });

  it("is empty for a reversal", () => {
    expect(assumptionStatements(REVERSAL_DETAIL)).toEqual([]);
  });
});

describe("misc", () => {
  it("names the charging strategy", () => {
    expect(strategyLabel("both")).toContain("de-duplicated");
    expect(strategyLabel("pc_only")).toBe("Payment certificates only");
    expect(strategyLabel("nonsense")).toBeNull();
  });

  it("groups on a sortable period key and degrades on a bad date", () => {
    expect(statementPeriod("2026-08-14T09:00:00Z").key).toBe("2026-08");
    expect(statementPeriod(null).label).toBe("Undated");
    expect(statementPeriod("rubbish").key).toBe("unknown");
  });
});
