import { describe, expect, it } from "vitest";
import {
  buildObligationRows,
  buildTimeBarRows,
  daysUntil,
  deriveUrgency,
  filterComplianceRows,
  isObligationClosed,
  isTimeBarClosed,
  parseDueDate,
  sortComplianceRows,
  summariseCompliance,
  summariseLoadIssues,
  urgencyLabel,
  type ApiObligation,
  type ApiTimeBar,
  type ComplianceRow,
} from "@/lib/compliance";

const TODAY = new Date(2026, 7, 3); // 3 Aug 2026, local midnight

const obligation = (over: Partial<ApiObligation> = {}): ApiObligation => ({
  _id: "1",
  title: "Issue revised programme",
  dueDate: "2026-08-20",
  responsibleRole: "Contractor",
  status: "Pending",
  ...over,
});

describe("daysUntil", () => {
  it("counts whole days forward and backward from today", () => {
    expect(daysUntil("2026-08-03", TODAY)).toBe(0);
    expect(daysUntil("2026-08-10", TODAY)).toBe(7);
    expect(daysUntil("2026-07-30", TODAY)).toBe(-4);
  });

  // A due date that arrived from a DateTimeField used to produce Invalid Date
  // → NaN, and NaN fails every comparison, so a month-overdue obligation came
  // out on-track and green.
  it("reads a full ISO datetime, using its date part", () => {
    expect(daysUntil("2026-07-01T00:00:00Z", TODAY)).toBe(-33);
    expect(daysUntil("2026-08-10T23:59:59+02:00", TODAY)).toBe(7);
    expect(daysUntil("2026-08-10 09:30:00", TODAY)).toBe(7);
  });

  it("signals an unreadable date with null rather than NaN", () => {
    for (const bad of ["", "not a date", "20/08/2026", "2026-13-01", "2026-02-30", "2026-8-3"]) {
      expect(daysUntil(bad, TODAY)).toBeNull();
    }
    expect(daysUntil(null, TODAY)).toBeNull();
    expect(daysUntil(undefined, TODAY)).toBeNull();
  });
});

describe("parseDueDate", () => {
  it("resolves to a local calendar date, so no timezone can shift the day", () => {
    const d = parseDueDate("2026-08-20T22:00:00Z");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(7);
    expect(d?.getDate()).toBe(20);
  });

  it("returns null for anything it cannot read", () => {
    expect(parseDueDate("soon")).toBeNull();
    expect(parseDueDate(null)).toBeNull();
  });
});

describe("status vocabularies", () => {
  // A backend rename must never close a legal deadline. Unknown stays open.
  it("closes a time bar only on a recognised closed status", () => {
    expect(isTimeBarClosed("served")).toBe(true);
    expect(isTimeBarClosed(" Served ")).toBe(true);
    expect(isTimeBarClosed("WAIVED")).toBe(true);
    expect(isTimeBarClosed("open")).toBe(false);
    expect(isTimeBarClosed("active")).toBe(false);
    expect(isTimeBarClosed("OPEN")).toBe(false);
    expect(isTimeBarClosed("")).toBe(false);
    expect(isTimeBarClosed(undefined)).toBe(false);
    // A lapsed notice period is not a resolved one — it stays countable.
    expect(isTimeBarClosed("expired")).toBe(false);
  });

  it("closes an obligation on any of the plausible completed spellings", () => {
    for (const s of ["Completed", "completed", "complete", "Closed", "done", "Satisfied", "waived"]) {
      expect(isObligationClosed(s)).toBe(true);
    }
    for (const s of ["Pending", "In Progress", "", "overdue"]) {
      expect(isObligationClosed(s)).toBe(false);
    }
  });
});

