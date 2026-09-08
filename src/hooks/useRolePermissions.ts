/**
 * Data layer for the Roles & Permissions page.
 *
 * Everything here is the real permission table. The page used to run on
 * `lib/rolesPermissionsMock.ts`, which invented 109 permission codes from the
 * Help pages' *actions*; the backend has 49 real ones and those win. The Help
 * vocabulary now lives on the permission rows themselves — `subgroup` is the
 * sub-part heading, `label` is the action, `description` says when it applies —
 * so the page reads presentation from the API instead of shipping a copy of it.
 *
 * Scope: this page writes PROJECT overrides only. Every save carries a
 * project_id, so a mistake reaches one contract and the reset endpoint undoes
 * it. Organisation-wide defaults are still edited in the older Settings page
 * until that capability lands here.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, fetchData, patchData, postData, putData } from "@/lib/Api";

/* ── Shapes the API returns ─────────────────────────────────────────────── */

export interface ApiPermission {
  id: number;
  code: string;
  /** Stable key for the area — "task", "finance". Display name is a UI concern. */
  group: string;
  /** The sub-part heading, e.g. "VO — Variation Order". */
  subgroup: string;
  label: string;
  description: string;
  is_system: boolean;
  /** False means account-wide: it cannot be overridden for one project. */
  is_project_scoped: boolean;
}

export interface ApiRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  organization: number | null;
  is_active: boolean;
}

/** A code absent from a layer was never set there — which is not the same as false. */
export type LayerMap = Record<string, boolean>;

export interface RoleMatrix {
  role: ApiRole;
  /** Global merged with org. Kept for the older Settings page; prefer `layers`. */
  orgMatrix: LayerMap;
  projectOverrides: LayerMap;
  layers: { global: LayerMap; org: LayerMap; project: LayerMap };
  updatedBy: Record<string, { by: string | null; at: string | null }>;
}

/* ── Reads ──────────────────────────────────────────────────────────────── */

/**
 * Every permission the system defines, with its grouping and wording.
 *
 * Pass the current project id when known — the backend accepts settings.view
 * OR roles.view/roles.edit (account-wide or project-scoped) here, and a
 * project-scoped grant needs project_id on the request to be seen at all.
 */
export function usePermissionCatalogue(projectId?: string | number | null) {
  return useQuery<ApiPermission[]>({
    queryKey: ["permission-catalogue", projectId ?? null],
    // The catalogue only changes on deploy, so it does not need re-fetching
    // while someone works through a role.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const raw = await fetchData(projectId ? `permissions/?project_id=${projectId}` : "permissions/");
      return (Array.isArray(raw) ? raw : raw?.results ?? []) as ApiPermission[];
    },
  });
}

/**
 * System roles plus this organisation's own custom ones.
 *
 * projectId is optional and purely for the backend's permission GATE, not a
 * filter on which roles come back — a caller whose global role lacks
 * settings.view/edit but who is the given project's own Administrator can
 * still be let in via their project-scoped role. See
 * permissions/views.py::RoleViewSet._check_view_permission.
 */
export function useRoles(projectId?: string | number | null) {
  return useQuery<ApiRole[]>({
    queryKey: ["roles", projectId ?? null],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const qs = projectId ? `?project_id=${projectId}` : "";
      const raw = await fetchData(`permissions/roles/${qs}`);
      return (Array.isArray(raw) ? raw : raw?.results ?? []) as ApiRole[];
    },
  });
}

/** One role's three layers, for one project. */
export function useRoleMatrix(roleId: number | null, projectId: string | undefined) {
  return useQuery<RoleMatrix>({
    queryKey: ["role-matrix", roleId, projectId ?? null],
    enabled: roleId != null && !!projectId,
    queryFn: async () =>
      (await fetchData(
        `permissions/roles/${roleId}/matrix/?project_id=${projectId}`,
      )) as RoleMatrix,
  });
}

/* ── Resolution ─────────────────────────────────────────────────────────── */

export type Layer = "global" | "org" | "project";

export interface Resolution {
  /** What the role can actually do, after all three layers. */
  effective: boolean;
  /** Which layer produced that answer. */
  origin: Layer;
  global: boolean | null;
  org: boolean | null;
  project: boolean | null;
  /** True when a later layer reverses what an earlier one had set. */
  conflict: boolean;
}

/**
 * Walk the layers the way the backend does: last one SET wins.
 *
 * Mirrors permissions/core.py::_compute_effective_permissions deliberately.
 * It is a duplicate, which is normally the thing to avoid — but it is a
 * duplicate of the *display*, not the enforcement. The server still decides;
 * this only explains the answer the server already gave.
 */
export function resolveFromLayers(matrix: RoleMatrix | undefined, code: string): Resolution {
  const g = matrix?.layers?.global?.[code];
  const o = matrix?.layers?.org?.[code];
  const p = matrix?.layers?.project?.[code];

  const global = g === undefined ? null : g;
  const org = o === undefined ? null : o;
  const project = p === undefined ? null : p;

  let effective = global === true;
  let origin: Layer = "global";
  if (org !== null) {
    effective = org;
    origin = "org";
  }
  if (project !== null) {
    effective = project;
    origin = "project";
  }

  const conflict =
    (project !== null && global !== null && project !== global) ||
    (org !== null && global !== null && org !== global && project === null);

  return { effective, origin, global, org, project, conflict };
}

/* ── Writes ─────────────────────────────────────────────────────────────── */

