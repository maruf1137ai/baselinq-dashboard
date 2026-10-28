import { describe, it, expect } from "vitest";

import {
  buildCertificateRun,
  elapsedAwaitingCertification,
  retentionPosition,
  summariseVariations,
  toVariationRecord,
} from "../homeIndicators";
import { certifiedValueOf, summariseMoney } from "../homeSignals";

const NOW = new Date("2026-08-17T09:00:00Z");

// ── Variations ────────────────────────────────────────────────────────────

describe("summariseVariations", () => {
  // Project 45 as seeded: three approved, one submitted, one under review.
  const project45 = [
    { ref: "VO-001", status: "Approved", value: 552_000 },
    { ref: "VO-002", status: "Approved", value: 368_000 },
    { ref: "VO-003", status: "Approved", value: 460_000 },
    { ref: "VO-004", status: "Submitted", value: 207_000 },
    { ref: "VO-005", status: "Under Review", value: 304_750 },
  ];

  it("counts the variations still awaiting a decision", () => {
    const v = summariseVariations(project45);
    expect(v.outstanding).toBe(2);
    expect(v.settled).toBe(3);
    expect(v.total).toBe(5);
  });

  it("values only the outstanding ones", () => {
    expect(summariseVariations(project45).outstandingValue).toBe(511_750);
  });

  it("keeps drafts out of 'outstanding' — nobody is waiting on them", () => {
    const v = summariseVariations([
      { status: "Draft", value: 100 },
      { status: "Submitted", value: 200 },
    ]);
    expect(v.drafts).toBe(1);
    expect(v.outstanding).toBe(1);
    expect(v.outstandingValue).toBe(200);
  });

  it("reads the assignment task's vocabulary too", () => {
    const v = summariseVariations([
      { status: "done", value: 1 },
      { status: "in review", value: 2 },
      { status: "todo", value: 3 },
    ]);
    expect(v.settled).toBe(1);
    expect(v.outstanding).toBe(1);
    expect(v.drafts).toBe(1);
  });

  it("treats every status case-insensitively and tolerates whitespace", () => {
    expect(summariseVariations([{ status: "  APPROVED  " }]).settled).toBe(1);
  });

  it("reports an unpriced outstanding variation as unpriced, not as zero", () => {
    const v = summariseVariations([{ status: "Under Review", value: null }]);
    expect(v.outstanding).toBe(1);
    expect(v.outstandingValue).toBeNull();
  });

  it("counts an unrecognised status as outstanding rather than settling it", () => {
    // Failing closed: a status this file has never seen has certainly not been
    // decided by anyone here, so it stays on the list.
    expect(summariseVariations([{ status: "Escalated to arbitration" }]).outstanding).toBe(1);
    expect(summariseVariations([{ status: undefined }]).outstanding).toBe(1);
  });

  it("is empty for a project with no variations", () => {
    const v = summariseVariations([]);
    expect(v).toEqual({
      total: 0,
      outstanding: 0,
      outstandingValue: null,
      drafts: 0,
      settled: 0,
    });
  });
});

describe("toVariationRecord", () => {
  it("reads the VariationOrder route", () => {
    expect(
      toVariationRecord({
        _id: "118",
        voNumber: "VO-005",
        status: "Under Review",
        grandTotal: 304_750,
        dateInstructed: "2026-06-28",
        approvedAt: null,
        updatedAt: "2026-06-30T09:00:00Z",
      }),
    ).toEqual({
      id: "118",
      ref: "VO-005",
      status: "Under Review",
      value: 304_750,
      dateInstructed: "2026-06-28",
      // Carried for the "What changed" feed, which dates a variation without a
      // second fetch. Both nullable on the model, and the feed words them
      // differently: `approved_at` names a transition, `updated_at` says only
      // that the row moved.
      approvedAt: null,
      updatedAt: "2026-06-30T09:00:00Z",
      signedAt: null,
    });
  });

  it("carries signedAt from the VariationOrder route", () => {
    // Only sign-and-issue (tasks/views_signing.py) stamps this — see
    // homeSignals.ts's VariationLike.signedAt for why summariseMoney needs it.
    expect(
      toVariationRecord({ voNumber: "VO-006", signedAt: "2026-07-01T00:00:00Z" }).signedAt,
    ).toBe("2026-07-01T00:00:00Z");
  });

  it("carries signedAt from the assignment-task route's nested variation", () => {
    const r = toVariationRecord({
      taskId: 92,
      task: { voNumber: "VO-007", signedAt: "2026-07-02T00:00:00Z" },
    });
    expect(r.signedAt).toBe("2026-07-02T00:00:00Z");
  });

  it("leaves both feed timestamps null when the payload carries neither", () => {
    // The feed drops an undated record rather than dating it now, so a null
    // here must stay a null and must not become "today".
    const r = toVariationRecord({ _id: "1", voNumber: "VO-001" });
    expect(r.approvedAt).toBeNull();
    expect(r.updatedAt).toBeNull();
  });

  it("reads the assignment-task route, preferring the variation's own status", () => {
    const r = toVariationRecord({
      taskId: 91,
      status: "done",
      task: { voNumber: "VO-002", status: "Approved", grandTotal: 368_000 },
    });
    expect(r.ref).toBe("VO-002");
    expect(r.status).toBe("Approved");
    expect(r.value).toBe(368_000);
  });

  it("falls back to the snake_case VO number the finance table also handles", () => {
    expect(toVariationRecord({ task: { vo_number: "VO-009" } }).ref).toBe("VO-009");
  });
});

