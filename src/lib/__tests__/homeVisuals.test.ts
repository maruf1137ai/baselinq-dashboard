/**
 * The visual band's arithmetic.
 *
 * These tests are written against the two things that can go wrong with a
 * chart, and they are different from the things that go wrong with a table:
 *
 *  1. **A series that does not declare its own incompleteness.** Every builder
 *     is checked to report the records it could not plot — undated
 *     certificates, unbaselined milestones, variations with no
 *     `date_instructed`. A curve drawn from six of nine certificates that says
 *     "six certificates" is a different chart from one that says "six of nine,
 *     three undated", and only the second one is true.
 *
 *  2. **Elapsed calendar time presented as progress.** `buildContractTimeline`
 *     is asserted to expose no fill, no percentage and no completion figure —
 *     only dated marks. This is the exact defect in
 *     `ProjectTimelineCard.tsx`, deleted in the same change.
 *
 * Plus the permission rule, which is the queue's rule applied to a second
 * list and must fail closed identically.
 */
import { describe, expect, it } from "vitest";

import {
  buildCertifiedCurve,
  buildContractTimeline,
  splitChangeByStatus,
  summariseChangePosition,
  summariseMilestoneDrift,
  type MilestoneLike,
} from "../homeVisuals";
import { summariseTime } from "../homeSignals";
import { buildCertificateRun } from "../homeIndicators";

const NOW = new Date("2026-06-15T09:00:00Z");

// ── 1. The contract timeline ──────────────────────────────────────────────

describe("buildContractTimeline", () => {
  const project = {
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    contractEndDate: "2026-12-31",
  };

  it("places start, completion and today on one axis", () => {
    const t = buildContractTimeline(summariseTime(project, NOW), NOW);
    expect(t.hasAxis).toBe(true);
    expect(t.marks.map((m) => m.key)).toEqual(["start", "completion", "today"]);
    expect(t.marks[0].at).toBe(0);
    expect(t.marks[1].at).toBe(1);
    // Mid-June of a calendar year is a bit under half way.
    expect(t.todayAt).toBeGreaterThan(0.4);
    expect(t.todayAt).toBeLessThan(0.5);
  });

  it("EXPOSES NO PROGRESS MEASURE — no fill, no percent, no completion", () => {
    // The defect in the deleted `ProjectTimelineCard.tsx`: it filled the bar
    // from start to today and labelled the fill as progress. Nothing on this
    // shape can be rendered that way by accident, because nothing on it is a
    // proportion of the works.
    const t = buildContractTimeline(summariseTime(project, NOW), NOW);
    const keys = Object.keys(t);
    expect(keys).not.toContain("fill");
    expect(keys).not.toContain("percentComplete");
    expect(keys).not.toContain("elapsedPct");
    expect(keys).not.toContain("progress");
  });

  it("draws no axis at all when either end is missing", () => {
    expect(buildContractTimeline(summariseTime({ startDate: "2026-01-01" }, NOW), NOW).hasAxis).toBe(
      false,
    );
    expect(buildContractTimeline(summariseTime({ endDate: "2026-12-31" }, NOW), NOW).hasAxis).toBe(
      false,
    );
    expect(buildContractTimeline(summariseTime(null, NOW), NOW).hasAxis).toBe(false);
  });

  it("marks the originally-agreed date only when an extension moved it", () => {
    const extended = buildContractTimeline(
      summariseTime({ ...project, contractEndDate: "2027-03-31" }, NOW),
      NOW,
    );
    expect(extended.marks.map((m) => m.key)).toContain("original");
    expect(extended.extension).not.toBeNull();
    expect(extended.extension!.days).toBe(90);
    // The live date is the one named as completion.
    expect(extended.marks.find((m) => m.key === "completion")!.date).toBe("2027-03-31");

    // Unextended: one completion pin, not two in the same place.
    const plain = buildContractTimeline(summariseTime(project, NOW), NOW);
    expect(plain.marks.map((m) => m.key)).not.toContain("original");
    expect(plain.extension).toBeNull();
  });

  it("keeps an overrun inside the axis instead of clipping it off the end", () => {
    const late = new Date("2027-02-01T09:00:00Z");
    const t = buildContractTimeline(summariseTime(project, late), late);
    expect(t.overrun).not.toBeNull();
    expect(t.overrun!.days).toBe(32);
    // The domain was extended to today, so completion is no longer at 1.0 and
    // the overrun band is visible rather than off the right-hand edge.
    expect(t.marks.find((m) => m.key === "completion")!.at).toBeLessThan(1);
    expect(t.todayAt).toBe(1);
  });

  it("has no today mark before the project starts", () => {
    const early = new Date("2025-06-01T09:00:00Z");
    const t = buildContractTimeline(summariseTime(project, early), early);
    expect(t.todayAt).toBeNull();
    expect(t.marks.map((m) => m.key)).not.toContain("today");
  });
});

