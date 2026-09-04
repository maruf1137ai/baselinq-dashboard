/**
 * The task document header must name people by their PROJECT role.
 *
 * The `tasks/tasks/{id}/` payload describes the same people twice and the two
 * copies disagree. The wrapper (`assignedBy` / `assignedTo` / `responseBy`)
 * carries `user.role.name` — the organisation role. The nested task
 * (`task.task.assigned_to` / `cc_users`) carries the role from
 * `ProjectTeamMember` for that task's project. A task belongs to one project,
 * so the project answer is the correct one, and these tests pin that choice.
 *
 * The divergence is real, not theoretical: in the dev data one member of
 * project 45 is an "Administrator" on the project and a "Consultant Quantity
 * Surveyor" at organisation level. The fixtures below use that exact pair.
 */
import { describe, expect, it } from "vitest";

import {
  buildMemberIndex,
  resolveHeaderPeople,
} from "@/lib/taskHeaderPeople";

/** A `projects/{id}/team-members/` row, trimmed to the fields that matter. */
const TEAM = [
  {
    userId: "45",
    user: { id: 45, name: "Architect", email: "architect@example.com", role: { name: "Consultant Quantity Surveyor" } },
    roleName: "Administrator", // the PROJECT role
    orgRoleName: "Consultant Quantity Surveyor",
  },
  {
    userId: "51",
    user: { id: 51, name: "test maruf", email: "maruf@example.com" },
    roleName: "Quantity Surveyor",
    orgRoleName: "Quantity Surveyor",
  },
];

/** The shape the API actually returns, with both copies of the same people. */
function payload(overrides: any = {}) {
  return {
    taskType: "RFI",
    assignedBy: { userId: "45", name: "Architect", role: "Consultant Quantity Surveyor" },
    assignedTo: [{ userId: "51", name: "test maruf", role: "Consultant Quantity Surveyor" }],
    responseBy: [{ userId: "51", name: "test maruf", role: "Consultant Quantity Surveyor" }],
    task: {
      task: {
        assignedByUserId: "45",
        assigned_to: [{ id: 51, name: "test maruf", email: "maruf@example.com", role: "Quantity Surveyor" }],
        cc_users: [{ id: 51, name: "test maruf", email: "maruf@example.com", role: "Quantity Surveyor" }],
      },
      ...overrides.task,
    },
    ...overrides,
  };
}

describe("buildMemberIndex", () => {
  it("indexes by user id and prefers the project role", () => {
    const index = buildMemberIndex(TEAM);
    expect(index["45"].role).toBe("Administrator");
    expect(index["45"].name).toBe("Architect");
  });

  it("falls back to the org role when the project role is blank", () => {
    const index = buildMemberIndex([
      { userId: "9", user: { name: "Nobody" }, roleName: "   ", orgRoleName: "Architect" },
    ]);
    expect(index["9"].role).toBe("Architect");
  });

  it("skips rows with no resolvable user id rather than keying on undefined", () => {
    expect(buildMemberIndex([{ user: {} }, null, undefined] as any)).toEqual({});
  });

  it("tolerates a missing list", () => {
    expect(buildMemberIndex(undefined)).toEqual({});
  });
});

describe("resolveHeaderPeople", () => {
  const index = buildMemberIndex(TEAM);

  it("resolves From through the project team, not the wrapper's org role", () => {
    const { from } = resolveHeaderPeople(payload(), index);
    expect(from.name).toBe("Architect");
    expect(from.role).toBe("Administrator");
    expect(from.role).not.toBe("Consultant Quantity Surveyor");
  });

  it("takes To and CC from the nested task, which carries the project role", () => {
    const { to, cc } = resolveHeaderPeople(payload(), index);
    expect(to.map((u) => u.role)).toEqual(["Quantity Surveyor"]);
    expect(cc.map((u) => u.role)).toEqual(["Quantity Surveyor"]);
  });

  it("stamps both id keys, so existing readers keep matching", () => {
    // The reply recipient picker matches on `userId`; the nested chips only
    // carry `id`. Dropping one of them silently breaks that filter.
    const { to } = resolveHeaderPeople(payload(), index);
    expect(String(to[0].id)).toBe("51");
    expect(String(to[0].userId)).toBe("51");
  });

  it("falls back to the wrapper when the nested lists are empty", () => {
    // An empty nested list is ambiguous — `task_to_representation` yields []
    // both when nobody is assigned and when its own lookup throws. Falling
    // back means this can never show FEWER people than before.
    const { to, cc } = resolveHeaderPeople(
      payload({ task: { task: { assignedByUserId: "45", assigned_to: [], cc_users: [] } } }),
      index,
    );
    expect(to).toHaveLength(1);
    expect(cc).toHaveLength(1);
    expect(to[0].role).toBe("Consultant Quantity Surveyor"); // the org label, knowingly
  });

  it("falls back to the wrapper's org data for someone off the project team", () => {
    // A historical document whose author has since been removed. A stale role
    // beats a blank chip.
    const { from } = resolveHeaderPeople(payload(), buildMemberIndex([]));
    expect(from.name).toBe("Architect");
    expect(from.role).toBe("Consultant Quantity Surveyor");
  });

  it("handles a payload with no nested task at all", () => {
    const { from, to, cc } = resolveHeaderPeople(
      {
        assignedBy: { userId: "45", name: "Architect", role: "Consultant Quantity Surveyor" },
        assignedTo: [{ userId: "51", name: "test maruf", role: "QS" }],
        responseBy: [],
      },
      index,
    );
    expect(from.name).toBe("Architect");
    expect(to).toHaveLength(1);
    expect(cc).toHaveLength(0);
  });

  it("does not throw on an empty or missing payload", () => {
    expect(() => resolveHeaderPeople(null, index)).not.toThrow();
    expect(resolveHeaderPeople(null, index).to).toEqual([]);
    expect(resolveHeaderPeople({}, {}).from.name).toBe("");
  });

  it("reads cc from response_by / ccUsers / cc_users spellings too", () => {
    const { cc } = resolveHeaderPeople(
      { response_by: [{ userId: "51", name: "test maruf", role: "QS" }] },
      index,
    );
    expect(cc).toHaveLength(1);
  });
});
