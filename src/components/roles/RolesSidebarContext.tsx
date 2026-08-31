/**
 * Shared state for the Roles & Permissions contextual sidebar.
 *
 * On /roles-permissions the main sidebar swaps its nav for the roles list —
 * the same swap DashboardSidebar already does for /account. The list lives in
 * the sidebar but the selection drives the page, so both need one source of
 * truth, which is this.
 *
 * The provider is mounted by RolesPermissions ABOVE DashboardLayout, which is
 * what puts DashboardSidebar inside it. Every other page renders the sidebar
 * with no provider above it, so useRolesSidebar() returns null there and the
 * sidebar keeps its normal nav. That null is the "not on this page" signal, not
 * an error.
 *
 * Roles are passed down rather than fetched here: the page needs the same list
 * to resolve the selected role, and two components fetching it independently is
 * how the sidebar and the content end up disagreeing about which role is open.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { ApiRole } from "@/hooks/useRolePermissions";

/** Which nav the sidebar is showing while we sit on /roles-permissions. */
export type RolesNavMode = "roles" | "main";

export interface RolesSidebarValue {
  roles: ApiRole[];
  isLoading: boolean;
  selectedRoleId: number | null;
  selectRole: (id: number) => void;
  roleSearch: string;
  setRoleSearch: (q: string) => void;
  /** Users holding each role on this project, keyed by role code. */
  holders: Record<string, string[]>;
  /** True when the viewer may delete roles — the button is hidden otherwise. */
  canManageRoles: boolean;
  /** Ask the page to open its delete dialog for this role. */
  requestDelete: (role: ApiRole) => void;
  /** Ask the page to open the copy dialog seeded from this role. */
  requestDuplicate: (role: ApiRole) => void;
  /** Ask the page to open the rename dialog. Custom roles only. */
  requestEdit: (role: ApiRole) => void;
  /** Ask the page to open the create dialog, from scratch. */
  requestCreate: () => void;
  navMode: RolesNavMode;
  setNavMode: (mode: RolesNavMode) => void;
}

const RolesSidebarContext = createContext<RolesSidebarValue | null>(null);

/** Returns null when the caller is not underneath the provider. */
export function useRolesSidebar(): RolesSidebarValue | null {
  return useContext(RolesSidebarContext);
}

interface Props {
  roles: ApiRole[];
  isLoading: boolean;
  selectedRoleId: number | null;
  onSelectRole: (id: number) => void;
  holders: Record<string, string[]>;
  canManageRoles: boolean;
  onRequestDelete: (role: ApiRole) => void;
  onRequestDuplicate: (role: ApiRole) => void;
  onRequestEdit: (role: ApiRole) => void;
  onRequestCreate: () => void;
  children: ReactNode;
}

export function RolesSidebarProvider({
  roles,
  isLoading,
  selectedRoleId,
  onSelectRole,
  holders,
  canManageRoles,
  onRequestDelete,
  onRequestDuplicate,
  onRequestEdit,
  onRequestCreate,
  children,
}: Props) {
  const [roleSearch, setRoleSearch] = useState("");
  const [navMode, setNavMode] = useState<RolesNavMode>("roles");

  const value = useMemo<RolesSidebarValue>(
    () => ({
      roles,
      isLoading,
      selectedRoleId,
      selectRole: onSelectRole,
      roleSearch,
      setRoleSearch,
      holders,
      canManageRoles,
      requestDelete: onRequestDelete,
      requestDuplicate: onRequestDuplicate,
      requestEdit: onRequestEdit,
      requestCreate: onRequestCreate,
      navMode,
      setNavMode,
    }),
    [
      roles,
      isLoading,
      selectedRoleId,
      onSelectRole,
      holders,
      canManageRoles,
      onRequestDelete,
      onRequestDuplicate,
      onRequestEdit,
      onRequestCreate,
      roleSearch,
      navMode,
    ],
  );

  return (
    <RolesSidebarContext.Provider value={value}>{children}</RolesSidebarContext.Provider>
  );
}