describe("deriveUrgency", () => {
  it("treats a past date as overdue", () => {
    expect(deriveUrgency("2026-07-30", false, TODAY)).toEqual({
      urgency: "overdue",
      daysFromDue: -4,
    });
  });

  it("treats today and the next 14 days as due soon", () => {
    expect(deriveUrgency("2026-08-03", false, TODAY).urgency).toBe("due-soon");
    expect(deriveUrgency("2026-08-17", false, TODAY).urgency).toBe("due-soon");
  });

  it("treats beyond 14 days as on track", () => {
    expect(deriveUrgency("2026-08-18", false, TODAY).urgency).toBe("on-track");
  });

  // The AI extractor writes obligations with a NULL due date. We must never
  // substitute one, and must never let the row read as compliant.
  it("reports a missing due date as its own state, not as on track", () => {
    expect(deriveUrgency(null, false, TODAY)).toEqual({
      urgency: "no-date",
      daysFromDue: null,
    });
  });

  // The dangerous direction: an unreadable date used to fall through every
  // comparison and land on on-track, which renders green.
  it("treats an unreadable due date as unknown, never as on track", () => {
    expect(deriveUrgency("not a date", false, TODAY)).toEqual({
      urgency: "no-date",
      daysFromDue: null,
    });
    expect(deriveUrgency("2026-02-30", false, TODAY).urgency).toBe("no-date");
  });

  it("reports a datetime that has already passed as overdue", () => {
    expect(deriveUrgency("2026-07-01T00:00:00Z", false, TODAY)).toEqual({
      urgency: "overdue",
      daysFromDue: -33,
    });
  });

  it("closes out regardless of date", () => {
    expect(deriveUrgency("2026-07-01", true, TODAY).urgency).toBe("closed");
    expect(deriveUrgency(null, true, TODAY).urgency).toBe("closed");
  });
});

describe("buildObligationRows", () => {
  it("carries the document context and ids through", () => {
    const [row] = buildObligationRows("42", "Main Contract.pdf", [obligation()], TODAY);
    expect(row).toMatchObject({
      key: "obligation-1",
      source: "obligation",
      context: "Main Contract.pdf",
      documentId: "42",
      obligationId: "1",
      responsibleRole: "Contractor",
      urgency: "on-track",
    });
  });

  it("marks Completed obligations as closed", () => {
    const [row] = buildObligationRows(
      "42",
      "Main Contract.pdf",
      [obligation({ status: "Completed", dueDate: "2026-01-01" })],
      TODAY,
    );
    expect(row.urgency).toBe("closed");
  });

  // A case difference used to leave a finished obligation reading as overdue
  // forever, because only the exact string "Completed" closed it.
  it("marks a completed obligation closed whatever the casing", () => {
    for (const status of ["completed", "COMPLETE", " Done ", "Closed"]) {
      const [row] = buildObligationRows(
        "42",
        "Main Contract.pdf",
        [obligation({ status, dueDate: "2026-01-01" })],
        TODAY,
      );
      expect(row.urgency).toBe("closed");
    }
  });

  it("leaves an obligation with an unrecognised status open", () => {
    const [row] = buildObligationRows(
      "42",
      "Main Contract.pdf",
      [obligation({ status: "awaiting_review", dueDate: "2026-01-01" })],
      TODAY,
    );
    expect(row.urgency).toBe("overdue");
  });

  it("keeps an undated obligation undated", () => {
    const [row] = buildObligationRows(
      "42",
      "Main Contract.pdf",
      [obligation({ dueDate: null })],
      TODAY,
    );
    expect(row.dueDate).toBeNull();
    expect(row.urgency).toBe("no-date");
  });

  it("returns nothing when the document has no obligations", () => {
    expect(buildObligationRows("42", "Main Contract.pdf", [], TODAY)).toEqual([]);
  });
});

describe("buildTimeBarRows", () => {
  const bar = (over: Partial<ApiTimeBar> = {}): ApiTimeBar => ({
    id: 7,
    label: "Notice of delay",
    contract_form: "JBCC",
    clause_ref: "23.1",
    clause_verified: true,
    deadline_date: "2026-08-10",
    days_remaining: 7,
    status: "open",
    ...over,
  });

  it("uses the server's days_remaining rather than recomputing", () => {
    const [row] = buildTimeBarRows([bar({ days_remaining: -2 })], TODAY);
    expect(row.urgency).toBe("overdue");
    expect(row.daysFromDue).toBe(-2);
  });

  it("closes a served bar", () => {
    const [row] = buildTimeBarRows([bar({ status: "served" })], TODAY);
    expect(row.urgency).toBe("closed");
    expect(row.daysFromDue).toBeNull();
  });

  it("preserves clause verification so an unverified clause can be flagged", () => {
    const [row] = buildTimeBarRows([bar({ clause_verified: false })], TODAY);
    expect(row.clauseVerified).toBe(false);
  });

  // A status we do not recognise used to close the bar outright, so a rename
  // on the backend would report every notice deadline on the project as dealt
  // with and the page as 0 overdue.
  it("keeps a bar with an unrecognised status open and counting", () => {
    for (const status of ["active", "OPEN", "", "pending_service"]) {
      const [row] = buildTimeBarRows([bar({ status, days_remaining: -2 })], TODAY);
      expect(row.urgency).toBe("overdue");
      expect(row.daysFromDue).toBe(-2);
    }
  });

  it("counts an open bar with no days_remaining from its deadline date", () => {
    const [row] = buildTimeBarRows(
      [bar({ days_remaining: null, deadline_date: "2026-07-30" })],
      TODAY,
    );
    expect(row.urgency).toBe("overdue");
    expect(row.daysFromDue).toBe(-4);
  });

  it("reports an open bar with no usable date as undated, not as a countdown", () => {
    const [row] = buildTimeBarRows(
      [bar({ days_remaining: null, deadline_date: null })],
      TODAY,
    );
    expect(row.urgency).toBe("no-date");
    expect(row.daysFromDue).toBeNull();
  });
});

