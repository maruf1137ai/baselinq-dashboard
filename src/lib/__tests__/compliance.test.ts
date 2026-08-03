import { describe, expect, it } from "vitest";
import {
  buildObligationRows,
  buildTimeBarRows,
  daysUntil,
  deriveUrgency,
  filterComplianceRows,
  sortComplianceRows,
  summariseCompliance,
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

  it("does not mutate the input", () => {
    const rows = buildObligationRows("1", "A", [obligation()], TODAY);
    const copy = [...rows];
    sortComplianceRows(rows);
    expect(rows).toEqual(copy);
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
