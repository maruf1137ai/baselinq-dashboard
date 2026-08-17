import { describe, it, expect } from "vitest";

import {
  actionItemIsPending,
  buildObligationQueue,
  buildRiskQueue,
  filterQueueByPermission,
  rankQueue,
  buildCertificateQueue,
  buildMeetingActionQueue,
  buildRejectedCertificateQueue,
  buildRsvpQueue,
  buildTaskQueue,
  buildTimeBarQueue,
  certificateIsCertified,
  daysUntil,
  relativeDays,
  resolveFinanceAccess,
  summariseHomeLoad,
  summariseMoney,
  visibleRiskSignals,
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

  it("gates every certificate row on finance.view, and nothing more", () => {
    expect(buildCertificateQueue(certs).map((i) => i.requires)).toEqual([
      ["finance.view"],
      ["finance.view"],
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

  it("routes every row somewhere that exists", () => {
    expect(buildCertificateQueue(certs).every((i) => i.href === "/finance")).toBe(true);
    expect(buildCertificateQueue(certs).every((i) => i.action.length > 0)).toBe(true);
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
    expect(q[0].requires).toEqual(["finance.view"]);
  });

  it("leads the money class, because payment on it has stopped dead", () => {
    const rejected = buildRejectedCertificateQueue([{ id: 5, workflowState: "rejected" }]);
    const submitted = buildCertificateQueue([{ id: 6, workflowState: "submitted" }]);
    expect(rejected[0].subRank).toBeLessThan(submitted[0].subRank as number);
  });

  it("never states a rejection reason, because no response carries one", () => {
    const q = buildRejectedCertificateQueue([
      { id: 7, workflowState: "rejected", updatedAt: iso(-4) },
    ]);
    expect(q[0].detail).toBe("Payment on it has stopped for 4 days");
  });
});

describe("buildTimeBarQueue", () => {
  it("states the clock, its unit and the thing it protects", () => {
    const q = buildTimeBarQueue([
      {
        id: 1,
        label: "VO-012",
        days_remaining: 14,
        unit: "working",
        status: "open",
        clause_ref: "26.5",
        clause_verified: true,
        contract_form: "JBCC",
      },
    ]);
    expect(q[0].headline).toBe("14 working days left to serve notice on VO-012");
    expect(q[0].detail).toBe("JBCC 26.5");
    expect(q[0].clock).toBe("working");
    expect(q[0].consequence).toBe("forfeiture");
    expect(q[0].overdue).toBe(false);
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
    expect(q[0].headline).toContain("passed its deadline 4 working days ago");
  });

  it("says a deadline falling today must be served today", () => {
    const q = buildTimeBarQueue([{ id: 10, label: "VO-021", days_remaining: 0, status: "open" }]);
    expect(q[0].headline).toBe("Notice on VO-021 must be served today");
    expect(q[0].pressure).toBe("expired");
  });

  it("treats an undated deadline as live and says so, rather than dropping it", () => {
    const q = buildTimeBarQueue([{ id: 4, label: "VO-015", days_remaining: null, status: "open" }]);
    expect(q).toHaveLength(1);
    expect(q[0].daysRemaining).toBeNull();
    expect(q[0].clock).toBeNull();
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

describe("buildRiskQueue", () => {
  const signal = (over: Record<string, unknown>) => ({
    id: 1,
    code: "R-01",
    category: "delay" as const,
    severity: "red" as const,
    status: "open",
    title: "Programme slipped past the baseline",
    ...over,
  });

  it("takes only open signals", () => {
    expect(buildRiskQueue([signal({ status: "resolved" }), signal({ id: 2 })])).toHaveLength(1);
  });

  it("derives urgency from severity, because no signal carries a date", () => {
    expect(buildRiskQueue([signal({ severity: "red" })])[0].pressure).toBe("critical");
    expect(buildRiskQueue([signal({ severity: "orange" })])[0].pressure).toBe("soon");
    expect(buildRiskQueue([signal({ severity: "green" })])[0].pressure).toBe("later");
    expect(buildRiskQueue([signal({})])[0].daysRemaining).toBeNull();
    expect(buildRiskQueue([signal({})])[0].clock).toBeNull();
  });

  it("separates a contractual breach from a commercial guide", () => {
    expect(buildRiskQueue([signal({ is_contractual: true })])[0].consequence).toBe("breach");
    expect(buildRiskQueue([signal({ is_contractual: false })])[0].consequence).toBe("advisory");
    // Absent means not asserted, and we do not assert a breach on its behalf.
    expect(buildRiskQueue([signal({})])[0].consequence).toBe("advisory");
  });

  it("prefers the backend's own evidence line over a rule number", () => {
    expect(buildRiskQueue([signal({ evidence: "Practical completion is 12 days late" })])[0].detail)
      .toBe("Practical completion is 12 days late");
    expect(buildRiskQueue([signal({ is_contractual: true })])[0].detail)
      .toBe("Contractual breach · rule R-01");
  });

  it("keeps the existing gates: compliance.view, plus finance.view when financial", () => {
    expect(buildRiskQueue([signal({ category: "delay" })])[0].requires).toEqual(["compliance.view"]);
    expect(buildRiskQueue([signal({ category: "financial" })])[0].requires).toEqual([
      "compliance.view",
      "finance.view",
    ]);
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
    expect(late[0].headline).toBe("Submit the OHS file — 9 days past its date");

    const soon = buildObligationQueue([ob({ _id: "o2", daysUntilDue: 3, dueDate: iso(3) })], NOW);
    expect(soon[0].daysRemaining).toBe(3);
    expect(soon[0].headline).toBe("Submit the OHS file — due in 3 days");
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
    expect(q[0].detail).toBe("JBCC PBA 6.2 · responsible: Contractor");
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

// `rankQueue` and `filterQueueByPermission` are the ranking rule itself and
// are tested in `homeQueueRank.test.ts`, next to the matrix they implement.


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
      ...buildRiskQueue([
        {
          id: 5,
          code: "R-09",
          category: "financial",
          severity: "red",
          status: "open",
          title: "Certified value exceeds the contract sum",
          is_contractual: true,
        },
      ]),
      ...buildTaskQueue([{ id: "t", title: "Respond", needsAction: true }], NOW),
    ]);
    // The contractor holds compliance.view but not finance.view, which is the
    // live configuration on project 45.
    const visible = filterQueueByPermission(items, { ...access, canViewCompliance: true });
    expect(visible.every((i) => !i.requires.includes("finance.view"))).toBe(true);
    expect(visible.map((i) => i.kind).sort()).toEqual(["task", "time-bar"]);
    // The notice deadline still leads: it is the only thing here that forfeits.
    expect(visible[0].kind).toBe("time-bar");
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