describe("urgencyLabel", () => {
  const row = (over: Partial<ComplianceRow>): ComplianceRow => ({
    key: "k",
    source: "time-bar",
    title: "Notice of delay",
    context: "JBCC",
    dueDate: null,
    status: "open",
    urgency: "on-track",
    daysFromDue: 30,
    ...over,
  });

  it("states the days when it has them", () => {
    expect(urgencyLabel(row({ urgency: "on-track", daysFromDue: 30 }))).toBe("30d left");
    expect(urgencyLabel(row({ urgency: "due-soon", daysFromDue: 3 }))).toBe("3d left");
    expect(urgencyLabel(row({ urgency: "overdue", daysFromDue: -4 }))).toBe("4d overdue");
  });

  // The badge is the whole message on a row. It must never print "nulld left"
  // or "NaNd left" at a user, whatever the backend sent.
  it("never prints null or NaN", () => {
    const cases: ComplianceRow[] = [
      row({ urgency: "on-track", daysFromDue: null }),
      row({ urgency: "due-soon", daysFromDue: null }),
      row({ urgency: "overdue", daysFromDue: null }),
      row({ urgency: "no-date", daysFromDue: null }),
      row({ urgency: "on-track", daysFromDue: NaN }),
      row({ urgency: "closed", daysFromDue: null, status: "" }),
    ];
    for (const c of cases) {
      const label = urgencyLabel(c);
      expect(label).not.toMatch(/null|NaN|undefined/);
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it("shows the backend status verbatim on a closed row", () => {
    expect(urgencyLabel(row({ urgency: "closed", status: "served" }))).toBe("served");
  });
});

describe("summariseLoadIssues", () => {
  it("is quiet when everything loaded", () => {
    expect(summariseLoadIssues({})).toEqual({ level: "none" });
  });

  // The defect this exists for: an outage rendering as a clean bill of health.
  it("reports both sources failing as a total failure", () => {
    const issue = summariseLoadIssues({ documentsFailed: true, timeBarsFailed: true });
    expect(issue.level).toBe("total");
    if (issue.level === "none") throw new Error("expected a message");
    expect(issue.message).toContain("Neither this project's documents nor its notice deadlines");
    expect(issue.message).toContain("not a statement that there is nothing outstanding");
  });

  it("reports one failed source as partial, and names it", () => {
    const issue = summariseLoadIssues({ timeBarsFailed: true });
    expect(issue.level).toBe("partial");
    if (issue.level === "none") throw new Error("expected a message");
    expect(issue.message).toContain("notice deadlines");
    expect(issue.message).toContain("incomplete");
  });

  // Three failures out of fifty leaves a list that looks complete.
  it("reports partially failed obligation queries with the numbers", () => {
    const issue = summariseLoadIssues({
      failedObligationDocuments: 3,
      totalObligationDocuments: 50,
    });
    expect(issue.level).toBe("partial");
    if (issue.level === "none") throw new Error("expected a message");
    expect(issue.message).toContain("3 of 50 documents");
  });

  it("reports documents the endpoint did not return, so truncation is never silent", () => {
    const issue = summariseLoadIssues({ undeliveredDocuments: 27 });
    expect(issue.level).toBe("partial");
    if (issue.level === "none") throw new Error("expected a message");
    expect(issue.message).toContain("27 documents");
  });
});

describe("summariseCompliance", () => {
  it("counts each state and totals them", () => {
    const rows = [
      ...buildObligationRows("1", "A", [obligation({ _id: "a", dueDate: "2026-07-01" })], TODAY),
      ...buildObligationRows("1", "A", [obligation({ _id: "b", dueDate: "2026-08-05" })], TODAY),
      ...buildObligationRows("1", "A", [obligation({ _id: "c", dueDate: null })], TODAY),
      ...buildObligationRows("1", "A", [obligation({ _id: "d", dueDate: "2026-12-01" })], TODAY),
      ...buildObligationRows("1", "A", [obligation({ _id: "e", status: "Completed" })], TODAY),
    ];
    expect(summariseCompliance(rows)).toEqual({
      overdue: 1,
      dueSoon: 1,
      noDate: 1,
      onTrack: 1,
      closed: 1,
      total: 5,
    });
  });

  it("is all zeroes with no rows, so the empty state is reachable", () => {
    expect(summariseCompliance([])).toEqual({
      overdue: 0,
      dueSoon: 0,
      noDate: 0,
      onTrack: 0,
      closed: 0,
      total: 0,
    });
  });
});

describe("sortComplianceRows", () => {
  it("puts the worst first and the soonest first within a band", () => {
    const rows = buildObligationRows(
      "1",
      "A",
      [
        obligation({ _id: "on", title: "On track", dueDate: "2026-12-01" }),
        obligation({ _id: "nd", title: "No date", dueDate: null }),
        obligation({ _id: "od1", title: "Overdue a week", dueDate: "2026-07-27" }),
        obligation({ _id: "od2", title: "Overdue a month", dueDate: "2026-07-03" }),
        obligation({ _id: "soon", title: "Due soon", dueDate: "2026-08-06" }),
        obligation({ _id: "done", title: "Done", status: "Completed" }),
      ],
      TODAY,
    );
    expect(sortComplianceRows(rows).map(r => r.title)).toEqual([
      "Overdue a month",
      "Overdue a week",
      "Due soon",
      "No date",
      "On track",
      "Done",
    ]);
  });

  // With one row an in-place sort passes trivially. The input is deliberately
  // in an order the sort is guaranteed to change.
  it("does not mutate the input", () => {
    const rows = buildObligationRows(
      "1",
      "A",
      [
        obligation({ _id: "on", title: "On track", dueDate: "2026-12-01" }),
        obligation({ _id: "done", title: "Done", status: "Completed" }),
        obligation({ _id: "od", title: "Overdue", dueDate: "2026-07-03" }),
        obligation({ _id: "soon", title: "Due soon", dueDate: "2026-08-06" }),
      ],
      TODAY,
    );
    const before = rows.map(r => r.title);
    expect(before).toEqual(["On track", "Done", "Overdue", "Due soon"]);

    const sorted = sortComplianceRows(rows);
    expect(sorted.map(r => r.title)).toEqual(["Overdue", "Due soon", "On track", "Done"]);
    expect(rows.map(r => r.title)).toEqual(before);
    expect(sorted).not.toBe(rows);
  });
});

describe("filterComplianceRows", () => {
  const rows: ComplianceRow[] = [
    ...buildObligationRows("1", "Main Contract.pdf", [obligation()], TODAY),
    ...buildTimeBarRows(
      [
        {
          id: 7,
          label: "Notice of delay",
          contract_form: "JBCC",
          clause_ref: "23.1",
          clause_verified: true,
          deadline_date: "2026-08-10",
          days_remaining: 7,
          status: "open",
        },
      ],
      TODAY,
    ),
  ];

  it("returns everything for an empty term", () => {
    expect(filterComplianceRows(rows, "   ")).toHaveLength(2);
  });

  it("matches title, document name, clause and responsible role", () => {
    expect(filterComplianceRows(rows, "programme")).toHaveLength(1);
    expect(filterComplianceRows(rows, "main contract")).toHaveLength(1);
    expect(filterComplianceRows(rows, "23.1")).toHaveLength(1);
    expect(filterComplianceRows(rows, "contractor")).toHaveLength(1);
  });

  it("returns nothing when there is no match, so the search empty state shows", () => {
    expect(filterComplianceRows(rows, "retention")).toEqual([]);
  });
});
