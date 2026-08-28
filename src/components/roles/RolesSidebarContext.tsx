/**
 * Shared state for the Roles & Permissions contextual sidebar.
 *
 * On /roles-permissions the main sidebar swaps its nav out for the roles list
 * (the same swap DashboardSidebar already does for /account). The list lives
 * in the sidebar but the selection drives the page, so both need one source of
 * truth — that is this context.
 *
 * The provider is mounted by RolesPermissions ABOVE DashboardLayout, which is
 * what puts DashboardSidebar inside it. Every other page renders the sidebar
 * with no provider above it, so useRolesSidebar() returns null there and the
 * sidebar keeps its normal nav. That null is the "not on this page" signal —
 * it is not an error.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** Which nav the sidebar is showing while we sit on /roles-permissions. */
export type RolesNavMode = "roles" | "main";

export interface RolesSidebarValue {
  selectedRole: string;
  selectRole: (code: string) => void;
  roleSearch: string;
  setRoleSearch: (q: string) => void;
  navMode: RolesNavMode;
  setNavMode: (mode: RolesNavMode) => void;
}

const RolesSidebarContext = createContext<RolesSidebarValue | null>(null);

/** Returns null when the caller is not underneath the provider. */
export function useRolesSidebar(): RolesSidebarValue | null {
  return useContext(RolesSidebarContext);
}

interface Props {
  selectedRole: string;
  onSelectRole: (code: string) => void;
  children: ReactNode;
}

export function RolesSidebarProvider({ selectedRole, onSelectRole, children }: Props) {
  const [roleSearch, setRoleSearch] = useState("");
  const [navMode, setNavMode] = useState<RolesNavMode>("roles");

  const value = useMemo<RolesSidebarValue>(
    () => ({
      selectedRole,
      selectRole: onSelectRole,
      roleSearch,
      setRoleSearch,
      navMode,
      setNavMode,
    }),
    [selectedRole, onSelectRole, roleSearch, navMode],
  );

  return (
    <RolesSidebarContext.Provider value={value}>{children}</RolesSidebarContext.Provider>
  );
}
