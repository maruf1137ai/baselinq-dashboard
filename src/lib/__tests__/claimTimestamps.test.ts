import { describe, it, expect } from "vitest";

import {
  getIntentionAtDisplay,
  getFormalClaimAtDisplay,
  getNoticeGapDays,
} from "../claimTimestamps";

// ── getIntentionAtDisplay ──────────────────────────────────────────────────

describe("getIntentionAtDisplay", () => {
  it("formats camelCase intentionAt", () => {
    const out = getIntentionAtDisplay({ intentionAt: "2026-03-14T10:00:00Z" });
    expect(out).toMatch(/March/);
    expect(out).toMatch(/2026/);
  });

  it("formats snake_case intention_at", () => {
    const out = getIntentionAtDisplay({ intention_at: "2026-03-14T10:00:00Z" });
    expect(out).toMatch(/March/);
  });

  it("falls back to task.intentionAt nested shape (raw API response)", () => {
    const out = getIntentionAtDisplay({ task: { intentionAt: "2026-04-11T09:00:00Z" } });
    expect(out).toMatch(/April/);
  });

  it("returns empty when missing", () => {
    expect(getIntentionAtDisplay({})).toBe("");
    expect(getIntentionAtDisplay(null)).toBe("");
    expect(getIntentionAtDisplay(undefined)).toBe("");
  });

  it("returns raw string when unparseable", () => {
    expect(getIntentionAtDisplay({ intentionAt: "not-a-date" })).toBe("not-a-date");
  });
});

// ── getFormalClaimAtDisplay ────────────────────────────────────────────────

describe("getFormalClaimAtDisplay", () => {
  it("formats camelCase formalClaimAt", () => {
    const out = getFormalClaimAtDisplay({ formalClaimAt: "2026-04-11T09:00:00Z" });
    expect(out).toMatch(/April/);
    expect(out).toMatch(/2026/);
  });

  it("formats snake_case formal_claim_at", () => {
    const out = getFormalClaimAtDisplay({ formal_claim_at: "2026-04-11T09:00:00Z" });
    expect(out).toMatch(/April/);
  });

  it("returns empty when missing", () => {
    expect(getFormalClaimAtDisplay({})).toBe("");
    expect(getFormalClaimAtDisplay(null)).toBe("");
  });
});

// ── getNoticeGapDays ───────────────────────────────────────────────────────

describe("getNoticeGapDays", () => {
  it("calculates whole-day gap between two ISO timestamps", () => {
    expect(
      getNoticeGapDays("2026-03-14T10:00:00Z", "2026-04-11T09:00:00Z"),
    ).toBe(28);
  });

  it("returns 0 when both dates are the same calendar day (use midday to avoid TZ flake)", () => {
    // differenceInCalendarDays uses the host timezone; pick midday in UTC so
    // every reasonable timezone agrees on the calendar date.
    expect(
      getNoticeGapDays("2026-03-14T12:00:00Z", "2026-03-14T12:30:00Z"),
    ).toBe(0);
  });

  it("returns negative if formal_claim_at is before intention_at (sanity check)", () => {
    // Legal record: this should never happen, but the helper should not lie.
    expect(
      getNoticeGapDays("2026-04-11T00:00:00Z", "2026-03-14T00:00:00Z"),
    ).toBe(-28);
  });

  it("returns null when either side is missing", () => {
    expect(getNoticeGapDays(null, "2026-03-14T00:00:00Z")).toBeNull();
    expect(getNoticeGapDays("2026-03-14T00:00:00Z", null)).toBeNull();
    expect(getNoticeGapDays(null, null)).toBeNull();
    expect(getNoticeGapDays(undefined, undefined)).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(getNoticeGapDays("garbage", "2026-04-11T00:00:00Z")).toBeNull();
    expect(getNoticeGapDays("2026-03-14T00:00:00Z", "garbage")).toBeNull();
  });
});
