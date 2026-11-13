/**
 * The urgency colours on Notice deadlines, which used to run backwards: the
 * tab greyed "2 working days remaining" into the served/cancelled style and
 * coloured "40 working days remaining" green. Nearest must be loudest.
 */
import { describe, expect, it } from "vitest";
import {
  describeCountdown, isLiveStatus, statusLabel, TONE_VARIANT, type TimeBarCountdownInput,
} from "@/lib/timeBarCountdown";

const open = (days: number | null, label: string | null, unit = "working"): TimeBarCountdownInput => ({
  days_remaining: days, days_remaining_unit: unit, days_remaining_label: label, status: "open",
});

const variantOf = (bar: TimeBarCountdownInput) => TONE_VARIANT[describeCountdown(bar).tone];

describe("the urgency colour of a live deadline", () => {
  it.each([
    // [days, label, unit, tone, variant]
    [-3, "3 working days overdue", "working", "overdue", "danger"],
    [0, "due today", "working", "urgent", "danger"],
    [2, "2 working days remaining", "working", "urgent", "danger"],
    [3, "3 working days remaining", "working", "urgent", "danger"],
    [4, "4 working days remaining", "working", "soon", "warning"],
    [10, "10 working days remaining", "working", "soon", "warning"],
    [11, "11 working days remaining", "working", "safe", "neutral"],
    [40, "40 working days remaining", "working", "safe", "neutral"],
    [14, "14 calendar days remaining", "calendar", "soon", "warning"],
    [15, "15 calendar days remaining", "calendar", "safe", "neutral"],
  ])("%i (%s) is %s → %s", (days, label, unit, tone, variant) => {
    const c = describeCountdown(open(days as number, label as string, unit as string));
    expect(c.tone).toBe(tone);
    expect(c.text).toBe(label);
    expect(TONE_VARIANT[c.tone]).toBe(variant);
  });

  it("never colours three days or fewer like a closed notice — the inversion", () => {
    const closedVariants = new Set([
      variantOf({ ...open(2, "x"), status: "cancelled" }),
      variantOf({ ...open(2, "x"), status: "served" }),
    ]);
    expect(closedVariants.has(variantOf(open(2, "2 working days remaining")))).toBe(false);
    expect(closedVariants.has(variantOf(open(0, "due today")))).toBe(false);
  });

  it("never colours a comfortable deadline green", () => {
    expect(variantOf(open(40, "40 working days remaining"))).not.toBe("success");
  });

  it("is louder the nearer the deadline", () => {
    const rank = { neutral: 0, warning: 1, danger: 2, success: -1 } as const;
    const loudness = [40, 8, 2, -1].map((d) => rank[variantOf(open(d, `${d}`))]);
    expect(loudness).toEqual([...loudness].sort((a, b) => a - b));
    expect(new Set(loudness).size).toBe(3);
  });

  it("an uncounted live deadline is amber, never the comfortable neutral", () => {
    expect(describeCountdown(open(null, "due today")).tone).toBe("unknown");
    expect(variantOf(open(null, "due today"))).toBe("warning");
    expect(variantOf(open(12, null))).toBe("warning");
  });
});

describe("a deadline that is no longer running", () => {
  it("a lapsed deadline is overdue and red, not a grey 'lapsed' chip", () => {
    const c = describeCountdown({ ...open(-2, "2 working days overdue"), status: "lapsed" });
    expect(c).toEqual({ text: "2 working days overdue", tone: "overdue" });
    expect(TONE_VARIANT[c.tone]).toBe("danger");
    expect(describeCountdown({ ...open(null, null), status: "lapsed" }).text).toBe("Deadline passed");
  });

  it("served in time is green, served late is red — the server's verdict", () => {
    const onTime = describeCountdown({ ...open(5, "x"), status: "served", service: { timing: { on_time: true } } });
    const late = describeCountdown({ ...open(5, "x"), status: "served", service: { timing: { on_time: false } } });
    expect(onTime).toEqual({ text: "Served", tone: "served" });
    expect(TONE_VARIANT[onTime.tone]).toBe("success");
    expect(late).toEqual({ text: "Served late", tone: "served_late" });
    expect(TONE_VARIANT[late.tone]).toBe("danger");
  });

  it("served with no date of service is not claimed to be on time", () => {
    const c = describeCountdown({ ...open(5, "x"), status: "served", service: { timing: null } });
    expect(c).toEqual({ text: "Served", tone: "served_undated" });
    expect(TONE_VARIANT[c.tone]).toBe("neutral");
  });

  it("cancelled reads as Cancelled, never the raw enum", () => {
    expect(describeCountdown({ ...open(5, "x"), status: "cancelled" })).toEqual({ text: "Cancelled", tone: "cancelled" });
  });

  it("an unknown status is humanised", () => {
    expect(describeCountdown({ ...open(5, "x"), status: "on_hold" })).toEqual({ text: "On hold", tone: "closed" });
  });
});

describe("statusLabel / isLiveStatus", () => {
  it("names each status as a person would", () => {
    expect(statusLabel("open")).toBe("Open");
    expect(statusLabel("served")).toBe("Served");
    expect(statusLabel("lapsed")).toBe("Deadline passed");
    expect(statusLabel("cancelled")).toBe("Cancelled");
    expect(statusLabel("")).toBe("Closed");
  });

  it("open and lapsed can still be acted on; served and cancelled cannot", () => {
    expect(["open", "lapsed", "served", "cancelled"].map(isLiveStatus)).toEqual([true, true, false, false]);
  });
});

describe("a step that carries no forfeiture of its own", () => {
  it("is never red, however near or overdue", () => {
    const near = describeCountdown({ ...open(2, "2 working days remaining"), forfeits: false });
    const late = describeCountdown({ ...open(-1, "1 working day overdue"), forfeits: false });
    const lapsed = describeCountdown({ ...open(-1, "1 working day overdue"), status: "lapsed", forfeits: false });
    for (const c of [near, late, lapsed]) expect(TONE_VARIANT[c.tone]).toBe("warning");
    expect(late.text).toBe("1 working day overdue");
  });

  it("a notice that can forfeit, or one the server did not classify, stays red", () => {
    expect(variantOf({ ...open(2, "x"), forfeits: true })).toBe("danger");
    expect(variantOf(open(2, "x"))).toBe("danger");
  });
});
