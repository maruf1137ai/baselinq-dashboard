/**
 * The roles list, rendered inside the main sidebar while on /roles-permissions.
 *
 * This is the list that used to be a second column inside the page. Moving it
 * into the sidebar is what buys the page its width back: the alternative was a
 * 256px main nav plus a 280px role column before any content started.
 *
 * Roles in use are listed first. There are 29 system roles and only a handful
 * are held by anyone on a given project, so an alphabetical list of all of them
 * buries the ones that matter — the rest sit behind "Show all". The green-dot
 * legend lives on the page (PageHeader description), not here; the sidebar
 * stays nav and nothing else.
 *
 * Collapsed (icon-rail) state still has to work, because the rail is a global
 * affordance the user can toggle from the header on any page. At 3rem there is
 * no room for names, so the list degrades to code stubs with a title tooltip.
 */
import { useState } from "react";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useRolesSidebar } from "./RolesSidebarContext";

export function RolesNav() {
  const ctx = useRolesSidebar();
  const { open } = useSidebar();
  const [showAll, setShowAll] = useState(false);

  // Rendered only from inside the provider, but the sidebar is shared code —
  // stay defensive rather than assume.
  if (!ctx) return null;

  const {
    roles,
    isLoading,
    selectedRoleId,
    selectRole,
    roleSearch,
    setRoleSearch,
    holders,
    canManageRoles,
    requestDelete,
    requestDuplicate,
    requestEdit,
    requestCreate,
  } = ctx;

  const holderCount = (code: string) => holders[code]?.length ?? 0;

  const q = roleSearch.trim().toLowerCase();
  const matching = q
    ? roles.filter(
        (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
      )
    : roles;

  const inUse = matching.filter((r) => holderCount(r.code) > 0);
  const unused = matching.filter((r) => holderCount(r.code) === 0);
  // A search is already a deliberate narrowing — don't make the user press
  // "Show all" to see the thing they just typed the name of.
  const visible = q || showAll ? matching : inUse;

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        {roles.map((r) => {
          const active = r.id === selectedRoleId;
          const held = holderCount(r.code);
          return (
            <button
              key={r.id}
              type="button"
              title={`${r.name} — ${held || "no"} user${held === 1 ? "" : "s"}`}
              onClick={() => selectRole(r.id)}
              aria-current={active}
              className={cn(
                "relative h-7 w-7 shrink-0 rounded-md text-[10px] font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {r.code.slice(0, 2)}
              {held > 0 && (
                <span
                  className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-green-600"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* The container drops its right gutter for the list below, so the
          search box restores its own. */}
      <div className="relative mb-3 mr-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          placeholder={isLoading ? "Loading roles…" : `Search ${roles.length} roles…`}
          className="h-8 pl-8 text-sm"
          aria-label="Search roles"
          disabled={isLoading}
        />
      </div>

      <div className="subtle-scrollbar flex-1 space-y-1 overflow-y-auto overscroll-contain pb-2">
        {isLoading && (
          <div className="space-y-1.5 pr-3" aria-label="Loading roles">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {!isLoading &&
          visible.map((r) => {
            const active = r.id === selectedRoleId;
            const held = holderCount(r.code);
            // Copying works from any role — starting from a system role that
            // already works is the whole point. Renaming and deleting are
            // custom-only, because the API refuses both on system roles and a
            // control that always fails is worse than no control.
            const canCopy = canManageRoles;
            const canModify = canManageRoles && !r.is_system;
            const actionCount = (canCopy ? 1 : 0) + (canModify ? 2 : 0);
            return (
              <div key={r.id} className="group/role relative">
              <button
                type="button"
                onClick={() => selectRole(r.id)}
                aria-current={active}
                title={held ? holders[r.code].join(", ") : "Nobody holds this role here"}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  actionCount === 1 && "pr-8",
                  actionCount === 3 && "pr-[76px]",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    held > 0 ? "bg-green-600" : "bg-border",
                  )}
                  aria-hidden
                />
                <span className="flex-1 truncate">{r.name}</span>
                {!r.is_system && (
                  <span className="shrink-0 rounded border border-border px-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                    custom
                  </span>
                )}
                <span
                  className={cn(
                    "shrink-0 text-[11px] tabular-nums",
                    held > 0 ? "text-muted-foreground" : "text-muted-foreground/50",
                  )}
                >
                  <span className="sr-only">
                    {held} user{held === 1 ? "" : "s"}
                  </span>
                  <span aria-hidden>{held}</span>
                </span>
              </button>

              {actionCount > 0 && (
                /* Hidden until hover, but focus-within brings the cluster back
                   so it is reachable by keyboard rather than mouse-only. */
                <span className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/role:opacity-100 md:flex">
                  {canCopy && (
                    <button
                      type="button"
                      onClick={() => requestDuplicate(r)}
                      aria-label={`Copy ${r.name}`}
                      title={`Copy ${r.name} into a new role`}
                      className="rounded p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => requestEdit(r)}
                      aria-label={`Rename ${r.name}`}
                      title={`Rename ${r.name}`}
                      className="rounded p-1 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => requestDelete(r)}
                      aria-label={`Delete ${r.name}`}
                      title={`Delete ${r.name}`}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              )}
              </div>
            );
          })}

        {!isLoading && !q && unused.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {showAll
              ? "Hide roles nobody holds"
              : `Show ${unused.length} role${unused.length === 1 ? "" : "s"} nobody holds`}
          </button>
        )}

        {!isLoading && visible.length === 0 && (
          <p className="px-1.5 py-4 text-sm text-muted-foreground">
            {q ? `No role matches “${roleSearch}”.` : "No roles are held on this project yet."}
          </p>
        )}
      </div>

      {/* Outside the scrolling list on purpose: with 30 roles above it, a
          button that scrolls away is one nobody finds. */}
      {canManageRoles && (
        <button
          type="button"
          onClick={requestCreate}
          className="mr-3 mt-2 flex shrink-0 items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4 shrink-0" />
          New role
        </button>
      )}
    </div>
  );
}
