import { describe, it, expect } from "vitest";

import {
  actionItemIsPending,
  buildCertificateQueue,
  buildMeetingActionQueue,
  buildRejectedCertificateQueue,
  buildRsvpQueue,
  buildTaskQueue,
  buildTimeBarQueue,
  certificateIsCertified,
  daysUntil,
  filterQueueByPermission,
  rankQueue,
  relativeDays,
  resolveFinanceAccess,
  summariseHomeLoad,
  summariseMoney,
  visibleRiskSignals,
  type QueueItem,
} from "../homeSignals";
import { summariseProjectSetup } from "../homeSetup";

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

  it("gates every certificate row on finance.view", () => {
    expect(buildCertificateQueue(certs).every((i) => i.requires === "finance.view")).toBe(true);
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
  it("picks up rejected certificates and gates them on finance.view", () => {
    const q = buildRejectedCertificateQueue([
      { id: 5, pcNumber: "PC-005", workflowState: "rejected" },
      { id: 6, workflowState: "posted" },
    ]);
    expect(q).toHaveLength(1);
    expect(q[0].headline).toContain("PC-005 was rejected");
    expect(q[0].requires).toBe("finance.view");
  });
});

describe("buildTimeBarQueue", () => {
  it("states the clock and the thing, with days remaining", () => {
    const q = buildTimeBarQueue([
      {
        id: 1,
        label: "VO-012",
        days_remaining: 14,
        status: "open",
        clause_ref: "26.5",
        clause_verified: true,
        contract_form: "JBCC",
      },
    ]);
    expect(q[0].headline).toBe("14 days left to serve notice on VO-012");
    expect(q[0].detail).toBe("JBCC 26.5");
    expect(q[0].overdue).toBe(false);
  });

  it("withholds an unverified clause reference rather than guessing", () => {
    const q = buildTimeBarQueue([
      { id: 2, label: "VO-013", days_remaining: 3, status: "open", clause_ref: "26.5", clause_verified: false },
    ]);
    expect(q[0].detail).toBeNull();
  });

  it("marks a passed deadline as overdue", () => {
    const q = buildTimeBarQueue([{ id: 3, label: "VO-014", days_remaining: -4, status: "open" }]);
    expect(q[0].overdue).toBe(true);
    expect(q[0].headline).toContain("passed its deadline 4 days ago");
  });

  it("ignores bars that are no longer open", () => {
    expect(buildTimeBarQueue([{ id: 4, label: "x", days_remaining: 2, status: "served" }])).toHaveLength(0);
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
    expect(q[0].headline).toBe("Reply to the invitation for Site meeting");
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
    expect(q[0].headline).toBe("Approve 2 actions proposed in Tuesday's site meeting");
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
    expect(q[0].headline).toBe("Approve one action proposed in M");
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

  it("says so plainly when a task is overdue", () => {
    const q = buildTaskQueue([{ id: "c", title: "Late", type: "VO", due_date: iso(-3), needsAction: true }], NOW);
    expect(q[0].overdue).toBe(true);
    expect(q[0].headline).toContain("3 days past its due date");
  });

  it("states that no due date was recorded rather than inventing one", () => {
    const q = buildTaskQueue([{ id: "d", title: "Undated", needsAction: true }], NOW);
    expect(q[0].detail).toBe("No due date recorded");
    expect(q[0].daysRemaining).toBeNull();
  });
});

describe("rankQueue", () => {
  const item = (over: Partial<QueueItem>): QueueItem => ({
    key: "k",
    kind: "task",
    headline: "h",
    detail: null,
    daysRemaining: null,
    overdue: false,
    href: "/",
    requires: null,
    ...over,
  });

  it("puts anything overdue above everything on time", () => {
    const ranked = rankQueue([
      item({ key: "cert", kind: "certificate" }),
      item({ key: "late-task", kind: "task", overdue: true, daysRemaining: -2 }),
    ]);
    expect(ranked[0].key).toBe("late-task");
  });

  it("orders on-time work certificates → notices → RSVPs → meeting actions → rejected → tasks", () => {
    const ranked = rankQueue([
      item({ key: "task", kind: "task" }),
      item({ key: "rejected", kind: "rejected" }),
      item({ key: "meeting-action", kind: "meeting-action" }),
      item({ key: "rsvp", kind: "rsvp" }),
      item({ key: "time-bar", kind: "time-bar" }),
      item({ key: "certificate", kind: "certificate" }),
    ]);
    expect(ranked.map((i) => i.key)).toEqual([
      "certificate",
      "time-bar",
      "rsvp",
      "meeting-action",
      "rejected",
      "task",
    ]);
  });

  it("breaks ties on the nearest clock, and sinks items with no clock", () => {
    const ranked = rankQueue([
      item({ key: "far", kind: "time-bar", daysRemaining: 20 }),
      item({ key: "none", kind: "time-bar", daysRemaining: null }),
      item({ key: "near", kind: "time-bar", daysRemaining: 2 }),
    ]);
    expect(ranked.map((i) => i.key)).toEqual(["near", "far", "none"]);
  });
});

describe("filterQueueByPermission", () => {
  const items: QueueItem[] = [
    {
      key: "money",
      kind: "certificate",
      headline: "h",
      detail: null,
      daysRemaining: null,
      overdue: false,
      href: "/",
      requires: "finance.view",
    },
    {
      key: "everyone",
      kind: "task",
      headline: "h",
      detail: null,
      daysRemaining: null,
      overdue: false,
      href: "/",
      requires: null,
    },
  ];

  it("hides finance rows from a viewer without finance.view", () => {
    const out = filterQueueByPermission(items, { canViewFinance: false });
    expect(out.map((i) => i.key)).toEqual(["everyone"]);
  });

  it("shows them to a viewer who holds it", () => {
    const out = filterQueueByPermission(items, { canViewFinance: true });
    expect(out).toHaveLength(2);
  });
});

describe("resolveFinanceAccess", () => {
  // The case that matters: on live project 45, Contractor resolves
  // finance.view = false while Client/Owner and Project Manager resolve true.
  it("gives a contractor without finance.view no money and no certification", () => {
    expect(
      resolveFinanceAccess({ canViewFinance: false, canApprovePayment: false, isLoading: false }),
    ).toEqual({ canViewFinance: false, canApprovePayment: false });
  });

  it("gives a PM who holds finance.view the money blocks", () => {
    expect(
      resolveFinanceAccess({ canViewFinance: true, canApprovePayment: true, isLoading: false }),
    ).toEqual({ canViewFinance: true, canApprovePayment: true });
  });

  it("FAILS CLOSED while permissions are still loading", () => {
    // usePermissions returns true for every flag while the effective map is in
    // flight, so a route gate does not bounce a legitimate user. Rendering must
    // not inherit that: it would flash the contract sum at a contractor.
    expect(
      resolveFinanceAccess({ canViewFinance: true, canApprovePayment: true, isLoading: true }),
    ).toEqual({ canViewFinance: false, canApprovePayment: false });
  });

  it("keeps view and approve independent", () => {
    expect(
      resolveFinanceAccess({ canViewFinance: true, canApprovePayment: false, isLoading: false }),
    ).toEqual({ canViewFinance: true, canApprovePayment: false });
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
    const visible = filterQueueByPermission(items, access);
    expect(visible.every((i) => i.requires === null)).toBe(true);
    expect(visible.map((i) => i.kind).sort()).toEqual(["task", "time-bar"]);
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

  it("derives balance and a certified share of contract sum", () => {
    const m = summariseMoney(project, certificates, variations);
    expect(m.contractSum).toBe(1_000_000);
    expect(m.balance).toBe(670_000);
    expect(m.certifiedPct).toBe(33);
  });

  it("returns null rather than zero when the contract sum is unknown", () => {
    const m = summariseMoney({}, certificates, variations);
    expect(m.contractSum).toBeNull();
    expect(m.balance).toBeNull();
    expect(m.certifiedPct).toBeNull();
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
