import { describe, it, expect } from "vitest";

import {
  actionItemIsPending,
  bandOf,
  buildObligationQueue,
  groupRiskSignals,
  filterQueueByPermission,
  rankQueue,
  buildCertificateQueue,
  buildPaymentOverdueQueue,
  homeVerdict,
  buildMeetingActionQueue,
  buildRejectedCertificateQueue,
  buildRsvpQueue,
  buildTaskQueue,
  buildTimeBarQueue,
  certificateIsCertified,
  daysUntil,
  documentsHref,
  FINANCE_TAB,
  relativeDays,
  riskGroupHref,
  riskSignalHref,
  resolveFinanceAccess,
  shortDate,
  summariseHomeLoad,
  summariseMoney,
  summariseTime,
  visibleRiskSignals,
} from "../homeSignals";
import type { TaskLike } from "../homeSignals";
import { SETUP_FIELDS, SETUP_LABELS, summariseProjectSetup } from "../homeSetup";

/** The finance tab labels as they travel in a URL. See `FINANCE_TAB`. */
const CERTIFICATES = `/finance?tab=${encodeURIComponent(FINANCE_TAB.certificates)}`;
const VARIATIONS = `/finance?tab=${encodeURIComponent(FINANCE_TAB.variations)}`;
const HEALTH = "/project-health?tab=risk-signals";

const NOW = new Date("2026-08-17T09:00:00Z");

const iso = (offsetDays: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

describe("daysUntil / relativeDays", () => {
  it("counts whole days either side of today", () => {
    expect(daysUntil(iso(0), NOW)).toBe(0);
    expect(daysUntil(iso(3), NOW)).toBe(3);
    expect(daysUntil(iso(-6), NOW)).toBe(-6);
  });

  it("returns null rather than guessing when there is no date", () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil(undefined, NOW)).toBeNull();
    expect(daysUntil("not a date", NOW)).toBeNull();
  });

  it("reads in British English with no exclamation", () => {
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(1)).toBe("tomorrow");
    expect(relativeDays(-1)).toBe("yesterday");
    expect(relativeDays(5)).toBe("in 5 days");
    expect(relativeDays(-5)).toBe("5 days ago");
    expect(relativeDays(null)).toBeNull();
  });
});

describe("buildCertificateQueue", () => {
  const certs = [
    { id: 1, pcNumber: "PC-003", workflowState: "submitted" },
    { id: 2, pcNumber: "PC-002", workflowState: "approved" },
    { id: 3, pcNumber: "PC-001", workflowState: "posted" },
    { id: 4, pcNumber: "PC-004", workflowState: "draft" },
  ];

  it("surfaces only certificates that need a human", () => {
    const q = buildCertificateQueue(certs);
    expect(q.map((i) => i.key)).toEqual(["certificate-1", "certificate-2"]);
  });

  it("names the next move rather than the state", () => {
    const q = buildCertificateQueue(certs);
    expect(q[0].headline).toContain("Certify PC-003");
    expect(q[1].headline).toContain("Post PC-002");
  });

  it("gates each row on the permission for the ACT it names", () => {
    // It used to be `["finance.view"]` on every row, so "Certify PC-003"
    // rendered identically for the principal agent, the contractor's QS and
    // any finance viewer on the project — under a heading reading
    // "Certificates awaiting you". The codes below are the server's own
    // `TRANSITION_PERMISSIONS` (tasks/pc_workflow.py), and
    // `finance.approve_certificate` is granted to PRINCIPAL_PM alone.
    expect(buildCertificateQueue(certs).map((i) => i.requires)).toEqual([
      ["finance.view", "finance.approve_certificate"],
      ["finance.view", "finance.post_certificate"],
    ]);
  });

  it("carries no clock, because no certificate payload has a due date", () => {
    // Not "no rush" — a gap in the API. The band matrix is what stops this
    // absence from burying the most valuable thing a principal agent does.
    const q = buildCertificateQueue(certs);
    expect(q.map((i) => i.daysRemaining)).toEqual([null, null]);
    expect(q.map((i) => i.clock)).toEqual([null, null]);
    expect(q.every((i) => i.consequence === "money" && i.pressure === "none")).toBe(true);
  });

  it("puts certifying ahead of posting within the money class", () => {
    const q = buildCertificateQueue(certs);
    expect(q[0].subRank).toBeLessThan(q[1].subRank as number);
  });

  it("routes every row to the certificate it names, not to bare /finance", () => {
    // It used to be `href === "/finance"` for all of them: the row said
    // "Certify PC-006" and dropped you on the finance page's default tab with
    // PC-006 nowhere named. The id it was already holding now travels.
    const rows = buildCertificateQueue(certs);
    expect(rows.every((i) => i.href.startsWith("/finance?tab="))).toBe(true);
    expect(rows.map((i) => i.href)).toEqual(rows.map((i) => `${CERTIFICATES}&pc=${i.key.split("-")[1]}`));
    expect(rows.every((i) => i.action.length > 0)).toBe(true);
  });

  it("reads workflowState, never the legacy approvalStatus", () => {
    // A certificate stuck at approvalStatus "pending" for its whole life is
    // the exact bug workflowState exists to avoid.
    const q = buildCertificateQueue([
      { id: 9, pcNumber: "PC-009", workflowState: "posted", approvalStatus: "pending" } as any,
    ]);
    expect(q).toHaveLength(0);
  });
});

describe("buildRejectedCertificateQueue", () => {
  it("picks up rejected certificates and gates them on the PREPARER's code", () => {
    const q = buildRejectedCertificateQueue([
      { id: 5, pcNumber: "PC-005", workflowState: "rejected" },
      { id: 6, workflowState: "posted" },
    ]);
    expect(q).toHaveLength(1);
    expect(q[0].headline).toBe("Rework PC-005 — it was rejected");
    // Reworking is the preparer's act — `TRANSITION_PERMISSIONS` maps submit
    // and cancel to `finance.create_certificate` — not a certifier's.
    expect(q[0].requires).toEqual(["finance.view", "finance.create_certificate"]);
  });

  it("leads the money class, because payment on it has stopped dead", () => {
    const rejected = buildRejectedCertificateQueue([{ id: 5, workflowState: "rejected" }]);
    const submitted = buildCertificateQueue([{ id: 6, workflowState: "submitted" }]);
    expect(rejected[0].subRank).toBeLessThan(submitted[0].subRank as number);
  });

  it("never states a rejection reason, because no response carries one", () => {
    // `iso()` is relative to the frozen NOW, so the clock has to be too. The
    // call omitted it and silently used the real today, which made the test
    // pass only on the day it was written and drift by a day thereafter.
    const q = buildRejectedCertificateQueue(
      [{ id: 7, workflowState: "rejected", updatedAt: iso(-4) }],
      NOW,
    );
    expect(q[0].detail).toBe("Payment on it has stopped for 4 days");
  });
});

