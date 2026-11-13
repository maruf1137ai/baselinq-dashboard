/**
 * QA BUG-10: the Audit page showed 0% and an empty trail on a project with
 * 163 tasks. It read `{ results }` from an endpoint that returns `{ tasks }`,
 * read fields the payload does not have, and took its trail from a route that
 * does not exist.
 */
import { describe, expect, it } from "vitest";

import { buildAuditTrail, buildCompliance, taskCodeOf, tasksFrom } from "@/lib/auditCompliance";

const NOW = new Date("2026-10-27T10:00:00Z");

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

describe("buildCompliance", () => {
  it("scores over the real tasks — not 0% over nothing", () => {
    const c = buildCompliance([vo, rfi], NOW);
    expect(c.totalTasks).toBe(2);
    expect(c.compliantTasks).toBe(1);
    expect(c.score).toBe(50);
  });

  it("labels deadline rows with the document's own number and assignee", () => {
    const c = buildCompliance([vo, rfi], NOW);
    const r = c.deadlines.find((d) => d.taskType === "RFI")!;
    expect(r.taskNumber).toBe("RFI-006");
    expect(r.taskId).toBe("12");
    expect(r.assignedTo).toBe("Unassigned");
    // Raised 20 Oct, 5-day response window → overdue on 27 Oct.
    expect(r.daysRemaining).toBeLessThan(0);
    expect(c.overdueItems).toBe(1);
    expect(c.deadlines.find((d) => d.taskType === "VO")!.assignedTo).toBe("Test CM");
  });

  it("falls back to TYPE-id when a document has no number", () => {
    expect(taskCodeOf({ taskId: "7", taskType: "SI", task: {} })).toBe("SI-007");
  });
});

describe("buildAuditTrail", () => {
  it("turns task-audit rows into readable, typed entries", () => {
    const trail = buildAuditTrail(
      [
        { taskId: 345, action: "other", description: "Signed and issued by Swapnil", createdByName: "Swapnil", createdAt: "2026-10-27T09:00:00Z" },
        { taskId: 12, action: "status_updated", description: "Status changed from Draft to Sent", createdByName: "Test PM", createdAt: "2026-10-27T10:00:00Z" },
      ],
      [vo, rfi],
    );
    expect(trail[0]).toMatchObject({ taskType: "RFI", action: "RFI-006 · Status changed from Draft → Sent" });
    expect(trail[1]).toMatchObject({ taskType: "VO", action: "VO-203 · Swapnil signed and issued by Swapnil" });
    expect(trail.every((t) => !/\bOther\b/.test(t.action))).toBe(true);
  });
});
