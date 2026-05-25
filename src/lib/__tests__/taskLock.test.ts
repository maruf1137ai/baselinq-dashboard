import { describe, it, expect } from "vitest";

import { isTaskLocked } from "../taskLock";

// ── Null / empty input ──────────────────────────────────────────────────────

describe("isTaskLocked — null/empty inputs", () => {
  it("returns false for null", () => {
    expect(isTaskLocked(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTaskLocked(undefined)).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(isTaskLocked({})).toBe(false);
  });

  it("returns false when timeline has no stages", () => {
    expect(isTaskLocked({ type: "RFI", timeline: { stages: [], current: "" } })).toBe(false);
  });
});

// ── VO — locks on signed_at ────────────────────────────────────────────────

describe("isTaskLocked — VO type", () => {
  it("locks immediately when signed_at is set, ignoring timeline stage", () => {
    expect(
      isTaskLocked({
        type: "VO",
        signed_at: "2026-05-21T05:19:13Z",
        timeline: { stages: ["Draft", "Priced", "Approved"], current: "Draft" },
      }),
    ).toBe(true);
  });

  it("locks on camelCase signedAt", () => {
    expect(
      isTaskLocked({
        type: "VO",
        signedAt: "2026-05-21T05:19:13Z",
        timeline: { stages: ["Draft", "Approved"], current: "Draft" },
      }),
    ).toBe(true);
  });

  it("does NOT lock when signed_at is missing and timeline isn't on last stage", () => {
    expect(
      isTaskLocked({
        type: "VO",
        timeline: { stages: ["Draft", "Priced", "Approved"], current: "Priced" },
      }),
    ).toBe(false);
  });

  it("falls back to last-stage when signed_at is null but timeline shows final stage", () => {
    // Edge case: timeline says "Approved" but signed_at not yet stamped.
    // The last-stage rule keeps the lock honest as a safety net.
    expect(
      isTaskLocked({
        type: "VO",
        signed_at: null,
        timeline: { stages: ["Draft", "Approved"], current: "Approved" },
      }),
    ).toBe(true);
  });

  it("reads signed_at from rawTask when transformed task didn't propagate it", () => {
    expect(
      isTaskLocked(
        { type: "VO", timeline: { stages: ["Draft", "Approved"], current: "Draft" } },
        { signedAt: "2026-05-21T05:19:13Z" },
      ),
    ).toBe(true);
  });

  it("prefers signed_at on the transformed task over rawTask", () => {
    // Transformed task says NOT signed → not locked, even if raw says otherwise.
    // (This is the normal-case data flow — backend response → transform → display.
    // The raw fallback only fires when transformed didn't carry the field.)
    expect(
      isTaskLocked(
        { type: "VO", signed_at: "2026-05-21T05:19:13Z", timeline: { stages: ["x"], current: "" } },
        { signed_at: null },
      ),
    ).toBe(true);
  });
});

// ── SI — locks ONLY at Verified per Werner spec ────────────────────────────

describe("isTaskLocked — SI type", () => {
  it("does NOT lock at Issued, even with signed_at", () => {
    // Werner spec — SI workflow continues through Acknowledged → Actioned
    // → Verified. Issued is mid-flow; the contractor still has work to do.
    expect(
      isTaskLocked({
        type: "SI",
        status: "Issued",
        signed_at: "2026-05-21T05:19:13Z",
      }),
    ).toBe(false);
  });

  it("does NOT lock at Acknowledged", () => {
    expect(isTaskLocked({ type: "SI", status: "Acknowledged" })).toBe(false);
  });

  it("does NOT lock at Actioned", () => {
    expect(isTaskLocked({ type: "SI", status: "Actioned" })).toBe(false);
  });

  it("locks at Verified", () => {
    expect(isTaskLocked({ type: "SI", status: "Verified" })).toBe(true);
  });

  it("locks at legacy Completed status (existing rows pre-spec)", () => {
    expect(isTaskLocked({ type: "SI", status: "Completed" })).toBe(true);
  });

  it("locks at legacy Closed status (existing rows pre-spec)", () => {
    expect(isTaskLocked({ type: "SI", status: "Closed" })).toBe(true);
  });

  it("reads status from rawTask when transformed task didn't propagate it", () => {
    expect(
      isTaskLocked(
        { type: "SI" },
        { status: "Verified" },
      ),
    ).toBe(true);
  });

  it("reads status from rawTask.task when needed (nested API shape)", () => {
    expect(
      isTaskLocked(
        { type: "SI" },
        { task: { status: "Verified" } },
      ),
    ).toBe(true);
  });
});

// ── RFI / DC / GI / CPI — fall back to last-stage rule ─────────────────────

describe("isTaskLocked — non-signable task types", () => {
  it("locks an RFI when timeline.current is the last stage", () => {
    expect(
      isTaskLocked({
        type: "RFI",
        timeline: { stages: ["Open", "Replied", "Closed"], current: "Closed" },
      }),
    ).toBe(true);
  });

  it("does NOT lock an RFI mid-flow", () => {
    expect(
      isTaskLocked({
        type: "RFI",
        timeline: { stages: ["Open", "Replied", "Closed"], current: "Replied" },
      }),
    ).toBe(false);
  });

  it("ignores signed_at on non-signable types (e.g. RFI never gets signed)", () => {
    // signed_at should never be set on an RFI — but if it somehow is, we
    // shouldn't accidentally lock on it. Only the timeline rule applies.
    expect(
      isTaskLocked({
        type: "RFI",
        signed_at: "2026-05-21T05:19:13Z",
        timeline: { stages: ["Open", "Replied", "Closed"], current: "Open" },
      }),
    ).toBe(false);
  });

  it("locks a DC on the last stage", () => {
    expect(
      isTaskLocked({
        type: "DC",
        timeline: { stages: ["Submitted", "Reviewed", "Decided"], current: "Decided" },
      }),
    ).toBe(true);
  });

  it("locks a GI on the last stage", () => {
    expect(
      isTaskLocked({
        type: "GI",
        timeline: { stages: ["Open", "Closed"], current: "Closed" },
      }),
    ).toBe(true);
  });
});

// ── Regression: the original timeline-stage bug fix is preserved ───────────

describe("isTaskLocked — regression: timeline-stage behaviour unchanged for non-signable types", () => {
  it("returns false when stages array is empty (the original buggy condition)", () => {
    expect(
      isTaskLocked({
        type: "RFI",
        timeline: { stages: [], current: "Closed" },
      }),
    ).toBe(false);
  });

  it("compares current to LAST stage, not first", () => {
    expect(
      isTaskLocked({
        type: "RFI",
        timeline: { stages: ["A", "B", "C"], current: "A" },
      }),
    ).toBe(false);
    expect(
      isTaskLocked({
        type: "RFI",
        timeline: { stages: ["A", "B", "C"], current: "C" },
      }),
    ).toBe(true);
  });
});
