import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { fetchData, putData, postData, patchData, deleteData } from "@/lib/Api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

import useFetch from "@/hooks/useFetch";

const PERM_DESCRIPTIONS: Record<string, string> = {
  // Settings
  "settings.view": "Can open and read everything in the Settings section (team, roles, permissions, billing)",
  "settings.edit": "Can manage everything in Settings — add/remove team members, edit roles, change permissions, billing, integrations",
  // Documents — upload
  "document.upload.contract":               "Can upload main contract documents",
  "document.upload.contract_agreement":     "Can upload contract agreement documents",
  "document.upload.drawing":                "Can upload architectural and engineering drawings",
  "document.upload.specification":          "Can upload project specifications",
  "document.upload.report":                 "Can upload reports and assessments",
  "document.upload.certificate":            "Can upload general certificates",
  "document.upload.certificate.payment":    "Can upload payment certificates",
  "document.upload.certificate.test":       "Can upload test and inspection certificates",
  "document.upload.certificate.insurance":  "Can upload insurance certificates",
  "document.upload.certificate.compliance": "Can upload compliance certificates",
  // Documents — download
  "document.download.contract":             "Can download contract documents",
  "document.download.contract_agreement":   "Can download contract agreement documents",
  "document.download.certificate.payment":  "Can download payment certificates",
  "document.download.certificate.insurance":"Can download insurance certificates",
  // Documents — status
  "document.status.gate":    "Can lock a document to prevent further changes",
  "document.status.ungate":  "Can unlock a gated document",
  "document.status.archive": "Can archive documents",
  "document.status.restore": "Can restore archived documents",
  // Documents — edit / delete / version
  "document.edit.any":           "Can edit details of any document",
  "document.delete.any":         "Can delete any document",
  "document.delete.unlinked":    "Can delete documents not linked to a task",
  "document.version.upload.any": "Can upload new versions of any document",
  // Documents — findings & AI
  "document.findings.create":      "Can create findings or issues on a document",
  "document.findings.resolve.any": "Can mark findings as resolved",
  "document.ai.retrigger":         "Can re-run AI analysis on a document",
  // Documents — AI chat
  "document.chat.contract":      "Can use AI chat on contract documents",
  "document.chat.drawing":       "Can use AI chat on drawings",
  "document.chat.specification": "Can use AI chat on specifications",
  "document.chat.certificate":   "Can use AI chat on certificates",
  // Tasks — creation
  "task.create":     "Can create tasks (general access gate)",
  "task.vo.create":  "Can create Variation Order (VO) tasks",
  "task.si.create":  "Can create Site Instruction (SI) tasks",
  "task.rfi.create": "Can create Request for Information (RFI) tasks",
  "task.dc.create":  "Can create Delay Claim (DC) tasks",
  "task.cpi.create": "Can create Critical Path Item (CPI) tasks",
  "task.gi.create":  "Can create General Instruction (GI) tasks",
  // Tasks — approval
  "task.vo.recommend": "Can recommend a priced VO to the client for approval",
  "task.vo.approve":   "Can give final sign-off on a recommended VO",
  // Finance
  "finance.view":                      "Can access the Finance module",
  "finance.cost_ledger.view":          "Can open the Cost Ledger tab",
  "finance.cost_ledger.edit":          "Can add and edit cost ledger entries",
  "finance.payment_certificate.view":  "Can open the Payment Certificates tab",
  "finance.payment_certificate.edit":  "Can create and edit payment certificates",
  "finance.variation_order.view":      "Can open the Variation Orders tab",
  "finance.variation_order.edit":      "Can create and edit variation orders",
  // Project
  "project.create": "Can create new projects",
  "project.edit":   "Can edit project details and configuration",
};

