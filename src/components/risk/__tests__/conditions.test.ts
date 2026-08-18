import { describe, expect, it } from "vitest";

import { chromaticTier, groupConditions, tierOf, type SignalLike } from "../conditions";

let clock = 0;
const sig = (o: Partial<SignalLike> & { id: number }): SignalLike => ({
  code: "X",
  // Distinct, increasing timestamps so "oldest first" is observable.
  first_detected_at: new Date(1_760_000_000_000 + (clock += 60_000)).toISOString(),
  category: "delay",
  severity: "red",
  status: "open",
  title: "Something",
  evidence: "",
  is_contractual: false,
  ...o,
});

/**
 * Project 45 as the page actually receives it: fifteen signals, twelve of them
 * red. This is the shape the whole change exists to fix.
 */
const PROJECT_45: SignalLike[] = [
  ...[43, 31, 22, 17].map((d, i) =>
    sig({
      id: 100 + i,
      code: "MILESTONE_OVERDUE",
      title: `Milestone overdue — ${i}`,
      evidence: `${d} days past its due date`,
    }),
  ),
  ...[38, 24, 11].map((d, i) =>
    sig({
      id: 200 + i,
      code: "PAYMENT_OVERDUE",
      category: "financial",
      title: `Certificate overdue — ${i}`,
      evidence: `${d} days past the date for payment`,
    }),
  ),
  sig({ id: 300, code: "VO_TOLERANCE_BREACH", category: "financial", title: "Package B" }),
  sig({ id: 301, code: "VO_TOLERANCE_BREACH", category: "financial", title: "Package D" }),
  sig({ id: 400, code: "SCHEDULE_SLIPPAGE", title: "Programme slipped" }),
  sig({ id: 500, code: "PC_CERTIFICATION_DIVERGENCE", category: "financial", title: "Divergence" }),
  sig({
    id: 600,
    code: "VO_MANDATE_BREACH",
    category: "claim",
    title: "VO-018 above mandate",
    is_contractual: true,
  }),
  sig({ id: 700, code: "TIME_BAR_APPROACHING", category: "compliance", severity: "orange", title: "EOT" }),
  sig({ id: 701, code: "TIME_BAR_APPROACHING", category: "compliance", severity: "orange", title: "E&L" }),
  sig({ id: 800, code: "VO_RATE_VARIANCE", category: "financial", severity: "green", title: "Rate" }),
];

describe("tierOf", () => {
  it("puts a contractual breach above everything, because it is a different claim", () => {
    expect(tierOf(sig({ id: 1, is_contractual: true }))).toBe("breach");
    expect(tierOf(sig({ id: 2, severity: "red" }))).toBe("tolerance");
  });

  it("reads a red that is not contractual as a threshold, not a breach", () => {
    // The thresholds live on ProjectRiskPolicy and a user can change them in
    // settings. Passing one is real, and it is not a breach of contract.
    expect(tierOf(sig({ id: 3, severity: "red", is_contractual: false }))).toBe("tolerance");
  });

  it("maps the remaining severities without inventing any", () => {
    expect(tierOf(sig({ id: 4, severity: "orange" }))).toBe("watch");
    expect(tierOf(sig({ id: 5, severity: "green" }))).toBe("noted");
  });

  it("promotes a contractual signal even if the backend graded it lower", () => {
    expect(tierOf(sig({ id: 6, severity: "orange", is_contractual: true }))).toBe("breach");
  });
});