describe("buildTimeBarQueue", () => {
  it("leads with the deadline date — the one temporal value that is correct", () => {
    const q = buildTimeBarQueue([
      {
        id: 1,
        label: "VO-012",
        days_remaining: 14,
        unit: "working",
        duration: 20,
        status: "open",
        awareness_date: "2026-08-04",
        deadline_date: "2026-08-24",
        clause_ref: "26.5",
        clause_verified: true,
        contract_form: "JBCC",
      },
    ]);
    expect(q[0].headline).toBe("VO-012");
    // The date is on the row, in a slot of its own, not glued to the headline.
    expect(q[0].date).toBe("2026-08-24");
    expect(q[0].detail).toBe("JBCC 26.5 · 20 working days from 4 Aug 2026");
    expect(q[0].consequence).toBe("forfeiture");
    expect(q[0].overdue).toBe(false);
  });

  // ── The countdown-unit bug ───────────────────────────────────────────────
  //
  // `days_remaining` is `(deadline_date - localdate()).days` on the server —
  // plain date subtraction — while `unit` describes the notice PERIOD. The row
  // used to print one with the other and claim "6 working days left" for a
  // deadline four working days away.
  it("never publishes a clock unit, because the countdown is calendar days", () => {
    const q = buildTimeBarQueue([
      { id: 1, label: "Notice of delay", days_remaining: 6, unit: "working", status: "open", deadline_date: "2026-08-24" },
    ]);
    // ActionQueue's chip only writes " working" when `clock === "working"`, so
    // this is what makes it render the truthful "6 days left".
    expect(q[0].clock).toBeNull();
    expect(q[0].daysRemaining).toBe(6);
  });

  it("keeps the working-day THRESHOLDS, so no row moves band because of that", () => {
    // 6 days against the forfeiture thresholds (<=5 critical, <=10 soon) is
    // "soon"; against calendar thresholds it would be "later" — band 2 versus
    // band 5. Erring towards urgency is the safe direction while the count
    // itself is wrong.
    const q = buildTimeBarQueue([
      { id: 1, label: "Notice of delay", days_remaining: 6, unit: "working", status: "open" },
    ]);
    expect(q[0].pressure).toBe("soon");
    expect(bandOf(q[0])).toBe(2);
  });

  it("says 'working days' only of the notice period, never of the countdown", () => {
    const q = buildTimeBarQueue([
      { id: 1, label: "Notice of delay", days_remaining: 6, unit: "working", duration: 20, status: "open", awareness_date: "2026-08-04", deadline_date: "2026-08-24" },
    ]);
    expect(q[0].detail).toContain("20 working days from 4 Aug 2026");
    expect(q[0].headline).not.toContain("working");
  });

  it("never calls a clock a notice the label did not call a notice", () => {
    // The expense-and-loss clock is a single 40-day period; whether it is a
    // notice stage is a backend definition, not something this row may assert.
    const q = buildTimeBarQueue([
      { id: 1, label: "Claim for expense and loss", days_remaining: 40, unit: "working", status: "open", deadline_date: "2026-09-30" },
    ]);
    expect(q[0].headline).toBe("Claim for expense and loss");
    expect(q[0].headline.toLowerCase()).not.toContain("notice");
    expect(q[0].action.toLowerCase()).not.toContain("notice");
  });

  it("never prepends 'Notice on' to a label that already says Notice", () => {
    const label = "Notice of delay / claim for revision of completion date";
    const q = buildTimeBarQueue([
      { id: 1, label, days_remaining: 2, unit: "working", status: "open", deadline_date: "2026-08-20" },
    ]);
    expect(q[0].headline).toBe(label);
    expect(q[0].headline).not.toContain("Notice on Notice");
  });

  it("puts no date and no day count in any time-bar headline", () => {
    // The headline is the label and nothing else, at every point on the clock.
    // Both temporal values live in their own slots on the row: the deadline in
    // the date tile, the countdown in the chip. Stating the date in the prose
    // as well made a row of six read as six near-identical sentences.
    const at = (days: number | null) =>
      buildTimeBarQueue([
        { id: 1, label: "Delay particulars", days_remaining: days, unit: "working", status: "open", deadline_date: "2026-08-24" },
      ])[0];
    for (const days of [null, -4, 0, 2, 9]) {
      expect(at(days).headline).toBe("Delay particulars");
      expect(at(days).headline).not.toMatch(/\d/);
      expect(at(days).date).toBe("2026-08-24");
    }
  });

  it("tells five clocks of the same kind apart by their DATE SLOT", () => {
    // The deadline date is still what distinguishes three otherwise identical
    // clocks — it is simply no longer doing that job from inside a sentence.
    // `QueueRow` draws it as a date object at the head of the row, so a column
    // of them can be scanned without reading three copies of the same label.
    const label = "Notice of delay / claim for revision of completion date";
    const bar = (id: number, deadline_date: string, days_remaining: number) => ({
      id, label, deadline_date, days_remaining, unit: "working", status: "open",
    });
    const q = buildTimeBarQueue([
      bar(1, "2026-08-20", 2),
      bar(2, "2026-08-27", 4),
      bar(3, "2026-09-03", 5),
    ]);
    expect(new Set(q.map((i) => i.date)).size).toBe(3);
    expect(q.map((i) => i.date)).toEqual(["2026-08-20", "2026-08-27", "2026-09-03"]);
    // The headline is now the same string for all three, deliberately: what
    // they have in common IS the same, and the row says so once.
    expect(new Set(q.map((i) => i.headline)).size).toBe(1);
  });

  it("falls back to the label alone rather than inventing a date", () => {
    const q = buildTimeBarQueue([{ id: 1, label: "VO-012", days_remaining: 2, status: "open" }]);
    expect(q[0].headline).toBe("VO-012");
  });

  it("uses the backend's days_remaining verbatim and never the deadline date", () => {
    // The backend counts on the SA working-day calendar, holidays and the
    // builders' break included. Recomputing from deadline_date would hand
    // somebody days they do not have.
    const q = buildTimeBarQueue([
      {
        id: 9,
        label: "VO-020",
        days_remaining: 2,
        unit: "working",
        // Four calendar days away. If this were used, pressure would differ.
        deadline_date: iso(4).slice(0, 10),
        status: "open",
      },
    ]);
    expect(q[0].daysRemaining).toBe(2);
    expect(q[0].pressure).toBe("critical");
  });

  it("withholds an unverified clause reference rather than guessing", () => {
    const q = buildTimeBarQueue([
      { id: 2, label: "VO-013", days_remaining: 3, status: "open", clause_ref: "26.5", clause_verified: false },
    ]);
    expect(q[0].detail).toBeNull();
  });

  it("marks a passed deadline as overdue and expired", () => {
    const q = buildTimeBarQueue([{ id: 3, label: "VO-014", days_remaining: -4, status: "open" }]);
    expect(q[0].overdue).toBe(true);
    expect(q[0].pressure).toBe("expired");
    expect(q[0].daysRemaining).toBe(-4);
  });

  it("keeps a deadline falling today expired and on its own row", () => {
    const q = buildTimeBarQueue([{ id: 10, label: "VO-021", days_remaining: 0, status: "open" }]);
    expect(q).toHaveLength(1);
    expect(q[0].key).toBe("time-bar-10");
    expect(q[0].pressure).toBe("expired");
  });

  it("treats an undated deadline as live and says so, rather than dropping it", () => {
    const q = buildTimeBarQueue([{ id: 4, label: "VO-015", days_remaining: null, status: "open" }]);
    expect(q).toHaveLength(1);
    expect(q[0].daysRemaining).toBeNull();
    expect(q[0].clock).toBeNull();
    expect(q[0].pressure).toBe("none");
    expect(q[0].pressure).toBe("none");
    expect(q[0].detail).toContain("treat it as live");
  });

  it("ignores bars that are no longer open", () => {
    expect(buildTimeBarQueue([{ id: 5, label: "x", days_remaining: 2, status: "served" }])).toHaveLength(0);
  });

  it("is not gated — a lapsing notice prejudices every party to the contract", () => {
    const q = buildTimeBarQueue([{ id: 6, label: "x", days_remaining: 2, status: "open" }]);
    expect(q[0].requires).toEqual([]);
    expect(q[0].href).toBe("/project-health?tab=notice-deadlines");
  });
});

describe("shortDate", () => {
  it("reads a bare date without letting a timezone move it a day", () => {
    expect(shortDate("2026-08-04")).toBe("4 Aug 2026");
    expect(shortDate("2026-01-31T00:00:00Z")).toBe("31 Jan 2026");
    expect(shortDate("2026-12-01")).toBe("1 Dec 2026");
  });

  it("returns null rather than guessing at something it cannot read", () => {
    for (const v of [null, undefined, "", "not a date", "2026-13-01"]) {
      expect(shortDate(v)).toBeNull();
    }
  });
});

/**
 * The rule the whole queue is built to: a row must still say WHICH row it is
 * once the column truncates it. Sixty characters is roughly where `QueueRow`
 * cuts at the narrowest layout the homepage lays out.
 */
describe("headlines identify their row when truncated", () => {
  const TRUNCATE = 60;

  it("keeps three same-kind notices apart by DATE, the headline being shared", () => {
    // The truncation rule is about what a reader can tell apart at a glance,
    // and for these three that is the date — which is why it is now a slot of
    // its own rather than the first eighteen characters of a sentence. The
    // headline is shared and fits inside the truncation width whole.
    const label = "Notice of delay / claim for revision of completion date";
    const q = buildTimeBarQueue([
      { id: 1, label, deadline_date: "2026-08-20", days_remaining: 2, unit: "working", status: "open" },
      { id: 2, label, deadline_date: "2026-08-27", days_remaining: 3, unit: "working", status: "open" },
      { id: 3, label, deadline_date: "2026-09-17", days_remaining: 4, unit: "working", status: "open" },
    ]);
    expect(new Set(q.map((i) => i.date)).size).toBe(3);
    expect(q.every((i) => i.headline.length <= TRUNCATE)).toBe(true);
  });

  it("keeps three certificates apart in their first 60 characters", () => {
    const q = [
      ...buildCertificateQueue(
        [
          { id: 1, pcNumber: "PC-006", workflowState: "submitted" },
          { id: 2, pcNumber: "PC-007", workflowState: "approved" },
        ],
        NOW,
      ),
      ...buildRejectedCertificateQueue([{ id: 3, pcNumber: "PC-005", workflowState: "rejected" }], NOW),
    ];
    expect(new Set(q.map((i) => i.headline.slice(0, TRUNCATE))).size).toBe(3);
    for (const item of q) expect(item.headline.length).toBeLessThanOrEqual(TRUNCATE);
  });

  it("keeps two long-titled meetings apart in their first 60 characters", () => {
    const long = (n: string) => `${n} progress and coordination meeting, all consultants`;
    const rsvps = buildRsvpQueue(
      [
        { id: 1, title: long("Monday"), status: "scheduled", my_rsvp: "invited", scheduled_utc: iso(2) },
        { id: 2, title: long("Thursday"), status: "scheduled", my_rsvp: "invited", scheduled_utc: iso(4) },
      ],
      NOW,
    );
    expect(new Set(rsvps.map((i) => i.headline.slice(0, TRUNCATE))).size).toBe(2);

    const actions = buildMeetingActionQueue([
      { id: 1, title: long("Monday"), action_items: [{ id: 1, text: "a" }] },
      { id: 2, title: long("Thursday"), action_items: [{ id: 2, text: "b" }] },
    ]);
    expect(new Set(actions.map((i) => i.headline.slice(0, TRUNCATE))).size).toBe(2);
  });

  it("puts no day count in any headline the queue can build", () => {
    const items = [
      ...buildTimeBarQueue([
        { id: 1, label: "Notice of delay", deadline_date: "2026-08-04", days_remaining: -4, unit: "working", status: "open" },
      ]),
      ...buildCertificateQueue([{ id: 1, pcNumber: "PC-006", workflowState: "submitted", updatedAt: iso(-11) }], NOW),
      ...buildRejectedCertificateQueue([{ id: 2, pcNumber: "PC-005", workflowState: "rejected", updatedAt: iso(-4) }], NOW),
      ...buildObligationQueue([{ _id: "o", title: "Submit the OHS file", isOverdue: true, daysOverdue: 9, dueDate: iso(-9) }], NOW),
      ...buildTaskQueue([{ id: "t", title: "Late", type: "VO", due_date: iso(-3), needsAction: true }], NOW),
    ];
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.headline).not.toMatch(/\bdays?\b/i);
      expect(item.headline).not.toMatch(/\btoday\b|\btomorrow\b|\byesterday\b/i);
    }
  });
});

