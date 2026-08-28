/**
 * The roles list, rendered inside the main sidebar while on /roles-permissions.
 *
 * This is the same list that used to be a second column inside the page. Moving
 * it into the sidebar is what buys the page its width back: the alternative was
 * a 256px main nav plus a 280px role column before any content started.
 *
 * The green-dot legend lives on the page (PageHeader description), not
 * here — the sidebar stays nav, nothing else.
 *
 * Collapsed (icon-rail) state still has to work, because the rail is a global
 * affordance the user can toggle from the header on any page. At 3rem there is
 * no room for names, so the list degrades to code stubs with a title tooltip.
 */
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_GROUPS } from "@/lib/rolesPermissionsMock";
import { useRolesSidebar } from "./RolesSidebarContext";

export function RolesNav() {
  const ctx = useRolesSidebar();
  const { open } = useSidebar();

  // Rendered only from inside the provider, but the sidebar is shared code —
  // stay defensive rather than assume.
  if (!ctx) return null;

  const { selectedRole, selectRole, roleSearch, setRoleSearch } = ctx;

  const q = roleSearch.trim().toLowerCase();
  const visibleRoles = q
    ? ROLES.filter(
        (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
      )
    : ROLES;

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        {ROLES.map((r) => {
          const active = r.code === selectedRole;
          return (
            <button
              key={r.code}
              type="button"
              title={`${r.name} — ${r.users || "no"} user${r.users === 1 ? "" : "s"}`}
              onClick={() => selectRole(r.code)}
              aria-current={active}
              className={cn(
                "relative h-7 w-7 shrink-0 rounded-md text-[10px] font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {r.code.slice(0, 2)}
              {r.users > 0 && (
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
          placeholder={`Search ${ROLES.length} roles…`}
          className="h-8 pl-8 text-sm"
          aria-label="Search roles"
        />
      </div>

      <div className="subtle-scrollbar flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2">
        {ROLE_GROUPS.map((groupName) => {
          const inGroup = visibleRoles.filter((r) => r.group === groupName);
          if (inGroup.length === 0) return null;
          return (
            <div key={groupName}>
              <h4 className="mb-1 px-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {groupName}
              </h4>
              <div className="space-y-0.5">
                {inGroup.map((r) => {
                  const active = r.code === selectedRole;
                  return (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => selectRole(r.code)}
                      aria-current={active}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          r.users > 0 ? "bg-green-600" : "bg-border",
                        )}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{r.name}</span>
                      <span
                        className={cn(
                          "shrink-0 text-[11px] tabular-nums",
                          r.users > 0 ? "text-muted-foreground" : "text-muted-foreground/50",
                        )}
                      >
                        {r.users}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {visibleRoles.length === 0 && (
          <p className="px-1.5 py-4 text-sm text-muted-foreground">
            No role matches “{roleSearch}”.
          </p>
        )}
      </div>
    </div>
  );
}