export interface MatrixSave {
  roleId: number;
  projectId: string;
  /** Only what changed. Sending the untouched 49 would stamp every row. */
  changes: Array<{ code: string; granted: boolean }>;
}

export function useSaveRoleMatrix() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, projectId, changes }: MatrixSave) =>
      putData({
        url: `permissions/roles/${roleId}/matrix/`,
        data: { project_id: Number(projectId), permissions: changes },
      }),
    onSuccess: (_data, { roleId, projectId }) => {
      qc.invalidateQueries({ queryKey: ["role-matrix", roleId, projectId] });
      // What this user may do can change as a result of what they just saved.
      qc.invalidateQueries({ queryKey: ["effective-perms"] });
      // A surface just hidden or revealed changes how many unreads the
      // bell/sidebar should be counting — see unread_summary's permission
      // filter on the backend.
      qc.invalidateQueries({ queryKey: ["unread-summary"] });
      // Per-document userPermissions (canEdit/canDelete/canUploadVersion)
      // are embedded in the document list/detail responses — an open
      // Documents page needs a refetch too, or its Edit/Delete controls
      // keep reflecting the permission that was just changed here.
      qc.invalidateQueries({ queryKey: ["document"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

/**
 * Clear this ROLE's overrides on this project, putting it back on the
 * organisation's defaults.
 *
 * The endpoint is per-role and rejects a call without `?role=` — it is not a
 * whole-project reset, despite the URL reading like one.
 */
export function useResetProjectOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, roleId }: { projectId: string; roleId: number }) =>
      postData({
        url: `permissions/project/${projectId}/reset/?role=${roleId}`,
        data: {},
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-matrix"] });
      qc.invalidateQueries({ queryKey: ["effective-perms"] });
    },
  });
}

/* ── Custom roles ───────────────────────────────────────────────────────── */

/**
 * Roles are organisation-scoped objects, not project-scoped: a role created
 * here appears on every project the organisation runs. That is worth saying in
 * the UI, because the rest of this page is deliberately project-only.
 */
export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) =>
      postData({ url: "permissions/roles/", data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

/**
 * Rename a role or change its description.
 *
 * The API only accepts `description` on system roles — their name and code are
 * part of the product. The UI offers this on custom roles only, so that
 * restriction never has to surface as an error.
 */
export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; description?: string }) =>
      patchData({ url: `permissions/roles/${id}/`, data }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      // The matrix response embeds the role, so its name is stale otherwise.
      qc.invalidateQueries({ queryKey: ["role-matrix", id] });
    },
  });
}

/** Who holds a role, and what deleting it would take with it. */
export interface RoleHolders {
  role: ApiRole;
  /** People whose ACCOUNT-level role is this one. */
  accountUsers: Array<{ id: number; name: string; email: string }>;
  /** Project memberships holding this role, across every project. */
  memberships: Array<{
    id: number;
    userId: number;
    name: string;
    projectId: number;
    projectName: string | null;
  }>;
  /** Tuning that cascades away with the role. */
  orgOverrides: number;
  projectOverrides: number;
}

/**
 * Fetched when the delete dialog opens, not with the role list.
 *
 * It is two extra queries per role and only ever matters at the moment
 * somebody is about to delete one — loading it for all 30 up front would be
 * 60 queries to answer a question nobody asked.
 */
export function useRoleHolders(
  roleId: number | null,
  enabled: boolean,
  projectId?: string | number | null,
) {
  return useQuery<RoleHolders>({
    queryKey: ["role-holders", roleId, projectId ?? null],
    enabled: roleId != null && enabled,
    // Always re-read: someone may have joined the project since it was last seen,
    // and this number is about to justify a destructive action.
    staleTime: 0,
    queryFn: async () => {
      // projectId is for the backend's permission gate only (see useRoles'
      // comment) — the response still reports holders across every project.
      const qs = projectId ? `?project_id=${projectId}` : "";
      return (await fetchData(`permissions/roles/${roleId}/holders/${qs}`)) as RoleHolders;
    },
  });
}

/** What to do with anyone holding the role being deleted. */
export type OnHolders =
  | { mode: "none" }
  | { mode: "reassign"; targetRoleId: number }
  | { mode: "remove" };

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, onHolders }: { id: number; onHolders: OnHolders }) => {
      let qs = "";
      if (onHolders.mode === "reassign") {
        qs = `?on_holders=reassign&target=${onHolders.targetRoleId}`;
      } else if (onHolders.mode === "remove") {
        qs = "?on_holders=remove";
      }
      return deleteData({ url: `permissions/roles/${id}/${qs}`, data: {} });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      // Reassigning changes who is on a project and under which role.
      qc.invalidateQueries({ queryKey: ["project-role-holders"] });
      qc.invalidateQueries({ queryKey: ["effective-perms"] });
    },
  });
}

/**
 * Copy any role — including a system one — into a new custom role.
 *
 * Server-side, so it is one transaction and the client never has to hold the
 * source matrix. Copying from a system role is the common case: "like Quantity
 * Surveyor but without payment approval" is how people build a role, and it
 * beats starting from 49 switches set to off.
 */
export function useDuplicateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, code }: { id: number; name: string; code?: string }) =>
      postData({
        url: `permissions/roles/${id}/duplicate/`,
        data: code ? { name, code } : { name },
      }) as Promise<ApiRole & { copiedPermissions: number }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}
