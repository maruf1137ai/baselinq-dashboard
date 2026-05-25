import { describe, it, expect } from "vitest";

import { predictNextAssignee } from "../assignmentAfterReply";

const C = { id: 1, role: "contractor" };
const P = { id: 2, role: "professional" };
const PM = { id: 3, role: "pm" };

describe("predictNextAssignee", () => {
  // ── Universal rule: ball goes back to original author ──────────────────

  it("RFI flow — pro replies, ball goes back to the raised_by contractor", () => {
    const next = predictNextAssignee({ raised_by: C }, P);
    expect(next?.id).toBe(C.id);
  });

  it("RFI flow — camelCase field shape (raisedBy)", () => {
    const next = predictNextAssignee({ raisedBy: C }, P);
    expect(next?.id).toBe(C.id);
  });

  it("SI flow — contractor replies, ball goes back to the issued_by pro", () => {
    const next = predictNextAssignee({ issued_by: P }, C);
    expect(next?.id).toBe(P.id);
  });

  it("DC flow — pro replies, ball goes back to the submitted_by contractor", () => {
    const next = predictNextAssignee({ submitted_by: C }, P);
    expect(next?.id).toBe(C.id);
  });

  it("IC flow — PM replies, ball goes back to the raised_by contractor", () => {
    const next = predictNextAssignee({ raised_by: C }, PM);
    expect(next?.id).toBe(C.id);
  });

  // ── Self-reply: no reassignment ────────────────────────────────────────

  it("returns null when the only author candidate is the reply author themselves", () => {
    // Contractor raised the RFI; contractor replies on their own RFI →
    // there's no other author candidate, ball stays where it was.
    const next = predictNextAssignee({ raised_by: C }, C);
    expect(next).toBeNull();
  });

  // ── Field priority ────────────────────────────────────────────────────

  it("prefers raised_by over created_by", () => {
    const next = predictNextAssignee({ raised_by: C, created_by: PM }, P);
    expect(next?.id).toBe(C.id);
  });

  it("falls back to next field when first candidate IS the replier", () => {
    // raised_by is the replier; skip them, return submitted_by.
    const next = predictNextAssignee({ raised_by: P, submitted_by: C }, P);
    expect(next?.id).toBe(C.id);
  });

  it("falls back through to created_by when no earlier author fits", () => {
    const next = predictNextAssignee({ created_by: C }, P);
    expect(next?.id).toBe(C.id);
  });

  // ── Defensive returns ─────────────────────────────────────────────────

  it("returns null for null/undefined inputs", () => {
    expect(predictNextAssignee(null, C)).toBeNull();
    expect(predictNextAssignee(undefined, C)).toBeNull();
    expect(predictNextAssignee({ raised_by: C }, null)).toBeNull();
    expect(predictNextAssignee({ raised_by: C }, undefined)).toBeNull();
  });

  it("returns null when reply author has no id", () => {
    expect(predictNextAssignee({ raised_by: C }, {})).toBeNull();
  });

  it("returns null when task has no author fields at all", () => {
    expect(predictNextAssignee({}, C)).toBeNull();
  });

  it("handles string and number ids interchangeably (DRF returns ints, some legacy returns strings)", () => {
    const stringContractor = { id: "1" };
    const next = predictNextAssignee({ raised_by: stringContractor }, { id: 2 });
    expect(next?.id).toBe("1");
    // Reverse: reply author id as string, candidate as int
    const noNext = predictNextAssignee({ raised_by: { id: 1 } }, { id: "1" });
    expect(noNext).toBeNull();
  });
});
