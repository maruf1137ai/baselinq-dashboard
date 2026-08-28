/**
 * Roles & Permissions — role-first editor.
 *
 * UI ONLY. Every value comes from lib/rolesPermissionsMock.ts; nothing is
 * fetched and nothing is saved. Wiring it up means replacing the three mock
 * imports with the real endpoints — the component shape does not change.
 *
 * ── Why this layout ──────────────────────────────────────────────────────
 *
 * 49 permissions × 29 roles is 1,421 cells. A grid of that is unreadable and
 * unmaintainable, so the page never draws one: pick a role on the left, see
 * that role's 49 permissions on the right, grouped into the nine families the
 * permission codes already form.
 *
 * The harder problem is that an answer is not a boolean. It resolves through
 * three layers — global default → organisation → project — and the last one
 * SET wins (permissions/core.py::_compute_effective_permissions). A project
 * override can therefore silently reverse a global grant, which is the exact
 * failure the /permission-debug tooling exists to chase down after the fact.
 *
 * So every row states which layer produced its answer, and any row where a
 * later layer reverses an earlier one is flagged in place, with the full
 * trace expandable underneath. The information that tooling has to dig for is
 * on the page.
 */

import { Link } from "react-router-dom";
import type React from "react";
import { useCallback, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

// The same icon components DashboardSidebar's nav uses, so the area rail and
// the sidebar read as one set rather than two icon families side by side.
import Task from "@/components/icons/Task";
import SaveMoney from "@/components/icons/SaveMoney";
import Document2 from "@/components/icons/Document2";
import Programme from "@/components/icons/Programme";
import Meetings from "@/components/icons/Meeting";
import Shield from "@/components/icons/Shield";
import Settings from "@/components/icons/Settings";
import Communication from "@/components/icons/Communication";
import Trending from "@/components/icons/Trending";

import { DashboardLayout } from "@/components/DashboardLayout";
import { RolesSidebarProvider } from "@/components/roles/RolesSidebarContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ALL_PERMISSIONS,
  CURRENT_ORG,
  CURRENT_PROJECT,
  PERMISSION_GROUPS,
  ROLES,
  resolve,
  type Layer,
  type LayerValue,
  type Resolution,
} from "@/lib/rolesPermissionsMock";

/* ── Small presentational pieces ─────────────────────────────────────────── */

const ORIGIN_LABEL: Record<Layer, string> = {
  global: "Default",
  org: "Org override",
  project: "This project",
};

/** Where the answer came from. Colour is meaning here, not decoration. */
function OriginTag({ origin }: { origin: Layer }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        origin === "global" && "border-border text-muted-foreground",
        origin === "org" && "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-400",
        origin === "project" && "border-red-300 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-400",
      )}
    >
      {ORIGIN_LABEL[origin]}
    </span>
  );
}

function LayerValueTag({ value }: { value: LayerValue }) {
  if (value === null) {
    return <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">not set</span>;
  }
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-medium",
        value
          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
      )}
    >
      {value ? "granted" : "denied"}
    </span>
  );
}

/**
 * The three-layer trace. Only rendered when a row is expanded, because it is
 * the answer to "why", not part of scanning the list.
 */