// If a parent permission is OFF, its children are meaningless — disable them in the UI
const PERMISSION_PARENTS: Record<string, string> = {
  // settings.edit requires settings.view (edit implies view)
  "settings.edit":  "settings.view",
  // project edit is a settings-level action
  "project.edit":   "settings.view",
  // Finance parent-child
  "finance.cost_ledger.view":         "finance.view",
  "finance.cost_ledger.edit":         "finance.cost_ledger.view",
  "finance.payment_certificate.view": "finance.view",
  "finance.payment_certificate.edit": "finance.payment_certificate.view",
  "finance.variation_order.view":     "finance.view",
  "finance.variation_order.edit":     "finance.variation_order.view",
  // Tasks
  "task.vo.create":    "task.create",
  "task.si.create":    "task.create",
  "task.rfi.create":   "task.create",
  "task.dc.create":    "task.create",
  "task.cpi.create":   "task.create",
  "task.gi.create":    "task.create",
  "task.vo.recommend": "task.create",
  "task.vo.approve":   "task.create",
};

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

/**
 * Inner content: permission matrix.
 */
export function PermissionsContent({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <div className="space-y-6">
      {readOnly && (
        <p className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2">
          You have read-only access to this matrix. Contact an admin to make changes.
        </p>
      )}
      <MatrixTab mode="org" readOnly={readOnly} />
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

interface RoleFormState {
  name: string;
  code: string;
  description: string;
}

const EMPTY_FORM: RoleFormState = { name: "", code: "", description: "" };

export function RolesTab({ canManage = true }: { canManage?: boolean }) {
  const { data: rolesRaw, isLoading, refetch } = useFetch<Role[] | { results: Role[] }>("permissions/roles/");
  const roles = asArray<Role>(rolesRaw);
  const customRoles = roles.filter((r) => !r.is_system);

  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowCreate(true);
  };

  const openEdit = (role: Role) => {
    setForm({ name: role.name, code: role.code ?? "", description: role.description ?? "" });
    setEditingRole(role);
  };

  const closeDialogs = () => {
    setShowCreate(false);
    setEditingRole(null);
    setForm(EMPTY_FORM);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      await postData({
        url: "permissions/roles/",
        data: { name: form.name.trim(), code: form.code.trim() || undefined, description: form.description.trim() },
      });
      toast.success("Custom role created");
      closeDialogs();
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to create role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingRole || !form.name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      await patchData({
        url: `permissions/roles/${editingRole.id}/`,
        data: { name: form.name.trim(), code: form.code.trim() || undefined, description: form.description.trim() },
      });
      toast.success("Role updated");
      closeDialogs();
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      await deleteData({ url: `permissions/roles/${deletingRole.id}/`, data: undefined });
      toast.success("Role deleted");
      setDeletingRole(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <AwesomeLoader message="Loading roles" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Custom roles are specific to your organisation and can be assigned permissions in the matrix above.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="shrink-0">
            + Create Role
          </Button>
        )}
      </div>

      {/* Table */}
      {customRoles.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-foreground">No custom roles yet</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {canManage
              ? "Create a custom role to assign tailored permissions to users in your organisation."
              : "No custom roles have been created for your organisation."}
          </p>
          {canManage && (
            <Button variant="outline" size="sm" onClick={openCreate} className="mt-2">
              + Create your first role
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Name</th>
                <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Code</th>
                <th className="text-left font-normal text-muted-foreground text-xs px-4 py-2.5">Description</th>
                {canManage && <th className="text-right font-normal text-muted-foreground text-xs px-4 py-2.5">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {customRoles.map((role) => (
                <tr key={role.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{role.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {role.code ?? <span className="italic">auto</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{role.description || "—"}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(role)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingRole(role)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) closeDialogs(); }}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
          </DialogHeader>
          <RoleForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingRole} onOpenChange={(o) => { if (!o) closeDialogs(); }}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <RoleForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs} disabled={submitting}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingRole} onOpenChange={(o) => { if (!o) setDeletingRole(null); }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingRole?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This role will be permanently deleted. Users currently assigned this role must be reassigned first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoleForm({ form, onChange }: { form: RoleFormState; onChange: (f: RoleFormState) => void }) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="role-name">Name <span className="text-red-400">*</span></Label>
        <Input
          id="role-name"
          placeholder="e.g. Junior Contracts Manager"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role-code">
          Code <span className="text-muted-foreground text-xs font-normal">(optional — auto-generated if left blank)</span>
        </Label>
        <Input
          id="role-code"
          placeholder="e.g. JR_CONTRACTS"
          value={form.code}
          onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role-desc">Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
        <Input
          id="role-desc"
          placeholder="Short description of this role's responsibilities"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Matrix tab (shared for org-level defaults and per-project overrides)
// ──────────────────────────────────────────────────────────────────────────────


function MatrixTab({ mode, readOnly }: { mode: "org"; readOnly?: boolean }) {
  const { data: rolesRaw } = useFetch<Role[] | { results: Role[] }>("permissions/roles/");
  const { data: permsRaw } = useFetch<Permission[] | { results: Permission[] }>("permissions/");
  const roles = asArray<Role>(rolesRaw);
  const permissions = asArray<Permission>(permsRaw);

  // Read project context from localStorage
  const projectId = parseInt(localStorage.getItem("selectedProjectId") || "0") || null;

  if (roles.length === 0 || permissions.length === 0) return <AwesomeLoader message="Loading matrix" />;

  return <MatrixGrid mode={mode} roles={roles} permissions={permissions} projectId={projectId} readOnly={readOnly} />;
}

function MatrixGrid({
  roles,
  permissions,
  projectId,
  readOnly = false,
}: {
  mode: "org";
  roles: Role[];
  permissions: Permission[];
  projectId: number | null;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();

  // Build grouped list
  const groups = useMemo(() => {
    const byGroup: Record<string, Permission[]> = {};
    const hiddenGroups = ["audit", "compliance", "programme", "project"];
    const hiddenCodes = ["project.create"];
    // Remap certain permissions into a different display group
    const GROUP_OVERRIDES: Record<string, string> = {
      "project.edit": "settings",
    };

    for (const p of permissions) {
      const effectiveGroup = GROUP_OVERRIDES[p.code] ?? p.group;
      if (hiddenGroups.includes(effectiveGroup.toLowerCase())) continue;
      if (hiddenCodes.includes(p.code)) continue;
      byGroup[effectiveGroup] = byGroup[effectiveGroup] ?? [];
      byGroup[effectiveGroup].push(p);
    }

    // Explicit priority order — lower number = appears earlier, rest alphabetical
    const SORT_ORDER: Record<string, number> = {
      // Settings
      "settings.view":  0,
      "settings.edit":  1,
      "project.edit":   2,
      // Finance
      "finance.view":                        0,
      "finance.cost_ledger.view":            1,
      "finance.cost_ledger.edit":            2,
      "finance.payment_certificate.view":    3,
      "finance.payment_certificate.edit":    4,
      "finance.variation_order.view":        5,
      "finance.variation_order.edit":        6,
      // Task
      "task.create":    0,
    };

    for (const perms of Object.values(byGroup)) {
      perms.sort((a, b) => {
        const ai = SORT_ORDER[a.code] ?? 99;
        const bi = SORT_ORDER[b.code] ?? 99;
        if (ai !== bi) return ai - bi;
        return a.label.localeCompare(b.label);
      });
    }

    return byGroup;
  }, [permissions]);

  const [matrix, setMatrix] = useState<Record<number, Record<string, boolean>>>({});
  const [projectOverrides, setProjectOverrides] = useState<Record<number, Record<string, boolean>>>({});
  const [dirty, setDirty] = useState<Record<number, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      const next: Record<number, Record<string, boolean>> = {};
      const overrides: Record<number, Record<string, boolean>> = {};

      await Promise.all(
        roles.map(async (role) => {
          const url = projectId
            ? `permissions/roles/${role.id}/matrix/?project_id=${projectId}`
            : `permissions/roles/${role.id}/matrix/`;

          const resp = await fetchData(url);
          next[role.id] = resp.orgMatrix ?? {};

          if (projectId && resp.projectOverrides) {
            overrides[role.id] = resp.projectOverrides;
          }
        })
      );

      if (cancelled) return;
      setMatrix(next);
      setProjectOverrides(overrides);
      setDirty({});
      setLoading(false);
    };
    load().catch((e) => {
      console.error(e);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [roles, projectId]);

  // Check if permission is overridden at project level
  const isOverridden = (roleId: number, code: string): boolean => {
    if (!projectId) return false;
    return projectOverrides[roleId]?.hasOwnProperty(code) ?? false;
  };

  // Get effective value (project override takes precedence over org default)
  const effective = (roleId: number, code: string): boolean => {
    if (projectId && isOverridden(roleId, code)) {
      return projectOverrides[roleId][code];
    }
    return matrix[roleId]?.[code] ?? false;
  };

  // A permission is disabled when its parent gate is unchecked OR itself disabled (recursive)
  const isDisabled = (roleId: number, code: string): boolean => {
    const parent = PERMISSION_PARENTS[code];
    if (!parent) return false;
    return !effective(roleId, parent) || isDisabled(roleId, parent);
  };

  const handleToggle = (roleId: number, code: string) => {
    const target = !effective(roleId, code);

    if (projectId) {
      // For project context, update project overrides
      setProjectOverrides((prev) => ({
        ...prev,
        [roleId]: { ...(prev[roleId] ?? {}), [code]: target },
      }));
    } else {
      // For org context, update org matrix
      setMatrix((prev) => ({
        ...prev,
        [roleId]: { ...(prev[roleId] ?? {}), [code]: target },
      }));
    }

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
          granted: projectId && isOverridden(roleId, code)
            ? projectOverrides[roleId]?.[code] ?? false
            : matrix[roleId]?.[code] ?? false,
        }));

        const data = projectId
          ? {
              permissions: items,
              project_id: projectId,
            }
          : { permissions: items };

        await putData({
          url: `permissions/roles/${roleId}/matrix/`,
          data: data,
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

      // Bust the effective-permissions cache so the rest of the app
      // immediately reflects the updated matrix without waiting for staleTime.
      queryClient.invalidateQueries({ queryKey: ["effective-perms"] });

      // Also dispatch event for any other listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('permissions-changed'));
      }
    }
    setSavingAll(false);
  };

  if (loading) return <AwesomeLoader message="Loading matrix" />;

  const dirtyRolesCount = Object.values(dirty).reduce((acc, s) => acc + (s?.size ?? 0), 0);
  const groupEntries = Object.entries(groups);

  return (
    <div className="space-y-4 pb-24">
      {/* Premium Floating Save Bar */}
      {!readOnly && dirtyRolesCount > 0 && (
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
        {groupEntries.map(([group, perms]) => (
          <AccordionItem
            key={group}
            value={group}
            className="border border-border rounded-lg bg-white overflow-hidden"
          >
            <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium capitalize">{group}</span>
                <span className="text-xs text-muted-foreground">
                  {perms.length} permission{perms.length === 1 ? "" : "s"}
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
                    {perms.map((perm) => (
                        <tr key={perm.code} className="border-t border-border hover:bg-muted/20">
                          <td className="sticky left-0 z-10 bg-white px-4 py-2 border-r border-border">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{perm.label}</span>
                              {(perm.description || PERM_DESCRIPTIONS[perm.code]) && (
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-help transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[260px] text-xs leading-relaxed">
                                      {perm.description || PERM_DESCRIPTIONS[perm.code]}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </td>
                          {roles.map((role) => {
                            const val = effective(role.id, perm.code);
                            const disabled = isDisabled(role.id, perm.code);
                            const override = isOverridden(role.id, perm.code);
                            return (
                              <td key={role.id} className={`text-center px-3 py-2 ${disabled || readOnly ? "opacity-30" : ""}`}>
                                <div className="flex items-center justify-center gap-1">
                                  <Checkbox
                                    checked={val}
                                    disabled={disabled || readOnly}
                                    onCheckedChange={() => !disabled && !readOnly && handleToggle(role.id, perm.code)}
                                    className={`h-4 w-4 ${
                                      override
                                        ? "border-primary data-[state=checked]:bg-primary"
                                        : projectId
                                        ? "opacity-60"
                                        : ""
                                    }`}
                                  />
                                  {override && (
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" title="Project override" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-xs text-muted-foreground">
        {projectId
          ? `Changes affect only this project. Organization defaults are shown in gray, overrides are highlighted.`
          : `Changes affect all projects in your organisation. Use the "Save" buttons above once you've toggled permissions.`}
      </p>
    </div>
  );
}