// ── Certificate run ───────────────────────────────────────────────────────

describe("buildCertificateRun", () => {
  // Project 45 as seeded: five posted, one submitted, R8.2m certified.
  const project45 = [
    { id: 45, pcNumber: "PC-001", certificateDate: "2026-03-20", claimAmount: 1_400_000, retentionAmount: 70_000, workflowState: "posted" },
    { id: 46, pcNumber: "PC-002", certificateDate: "2026-04-19", claimAmount: 1_850_000, retentionAmount: 92_500, workflowState: "posted" },
    { id: 47, pcNumber: "PC-003", certificateDate: "2026-05-19", claimAmount: 2_100_000, retentionAmount: 105_000, workflowState: "posted" },
    { id: 48, pcNumber: "PC-004", certificateDate: "2026-06-18", claimAmount: 1_600_000, retentionAmount: 80_000, workflowState: "posted" },
    { id: 49, pcNumber: "PC-005", certificateDate: "2026-07-18", claimAmount: 1_250_000, retentionAmount: 62_500, workflowState: "posted" },
    { id: 50, pcNumber: "PC-006", certificateDate: "2026-08-15", claimAmount: 980_000, retentionAmount: 49_000, workflowState: "submitted" },
  ];

  it("orders the run oldest first by certificate date", () => {
    const run = buildCertificateRun([...project45].reverse());
    expect(run.entries.map((e) => e.ref)).toEqual([
      "PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006",
    ]);
  });

  it("accumulates only posted certificates", () => {
    const run = buildCertificateRun(project45);
    expect(run.entries.map((e) => e.cumulative)).toEqual([
      1_400_000, 3_250_000, 5_350_000, 6_950_000, 8_200_000, null,
    ]);
    expect(run.certified).toBe(8_200_000);
  });

  it("reports the value raised but not yet certified separately", () => {
    expect(buildCertificateRun(project45).inFlight).toBe(980_000);
  });

  it("scales each entry against the largest in the run, not the contract sum", () => {
    const run = buildCertificateRun(project45);
    // PC-003 is the largest, so it is the 100% reference.
    expect(run.entries.find((e) => e.ref === "PC-003")!.share).toBe(100);
    expect(run.entries.find((e) => e.ref === "PC-001")!.share).toBe(67);
  });

  it("survives a run of one", () => {
    const run = buildCertificateRun([project45[0]]);
    expect(run.entries).toHaveLength(1);
    expect(run.entries[0].share).toBe(100);
    expect(run.certified).toBe(1_400_000);
    expect(run.inFlight).toBeNull();
  });

  it("survives a run of thirty", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      pcNumber: `PC-${String(i + 1).padStart(3, "0")}`,
      certificateDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      claimAmount: 100_000,
      workflowState: "posted",
    }));
    const run = buildCertificateRun(many);
    expect(run.entries).toHaveLength(30);
    expect(run.certified).toBe(3_000_000);
    expect(run.entries.at(-1)!.cumulative).toBe(3_000_000);
  });

  it("puts undated certificates last and counts them rather than guessing a slot", () => {
    const run = buildCertificateRun([
      { id: 1, pcNumber: "PC-A", certificateDate: null, claimAmount: 10, workflowState: "posted" },
      { id: 2, pcNumber: "PC-B", certificateDate: "2026-02-01", claimAmount: 20, workflowState: "posted" },
    ]);
    expect(run.entries.map((e) => e.ref)).toEqual(["PC-B", "PC-A"]);
    expect(run.undated).toBe(1);
  });

  it("drops cancelled certificates — no value is riding on them", () => {
    const run = buildCertificateRun([
      ...project45,
      { id: 99, pcNumber: "PC-007", certificateDate: "2026-09-01", claimAmount: 500_000, workflowState: "cancelled" },
    ]);
    expect(run.entries.map((e) => e.ref)).not.toContain("PC-007");
    expect(run.certified).toBe(8_200_000);
  });

  it("names a certificate by its id when it carries no number", () => {
    expect(buildCertificateRun([{ id: 7, workflowState: "draft" }]).entries[0].ref).toBe("PC-7");
  });

  it("is empty rather than zeroed for a project with no certificates", () => {
    expect(buildCertificateRun([])).toEqual({
      entries: [], certified: null, inFlight: null, undated: 0,
    });
  });
});

// ── The certified basis ───────────────────────────────────────────────────

