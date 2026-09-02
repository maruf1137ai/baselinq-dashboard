/**
 * Roles & Permissions — role-first editor, wired to the real permission table.
 *
 * ── Scope ────────────────────────────────────────────────────────────────
 *
 * This page writes PROJECT overrides only. Every save carries a project_id, so
 * a mistake reaches one contract and "Reset" undoes it. Editing the
 * organisation-wide default is a different blast radius — every project at once
 * — and stays in the older Settings page until it can be given a control nobody
 * can misread.
 *
 * ── Why this layout ──────────────────────────────────────────────────────
 *
 * 49 permissions x 29 roles is 1,421 cells. A grid of that is unreadable, so
 * the page never draws one: pick a role in the sidebar, pick an area in the
 * rail, read that area's permissions grouped into the sub-parts the Help pages
 * already use.
 *
 * The harder problem is that an answer is not a boolean. It resolves through
 * three layers — global default, organisation, this project — and the last one
 * SET wins. A project override can therefore silently reverse a global grant,
 * which is the exact failure /permission-debug exists to chase down after the
 * fact. So a row whose answer came from anywhere but the shipped default says
 * so in place, and the full trace expands underneath.
 *
 * Presentation — sub-part headings, plain-English labels and descriptions —
 * comes from the permission rows themselves (user/migrations/0047), so this
 * page renders the vocabulary rather than owning a second copy of it.
 */
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Info, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// The same icon components DashboardSidebar's nav uses, so the area rail and
// the sidebar read as one set rather than two icon families side by side.
import Task from "@/components/icons/Task";
import SaveMoney from "@/components/icons/SaveMoney";
import Document2 from "@/components/icons/Document2";
import Programme from "@/components/icons/Programme";
import Meetings from "@/components/icons/Meeting";
import Shield from "@/components/icons/Shield";
import Settings from "@/components/icons/Settings";
import ProjectIcon from "@/components/icons/Project";
import AuditIcon from "@/components/icons/Audit";

import { DashboardLayout } from "@/components/DashboardLayout";
import { RolesSidebarProvider } from "@/components/roles/RolesSidebarContext";
import { DeleteRoleDialog } from "@/components/roles/DeleteRoleDialog";
import {
  RoleFormDialog,
  type RoleFormRequest,
} from "@/components/roles/RoleFormDialog";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fetchData } from "@/lib/Api";
import { usePermissions } from "@/hooks/usePermissions";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import {
  resolveFromLayers,
  usePermissionCatalogue,
  useResetProjectOverrides,
  useRoleMatrix,
  useRoles,
  useSaveRoleMatrix,
  type ApiPermission,
  type ApiRole,
  type Layer,
  type Resolution,
} from "@/hooks/useRolePermissions";

/**
 * Display name and glyph per permission group. `group` is a stable API key;
 * what it is called belongs here. Every glyph is the component
 * DashboardSidebar renders for the matching nav item.
 */
type AreaIcon = React.ComponentType<{ className?: string }>;

const AREAS: Record<string, { title: string; icon: AreaIcon; help: string | null }> = {
  task: { title: "Tasks", icon: Task, help: "/help/tasks" },
  finance: { title: "Finance", icon: SaveMoney, help: "/help/finance" },
  document: { title: "Documents", icon: Document2, help: "/help/documentation" },
  programme: { title: "Programme", icon: Programme, help: "/help/programme" },
  project: { title: "Project", icon: ProjectIcon, help: null },
  compliance: { title: "Compliance", icon: Shield, help: "/help/compliance" },
  meeting: { title: "Meetings", icon: Meetings, help: "/help/meetings" },
  settings: { title: "Settings", icon: Settings, help: "/help/settings" },
  audit: { title: "Audit", icon: AuditIcon, help: null },
};

const AREA_ORDER = Object.keys(AREAS);

/**
 * What the badge on a row says — where the answer came FROM, not who it
 * applies to.
 *
 * "This project" read as scope, which the page header already states, so it
 * looked like the same sentence twice. "Changed here" says the thing the
 * header does not: this row is not on its default any more, somebody moved it.
 */
const ORIGIN_LABEL: Record<Layer, string> = {
  global: "Default",
  org: "From organisation",
  project: "Changed here",
};

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function OriginTag({ origin }: { origin: Layer }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        origin === "global" && "border-border text-muted-foreground",
        origin === "org" &&
          "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-400",
        origin === "project" &&
          "border-red-300 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-400",
      )}
    >
      {ORIGIN_LABEL[origin]}
    </span>
  );
}