describe("groupConditions", () => {
  const conditions = groupConditions(PROJECT_45);

  it("reports conditions, not instances — fifteen signals become eight", () => {
    expect(PROJECT_45).toHaveLength(15);
    expect(PROJECT_45.filter((s) => s.severity === "red")).toHaveLength(12);
    expect(conditions).toHaveLength(8);
  });

  it("spends the loud mark once: exactly one condition is a breach", () => {
    // This is the whole point. Twelve red cards became one filled object.
    expect(conditions.filter((c) => c.tier === "breach")).toHaveLength(1);
    expect(conditions[0].code).toBe("VO_MANDATE_BREACH");
  });

  it("loses no signal — every instance is still on the page", () => {
    const ids = conditions.flatMap((c) => c.instances.map((s) => s.id)).sort();
    expect(ids).toEqual(PROJECT_45.map((s) => s.id).sort());
  });

  it("reads worst first, then by how often the condition recurred", () => {
    expect(conditions.map((c) => c.tier)).toEqual([
      "breach",
      "tolerance",
      "tolerance",
      "tolerance",
      "tolerance",
      "tolerance",
      "watch",
      "noted",
    ]);
    // Within the tolerance tier: 4 milestones, then 3 certificates, then 2 VOs.
    expect(conditions.slice(1, 4).map((c) => c.count)).toEqual([4, 3, 2]);
  });

  it("names the rule when it fired more than once", () => {
    const milestones = conditions.find((c) => c.code === "MILESTONE_OVERDUE")!;
    expect(milestones.label).toBe("Milestones past their dates");
  });

  it("keeps the backend's own sentence when the rule fired once", () => {
    // No group label is invented for a single instance: the server already
    // wrote a sentence that names the specific thing.
    const slip = conditions.find((c) => c.code === "SCHEDULE_SLIPPAGE")!;
    expect(slip.count).toBe(1);
    expect(slip.label).toBe("Programme slipped");
  });

  it("leads a group with its longest-open instance, not a claimed worst", () => {
    // Nothing on the payload ranks four overdue milestones against each other
    // — `detail` is shaped differently per rule and carries no common
    // magnitude. `first_detected_at` is on every signal and means something.
    const milestones = conditions.find((c) => c.code === "MILESTONE_OVERDUE")!;
    expect(milestones.lead).toBe(milestones.instances[0]);
    expect(milestones.lead.id).toBe(100);
    const dates = milestones.instances.map((s) => s.first_detected_at!);
    expect([...dates].sort()).toEqual(dates);
  });

  it("sorts a signal with no detection date last, never first", () => {
    const out = groupConditions([
      sig({ id: 1, code: "M", title: "dated" }),
      { ...sig({ id: 2, code: "M", title: "undated" }), first_detected_at: undefined },
    ]);
    expect(out[0].lead.id).toBe(1);
  });

  it("grades a condition by its most severe instance, which also leads it", () => {
    const mixed = groupConditions([
      sig({ id: 1, code: "M", severity: "green" }),
      sig({ id: 2, code: "M", severity: "red" }),
    ]);
    expect(mixed[0].tier).toBe("tolerance");
    // Severity outranks age: an older advisory does not lead a critical.
    expect(mixed[0].lead.id).toBe(2);
  });

  it("falls back to the code rather than guessing a name for an unknown rule", () => {
    const out = groupConditions([
      sig({ id: 1, code: "SOME_FUTURE_RULE", title: "a" }),
      sig({ id: 2, code: "SOME_FUTURE_RULE", title: "b" }),
    ]);
    expect(out[0].label).toBe("Some future rule");
  });

  it("is empty for an empty feed rather than producing a placeholder", () => {
    expect(groupConditions([])).toEqual([]);
  });
});

describe("chromaticTier — where colour is allowed to go", () => {
  it("draws only the worst tier present", () => {
    // Project 45 has a contractual breach, so the five tolerance conditions
    // below it render grey. Twelve red cards became one red sentence.
    expect(chromaticTier(groupConditions(PROJECT_45))).toBe("breach");
  });

  it("promotes tolerance to the drawn tier when nothing has breached a term", () => {
    const withoutBreach = PROJECT_45.filter((s) => !s.is_contractual);
    expect(chromaticTier(groupConditions(withoutBreach))).toBe("tolerance");
  });

  it("draws nothing at all when the worst thing open has not happened yet", () => {
    // A warning is a threshold that has NOT been passed. A project whose worst
    // signal is a warning is a project with no colour on it.
    const warnings = PROJECT_45.filter((s) => s.severity === "orange");
    expect(chromaticTier(groupConditions(warnings))).toBeNull();
  });

  it("draws nothing for advisories", () => {
    const green = PROJECT_45.filter((s) => s.severity === "green");
    expect(chromaticTier(groupConditions(green))).toBeNull();
  });

  it("draws nothing for an empty feed", () => {
    expect(chromaticTier([])).toBeNull();
  });
});
