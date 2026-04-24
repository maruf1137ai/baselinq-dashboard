import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchData, putData } from "@/lib/Api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";

import useFetch from "@/hooks/useFetch";

interface Role {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  organization: number | null;
  is_active: boolean;
}

interface Permission {
  id: number;
  code: string;
  group: string;
  subgroup: string;
  label: string;
  description: string;
  is_system: boolean;
  is_project_scoped: boolean;
}

type Tab = "roles" | "org";

/**
 * Inner content: Roles list + Organisation Matrix, as two sub-tabs.
 */
export function PermissionsContent() {
  return (
    <div className="space-y-6">
      <MatrixTab mode="org" />
    </div>
  );
}

/**
 * Standalone page — full header + content. Used by the sidebar "Roles & Permissions" route.
 */
export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage roles and what each role can do. Changes take effect immediately.
        </p>
      </div>
      <PermissionsContent />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Roles tab
// ──────────────────────────────────────────────────────────────────────────────

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && Array.isArray(v.results)) return v.results as T[];
  return [];
}

export function RolesTab() {
  const { data: rolesRaw, isLoading } = useFetch<Role[] | { results: Role[] }>("permissions/roles/");
  const roles = asArray<Role>(rolesRaw);

  if (isLoading) return <AwesomeLoader message="Loading roles" />;
  const rows = roles.slice().sort((a, b) => (a.is_system === b.is_system ? 0 : a.is_system ? -1 : 1));

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Name</th>
              <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Code</th>
              <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Type</th>
              <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((role) => (
              <tr key={role.id} className="border-t border-border">
                <td className="px-4 py-3">{role.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{role.code ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      role.is_system
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {role.is_system ? "System" : "Custom"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{role.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Matrix tab (shared for org-level defaults and per-project overrides)
// ──────────────────────────────────────────────────────────────────────────────

interface Project {
  id: number;
  name: string;
  project_number?: string;
}

function MatrixTab({ mode }: { mode: "org" }) {
  const { data: rolesRaw } = useFetch<Role[] | { results: Role[] }>("permissions/roles/");
  const { data: permsRaw } = useFetch<Permission[] | { results: Permission[] }>("permissions/");
  const roles = asArray<Role>(rolesRaw);
  const permissions = asArray<Permission>(permsRaw);

  if (roles.length === 0 || permissions.length === 0) return <AwesomeLoader message="Loading matrix" />;

  return <MatrixGrid mode={mode} roles={roles} permissions={permissions} projectId={null} />;
}

function MatrixGrid({
  roles,
  permissions,
}: {
  mode: "org";
  roles: Role[];
  permissions: Permission[];
  projectId: null;
}) {
  // Build grouped list
  const groups = useMemo(() => {
    const byGroup: Record<string, Record<string, Permission[]>> = {};
    const hiddenGroups = ["audit", "compliance", "programme"];

    for (const p of permissions) {
      if (hiddenGroups.includes(p.group.toLowerCase())) continue;
      byGroup[p.group] = byGroup[p.group] ?? {};
      byGroup[p.group][p.subgroup || ""] = byGroup[p.group][p.subgroup || ""] ?? [];
      byGroup[p.group][p.subgroup || ""].push(p);
    }
    return byGroup;
  }, [permissions]);

  const [matrix, setMatrix] = useState<Record<number, Record<string, boolean>>>({});
  const [dirty, setDirty] = useState<Record<number, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      const next: Record<number, Record<string, boolean>> = {};
      await Promise.all(
        roles.map(async (role) => {
          const resp = await fetchData(`permissions/roles/${role.id}/matrix/`);
          next[role.id] = resp.orgMatrix ?? {};
        })
      );
      if (cancelled) return;
      setMatrix(next);
      setDirty({});
      setLoading(false);
    };
    load().catch((e) => {
      console.error(e);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [roles]);

  const effective = (roleId: number, code: string): boolean =>
    matrix[roleId]?.[code] ?? false;

  const handleToggle = (roleId: number, code: string) => {
    const target = !effective(roleId, code);
    setMatrix((prev) => ({
      ...prev,
      [roleId]: { ...(prev[roleId] ?? {}), [code]: target },
    }));
    setDirty((prev) => {
      const next = { ...prev };
      next[roleId] = new Set(next[roleId] ?? []);
      next[roleId].add(code);
      return next;
    });
  };

  const [savingAll, setSavingAll] = useState(false);

  const handleSaveAll = async () => {
    setSavingAll(true);
    const roleIds = Object.keys(dirty).map(Number);
    let successCount = 0;

    for (const roleId of roleIds) {
      const codes = Array.from(dirty[roleId] ?? []);
      if (codes.length === 0) continue;

      try {
        const items = codes.map((code) => ({
          code,
          granted: matrix[roleId]?.[code] ?? false,
        }));
        await putData({
          url: `permissions/roles/${roleId}/matrix/`,
          data: { permissions: items },
        });
        successCount++;
        setDirty((prev) => {
          const next = { ...prev };
          delete next[roleId];
          return next;
        });
      } catch (e: any) {
        const role = roles.find((r) => r.id === roleId);
        toast.error(`Failed to save for ${role?.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully saved changes for ${successCount} role(s)`);
    }
    setSavingAll(false);
  };

  if (loading) return <AwesomeLoader message="Loading matrix" />;

  const dirtyRolesCount = Object.values(dirty).reduce((acc, s) => acc + (s?.size ?? 0), 0);
  const groupEntries = Object.entries(groups);
  const permsInGroup = (g: Record<string, Permission[]>) =>
    Object.values(g).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="space-y-4 pb-24">
      {/* Premium Floating Save Bar */}
      {dirtyRolesCount > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-6 px-6 py-3 bg-white/90 backdrop-blur-md border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-full ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {dirtyRolesCount} unsaved change{dirtyRolesCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs"
                onClick={() => window.location.reload()}
                disabled={savingAll}
              >
                Discard
              </Button>
              <Button
                size="sm"
                className="rounded-full px-6 h-9 shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs font-semibold"
                onClick={handleSaveAll}
                disabled={savingAll}
              >
                {savingAll ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  "Save All Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Accordion type="multiple" className="space-y-2">
        {groupEntries.map(([group, subgroups]) => (
          <AccordionItem
            key={group}
            value={group}
            className="border border-border rounded-lg bg-white overflow-hidden"
          >
            <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium capitalize">{group}</span>
                <span className="text-xs text-muted-foreground">
                  {permsInGroup(subgroups)} permission{permsInGroup(subgroups) === 1 ? "" : "s"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="overflow-auto border-t border-border">
                <table className="text-sm w-full">
                  <thead className="bg-gray-50/80 backdrop-blur-sm">
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 text-left font-normal text-muted-foreground text-xs px-4 py-2.5 min-w-[280px] border-r border-border">
                        <span className="text-foreground font-medium">Permission</span>
                      </th>
                      {roles.map((r) => (
                        <th
                          key={r.id}
                          className="text-center font-normal text-muted-foreground text-xs px-3 py-2.5 min-w-[100px]"
                        >
                          <span className="text-foreground font-medium">{r.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(subgroups).flatMap(([_subgroup, perms]) =>
                      perms.map((perm) => (
                        <tr key={perm.code} className="border-t border-border hover:bg-muted/20">
                          <td className="sticky left-0 z-10 bg-white px-4 py-2 border-r border-border">
                            <div className="flex flex-col">
                              <span className="text-sm">{perm.label}</span>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {perm.code}
                              </span>
                            </div>
                          </td>
                          {roles.map((role) => {
                            const val = effective(role.id, perm.code);
                            return (
                              <td key={role.id} className="text-center px-3 py-2">
                                <Checkbox
                                  checked={val}
                                  onCheckedChange={() => handleToggle(role.id, perm.code)}
                                  className="h-4 w-4"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-xs text-muted-foreground">
        Changes affect all projects in your organisation. Use the "Save" buttons above once you've toggled permissions.
      </p>
    </div>
  );
}