function LayerTrace({ res }: { res: Resolution }) {
  const rows: { layer: Layer; name: string; value: LayerValue }[] = [
    { layer: "global", name: "Global default", value: res.global },
    { layer: "org", name: `Organisation · ${CURRENT_ORG}`, value: res.org },
    { layer: "project", name: `This project · ${CURRENT_PROJECT.name}`, value: res.project },
  ];

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        How this was decided — last layer that is set wins
      </p>
      <div className="grid gap-1.5">
        {rows.map((r, i) => {
          const wins = r.layer === res.origin;
          return (
            <div key={r.layer} className="grid grid-cols-[16px_1fr_auto] items-center gap-3 text-sm">
              <span className="text-right text-[11px] text-muted-foreground">{i + 1}</span>
              <span className={cn("text-foreground", wins && "font-medium")}>
                {r.name}
                {wins && <span className="ml-2 text-xs font-normal text-primary">← wins</span>}
              </span>
              <LayerValueTag value={r.value} />
            </div>
          );
        })}
      </div>

      {res.conflict && (
        <div className="mt-3 flex gap-2 rounded-md border border-red-300 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="m-0">
            <strong className="font-semibold">This reverses the default.</strong>{" "}
            {res.origin === "project" ? "A project-level" : "An organisation-level"} setting is
            overriding what this role has everywhere else. If that was not deliberate, clear the
            override to fall back to{" "}
            <em>{res.global ? "granted" : "denied"}</em>.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * One glyph per permission area, keyed by PERMISSION_GROUPS[].key.
 *
 * Every one is the component DashboardSidebar renders for the matching nav
 * item, so the rail and the sidebar read as one set. Project Health borrows
 * Home's Trending glyph rather than repeating Compliance's Shield, which is
 * what the sidebar itself does — fine when they sit far apart in a long nav,
 * confusing in a nine-item list where both are visible at once.
 */
type AreaIcon = React.ComponentType<{ className?: string }>;

const AREA_ICONS: Record<string, AreaIcon> = {
  tasks: Task,
  finance: SaveMoney,
  programme: Programme,
  meetings: Meetings,
  communication: Communication,
  documentation: Document2,
  compliance: Shield,
  project_health: Trending,
  settings: Settings,
};

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function RolesPermissions() {
  const [selectedRole, setSelectedRole] = useState("CLIENT");
  const [selectedArea, setSelectedArea] = useState(PERMISSION_GROUPS[0].key);
  const [expanded, setExpanded] = useState<string | null>("finance.client_approve");
  /** Local, unsaved edits. code -> granted. UI-only; nothing is persisted. */
  const [edits, setEdits] = useState<Record<string, boolean>>({});

  const role = ROLES.find((r) => r.code === selectedRole)!;

  const area =
    PERMISSION_GROUPS.find((g) => g.key === selectedArea) ?? PERMISSION_GROUPS[0];

  const editCount = Object.keys(edits).length;

  /* Handed to RolesSidebarProvider, so keep the identity stable. */
  const selectRole = useCallback((code: string) => {
    setSelectedRole(code);
    setExpanded(null);
    setEdits({});
  }, []);

  /** Effective value for a permission, taking any unsaved edit into account. */
  const valueFor = (code: string, res: Resolution) =>
    code in edits ? edits[code] : res.effective;

  return (
    <RolesSidebarProvider selectedRole={selectedRole} onSelectRole={selectRole}>
      <DashboardLayout>
        <TooltipProvider delayDuration={200}>
          <div className="space-y-6">
            <PageHeader
              className="border-b border-border pb-5"
              title="Roles & Permissions"
              /* The stats block is gone, so this is now the only thing on the
                 page naming the role whose switches are on screen. */
              meta={<span className="text-foreground">{role.name}</span>}
              description={`Pick a role in the sidebar to review its ${ALL_PERMISSIONS.length} permissions. A green dot marks the roles someone currently holds on this project.`}
              /* `reference` is the title-row right slot; `actions` would drop
                 these onto a second row under the description. */
              reference={
                <div className="flex items-center gap-2">
                  {editCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {editCount} unsaved {editCount === 1 ? "change" : "changes"}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-normal"
                    disabled={editCount === 0}
                    onClick={() => setEdits({})}
                  >
                    Discard
                  </Button>
                  <Button size="sm" className="font-normal" disabled={editCount === 0}>
                    Save changes
                  </Button>
                </div>
              }
            />

            <section>

              {/* ── Areas beside their parts ─────────────────────────────
                  Nine areas, 49 permissions, but Tasks alone holds 22 while
                  six areas hold three or fewer. A rail keeps every area one
                  click away instead of charging a whole view to reveal the two
                  switches in Audit. Sub-part titles deliberately echo the
                  matching Help page, so the two read as one vocabulary. */}
              <div className="grid gap-5 md:grid-cols-[196px_minmax(0,1fr)]">
                <div className="border-b border-border pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                  <nav
                    aria-label="Permission areas"
                    className="subtle-scrollbar flex flex-col gap-0.5 md:sticky md:top-4 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto"
                  >
                    {PERMISSION_GROUPS.map((group) => {
                      const active = group.key === selectedArea;
                      const resolved = group.permissions.map((p) =>
                        resolve(selectedRole, p.code),
                      );
                      const overrides = resolved.filter((r) => r.origin !== "global").length;
                      const grantedHere = group.permissions.filter((p, i) =>
                        valueFor(p.code, resolved[i]),
                      ).length;
                      const conflicts = resolved.filter((r) => r.conflict).length;
                      const Icon = AREA_ICONS[group.key] ?? Shield;
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => setSelectedArea(group.key)}
                          aria-current={active}
                          title={group.blurb}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{group.title}</span>
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
                                  ? `${conflicts} reversed by an override in ${group.title}`
                                  : `${overrides} overridden in ${group.title}`}
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
                              {grantedHere} of {group.permissions.length} granted
                            </span>
                            <span aria-hidden>
                              {grantedHere}/{group.permissions.length}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="min-w-0">
                  {/* Deliberately shaped like HelpTasks: a section per part,
                      a plain-English intro, then a table. The columns differ
                      because the question differs — Help answers "who can do
                      this", and here the who is already fixed by the selected
                      role, so the useful third column is which layer decided
                      it and whether it is on. */}
                  <div className="space-y-8">
                    {area.parts.map((part) => {
                      const rows = part.permissions.map((p) => ({
                        p,
                        res: resolve(selectedRole, p.code),
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
                            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                              {part.explain}
                            </p>

                            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                              <table className="w-full min-w-[520px] text-sm">
                                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-4 py-2.5 text-left font-normal">
                                      Action
                                    </th>
                                    <th className="w-24 px-4 py-2.5 text-right font-normal">
                                      Granted
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map(({ p, res }) => {
                                    const on = valueFor(p.code, res);
                                    const isOpen = expanded === p.code;
                                    return (
                                      <tr
                                        key={p.code}
                                        className="border-t border-border align-top"
                                      >
                                        <td className="px-4 py-3" title={p.code}>
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-foreground">{p.label}</span>
                                            {res.origin !== "global" && (
                                              <button
                                                type="button"
                                                onClick={() => setExpanded(isOpen ? null : p.code)}
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
                                                  An override reverses the global default here
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                            {!p.projectScoped && (
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-normal"
                                                  >
                                                    global
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                  Applies account-wide — it cannot be
                                                  overridden per project
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                          <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
                                            {p.description}
                                          </p>
                                          {isOpen && (
                                            <div className="mt-2">
                                              <LayerTrace res={res} />
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <Switch
                                            checked={on}
                                            onCheckedChange={(next) =>
                                              setEdits((prev) => ({ ...prev, [p.code]: next }))
                                            }
                                            aria-label={`${p.label} for ${role.name}`}
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

                  {area.help && (
                    <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                      The same areas are explained in plain English, with no switches, in{" "}
                      <Link to={area.help} className="underline hover:text-foreground">
                        the {area.title} help reference
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </TooltipProvider>
      </DashboardLayout>
    </RolesSidebarProvider>
  );
}