describe("buildTimeBarQueue — folding the ones with nothing to do today", () => {
  const bar = (id: number, label: string, days_remaining: number | null, deadline_date?: string) => ({
    id, label, days_remaining, deadline_date, unit: "working", status: "open",
  });

  it("folds same-kind clocks that are all beyond their pressure window", () => {
    const label = "Claim for expense and loss";
    const q = buildTimeBarQueue([
      bar(1, label, 30, "2026-08-04"),
      bar(2, label, 18, "2026-08-11"),
      bar(3, label, 22, "2026-08-20"),
    ]);
    expect(q).toHaveLength(1);
    expect(q[0].key).toBe("time-bar-group-claim-for-expense-and-loss");
    expect(q[0].headline).toBe("3 deadlines — Claim for expense and loss");
  });

  it("draws the folded row with the SOONEST clock in the group", () => {
    const label = "Delay particulars";
    const q = buildTimeBarQueue([bar(1, label, 30), bar(2, label, 18), bar(3, label, 22)]);
    expect(q[0].daysRemaining).toBe(18);
    // Not "working": the folded row is under the same countdown-unit rule.
    expect(q[0].clock).toBeNull();
    expect(q[0].pressure).toBe("later");
    expect(q[0].overdue).toBe(false);
  });

  it("never folds a clock that needs acting on — that is the whole risk", () => {
    // Two days left must not disappear behind four sixteen-day clocks.
    const label = "Notice of delay";
    const q = buildTimeBarQueue([
      bar(1, label, 2, "2026-08-04"),
      bar(2, label, 16, "2026-08-11"),
      bar(3, label, 17, "2026-08-12"),
      bar(4, label, 18, "2026-08-13"),
      bar(5, label, 19, "2026-08-14"),
    ]);
    const urgent = q.find((i) => i.key === "time-bar-1");
    expect(urgent).toBeDefined();
    expect(urgent?.daysRemaining).toBe(2);
    expect(urgent?.pressure).toBe("critical");
    // The four with nothing to do about them today fold into one.
    expect(q).toHaveLength(2);
    expect(q[1].headline).toBe("4 deadlines — Notice of delay");
  });

  it("leaves an expired, critical, soon or undated clock on its own row", () => {
    const label = "Notice of delay";
    const q = buildTimeBarQueue([
      bar(1, label, -3), bar(2, label, 1), bar(3, label, 8), bar(4, label, null),
    ]);
    expect(q).toHaveLength(4);
    expect(q.every((i) => !i.key.startsWith("time-bar-group-"))).toBe(true);
  });

  it("does not fold across different notices", () => {
    const q = buildTimeBarQueue([
      bar(1, "Notice of delay", 20), bar(2, "Notice of delay", 21),
      bar(3, "Delay particulars", 22), bar(4, "Delay particulars", 23),
    ]);
    expect(q.map((i) => i.headline).sort()).toEqual([
      "2 deadlines — Delay particulars",
      "2 deadlines — Notice of delay",
    ]);
  });

  it("leaves a lone distant clock as itself rather than a group of one", () => {
    const q = buildTimeBarQueue([bar(7, "Notice of delay", 30, "2026-09-30")]);
    expect(q).toHaveLength(1);
    expect(q[0].key).toBe("time-bar-7");
    expect(q[0].headline).toBe("Notice of delay");
    expect(q[0].date).toBe("2026-09-30");
  });

  it("lists the deadlines behind a folded row in its detail, soonest first", () => {
    const label = "Notice of delay";
    const q = buildTimeBarQueue([
      bar(1, label, 30, "2026-09-30"),
      bar(2, label, 18, "2026-09-18"),
      bar(3, label, 22, "2026-09-22"),
    ]);
    // A list of dates, no longer a stutter of "Due …, Due …, Due …".
    expect(q[0].detail).toBe("18 Sep 2026, 22 Sep 2026, 30 Sep 2026");
  });

  it("gives a folded row the SOONEST member's date, matching its chip", () => {
    // The group already draws its worst member's clock, so it can only ever
    // overstate its own urgency. The date slot comes from the SAME member, so
    // the tile and the chip on a folded row belong to one deadline rather than
    // to two different ones. The rest are listed in `detail`.
    const label = "Notice of delay";
    const q = buildTimeBarQueue([
      bar(1, label, 30, "2026-09-30"),
      bar(2, label, 18, "2026-09-18"),
      bar(3, label, 22, "2026-09-22"),
    ]);
    expect(q[0].key).toContain("time-bar-group-");
    expect(q[0].date).toBe("2026-09-18");
    expect(q[0].daysRemaining).toBe(18);
  });

  it("keeps a folded row unable to hide urgency it does not have a chip for", () => {
    // Folding must never move a row between bands: every member is `later`,
    // so the group is `later`, which homeQueueRank puts at band 5.
    const label = "Notice of delay";
    const q = buildTimeBarQueue([bar(1, label, 40), bar(2, label, 45)]);
    expect(bandOf(q[0])).toBe(5);
  });

  it("still shows every folded clock in the count, so none is lost", () => {
    const label = "Notice of delay";
    const q = buildTimeBarQueue([bar(1, label, 20), bar(2, label, 21), bar(3, label, 22)]);
    expect(q[0].headline).toBe("3 deadlines — Notice of delay");
  });
});

