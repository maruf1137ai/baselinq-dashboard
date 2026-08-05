import { describe, it, expect } from "vitest";

import {
  certificateConsumesRemainder,
  clampToRemaining,
  sumCertifiedByVo,
} from "../pcHistory";

const cert = (status: string, rows: { voNumber: string; thisPeriod: number }[]) => ({
  approvalStatus: status,
  voItems: rows,
});

describe("certificateConsumesRemainder", () => {
  it("counts a certificate that took effect", () => {
    for (const s of ["pending", "partial", "approved", "posted", "submitted"]) {
      expect(certificateConsumesRemainder({ approvalStatus: s })).toBe(true);
    }
  });

  it("does not let a draft or a rejected certificate eat the remainder", () => {
    for (const s of ["draft", "Draft", "rejected", "REJECTED", "cancelled", "void"]) {
      expect(certificateConsumesRemainder({ approvalStatus: s })).toBe(false);
    }
  });

  it("discounts on the workflow state too, not only the approval status", () => {
    expect(
      certificateConsumesRemainder({
        approvalStatus: "pending",
        workflowState: "rejected",
      }),
    ).toBe(false);
  });

  it("counts an unrecognised status — under-certifying beats certifying twice", () => {
    expect(certificateConsumesRemainder({ approvalStatus: "in_escrow" })).toBe(true);
    expect(certificateConsumesRemainder({})).toBe(true);
  });
});

describe("sumCertifiedByVo", () => {
  it("sums only the certificates that took effect", () => {
    const totals = sumCertifiedByVo([
      cert("approved", [{ voNumber: "VO-001", thisPeriod: 100 }]),
      cert("pending", [{ voNumber: "VO-001", thisPeriod: 50 }]),
      // Neither of these was ever issued.
      cert("draft", [{ voNumber: "VO-001", thisPeriod: 1000 }]),
      cert("rejected", [{ voNumber: "VO-001", thisPeriod: 1000 }]),
    ]);
    expect(totals["VO-001"]).toBe(150);
  });

  it("reads the snake_case shape as well as the camelCase one", () => {
    const totals = sumCertifiedByVo([
      { approval_status: "approved", vo_items: [{ vo_number: "VO-002", this_period: 25 }] },
    ]);
    expect(totals["VO-002"]).toBe(25);
  });

  it("ignores rows with no reference or a non-numeric amount", () => {
    const totals = sumCertifiedByVo([
      cert("approved", [
        { voNumber: "", thisPeriod: 99 } as any,
        { voNumber: "VO-003", thisPeriod: "oops" } as any,
        { voNumber: "VO-003", thisPeriod: 10 },
      ]),
    ]);
    expect(totals["VO-003"]).toBe(10);
    expect(totals[""]).toBeUndefined();
  });

  it("copes with an absent list", () => {
    expect(sumCertifiedByVo(undefined)).toEqual({});
    expect(sumCertifiedByVo([{ approvalStatus: "approved" }])).toEqual({});
  });
});

describe("clampToRemaining", () => {
  it("leaves an entry within the remainder alone and says nothing", () => {
    expect(clampToRemaining("VO-001", 40_000, 50_000)).toEqual({ value: 40_000 });
  });

  it("explains the reduction instead of silently rewriting the figure", () => {
    const out = clampToRemaining("VO-001", 80_000, 50_000);
    expect(out.value).toBe(50_000);
    expect(out.note).toContain("VO-001");
    expect(out.note).toContain("50 000,00");
  });

  it("says the variation is fully certified rather than flipping the field to 0", () => {
    const out = clampToRemaining("VO-003", 25_000, 0);
    expect(out.value).toBe(0);
    expect(out.note).toContain("fully certified");
    expect(out.note).toContain("VO-003");
  });

  it("lets a correcting negative entry through untouched", () => {
    expect(clampToRemaining("VO-001", -5_000, 0)).toEqual({ value: -5_000 });
    expect(clampToRemaining("VO-001", -5_000, 50_000)).toEqual({ value: -5_000 });
  });

  it("does not clamp when the remainder is unknown", () => {
    expect(clampToRemaining("VO-001", 999_999, undefined)).toEqual({ value: 999_999 });
  });
});
