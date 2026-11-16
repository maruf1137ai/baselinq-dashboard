/**
 * The Audit page shows only rows the server recorded. It used to invent
 * "Created"/"Completed" entries signed "System", score compliance against
 * made-up JBCC periods, and write an unescaped CSV.
 */
import { describe, expect, it } from "vitest";

import * as auditTrail from "@/lib/auditTrail";
import {
  PROJECT_TRAIL_LIMIT,
  buildAuditTrail,
  csvCell,
  isTrailCapped,
  taskCodeOf,
  tasksFrom,
  trailToCsv,
} from "@/lib/auditTrail";

// The real `projects/<id>/tasks/` row shape.
const vo = {
  taskId: "345", taskType: "VO", status: "done", created_at: "2026-10-01T00:00:00Z",
  assignedTo: [{ name: "Test CM" }], task: { voNumber: "VO-203", title: "Basement" },
};
const rfi = {
  taskId: "12", taskType: "RFI", status: "todo", created_at: "2026-10-20T00:00:00Z",
  assignedTo: [], task: { rfiNumber: "RFI-006" },
};

describe("tasksFrom", () => {
  it("reads the { tasks } envelope the endpoint actually returns", () => {
    expect(tasksFrom({ projectId: 47, tasks: [vo, rfi] })).toHaveLength(2);
    expect(tasksFrom({ results: [vo] })).toHaveLength(1);
    expect(tasksFrom(undefined)).toEqual([]);
  });
});

describe("taskCodeOf", () => {
  it("falls back to TYPE-id when a document has no number", () => {
    expect(taskCodeOf({ taskId: "7", taskType: "SI", task: {} })).toBe("SI-007");
  });
});

describe("no invented figures", () => {
  it("no longer exports the made-up JBCC deadline table or a compliance score", () => {
    expect("JBCC_DEADLINES" in auditTrail).toBe(false);
    expect("buildCompliance" in auditTrail).toBe(false);
  });

  it("an empty trail stays empty, whatever tasks exist", () => {
    expect(buildAuditTrail([], [vo, rfi])).toEqual([]);
  });
});

describe("buildAuditTrail", () => {
  it("turns task-audit rows into readable, typed entries, newest first", () => {
    const trail = buildAuditTrail(
      [
        { taskId: 345, action: "other", description: "Signed and issued by Swapnil", createdByName: "Swapnil", createdAt: "2026-10-27T09:00:00Z" },
        { taskId: 12, action: "status_updated", description: "Status changed from Draft to Sent", createdByName: "Test PM", createdAt: "2026-10-27T10:00:00Z" },
      ],
      [vo, rfi],
    );
    expect(trail[0]).toMatchObject({ record: "RFI-006", taskType: "RFI", action: "Status changed from Draft → Sent" });
    expect(trail[1]).toMatchObject({ record: "VO-203", taskType: "VO", action: "Swapnil signed and issued by Swapnil" });
    expect(trail.every((t) => !/\bOther\b/.test(t.action))).toBe(true);
  });

  it("never signs a row with no user as System", () => {
    const [e] = buildAuditTrail(
      [{ taskId: 345, action: "other", description: "Signed and issued", createdByName: null, createdAt: "2026-10-27T09:00:00Z" }],
      [vo],
    );
    expect(e.createdByName).toBeNull();
    expect(e.action).not.toMatch(/System/);
    expect(e.action).toBe("Signed and issued");
  });

  it("leaves the record blank when the task is not in the viewer's list", () => {
    const [e] = buildAuditTrail([{ taskId: 999, action: "created", createdByName: "A", createdAt: "2026-10-27T09:00:00Z" }], [vo]);
    expect(e.record).toBe("");
    expect(e.taskType).toBe("");
  });
});

describe("the server's cap", () => {
  it("is reached at the limit and not before", () => {
    expect(isTrailCapped(new Array(PROJECT_TRAIL_LIMIT - 1).fill({}))).toBe(false);
    expect(isTrailCapped(new Array(PROJECT_TRAIL_LIMIT).fill({}))).toBe(true);
    expect(isTrailCapped(undefined)).toBe(false);
  });
});

describe("CSV", () => {
  it("quotes every cell and doubles inner quotes", () => {
    expect(csvCell('Pour "B", level 2')).toBe('"Pour ""B"", level 2"');
    expect(csvCell(null)).toBe('""');
  });

  it("keeps a line break inside its cell", () => {
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
  });

  it("defuses cells a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+1")).toBe('"\'+1"');
    expect(csvCell("@SUM(A1)")).toBe('"\'@SUM(A1)"');
  });

  it("exports the trail rows, one line each, with a blank user where none was recorded", () => {
    const trail = buildAuditTrail(
      [
        { taskId: 345, action: "other", description: "Signed, and issued", createdByName: null, createdAt: "2026-10-27T09:00:00Z" },
      ],
      [vo],
    );
    const lines = trailToCsv(trail).split("\r\n");
    expect(lines[0]).toBe('"Date and time","Record","Type","Action","Detail","User"');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"VO-203","VO"');
    expect(lines[1].endsWith(',""')).toBe(true);
  });
});