describe("certifiedValueOf", () => {
  it("measures the VALUE OF WORK, not the VAT-inclusive payable", () => {
    // net_amount here is (claim − retention) × 1.15, as the server computes it.
    expect(
      certifiedValueOf({ id: 1, claimAmount: 1_400_000, netAmount: 1_529_500, retentionAmount: 70_000 }),
    ).toBe(1_400_000);
  });

  it("falls back only for rows that carry no claim amount at all", () => {
    expect(certifiedValueOf({ id: 1, totalPayable: 230_000, netAmount: 200_000 })).toBe(230_000);
    expect(certifiedValueOf({ id: 1, netAmount: 200_000 })).toBe(200_000);
    expect(certifiedValueOf({ id: 1 })).toBe(0);
  });

  it("puts project 45 at 82% of its contract sum, not 90%", () => {
    // 8,958,500 VAT-inclusive against a VAT-exclusive R10m read 90% — a figure
    // roughly fifteen percent high purely because it compared two bases.
    const money = summariseMoney(
      { contractValue: 10_000_000 },
      [
        { id: 1, claimAmount: 1_400_000, netAmount: 1_529_500, workflowState: "posted" },
        { id: 2, claimAmount: 1_850_000, netAmount: 2_021_125, workflowState: "posted" },
        { id: 3, claimAmount: 2_100_000, netAmount: 2_294_250, workflowState: "posted" },
        { id: 4, claimAmount: 1_600_000, netAmount: 1_748_000, workflowState: "posted" },
        { id: 5, claimAmount: 1_250_000, netAmount: 1_365_625, workflowState: "posted" },
        { id: 6, claimAmount: 980_000, netAmount: 1_070_650, workflowState: "submitted" },
      ],
      [],
    );
    expect(money.certified).toBe(8_200_000);
    expect(money.certifiedPct).toBe(82);
  });

  it("reads a variation's value from either route", () => {
    const money = summariseMoney({ contractValue: 1_000_000 }, [], [
      { status: "Approved", grandTotal: 552_000, signedAt: "2026-02-01T00:00:00Z" },
      { status: "approved", task: { grandTotal: 368_000 }, signedAt: "2026-02-02T00:00:00Z" },
      { status: "Under Review", grandTotal: 304_750 },
    ]);
    expect(money.variations).toBe(920_000);
    expect(money.variationCount).toBe(2);
  });
});

// ── Awaiting certification ────────────────────────────────────────────────

describe("elapsedAwaitingCertification", () => {
  it("measures elapsed days from the certificate's own date", () => {
    const a = elapsedAwaitingCertification(
      [{ id: 50, pcNumber: "PC-006", certificateDate: "2026-08-15", workflowState: "submitted" }],
      NOW,
    );
    expect(a).toEqual({ ref: "PC-006", days: 2, since: "2026-08-15", basis: "certificate" });
  });

  it("names the fallback basis rather than presenting it as the certificate date", () => {
    const a = elapsedAwaitingCertification(
      [{ id: 50, pcNumber: "PC-006", updatedAt: "2026-08-10T00:00:00Z", workflowState: "submitted" }],
      NOW,
    );
    expect(a!.basis).toBe("last-change");
    expect(a!.days).toBe(7);
  });

  it("returns the one that has waited longest", () => {
    const a = elapsedAwaitingCertification(
      [
        { id: 1, pcNumber: "PC-A", certificateDate: "2026-08-14", workflowState: "submitted" },
        { id: 2, pcNumber: "PC-B", certificateDate: "2026-07-01", workflowState: "submitted" },
      ],
      NOW,
    );
    expect(a!.ref).toBe("PC-B");
  });

  it("ignores every state but submitted", () => {
    expect(
      elapsedAwaitingCertification(
        [
          { id: 1, certificateDate: "2026-01-01", workflowState: "posted" },
          { id: 2, certificateDate: "2026-01-01", workflowState: "approved" },
          { id: 3, certificateDate: "2026-01-01", workflowState: "draft" },
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("never reads negative on a forward-dated certificate", () => {
    const a = elapsedAwaitingCertification(
      [{ id: 1, certificateDate: "2026-09-30", workflowState: "submitted" }],
      NOW,
    );
    expect(a!.days).toBe(0);
  });

  it("says nothing at all when there is no date to count from", () => {
    expect(
      elapsedAwaitingCertification([{ id: 1, workflowState: "submitted" }], NOW),
    ).toBeNull();
  });
});

// ── Retention ─────────────────────────────────────────────────────────────

describe("retentionPosition", () => {
  it("reports the amount held and the contract's rate", () => {
    expect(retentionPosition({ retentionRate: 5 }, 410_000)).toEqual({
      held: 410_000,
      ratePct: 5,
    });
  });

  it("reads the snake_case payload too", () => {
    expect(retentionPosition({ retention_rate: "5.00" }, 410_000).ratePct).toBe(5);
  });

  it("has no limit to report, because Project carries no such field", () => {
    const r = retentionPosition({ retentionRate: 5 }, 410_000);
    expect(r).not.toHaveProperty("limit");
    expect(Object.keys(r).sort()).toEqual(["held", "ratePct"]);
  });

  it("states no rate rather than a made-up one", () => {
    expect(retentionPosition({}, 410_000).ratePct).toBeNull();
    expect(retentionPosition({ retentionRate: 0 }, 410_000).ratePct).toBeNull();
    expect(retentionPosition(null, null)).toEqual({ held: null, ratePct: null });
  });
});