function LayerValueTag({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-muted-foreground">not set</span>;
  return (
    <span className={value ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
      {value ? "granted" : "denied"}
    </span>
  );
}

/** The three-layer trace for one permission — why the answer is the answer. */
function LayerTrace({
  res,
  stamp,
}: {
  res: Resolution;
  stamp?: { by: string | null; at: string | null };
}) {
  const rows: { layer: Layer; name: string; value: boolean | null }[] = [
    { layer: "global", name: "Baselinq default", value: res.global },
    { layer: "org", name: "Your organisation", value: res.org },
    { layer: "project", name: "This project", value: res.project },
  ];

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.layer} className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                r.layer === res.origin ? "bg-foreground" : "bg-border",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "w-36 shrink-0",
                r.layer === res.origin ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {r.name}
            </span>
            <LayerValueTag value={r.value} />
            {r.layer === res.origin && <span className="text-muted-foreground">&larr; decides</span>}
          </div>
        ))}
      </div>

      {res.conflict && (
        <p className="mt-2 flex items-start gap-1.5 border-t border-border pt-2 text-red-700 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          An override reverses the default here. Anyone expecting the shipped behaviour will
          find this switched the other way.
        </p>
      )}

      {stamp?.by && (
        <p className="mt-2 border-t border-border pt-2 text-muted-foreground">
          Changed by {stamp.by}
          {stamp.at ? ` on ${new Date(stamp.at).toLocaleDateString()}` : ""}.
        </p>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function RolesPermissions() {
  const projectId = useSelectedProjectId();
  const { canEditSettings } = usePermissions();

  const { data: catalogue = [], isLoading: loadingCatalogue } = usePermissionCatalogue();
  const { data: roles = [], isLoading: loadingRoles } = useRoles();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  /** Local, unsaved edits. code -> granted. */
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  /** The role whose delete dialog is open, if any. */
  const [deleting, setDeleting] = useState<ApiRole | null>(null);
  /** Create / copy / rename all use one dialog; this is which, and from what. */
  const [roleForm, setRoleForm] = useState<RoleFormRequest | null>(null);

  // Who holds which role on this project. Drives the green dots and the impact
  // line, so an admin can see whether a change touches anyone at all.
  const { data: holders = {} } = useQuery<Record<string, string[]>>({
    queryKey: ["project-role-holders", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res: any = await fetchData(`projects/${projectId}/team-members/`);
      const members = res?.teamMembers || res?.results || res || [];
      const out: Record<string, string[]> = {};
      for (const m of members as any[]) {
        // roleCode is the backend's already-resolved PROJECT-scoped role
        // code (project role wins, falling back to org role only when the
        // project role text is unmatched) — the same resolution
        // permissions/core.py uses to decide what this member can actually
        // do on this project, so trust it first. roleName/orgRoleName are
        // last-resort display-text fallbacks for older rows that predate
        // the code field.
        const key = String(m.roleCode || m.roleName || m.orgRoleName || "").trim();
        if (!key) continue;
        const name = m.user?.name || m.user?.email || m.name || "Unknown";
        (out[key] ||= []).push(name);
      }
      return out;
    },
  });

  // Keyed by code where the endpoint gave one, by display name otherwise —
  // older membership rows predate the role FK and only carry the name.
  const holdersByCode = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const role of roles) {
      const names = holders[role.code] ?? holders[role.name] ?? [];
      if (names.length) out[role.code] = names;
    }
    return out;
  }, [roles, holders]);

  // Open on a role someone actually holds — a role nobody has is a poor
  // landing page, and first-alphabetically is arbitrary.
  const effectiveRoleId = useMemo(() => {
    if (selectedRoleId != null) return selectedRoleId;
    if (!roles.length) return null;
    const held = roles.find((r) => (holdersByCode[r.code]?.length ?? 0) > 0);
    return (held ?? roles[0]).id;
  }, [selectedRoleId, roles, holdersByCode]);

  const {
    data: matrix,
    isLoading: loadingMatrix,
    isError: matrixFailed,
  } = useRoleMatrix(effectiveRoleId, projectId);

  const save = useSaveRoleMatrix();
  const reset = useResetProjectOverrides();

  const role = roles.find((r) => r.id === effectiveRoleId) ?? null;

  const areas = useMemo(() => {
    const present = new Set(catalogue.map((p) => p.group));
    return AREA_ORDER.filter((key) => present.has(key));
  }, [catalogue]);

  const area = selectedArea && areas.includes(selectedArea) ? selectedArea : areas[0] ?? null;

  /**
   * The catch-all create permission is rendered as a parent control over the
   * per-type creates rather than as a row of its own — see MASTER_CREATE.
   * Nothing reads it, so showing it as an eighth switch would only invite the
   * question of what happens when it disagrees with the seven.
   */
  const SUPERSEDED = "task.create";

  /** Permissions of the open area, grouped into their sub-parts, order preserved. */
  const parts = useMemo(() => {
    const out: { title: string; permissions: ApiPermission[] }[] = [];
    const index = new Map<string, number>();
    for (const p of catalogue) {
      if (p.group !== area) continue;
      if (p.code === SUPERSEDED) continue;
      const title = p.subgroup || "Other";
      if (!index.has(title)) {
        index.set(title, out.length);
        out.push({ title, permissions: [] });
      }
      out[index.get(title)!].permissions.push(p);
    }
    return out;
  }, [catalogue, area]);

  const selectRole = useCallback((id: number) => {
    setSelectedRoleId(id);
    setExpanded(null);
    setEdits({});
  }, []);

  /** Effective value for a permission, taking any unsaved edit into account. */
  const valueFor = (code: string, res: Resolution) =>
    code in edits ? edits[code] : res.effective;

  /**
   * The per-type create permissions of the open area, and whether all, none or
   * some of them are on. Only shown where there is more than one to aggregate.
   */
  const createPerms = useMemo(
    () =>
      catalogue.filter(
        (p) => p.group === area && p.code !== SUPERSEDED && p.code.endsWith(".create"),
      ),
    [catalogue, area],
  );

  const createState = useMemo(() => {
    if (createPerms.length < 2) return null;
    const on = createPerms.filter((p) =>
      valueFor(p.code, resolveFromLayers(matrix, p.code)),
    ).length;
    return {
      total: createPerms.length,
      on,
      // Radix reads "indeterminate" as a checked state, which is exactly the
      // "some of these" case a switch has no way to show.
      checked: on === createPerms.length ? true : on === 0 ? false : "indeterminate",
    } as const;
  }, [createPerms, matrix, edits]);

  /** Turn every create in this area on or off in one go. */
  const setAllCreates = (next: boolean) => {
    setEdits((prev) => {
      const out = { ...prev };
      for (const p of createPerms) {
        if (!p.is_project_scoped) continue;
        const res = resolveFromLayers(matrix, p.code);
        // Keep the diff honest: an edit back to the saved value is not a change.
        if (next === res.effective) delete out[p.code];
        else out[p.code] = next;
      }
      return out;
    });
  };

  const editCount = Object.keys(edits).length;
  const holderNames = role ? holdersByCode[role.code] ?? [] : [];

  const handleSave = async () => {
    if (!role || !projectId) return;
    const changes = Object.entries(edits).map(([code, granted]) => ({ code, granted }));
    try {
      await save.mutateAsync({ roleId: role.id, projectId, changes });
      setEdits({});
      toast.success(
        `Saved ${changes.length} change${changes.length === 1 ? "" : "s"} for ${role.name}.`,
        {
          description: holderNames.length
            ? `${holderNames.length} user${holderNames.length === 1 ? "" : "s"} on this project affected.`
            : "Nobody currently holds this role on this project.",
        },
      );
    } catch (e: any) {
      // The server has guards this page cannot fully predict — the lockout
      // rule, unknown codes. Show what it said rather than a generic failure.
      toast.error("Could not save", {
        description:
          e?.response?.data?.detail ?? "The server rejected the change. Nothing was saved.",
      });
    }
  };

  const handleReset = async () => {
    if (!projectId || !role) return;
    try {
      await reset.mutateAsync({ projectId, roleId: role.id });
      setEdits({});
      toast.success(`${role.name} is back to your organisation's defaults.`, {
        description: "Other roles on this project are unchanged.",
      });
    } catch (e: any) {
      toast.error("Could not reset", {
        description:
          e?.response?.data?.detail ?? "Nothing was changed. Try again in a moment.",
      });
    } finally {
      setConfirmReset(false);
    }
  };

  /* ── No project chosen: the page has no meaning ─────────────────────── */
  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            className="z-20 -mt-6 border-b border-border bg-background pt-6 pb-5"
            title="Roles & Permissions"
            description="Choose a project to review and adjust what each role can do on it."
          />
          <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            Pick a project from the switcher at the top of the sidebar to get started.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RolesSidebarProvider
      roles={roles}
      isLoading={loadingRoles}
      selectedRoleId={effectiveRoleId}
      onSelectRole={selectRole}
      holders={holdersByCode}
      canManageRoles={canEditSettings}
      onRequestDelete={setDeleting}
      onRequestDuplicate={(role) => setRoleForm({ mode: "duplicate", role })}
      onRequestEdit={(role) => setRoleForm({ mode: "edit", role })}
      onRequestCreate={() => setRoleForm({ mode: "create" })}
    >
      <DashboardLayout>
        <TooltipProvider delayDuration={200}>
          <div className="space-y-6">
            <PageHeader
              className="sticky top-0 z-20 -mt-6 border-b border-border bg-background pt-6 pb-5"
              title="Roles & Permissions"
              /* The only thing naming the role whose switches are on screen. */
              meta={role ? <span className="text-foreground">{role.name}</span> : undefined}
              description={
                canEditSettings
                  ? "Changes apply to this project only. A green dot marks the roles someone currently holds here."
                  : "What each role can do on this project. Only an administrator can change these."
              }
              reference={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {editCount} unsaved {editCount === 1 ? "change" : "changes"}
                    </span>
                  )}
                  {canEditSettings && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-normal"
                        onClick={() => setConfirmReset(true)}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-normal"
                        disabled={editCount === 0 || save.isPending}
                        onClick={() => setEdits({})}
                      >
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        className="font-normal"
                        disabled={editCount === 0 || save.isPending}
                        onClick={handleSave}
                      >
                        {save.isPending && (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        )}
                        Save changes
                      </Button>
                    </>
                  )}
                </div>
              }
            />

            {matrixFailed && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-400">
                Could not load this role&rsquo;s permissions. Nothing has been changed — reload
                to try again.
              </p>
            )}

            <section>
              {/* ── Areas beside their parts ─────────────────────────────
                  Nine areas, 49 permissions, but Tasks alone holds 22 while
                  six areas hold three or fewer. A rail keeps every area one
                  click away instead of charging a whole view to reveal the two
                  switches in Audit. Sub-part titles come from the permission
                  rows, which carry the matching Help page's section names. */}
              <div className="grid gap-5 md:grid-cols-[196px_minmax(0,1fr)]">
                <div className="border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                  <nav
                    aria-label="Permission areas"
                    className="subtle-scrollbar flex flex-col gap-0.5 md:sticky md:top-[7rem] md:max-h-[calc(100vh-9rem)] md:overflow-y-auto"
                  >
                    {loadingCatalogue &&
                      Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="mb-1 h-8 animate-pulse rounded-md bg-muted" />
                      ))}

                    {areas.map((key) => {
                      const meta = AREAS[key];
                      const perms = catalogue.filter((p) => p.group === key);
                      const resolved = perms.map((p) => resolveFromLayers(matrix, p.code));
                      const overrides = resolved.filter((r) => r.origin !== "global").length;
                      const conflicts = resolved.filter((r) => r.conflict).length;
                      const grantedHere = perms.filter((p, i) =>
                        valueFor(p.code, resolved[i]),
                      ).length;
                      const active = key === area;
                      const Icon = meta.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedArea(key)}
                          aria-current={active}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{meta.title}</span>
                          {overrides > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    conflicts > 0 ? "bg-red-600" : "bg-amber-500",
                                  )}
                                  aria-label={
                                    conflicts > 0
                                      ? `${conflicts} reversed`
                                      : `${overrides} overridden`
                                  }
                                />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {conflicts > 0
                                  ? `${conflicts} reversed by an override in ${meta.title}`
                                  : `${overrides} overridden in ${meta.title}`}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span
                            className={cn(
                              "shrink-0 text-[11px] tabular-nums",
                              active ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            <span className="sr-only">
                              {grantedHere} of {perms.length} granted
                            </span>
                            <span aria-hidden>
                              {grantedHere}/{perms.length}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="min-w-0">
                  {/* Shaped like HelpTasks: a section per part, a plain-English
                      intro, then a table. The columns differ because the
                      question differs — Help answers "who can do this", and here
                      the who is already fixed by the selected role. */}
                  {loadingMatrix || loadingCatalogue ? (
                    <div className="space-y-3" aria-label="Loading permissions">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {createState && (
                        <label
                          className={cn(
                            "flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5",
                            canEditSettings && "cursor-pointer hover:bg-muted/60",
                          )}
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={createState.checked}
                            disabled={!canEditSettings}
                            onCheckedChange={(next) => setAllCreates(next === true)}
                            aria-label={`Create every type of ${AREAS[area!]?.title.toLowerCase()} item`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                              Create tasks (general access)
                              <span className="text-xs font-normal tabular-nums text-muted-foreground">
                                {createState.on} of {createState.total} types
                              </span>
                            </span>
                            <span className="mt-0.5 block max-w-prose text-xs leading-relaxed text-muted-foreground">
                              Switches on every create permission below. Turn individual
                              types back off afterwards and this shows as partly selected.
                            </span>
                          </span>
                        </label>
                      )}

                      {parts.map((part) => {
                        const rows = part.permissions.map((p) => ({
                          p,
                          res: resolveFromLayers(matrix, p.code),
                        }));
                        const grantedInPart = rows.filter(({ p, res }) =>
                          valueFor(p.code, res),
                        ).length;
                        return (
                          <section key={part.title}>
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <h3 className="text-base font-normal text-foreground">
                                {part.title}
                              </h3>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {grantedInPart} of {part.permissions.length} granted
                              </span>
                            </div>

                            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                              <table className="w-full min-w-[520px] text-sm">
                                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-4 py-2.5 text-left font-normal">Action</th>
                                    <th className="w-24 px-4 py-2.5 text-right font-normal">
                                      Granted
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map(({ p, res }) => {
                                    const on = valueFor(p.code, res);
                                    const isOpen = expanded === p.code;
                                    const changed = p.code in edits;
                                    return (
                                      <tr
                                        key={p.code}
                                        className={cn(
                                          "border-t border-border align-top",
                                          changed && "bg-primary/[0.04]",
                                        )}
                                      >
                                        <td className="px-4 py-3" title={p.code}>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-foreground">{p.label}</span>
                                            {res.origin !== "global" && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setExpanded(isOpen ? null : p.code)
                                                }
                                                aria-expanded={isOpen}
                                                aria-label={`How ${p.label} is decided`}
                                                className="flex items-center gap-1 rounded transition-opacity hover:opacity-70"
                                              >
                                                <OriginTag origin={res.origin} />
                                                <Info className="h-3 w-3 shrink-0 text-muted-foreground" />
                                              </button>
                                            )}
                                            {res.conflict && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                  An override reverses the default here
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                            {!p.is_project_scoped && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-normal"
                                                  >
                                                    account-wide
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                  Applies across the whole account — it cannot
                                                  be changed for one project
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                          <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
                                            {p.description}
                                          </p>
                                          {isOpen && (
                                            <div className="mt-2">
                                              <LayerTrace
                                                res={res}
                                                stamp={matrix?.updatedBy?.[p.code]}
                                              />
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <Switch
                                            checked={on}
                                            disabled={!canEditSettings || !p.is_project_scoped}
                                            onCheckedChange={(next) =>
                                              setEdits((prev) => {
                                                // Toggling back to the saved value
                                                // is not a change — drop it, so the
                                                // count and the diff stay honest.
                                                if (next === res.effective) {
                                                  const { [p.code]: _drop, ...rest } = prev;
                                                  return rest;
                                                }
                                                return { ...prev, [p.code]: next };
                                              })
                                            }
                                            aria-label={`${p.label} for ${role?.name ?? "this role"}`}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}

                  {area && AREAS[area]?.help && (
                    <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                      The same areas are explained in plain English, with no switches, in{" "}
                      <Link to={AREAS[area]!.help!} className="underline hover:text-foreground">
                        the {AREAS[area]!.title} help reference
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <RoleFormDialog
            request={roleForm}
            onClose={() => setRoleForm(null)}
            onDone={selectRole}
          />

          <DeleteRoleDialog
            role={deleting}
            roles={roles}
            onClose={() => setDeleting(null)}
            onDeleted={(id) => {
              // Selecting a deleted role would refetch a matrix that 404s, so
              // fall back to letting the page pick a held role again.
              if (selectedRoleId === id) setSelectedRoleId(null);
              setEdits({});
            }}
          />

          <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Reset {role?.name ?? "this role"} on this project?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Every override for {role?.name ?? "this role"} on this project is removed,
                  putting it back on your organisation&rsquo;s defaults. Other roles, and every
                  other project, are unaffected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} disabled={reset.isPending}>
                  Reset to defaults
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </DashboardLayout>
    </RolesSidebarProvider>
  );
}
