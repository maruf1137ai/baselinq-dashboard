/**
 * Who a task document is from, to and copied to — resolved against the PROJECT.
 *
 * Pure functions over the `tasks/tasks/{id}/` payload, so the rules can be
 * tested without mounting TaskDetails — the same split `src/lib/homeSignals.ts`
 * uses for the homepage.
 *
 * ── The bug these rules exist to fix ──────────────────────────────────────
 *
 * The payload describes the same people twice, and the two copies disagree
 * about their ROLE:
 *
 *   WRAPPER   `assignedBy`, `assignedTo`, `responseBy` — built from
 *             `user.role.name`, the ORGANISATION role.
 *   NESTED    `task.task.assigned_to`, `task.task.cc_users` — built by
 *             `_user_chip`, which looks the user up in `ProjectTeamMember`
 *             for this task's project and only falls back to the org role
 *             when that member has no project role set.
 *
 * (Both in `tasks/serializers.py`.) A task document belongs to one project, so
 * the project answer is the correct one. On a real project in the dev data,
 * one member is an "Administrator" on the project and a "Consultant Quantity
 * Surveyor" at organisation level — the header was printing the second on a
 * contractual document governed by the first.
 *
 * `assignedByUserId` is only an id, so "From" is resolved through a project
 * team index rather than read off a chip.
 *
 * ── Why the fallbacks are shaped the way they are ─────────────────────────
 *
 * The nested lists are preferred only when NON-EMPTY. `task_to_representation`
 * catches its own exceptions and yields `[]`, so an empty nested list is
 * ambiguous: it means either "nobody is assigned" or "that lookup threw".
 * Falling back on empty means this can only ever show the same people as
 * before, or the better-labelled version of them — never fewer.
 *
 * Someone who has since left the project team is absent from the index, and
 * "From" falls back to the wrapper's organisation data. A stale role beats a
 * blank chip on a historical document.
 */

/** One person as the task header renders them. */
export interface HeaderPerson {
  /** Present under both keys: nested chips use `id`, wrapper chips use `userId`. */
  id: string | number | null;
  userId: string | number | null;
  name: string;
  role: string;
  email?: string;
}

/** What a project team member contributes to the index. */
export interface MemberIdentity {
  name: string;
  role: string;
  email: string;
}

export type MemberIndex = Record<string, MemberIdentity>;

/**
 * Index a `projects/{id}/team-members/` payload by user id.
 *
 * `roleName` is `ProjectTeamMember.role` — the project role, and the field
 * this whole module exists to prefer. `orgRoleName` and the rest are fallbacks
 * for a membership whose project role was never filled in.
 */
export function buildMemberIndex(members: any[] | null | undefined): MemberIndex {
  const index: MemberIndex = {};
  for (const m of members ?? []) {
    const id = String(m?.userId ?? m?.user_id ?? m?.user?.id ?? "");
    if (!id) continue;
    index[id] = {
      name: m.user?.name || m.user?.email || m.name || "",
      role:
        (m.roleName || "").trim() ||
        m.orgRoleName ||
        m.orgRoleInfo?.name ||
        m.user?.role?.name ||
        "",
      email: m.user?.email || m.email || "",
    };
  }
  return index;
}

/** Stamp both id keys so existing readers keep matching on whichever they use. */
function withBothIdKeys(list: any[]): HeaderPerson[] {
  return (list ?? []).map((u: any) => ({
    ...u,
    id: u?.id ?? u?.userId ?? null,
    userId: u?.userId ?? u?.id ?? null,
    name: u?.name ?? "",
    role: u?.role ?? "",
  }));
}

export interface HeaderPeople {
  from: HeaderPerson;
  to: HeaderPerson[];
  cc: HeaderPerson[];
}

/**
 * Resolve the From / To / CC lines of a task document header.
 *
 * `apiResponse` is the `tasks/tasks/{id}/` body; `index` comes from
 * `buildMemberIndex`. Both are tolerated as empty — an older payload with no
 * nested task, or a team list that has not loaded yet, degrades to exactly the
 * behaviour that shipped before this module existed.
 */
export function resolveHeaderPeople(
  apiResponse: any,
  index: MemberIndex,
): HeaderPeople {
  const task = apiResponse?.task || {};
  const nested = task?.task || {};

  const nestedTo = Array.isArray(nested.assigned_to) ? nested.assigned_to : [];
  const nestedCc = Array.isArray(nested.cc_users) ? nested.cc_users : [];

  const wrapperTo = Array.isArray(apiResponse?.assignedTo) ? apiResponse.assignedTo : [];
  const wrapperCc =
    apiResponse?.responseBy ||
    apiResponse?.response_by ||
    apiResponse?.ccUsers ||
    apiResponse?.cc_users ||
    [];

  const to = withBothIdKeys(nestedTo.length > 0 ? nestedTo : wrapperTo);
  const cc = withBothIdKeys(nestedCc.length > 0 ? nestedCc : wrapperCc);

  const assignedBy = apiResponse?.assignedBy;
  const assignedByUserId = nested.assignedByUserId ?? null;
  const member = assignedByUserId ? index[String(assignedByUserId)] : undefined;

  const from: HeaderPerson = {
    id: assignedByUserId ?? assignedBy?.userId ?? task.createdBy?.userId ?? task.issuedBy?.userId ?? null,
    userId: assignedByUserId ?? assignedBy?.userId ?? task.createdBy?.userId ?? task.issuedBy?.userId ?? null,
    name:
      member?.name ||
      assignedBy?.name ||
      task.issuedBy?.name ||
      task.createdBy?.name ||
      task.raisedBy?.name ||
      task.submittedBy?.name ||
      "",
    role:
      member?.role ||
      assignedBy?.role ||
      task.issuedBy?.role ||
      task.createdBy?.role ||
      "",
  };

  return { from, to, cc };
}