describe("groupRiskSignals", () => {
  const signal = (over: Record<string, unknown>) => ({
    id: 1,
    code: "R-01",
    category: "delay" as const,
    severity: "red" as const,
    status: "open",
    title: "Programme slipped past the baseline",
    ...over,
  });

  it("folds one line per rule, so three identical signals stop being three rows", () => {
    // Project 45's actual shape: VO_MANDATE_BREACH fires once per variation.
    const groups = groupRiskSignals([
      signal({ id: 27, code: "VO_MANDATE_BREACH", title: "VO-001 exceeds principal agent mandate" }),
      signal({ id: 26, code: "VO_MANDATE_BREACH", title: "VO-002 exceeds principal agent mandate" }),
      signal({ id: 25, code: "VO_MANDATE_BREACH", title: "VO-003 exceeds principal agent mandate" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(3);
    expect(groups[0].title).toBe("3 variations exceed the principal agent mandate");
  });

  it("leaves a lone signal's own title exactly as the backend wrote it", () => {
    const groups = groupRiskSignals([signal({ code: "VO_MANDATE_BREACH" })]);
    expect(groups[0].title).toBe("Programme slipped past the baseline");
    expect(groups[0].count).toBe(1);
  });

  it("asserts nothing it cannot know about a rule it has no wording for", () => {
    const groups = groupRiskSignals([
      signal({ id: 1, code: "UNKNOWN_RULE", title: "First" }),
      signal({ id: 2, code: "UNKNOWN_RULE", title: "Second" }),
    ]);
    expect(groups[0].title).toBe("First · +1 more");
  });

  it("takes the worst severity in the group, and orders groups by it", () => {
    const groups = groupRiskSignals([
      signal({ id: 1, code: "AMBER_RULE", severity: "orange" }),
      signal({ id: 2, code: "MIXED_RULE", severity: "orange" }),
      signal({ id: 3, code: "MIXED_RULE", severity: "red" }),
    ]);
    expect(groups.map((g) => g.code)).toEqual(["MIXED_RULE", "AMBER_RULE"]);
    expect(groups[0].severity).toBe("red");
  });

  it("calls a group contractual only when EVERY signal in it is", () => {
    const mixed = groupRiskSignals([
      signal({ id: 1, code: "C", is_contractual: true }),
      signal({ id: 2, code: "C", is_contractual: false }),
    ]);
    expect(mixed[0].contractual).toBe(false);
    const all = groupRiskSignals([
      signal({ id: 1, code: "C", is_contractual: true }),
      signal({ id: 2, code: "C", is_contractual: true }),
    ]);
    expect(all[0].contractual).toBe(true);
    // Absent means not asserted, and we do not assert a breach on its behalf.
    expect(groupRiskSignals([signal({})])[0].contractual).toBe(false);
  });

  it("loses no signal — folding is presentation, not filtering", () => {
    const input = [
      signal({ id: 1, code: "A" }),
      signal({ id: 2, code: "A" }),
      signal({ id: 3, code: "B" }),
    ];
    const groups = groupRiskSignals(input);
    expect(groups.flatMap((g) => g.signals)).toHaveLength(input.length);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(input.length);
  });

  it("does not gate — the caller passes what visibleRiskSignals already allowed", () => {
    // The gate lives in visibleRiskSignals (tested below) and is unchanged from
    // the one the removed risk queue rows used to declare. Grouping must not
    // become a second, weaker filter.
    const financial = signal({ category: "financial" as const });
    const withheld = visibleRiskSignals([financial], {
      canViewCompliance: true,
      canViewFinance: false,
    });
    expect(groupRiskSignals(withheld)).toEqual([]);
  });
});

describe("buildObligationQueue", () => {
  const ob = (over: Record<string, unknown>) => ({
    _id: "o1",
    title: "Submit the OHS file",
    documentName: "JBCC PBA 6.2",
    responsibleRole: "Contractor",
    status: "Pending",
    ...over,
  });

  it("uses the server's own day counts rather than recomputing them", () => {
    const late = buildObligationQueue([ob({ isOverdue: true, daysOverdue: 9, dueDate: iso(-9) })], NOW);
    expect(late[0].daysRemaining).toBe(-9);
    expect(late[0].overdue).toBe(true);
    expect(late[0].headline).toBe("Submit the OHS file");
    expect(late[0].detail).toContain("9 days past its date");

    const soon = buildObligationQueue([ob({ _id: "o2", daysUntilDue: 3, dueDate: iso(3) })], NOW);
    expect(soon[0].daysRemaining).toBe(3);
    expect(soon[0].headline).toBe("Submit the OHS file");
    expect(soon[0].detail).toContain("due in 3 days");
  });

  it("falls back to the due date only when the server supplied no count", () => {
    const q = buildObligationQueue([ob({ dueDate: iso(4) })], NOW);
    expect(q[0].daysRemaining).toBe(4);
    expect(q[0].clock).toBe("calendar");
  });

  it("keeps the queue to what is near, leaving the rest to Compliance", () => {
    expect(buildObligationQueue([ob({ daysUntilDue: 14, dueDate: iso(14) })], NOW)).toHaveLength(1);
    expect(buildObligationQueue([ob({ daysUntilDue: 15, dueDate: iso(15) })], NOW)).toHaveLength(0);
  });

  it("drops closed obligations however the backend spells it", () => {
    for (const status of ["Completed", "completed", " Closed ", "waived"]) {
      expect(buildObligationQueue([ob({ status, daysUntilDue: 1 })], NOW)).toHaveLength(0);
    }
  });

  it("drops an obligation with no date at all rather than claiming it is due", () => {
    expect(buildObligationQueue([ob({ dueDate: null })], NOW)).toHaveLength(0);
  });

  it("names the responsible ROLE without implying the row is yours", () => {
    // The payload carries no assignee id, so these cannot be narrowed to "mine".
    const q = buildObligationQueue([ob({ daysUntilDue: 2, dueDate: iso(2) })], NOW);
    expect(q[0].detail).toBe("JBCC PBA 6.2 · responsible: Contractor · due in 2 days");
    expect(q[0].requires).toEqual(["compliance.view"]);
    expect(q[0].consequence).toBe("breach");
  });
});

describe("buildRsvpQueue", () => {
  const meetings = [
    { id: 1, title: "Site meeting", status: "scheduled", my_rsvp: "invited", scheduled_utc: iso(2) },
    { id: 2, title: "Progress meeting", status: "scheduled", my_rsvp: "accepted", scheduled_utc: iso(3) },
    { id: 3, title: "Old meeting", status: "completed", my_rsvp: "invited", scheduled_utc: iso(-3) },
  ];

  it("asks only for RSVPs the user has not given on live meetings", () => {
    const q = buildRsvpQueue(meetings, NOW);
    expect(q).toHaveLength(1);
    expect(q[0].key).toBe("rsvp-1");
  });

  it("never renders an inviter name, because no payload carries one", () => {
    const q = buildRsvpQueue(meetings, NOW);
    expect(q[0].headline).toBe("Site meeting — reply to the invitation");
    expect(q[0].detail).toBe("Meets in 2 days");
  });
});

describe("meeting action items", () => {
  it("treats a server decision as final", () => {
    expect(actionItemIsPending({ id: 1, text: "x" })).toBe(true);
    expect(actionItemIsPending({ id: 2, text: "x", approved_at: iso(-1) })).toBe(false);
    expect(actionItemIsPending({ id: 3, text: "x", declined_at: iso(-1) })).toBe(false);
    expect(actionItemIsPending({ id: 4, text: "x", state: "approved" })).toBe(false);
    expect(actionItemIsPending({ id: 5, text: "x", state: "pending" })).toBe(true);
  });

  it("counts the job, not the status", () => {
    const q = buildMeetingActionQueue([
      {
        id: 7,
        title: "Tuesday's site meeting",
        action_items: [
          { id: 1, text: "Price the roof variation" },
          { id: 2, text: "Issue RFI on the slab detail" },
          { id: 3, text: "Already done", approved_at: iso(-1) },
        ],
      },
    ]);
    expect(q).toHaveLength(1);
    expect(q[0].headline).toBe("Tuesday's site meeting — approve 2 proposed actions");
  });

  it("omits items the backend says this user cannot approve", () => {
    const q = buildMeetingActionQueue([
      { id: 8, title: "M", action_items: [{ id: 1, text: "x", can_approve: false }] },
    ]);
    expect(q).toHaveLength(0);
  });

  it("uses the item's own text when there is exactly one", () => {
    const q = buildMeetingActionQueue([
      { id: 9, title: "M", action_items: [{ id: 1, text: "Price the roof variation" }] },
    ]);
    expect(q[0].headline).toBe("M — approve 1 proposed action");
    expect(q[0].detail).toBe("Price the roof variation");
  });
});

describe("buildTaskQueue", () => {
  it("only includes tasks where the ball is in the user's court", () => {
    const q = buildTaskQueue(
      [
        { id: "a", title: "Respond", type: "RFI", due_date: iso(2), needsAction: true },
        { id: "b", title: "Watching only", needsAction: false },
      ],
      NOW,
    );
    expect(q).toHaveLength(1);
    expect(q[0].headline).toBe("RFI: Respond");
  });

  it("says so in the detail when a task is overdue, not twice on the row", () => {
    const q = buildTaskQueue([{ id: "c", title: "Late", type: "VO", due_date: iso(-3), needsAction: true }], NOW);
    expect(q[0].overdue).toBe(true);
    expect(q[0].headline).toBe("VO: Late");
    expect(q[0].detail).toBe("3 days past its due date");
  });

  it("states that no due date was recorded rather than inventing one", () => {
    const q = buildTaskQueue([{ id: "d", title: "Undated", needsAction: true }], NOW);
    expect(q[0].detail).toBe("No due date recorded");
    expect(q[0].daysRemaining).toBeNull();
  });

  // ── Escalated to you ──────────────────────────────────────────────────
  // An SI more than three days past its due date escalates to the PM. It is
  // NOT reassigned, so `needsAction` stays false for the PM — and before this,
  // that meant the escalation the backend raised never reached the homepage of
  // the person it was raised for.

  const escalatedSI = (over: Partial<TaskLike> = {}): TaskLike => ({
    id: "e",
    title: "Confirm the slab setting-out",
    type: "SI",
    due_date: iso(-9),
    needsAction: false,
    escalatedToMe: true,
    escalatedAt: iso(-5),
    awaiting: "Themba Nkosi",
    ...over,
  });

  it("surfaces a task escalated to you even though it is not assigned to you", () => {
    const q = buildTaskQueue([escalatedSI()], NOW);
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe("task-escalated");
  });

  it("says someone else is late, not that the work is yours", () => {
    const q = buildTaskQueue([escalatedSI()], NOW);
    expect(q[0].headline).toBe("SI: Confirm the slab setting-out — awaiting Themba Nkosi");
    expect(q[0].detail).toContain("No response from Themba Nkosi");
    expect(q[0].detail).toContain("escalated to you");
    // The move is to chase the person, not to do their work.
    expect(q[0].action).toBe("Chase the response");
  });

  it("names no one rather than guessing when the payload carries no name", () => {
    const q = buildTaskQueue([escalatedSI({ awaiting: null, title: "Untitled" })], NOW);
    expect(q[0].headline).toBe("SI: Untitled");
    expect(q[0].detail).toContain("No response from the assignee");
  });

  it("ranks an escalation above your own overdue work", () => {
    const q = buildTaskQueue(
      [
        { id: "mine", title: "My late paperwork", type: "RFI", due_date: iso(-9), needsAction: true },
        escalatedSI({ id: "theirs" }),
      ],
      NOW,
    );
    const escalated = q.find((i) => i.kind === "task-escalated")!;
    const own = q.find((i) => i.kind === "task")!;

    // Classified within the existing consequence axis, not added to it.
    expect(escalated.consequence).toBe("blocking");
    expect(own.consequence).toBe("own-work");
    // blocking/expired is band 4; own-work/expired is band 5.
    expect(bandOf(escalated)).toBeLessThan(bandOf(own));
    expect(rankQueue(q)[0].key).toBe(escalated.key);
  });

  it("reads a task both assigned and escalated to you as the escalation, once", () => {
    // The more urgent reading of the same fact wins, and it emits one row —
    // the same task twice in one list is noise.
    const q = buildTaskQueue([escalatedSI({ id: "both", needsAction: true })], NOW);
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe("task-escalated");
  });

  it("leaves a task escalated to somebody else out of your queue", () => {
    const q = buildTaskQueue([escalatedSI({ escalatedToMe: false })], NOW);
    expect(q).toHaveLength(0);
  });
});

// `rankQueue` and `filterQueueByPermission` are the ranking rule itself and
// are tested in `homeQueueRank.test.ts`, next to the matrix they implement.


describe("resolveFinanceAccess", () => {
  // The case that matters: on live project 45, Contractor resolves
  // finance.view = false while Client/Owner and Project Manager resolve true.
  const NO_ACTS = {
    canEditFinance: false,
    canCertifyCertificate: false,
    canPostCertificate: false,
    canPrepareCertificate: false,
  };

  it("gives a contractor without finance.view no money and no certification", () => {
    expect(
      resolveFinanceAccess({ canViewFinance: false, canApprovePayment: false, isLoading: false }),
    ).toEqual({ canViewFinance: false, canApprovePayment: false, ...NO_ACTS });
  });

  it("gives a PM who holds finance.view the money blocks", () => {
    expect(
      resolveFinanceAccess({ canViewFinance: true, canApprovePayment: true, isLoading: false }),
    ).toEqual({ canViewFinance: true, canApprovePayment: true, ...NO_ACTS });
  });

  it("FAILS CLOSED while permissions are still loading", () => {
    // usePermissions returns true for every flag while the effective map is in
    // flight, so a route gate does not bounce a legitimate user. Rendering must
    // not inherit that: it would flash the contract sum at a contractor.
    //
    // All SIX flags, not just the two: an act gate that failed open would put
    // "Certify PC-006" in front of somebody who cannot certify, for one frame,
    // every time the page loads.
    expect(
      resolveFinanceAccess({
        canViewFinance: true,
        canApprovePayment: true,
        isLoading: true,
        canEditFinance: true,
        canCertifyCertificate: true,
        canPostCertificate: true,
        canPrepareCertificate: true,
      }),
    ).toEqual({ canViewFinance: false, canApprovePayment: false, ...NO_ACTS });
  });

  it("keeps view and approve independent", () => {
    expect(
      resolveFinanceAccess({ canViewFinance: true, canApprovePayment: false, isLoading: false }),
    ).toEqual({ canViewFinance: true, canApprovePayment: false, ...NO_ACTS });
  });

  it("keeps CERTIFYING independent of approve_payment, which is a different act", () => {
    // `finance.approve_payment` REVERSES a recorded payment
    // (tasks/views_payments.py); `finance.approve_certificate` certifies and
    // is held by PRINCIPAL_PM alone. The homepage used to expose the first and
    // consume neither, and gating a certification row on it would have been a
    // scoping rule invented in the browser.
    const out = resolveFinanceAccess({
      canViewFinance: true,
      canApprovePayment: true,
      isLoading: false,
      canCertifyCertificate: false,
    });
    expect(out.canApprovePayment).toBe(true);
    expect(out.canCertifyCertificate).toBe(false);
  });

  it("hides every finance queue item from a contractor end to end", () => {
    const access = resolveFinanceAccess({
      canViewFinance: false,
      canApprovePayment: false,
      isLoading: false,
    });
    const items = rankQueue([
      ...buildCertificateQueue([
        { id: 1, pcNumber: "PC-001", workflowState: "submitted" },
        { id: 2, pcNumber: "PC-002", workflowState: "approved" },
      ]),
      ...buildRejectedCertificateQueue([{ id: 3, pcNumber: "PC-003", workflowState: "rejected" }]),
      ...buildTimeBarQueue([{ id: 4, label: "VO-012", days_remaining: 5, status: "open" }]),
      ...buildTaskQueue([{ id: "t", title: "Respond", needsAction: true }], NOW),
    ]);
    // The contractor holds compliance.view but not finance.view, which is the
    // live configuration on project 45.
    const visible = filterQueueByPermission(items, {
      canViewFinance: access.canViewFinance,
      canViewCompliance: true,
      canEditFinance: access.canEditFinance,
      canCertify: access.canCertifyCertificate,
      canPostCertificate: access.canPostCertificate,
      canPrepareCertificate: access.canPrepareCertificate,
    });
    expect(visible.every((i) => !i.requires.includes("finance.view"))).toBe(true);
    expect(visible.map((i) => i.kind).sort()).toEqual(["task", "time-bar"]);
    // The notice deadline still leads: it is the only thing here that forfeits.
    expect(visible[0].kind).toBe("time-bar");
  });

  it("hides a financial risk signal from that same contractor, now that risk is not a queue item", () => {
    // Risk moved out of the queue and into `groupRiskSignals`. The gate did not
    // move with it: `visibleRiskSignals` applies exactly what the removed rows
    // used to declare — compliance.view for every signal, plus finance.view for
    // a financial one — so this is the same guarantee at its new call site.
    const access = resolveFinanceAccess({
      canViewFinance: false,
      canApprovePayment: false,
      isLoading: false,
    });
    const signals = [
      {
        id: 5,
        code: "R-09",
        category: "financial" as const,
        severity: "red" as const,
        status: "open",
        title: "Certified value exceeds the contract sum",
        is_contractual: true,
      },
      {
        id: 6,
        code: "R-02",
        category: "delay" as const,
        severity: "red" as const,
        status: "open",
        title: "Practical completion has slipped",
      },
    ];
    const groups = groupRiskSignals(
      visibleRiskSignals(signals, { canViewCompliance: true, canViewFinance: access.canViewFinance }),
    );
    expect(groups.map((g) => g.code)).toEqual(["R-02"]);
    // And nothing at all while the permission map is still in flight.
    const loading = resolveFinanceAccess({
      canViewFinance: true,
      canApprovePayment: true,
      isLoading: true,
    });
    expect(
      groupRiskSignals(
        visibleRiskSignals(signals, {
          canViewCompliance: true,
          canViewFinance: loading.canViewFinance,
        }),
      ).map((g) => g.code),
    ).toEqual(["R-02"]);
  });
});

describe("visibleRiskSignals", () => {
  const signals = [
    { category: "delay" as const, status: "open", severity: "red" },
    { category: "financial" as const, status: "open", severity: "orange" },
    { category: "compliance" as const, status: "open", severity: "green" },
    { category: "delay" as const, status: "resolved", severity: "red" },
  ];

  it("shows nothing without compliance.view, since /project-health is gated on it", () => {
    expect(
      visibleRiskSignals(signals, { canViewCompliance: false, canViewFinance: true }),
    ).toEqual([]);
  });

  it("withholds financial signals from a contractor — their details carry amounts", () => {
    const out = visibleRiskSignals(signals, { canViewCompliance: true, canViewFinance: false });
    expect(out.map((s) => s.category)).toEqual(["delay", "compliance"]);
  });

  it("shows every open category to a PM holding both", () => {
    const out = visibleRiskSignals(signals, { canViewCompliance: true, canViewFinance: true });
    expect(out.map((s) => s.category)).toEqual(["delay", "financial", "compliance"]);
  });

  it("never includes signals that are no longer open", () => {
    const out = visibleRiskSignals(signals, { canViewCompliance: true, canViewFinance: true });
    expect(out.every((s) => s.status === "open")).toBe(true);
  });
});

describe("summariseMoney", () => {
  const project = { contractValue: 1_000_000 };
  const certificates = [
    { id: 1, workflowState: "posted", netAmount: 200_000, totalPayable: 230_000, retentionAmount: 20_000 },
    { id: 2, workflowState: "posted", netAmount: 100_000, retentionAmount: 10_000 },
    { id: 3, workflowState: "submitted", netAmount: 500_000, retentionAmount: 50_000 },
  ];
  const variations = [
    { status: "approved", task: { grandTotal: 50_000 } },
    { status: "in review", task: { grandTotal: 999_999 } },
  ];

  it("counts only posted certificates as certified", () => {
    const m = summariseMoney(project, certificates, variations);
    expect(m.certified).toBe(330_000);
    expect(m.retentionHeld).toBe(30_000);
  });

  it("counts only approved variations", () => {
    const m = summariseMoney(project, certificates, variations);
    expect(m.variations).toBe(50_000);
    expect(m.variationCount).toBe(1);
  });

  it("revises the contract sum by the approved variations", () => {
    const m = summariseMoney(project, certificates, variations);
    expect(m.contractSum).toBe(1_000_000);
    // Only the approved one. The in-review R999 999 is in no sum at all.
    expect(m.revisedContractSum).toBe(1_050_000);
  });

  it("takes certified value off the revised sum and does NOT deduct retention", () => {
    const m = summariseMoney(project, certificates, variations);
    // 1 050 000 revised − 330 000 certified. Retention is withheld out of
    // value that has ALREADY been certified — `claim_amount` is gross of it
    // per `pc_integrity.recompute` — so it is inside the certified figure and
    // taking it off again removes the same R30 000 twice.
    expect(m.balance).toBe(720_000);
    // The two figures this replaced, both named so neither comes back:
    expect(m.balance).not.toBe(690_000); // double-deducted retention
    expect(m.balance).not.toBe(670_000); // ignored the approved variation
  });

  it("agrees with Project Health, which is the whole point", () => {
    // Home said R 1 590 000 and Project Health said R 2 000 000 for project 45,
    // one click apart, because this function deducted retention and
    // `financialOverview` did not. `financialOverview` now reads this figure
    // rather than rebuilding it; the arithmetic is asserted from both ends.
    const m = summariseMoney(project, certificates, variations);
    expect(m.balance).toBe((m.revisedContractSum as number) - (m.certified as number));
  });

  it("states NOTHING when the certificate list could not be read", () => {
    // The strip that fabricated. A failed certificates request used to arrive
    // here as `[]`: `certified` and `retentionHeld` came back null correctly,
    // `balance` computed `revised − 0 − 0` and `certifiedPct` computed 0, so
    // the page rendered "R 1 050 000,00 remaining · 0% certified" over a
    // project that is 31% certified.
    const m = summariseMoney(project, null, variations);
    expect(m.certified).toBeNull();
    expect(m.retentionHeld).toBeNull();
    expect(m.balance).toBeNull();
    expect(m.certifiedPct).toBeNull();
    // The contract sum itself is NOT from that endpoint and survives.
    expect(m.contractSum).toBe(1_000_000);
    expect(m.revisedContractSum).toBe(1_050_000);
  });

  it("tells an EMPTY certificate list apart from an unread one", () => {
    // A project with no posted certificate has certified nothing, and the
    // whole revised sum is still to certify. That is a real zero and must
    // still produce a balance.
    const m = summariseMoney(project, [], variations);
    expect(m.certified).toBeNull();
    expect(m.balance).toBe(1_050_000);
    expect(m.certifiedPct).toBe(0);
  });

  it("states no revised sum when the variations could not be read", () => {
    // An unknown addend makes an unknown sum. The original on its own is a
    // DIFFERENT number, not a safe approximation of the revised one.
    const m = summariseMoney(project, certificates, null);
    expect(m.contractSum).toBe(1_000_000);
    expect(m.variations).toBeNull();
    expect(m.revisedContractSum).toBeNull();
    expect(m.balance).toBeNull();
    expect(m.certifiedPct).toBeNull();
    // What came off the certificates endpoint is still known and still shown.
    expect(m.certified).toBe(330_000);
  });

  it("measures the certified share against the revised sum, not the original", () => {
    const m = summariseMoney(project, certificates, variations);
    // 330 000 / 1 050 000, not 330 000 / 1 000 000.
    expect(m.certifiedPct).toBe(31);
  });

  it("does not report over-certification once a variation covers it", () => {
    const posted = [{ id: 1, workflowState: "posted", claimAmount: 1_050_000 }];
    const approved = [{ status: "approved", grandTotal: 200_000 }];
    // Against the original this reads 105% and fires the "Over" badge; against
    // the revised sum the server certifies against (pc_integrity's ceiling is
    // contract_value + approved variations) it is 88% and well inside.
    expect(summariseMoney(project, posted, approved).certifiedPct).toBe(88);
  });

  it("returns null rather than zero when the contract sum is unknown", () => {
    const m = summariseMoney({}, certificates, variations);
    expect(m.contractSum).toBeNull();
    expect(m.revisedContractSum).toBeNull();
    expect(m.balance).toBeNull();
    expect(m.certifiedPct).toBeNull();
  });

  it("does not present a bare variation total as a revised contract sum", () => {
    // No original sum, but approved variations exist. Adding them to nothing
    // would render R50 000 as this project's contract.
    const m = summariseMoney({}, [], variations);
    expect(m.variations).toBe(50_000);
    expect(m.revisedContractSum).toBeNull();
  });

  it("returns null figures when nothing has been certified at all", () => {
    const m = summariseMoney(project, [], []);
    expect(m.certified).toBeNull();
    expect(m.retentionHeld).toBeNull();
    expect(m.variations).toBeNull();
  });

  it("reads snake_case contract_value too", () => {
    expect(summariseMoney({ contract_value: "250000" }, [], []).contractSum).toBe(250_000);
  });

  it("treats posted as the only certified state", () => {
    expect(certificateIsCertified({ id: 1, workflowState: "posted" })).toBe(true);
    expect(certificateIsCertified({ id: 2, workflowState: "approved" })).toBe(false);
  });
});

describe("summariseHomeLoad", () => {
  it("reports nothing wrong when every source answered", () => {
    expect(summariseHomeLoad({}).level).toBe("none");
  });

  it("calls it a total outage only when every VISIBLE source failed", () => {
    const issue = summariseHomeLoad(
      { tasksFailed: true, meetingsFailed: true },
      ["tasksFailed", "meetingsFailed"],
    );
    expect(issue.level).toBe("total");
    expect(issue.message).toContain("not a statement that nothing is outstanding");
  });

  it("names the failed sources on a partial outage", () => {
    const issue = summariseHomeLoad({ timeBarsFailed: true, meetingsFailed: true });
    expect(issue.level).toBe("partial");
    expect(issue.message).toContain("your meetings");
    expect(issue.message).toContain("notice deadlines");
  });

  it("does not report a finance outage to someone who cannot see finance", () => {
    const issue = summariseHomeLoad({ certificatesFailed: true }, ["tasksFailed", "meetingsFailed"]);
    expect(issue.level).toBe("none");
  });
});

describe("summariseProjectSetup", () => {
  it("returns null with no project rather than a misleading zero", () => {
    expect(summariseProjectSetup(null)).toBeNull();
  });

  it("counts the seven fields and lists what is missing", () => {
    const s = summariseProjectSetup({ location: "Cape Town" })!;
    expect(s.totalCount).toBe(7);
    expect(s.filledCount).toBe(1);
    expect(s.percentage).toBe(14);
    expect(s.missing).toContain("Budget Allocation");
    expect(s.missing).not.toContain("Location");
  });

  it("accepts either casing", () => {
    const camel = summariseProjectSetup({ totalBudget: 5, startDate: "a", endDate: "b" })!;
    const snake = summariseProjectSetup({ total_budget: 5, start_date: "a", end_date: "b" })!;
    expect(camel.filledCount).toBe(snake.filledCount);
    expect(camel.filledCount).toBe(2);
  });

  it("reports a fully configured project as complete", () => {
    const s = summariseProjectSetup({
      clientDetails: { company_name: "ABC" },
      taskOrderBrief: "scope",
      documents: [{}],
      totalBudget: 100,
      location: "site",
      startDate: "a",
      endDate: "b",
      appointedCompany: { company_name: "XYZ" },
    })!;
    expect(s.percentage).toBe(100);
    expect(s.missing).toEqual([]);
  });
});

describe("SETUP_LABELS", () => {
  it("gives every setup field a plain-words label", () => {
    for (const field of SETUP_FIELDS) {
      expect(SETUP_LABELS[field]).toBeTruthy();
    }
  });

  it("no longer calls the documents check 'Project Documents'", () => {
    // The check is `documents.length > 0`, i.e. "nothing has been attached".
    // The label must say that, not name a feature.
    expect(SETUP_LABELS["Project Documents"]).toBe("attached documents");
  });
});

describe("summariseTime", () => {
  // Project 36 on the local DB: 2026-05-21 → 2026-06-30, with the live
  // contract end date moved out to 2026-07-30 by a signed variation.
  const P36 = {
    startDate: "2026-05-21",
    endDate: "2026-06-30",
    contractEndDate: "2026-07-30",
  };

  it("returns nothing usable for a project with no dates", () => {
    expect(summariseTime(null).hasDates).toBe(false);
    expect(summariseTime({}).hasDates).toBe(false);
    expect(summariseTime({ startDate: null, endDate: null }).hasDates).toBe(false);
  });

  it("measures build length inclusively against the LIVE completion date", () => {
    const t = summariseTime(P36, NOW);
    // 21 May → 30 Jul is 70 days apart; inclusive of both ends, 71.
    expect(t.buildDays).toBe(71);
    expect(t.contractEnd).toBe("2026-07-30");
    expect(t.originalEnd).toBe("2026-06-30");
  });

  it("reports the extension of time the contract end date carries", () => {
    expect(summariseTime(P36, NOW).extensionDays).toBe(30);
  });

  it("reports no extension when the live date matches the original", () => {
    const t = summariseTime(
      { startDate: "2026-05-21", endDate: "2026-06-30", contractEndDate: "2026-06-30" },
      NOW,
    );
    expect(t.extensionDays).toBeNull();
  });

  it("falls back to the original end when contract_end_date is unset", () => {
    const t = summariseTime({ startDate: "2026-05-21", endDate: "2026-06-30" }, NOW);
    expect(t.contractEnd).toBe("2026-06-30");
    expect(t.extensionDays).toBeNull();
  });

  it("counts remaining days negative once the completion date is past", () => {
    // NOW is 2026-08-17; the live completion date was 2026-07-30.
    const t = summariseTime(P36, NOW);
    expect(t.remainingDays).toBe(-18);
    expect(t.overrun).toBe(true);
  });

  it("counts remaining days positive before completion", () => {
    const t = summariseTime({ startDate: "2026-08-01", endDate: "2026-09-01" }, NOW);
    expect(t.remainingDays).toBe(15);
    expect(t.overrun).toBe(false);
  });

  it("counts elapsed days from the start date", () => {
    const t = summariseTime(P36, NOW);
    expect(t.elapsedDays).toBe(88);
    expect(t.notStarted).toBe(false);
  });

  it("reports zero elapsed, not negative, before the start date", () => {
    const t = summariseTime({ startDate: "2026-10-01", endDate: "2026-12-01" }, NOW);
    expect(t.notStarted).toBe(true);
    expect(t.elapsedDays).toBe(0);
  });

  it("reads snake_case as well as camelCase", () => {
    const snake = summariseTime(
      { start_date: "2026-05-21", end_date: "2026-06-30", contract_end_date: "2026-07-30" },
      NOW,
    );
    expect(snake).toEqual(summariseTime(P36, NOW));
  });

  it("ignores unparseable dates rather than emitting NaN", () => {
    const t = summariseTime({ startDate: "not-a-date", endDate: "2026-09-01" }, NOW);
    expect(t.start).toBeNull();
    expect(t.buildDays).toBeNull();
    expect(t.elapsedDays).toBeNull();
    expect(t.remainingDays).toBe(15);
  });

  it("computes NO percentage of any kind", () => {
    // Guard against the old homepage's "elapsed / total = % complete".
    expect(Object.keys(summariseTime(P36, NOW))).not.toContain("percentComplete");
    expect(Object.keys(summariseTime(P36, NOW))).not.toContain("elapsedPct");
  });
});


// ── Where a homepage row actually goes ────────────────────────────────────
//
// The bug these lock down: every risk row on the homepage linked to the string
// "/project-health", a read-only diagnostic page. A row saying "3 variations
// exceed the principal agent mandate" restated the same sentence there with no
// way through to the three variations. The `source_type` / `source_id` the
// backend has always sent are what fix it.
//
// The `source_type` strings below are the lowercased Django model names, read
// off the rules themselves — vo_tolerance.py `source=vo` (VariationOrder),
// payment_overdue.py `source=pc` (PaymentCertificate), milestone_overdue.py
// `source=milestone` (Milestone), time_bar.py `source=clock` (TimeBarClock),
// claim_notified.py `source=ic` (IntentionToClaim).

describe("riskSignalHref", () => {
  it("sends a variation-order signal to that variation", () => {
    expect(riskSignalHref({ source_type: "variationorder", source_id: 12 })).toBe(
      `${VARIATIONS}&vo=12`,
    );
  });

  it("sends a payment-certificate signal to that certificate", () => {
    expect(riskSignalHref({ source_type: "paymentcertificate", source_id: 6 })).toBe(
      `${CERTIFICATES}&pc=6`,
    );
  });

  it("sends a milestone signal to that milestone on the programme", () => {
    expect(riskSignalHref({ source_type: "milestone", source_id: 41 })).toBe(
      "/programme?milestone=41",
    );
  });

  it("sends a time-bar signal to the notice deadlines tab, which is where it lives", () => {
    // The ONE source type that legitimately belongs on Project health.
    expect(riskSignalHref({ source_type: "timebarclock", source_id: 3 })).toBe(
      "/project-health?tab=notice-deadlines",
    );
  });

  it("falls back to the risk signals tab when the rule attached NO source", () => {
    expect(riskSignalHref({ source_type: null, source_id: null })).toBe(HEALTH);
    expect(riskSignalHref({})).toBe(HEALTH);
    expect(riskSignalHref(undefined)).toBe(HEALTH);
    expect(riskSignalHref(null)).toBe(HEALTH);
  });

  it("falls back for an UNRECOGNISED source type", () => {
    // `intentiontoclaim` is real — claim_notified.py raises it — and this app
    // has no page for one yet, so it takes the fallback rather than guessing.
    expect(riskSignalHref({ source_type: "intentiontoclaim", source_id: 9 })).toBe(HEALTH);
    expect(riskSignalHref({ source_type: "somethingnewentirely", source_id: 1 })).toBe(HEALTH);
  });

  it("uses the list, not Project health, when a known type arrives without an id", () => {
    // The list contains the object; the diagnostic page does not.
    expect(riskSignalHref({ source_type: "variationorder", source_id: null })).toBe(VARIATIONS);
    expect(riskSignalHref({ source_type: "paymentcertificate" })).toBe(CERTIFICATES);
    expect(riskSignalHref({ source_type: "milestone" })).toBe("/programme");
  });

  it("is not defeated by casing", () => {
    expect(riskSignalHref({ source_type: "VariationOrder", source_id: 2 })).toBe(
      `${VARIATIONS}&vo=2`,
    );
  });
});

const signal = (over: Partial<Parameters<typeof groupRiskSignals>[0][number]>) => ({
  id: 1,
  code: "VO_MANDATE_BREACH",
  category: "financial" as const,
  severity: "red" as const,
  status: "open",
  title: "Variation exceeds the principal agent mandate",
  ...over,
});

describe("riskGroupHref", () => {
  it("sends a group of ONE to the object itself", () => {
    const [group] = groupRiskSignals([
      signal({ id: 1, source_type: "variationorder", source_id: 12 }),
    ]);
    expect(group.count).toBe(1);
    expect(riskGroupHref(group)).toBe(`${VARIATIONS}&vo=12`);
  });

  it("sends a group of THREE to the list holding all three, never to one of them", () => {
    // This is the owner's row: "3 variations exceed the principal agent
    // mandate". No URL in this app can say "these three ids", so naming one of
    // them would tell the reader the wrong variation is at issue.
    const groups = groupRiskSignals([
      signal({ id: 1, source_type: "variationorder", source_id: 12 }),
      signal({ id: 2, source_type: "variationorder", source_id: 13 }),
      signal({ id: 3, source_type: "variationorder", source_id: 14 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("3 variations exceed the principal agent mandate");
    const href = riskGroupHref(groups[0]);
    expect(href).toBe(VARIATIONS);
    expect(href).not.toContain("vo=");
  });

  it("sends folded certificates to the certificates tab and folded milestones to the programme", () => {
    const certs = groupRiskSignals([
      signal({ id: 1, code: "PAYMENT_OVERDUE", source_type: "paymentcertificate", source_id: 5 }),
      signal({ id: 2, code: "PAYMENT_OVERDUE", source_type: "paymentcertificate", source_id: 6 }),
    ]);
    expect(riskGroupHref(certs[0])).toBe(CERTIFICATES);

    const miles = groupRiskSignals([
      signal({ id: 1, code: "MILESTONE_OVERDUE", category: "delay", source_type: "milestone", source_id: 7 }),
      signal({ id: 2, code: "MILESTONE_OVERDUE", category: "delay", source_type: "milestone", source_id: 8 }),
    ]);
    expect(riskGroupHref(miles[0])).toBe("/programme");
  });

  it("falls back when a folded group disagrees about its source type", () => {
    const groups = groupRiskSignals([
      signal({ id: 1, source_type: "variationorder", source_id: 12 }),
      signal({ id: 2, source_type: "paymentcertificate", source_id: 5 }),
    ]);
    expect(riskGroupHref(groups[0])).toBe(HEALTH);
  });

  it("falls back for a folded group carrying no source at all", () => {
    const groups = groupRiskSignals([signal({ id: 1 }), signal({ id: 2 })]);
    expect(riskGroupHref(groups[0])).toBe(HEALTH);
    expect(riskGroupHref({ signals: [] })).toBe(HEALTH);
  });
});

describe("queue rows name their object", () => {
  it("a certificate row opens that certificate, not the finance page", () => {
    const [row] = buildCertificateQueue([
      { id: 6, pcNumber: "PC-006", workflowState: "submitted" },
    ]);
    expect(row.href).toBe(`${CERTIFICATES}&pc=6`);
  });

  it("a rejected certificate row opens that certificate", () => {
    const [row] = buildRejectedCertificateQueue([
      { id: 3, pcNumber: "PC-003", workflowState: "rejected" },
    ]);
    expect(row.href).toBe(`${CERTIFICATES}&pc=3`);
  });

  it("an obligation row opens that obligation, not the compliance page", () => {
    const rows = buildObligationQueue(
      [{ _id: "ob-9", title: "Submit the works programme", dueDate: "2026-01-02" }],
      new Date("2026-01-01T09:00:00Z"),
    );
    expect(rows[0].href).toBe("/compliance?obligation=ob-9");
  });

  it("the documents alert names its project", () => {
    expect(documentsHref(45)).toBe("/documents?project=45");
  });
});

// ── The certificate clock, at last ────────────────────────────────────────

describe("buildPaymentOverdueQueue", () => {
  const summary = {
    overdueCount: 2,
    certificates: [
      {
        paymentCertificateId: 5,
        pcNumber: "PC-005",
        isOverdue: true,
        daysPastDue: 19,
        outstandingAmount: "1240000.00",
        due: { dueDate: "2026-07-29", basisIsContractual: true },
      },
      {
        paymentCertificateId: 4,
        pcNumber: "PC-004",
        isOverdue: true,
        daysPastDue: 3,
        outstandingAmount: "80000.00",
        due: { dueDate: "2026-08-14", basisIsContractual: false },
      },
      // Posted, paid, not overdue. Not a row.
      { paymentCertificateId: 3, pcNumber: "PC-003", isOverdue: false, daysPastDue: 0 },
    ],
  };

  it("gives a certificate a REAL clock, which the list endpoint could not", () => {
    // `homeSignals` used to assert "No certificate endpoint carries a due
    // date" and hard-code `pressure: "none"` on every certificate row, so a
    // certificate 19 days past its contractual due date sat in the queue with
    // no chip, ranked beside one submitted this morning. The date is the
    // server's, off `projects/{id}/payments/`.
    const q = buildPaymentOverdueQueue(summary);
    expect(q).toHaveLength(2);
    expect(q[0].daysRemaining).toBe(-19);
    expect(q[0].clock).toBe("calendar");
    expect(q[0].date).toBe("2026-07-29");
    expect(q[0].overdue).toBe(true);
    expect(q[0].pressure).toBe("expired");
  });

  it("ranks a certificate past its due date above one merely waiting", () => {
    const overdue = buildPaymentOverdueQueue(summary)[0];
    const waiting = buildCertificateQueue([{ id: 6, workflowState: "submitted" }], NOW)[0];
    const ranked = rankQueue([waiting, overdue]);
    expect(ranked[0].key).toBe(overdue.key);
  });

  it("never recomputes the day count from the due date", () => {
    // `tasks/payment_terms.py` resolves the period from ProjectPaymentTerms and
    // applies the SA working-day calendar where it is counted in working days.
    // Re-deriving that in a browser would be a second implementation of the
    // rule that decides whether a contractor may claim interest.
    const q = buildPaymentOverdueQueue({
      certificates: [
        {
          paymentCertificateId: 1,
          pcNumber: "PC-001",
          isOverdue: true,
          daysPastDue: 4,
          // Forty days ago. If the date were subtracted here it would say 40.
          due: { dueDate: iso(-40).slice(0, 10), basisIsContractual: true },
        },
      ],
    });
    expect(q[0].daysRemaining).toBe(-4);
  });

  it("discloses a due date counted from a FALLBACK basis", () => {
    // The fallback can only ever move a due date later, i.e. in the employer's
    // favour, so a reader must be told when it was used.
    const q = buildPaymentOverdueQueue(summary);
    expect(q[0].detail).not.toContain("fallback");
    expect(q[1].detail).toContain("fallback");
  });

  it("names the outstanding amount and gates on the code that records a payment", () => {
    const q = buildPaymentOverdueQueue(summary);
    expect(q[0].detail).toContain("1 240 000,00");
    // `finance.edit` records a payment (tasks/views_payments.py:252).
    // NOT `finance.approve_payment`, which REVERSES one.
    expect(q[0].requires).toEqual(["finance.view", "finance.edit"]);
  });

  it("says nothing at all when the endpoint has not answered", () => {
    expect(buildPaymentOverdueQueue(undefined)).toEqual([]);
    expect(buildPaymentOverdueQueue({ certificates: [] })).toEqual([]);
  });
});

// ── The verdict ───────────────────────────────────────────────────────────

describe("homeVerdict", () => {
  const bar = (days: number, label = "Notice of delay") =>
    buildTimeBarQueue([
      { id: 1, label, days_remaining: days, unit: "working", status: "open", deadline_date: "2026-08-10" },
    ])[0];

  it("names the single worst thing already past a date", () => {
    const q = rankQueue([
      bar(-8),
      ...buildTaskQueue([{ id: "t", title: "Reply", needsAction: true, due_date: iso(-2) }], NOW),
    ]);
    const v = homeVerdict({ queue: q, loadLevel: "none" });
    expect(v.tone).toBe("breach");
    expect(v.text).toContain("Notice of delay");
    expect(v.text).toContain("8 days past its date");
    // The second one is not named — it is in the list below, where it was.
    expect(v.text).toContain("1 other past a date");
  });

  it("takes the ranker's word for which is worst, and does not re-rank", () => {
    // Forfeiture outranks own-work in `homeQueueRank`. The verdict reads the
    // top of the ranked list rather than forming a second opinion.
    const q = rankQueue([
      ...buildTaskQueue([{ id: "t", title: "Reply", needsAction: true, due_date: iso(-30) }], NOW),
      bar(-1),
    ]);
    expect(homeVerdict({ queue: q, loadLevel: "none" }).text).toContain("Notice of delay");
  });

  it("states a deadline that is closing WITHOUT calling it a breach", () => {
    const v = homeVerdict({ queue: rankQueue([bar(3)]), loadLevel: "none" });
    expect(v.tone).toBe("pressing");
    expect(v.text).toContain("closes in 3 days");
    // Severity rule 1: colour is for what has already happened.
    expect(v.tone).not.toBe("breach");
  });

  it("says so plainly when nothing is late", () => {
    const v = homeVerdict({ queue: [], loadLevel: "none" });
    expect(v.text).toBe("Nothing is past a contractual date.");
    expect(v.tone).toBe("clear");
  });

  it("NEVER asserts an all-clear over a source that did not answer", () => {
    // The one statement on this page that covers every source. An outage must
    // not be rendered as "nothing is late" — the same discipline the empty
    // queue state already keeps.
    const v = homeVerdict({ queue: [], loadLevel: "partial" });
    expect(v.tone).toBe("unknown");
    expect(v.text).not.toContain("Nothing is past");
    expect(v.text.toLowerCase()).toContain("could not be read");
  });

  it("still names a real breach when a DIFFERENT source failed", () => {
    // A partial outage does not suppress a fact we do hold.
    const v = homeVerdict({ queue: rankQueue([bar(-4)]), loadLevel: "partial" });
    expect(v.tone).toBe("breach");
  });

  it("can only name what the reader is shown, because it reads the filtered queue", () => {
    const contractor = filterQueueByPermission(
      rankQueue([
        ...buildCertificateQueue([{ id: 1, pcNumber: "PC-006", workflowState: "submitted" }], NOW),
        ...buildTaskQueue([{ id: "t", title: "Reply", needsAction: true, due_date: iso(-9) }], NOW),
      ]),
      { canViewCompliance: true },
    );
    const v = homeVerdict({ queue: contractor, loadLevel: "none" });
    expect(v.text).not.toContain("PC-006");
    expect(v.text).toContain("Reply");
  });
});