// ── 2. Milestone drift ────────────────────────────────────────────────────

describe("summariseMilestoneDrift", () => {
  it("counts unbaselined milestones as UNTRACKED, never as on time", () => {
    // The lie this guards against: a programme where nine of ten milestones
    // have no baseline reporting "0 slipped" and reading as healthy.
    const d = summariseMilestoneDrift([
      { _id: "1", name: "Foundations", baselineEnd: "2026-03-01", endDate: "2026-03-01" },
      { _id: "2", name: "Frame", endDate: "2026-06-01" },
      { _id: "3", name: "Roof", endDate: "2026-09-01" },
    ]);
    expect(d.tracked).toBe(1);
    expect(d.untracked).toBe(2);
    expect(d.slipped).toBe(0);
    expect(d.onOrAhead).toBe(1);
  });

  it("measures the ACTUAL end where one exists, and the plan where none does", () => {
    const d = summariseMilestoneDrift([
      // Finished 10 days late — actual_end wins over the live end_date.
      {
        _id: "1",
        name: "Foundations",
        baselineEnd: "2026-03-01",
        endDate: "2026-03-01",
        actualEnd: "2026-03-11",
      },
      // Not finished; the live plan is 5 days past baseline.
      { _id: "2", name: "Frame", baselineEnd: "2026-06-01", endDate: "2026-06-06" },
    ]);
    expect(d.rows.find((r) => r.id === "1")).toMatchObject({ slipDays: 10, isActual: true });
    expect(d.rows.find((r) => r.id === "2")).toMatchObject({ slipDays: 5, isActual: false });
    expect(d.slipped).toBe(2);
    expect(d.worstSlipDays).toBe(10);
  });

  it("reads a milestone finishing early as a negative slip, not as zero", () => {
    const d = summariseMilestoneDrift([
      { _id: "1", baselineEnd: "2026-03-11", endDate: "2026-03-01" },
    ]);
    expect(d.rows[0].slipDays).toBe(-10);
    expect(d.slipped).toBe(0);
    expect(d.onOrAhead).toBe(1);
    expect(d.worstSlipDays).toBeNull();
  });

  it("orders worst slip first, so rank is carried by position", () => {
    const d = summariseMilestoneDrift([
      { _id: "a", baselineEnd: "2026-01-01", endDate: "2026-01-03" },
      { _id: "b", baselineEnd: "2026-01-01", endDate: "2026-02-01" },
      { _id: "c", baselineEnd: "2026-01-01", endDate: "2026-01-01" },
    ]);
    expect(d.rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("NEVER reads percent_complete, even when the payload carries one", () => {
    // `Milestone.percent_complete` is nullable and human-entered, and the
    // server's own gates return None rather than guess from it.
    const d = summariseMilestoneDrift([
      // `percentComplete` is on the real serializer but not on `MilestoneLike`,
      // because this file never reads it. The cast is what proves that: the
      // field has to be smuggled past the type to get into the fixture at all.
      { _id: "1", baselineEnd: "2026-03-01", endDate: "2026-03-01", percentComplete: 65 } as
        MilestoneLike & { percentComplete: number },
    ]);
    expect(JSON.stringify(d)).not.toContain("65");
    expect(JSON.stringify(d).toLowerCase()).not.toContain("percent");
  });
});

// ── 3. The certified curve ────────────────────────────────────────────────

describe("buildCertifiedCurve", () => {
  const certs = [
    { id: 1, pcNumber: "PC-001", certificateDate: "2026-01-31", totalPayable: 1_000_000, workflowState: "posted" },
    { id: 2, pcNumber: "PC-002", certificateDate: "2026-02-28", totalPayable: 1_500_000, workflowState: "posted" },
    // Undated: real, posted, and unplottable on a time axis.
    { id: 3, pcNumber: "PC-003", certificateDate: null, totalPayable: 500_000, workflowState: "posted" },
    // In flight: real money, deliberately not in the certified total.
    { id: 4, pcNumber: "PC-004", certificateDate: "2026-03-31", totalPayable: 800_000, workflowState: "submitted" },
  ];

  it("plots the cumulative certified value and DECLARES what it left out", () => {
    const c = buildCertifiedCurve(buildCertificateRun(certs), 10_000_000);
    expect(c.points.map((p) => p.ref)).toEqual(["PC-001", "PC-002"]);
    expect(c.points.map((p) => p.cumulative)).toEqual([1_000_000, 2_500_000]);
    // The two disclosures, without which the chart is a lie of omission.
    expect(c.undated).toBe(1);
    expect(c.inFlight).toBe(800_000);
    expect(c.latest).toBe(2_500_000);
  });

  it("does not plot a submitted certificate as certified value", () => {
    const c = buildCertifiedCurve(buildCertificateRun(certs), 10_000_000);
    expect(c.points.some((p) => p.ref === "PC-004")).toBe(false);
  });

  it("flags certifying past the revised contract sum — a breach that HAS happened", () => {
    const c = buildCertifiedCurve(buildCertificateRun(certs), 2_000_000);
    expect(c.overCeiling).toBe(true);
  });

  it("does not flag an overrun against an unknown ceiling", () => {
    const c = buildCertifiedCurve(buildCertificateRun(certs), null);
    expect(c.overCeiling).toBe(false);
    expect(c.ceiling).toBeNull();
  });

  it("returns an empty curve, and the ceiling, when there are no certificates", () => {
    const c = buildCertifiedCurve(buildCertificateRun([]), 10_000_000);
    expect(c.points).toEqual([]);
    expect(c.latest).toBeNull();
    expect(c.ceiling).toBe(10_000_000);
  });
});

// ── 4. Change against the contract ────────────────────────────────────────

describe("summariseChangePosition", () => {
  const vos = [
    { status: "Approved", value: 500_000, dateInstructed: "2026-02-01" },
    { status: "Approved", value: 300_000, dateInstructed: null },
    { status: "Under Review", value: 100_000, dateInstructed: "2026-05-01" },
  ];

  it("counts variations with no date_instructed — the field is nullable", () => {
    const c = summariseChangePosition(vos, 10_000_000, 800_000, null);
    expect(c.undated).toBe(1);
    expect(c.total).toBe(3);
  });

  it("states approved change as a percentage of the ORIGINAL sum", () => {
    const c = summariseChangePosition(vos, 10_000_000, 800_000, null);
    expect(c.pctOfOriginal).toBe(8);
  });

  it("draws no tolerance when the server has not fired the signal", () => {
    // `risk/rules/vo_tolerance.py` emits nothing below the threshold, so there
    // is no tolerance_pct on any payload. The rule's own 10% fallback is a
    // policy default, not this project's policy, and substituting it would be
    // inventing the line.
    const c = summariseChangePosition(vos, 10_000_000, 800_000, null);
    expect(c.tolerancePct).toBeNull();
    expect(c.pastTolerance).toBe(false);
  });

  it("reports past-tolerance when the server supplied the threshold", () => {
    const c = summariseChangePosition(vos, 10_000_000, 800_000, 5);
    expect(c.tolerancePct).toBe(5);
    expect(c.pastTolerance).toBe(true);
  });

  it("computes no percentage against an unknown or zero original sum", () => {
    expect(summariseChangePosition(vos, null, 800_000, 5).pctOfOriginal).toBeNull();
    expect(summariseChangePosition(vos, 0, 800_000, 5).pctOfOriginal).toBeNull();
    expect(summariseChangePosition(vos, 0, 800_000, 5).pastTolerance).toBe(false);
  });
});

describe("splitChangeByStatus", () => {
  it("separates committed, awaited, draft and rejected", () => {
    const s = splitChangeByStatus([
      { status: "Approved" },
      { status: "Closed" },
      { status: "Under Review" },
      { status: "Priced" },
      { status: "Draft" },
      { status: "Rejected" },
    ]);
    expect(s).toEqual([
      { key: "approved", label: "Approved", count: 2 },
      { key: "outstanding", label: "Awaiting decision", count: 2 },
      { key: "draft", label: "Draft", count: 1 },
      { key: "rejected", label: "Rejected", count: 1 },
    ]);
  });

  it("reads the assignment task's vocabulary too", () => {
    // `tasks/tasks/?taskType=VO` returns a todo/in review/done lifecycle,
    // which the merged list carries alongside contractual statuses.
    const s = splitChangeByStatus([{ status: "in review" }, { status: "todo" }]);
    expect(s.find((x) => x.key === "outstanding")!.count).toBe(2);
  });
});

// ── 5. What changed ───────────────────────────────────────────────────────
//
// The feed moved to `src/lib/homeChanges.ts` when the two implementations of
// it were merged, and its tests moved with it to `homeChanges.test.ts`.
// `homeVisuals.ts` re-exports the builders because `useHomeData.ts` imports
// them from there; there is nothing left in this file to test.
