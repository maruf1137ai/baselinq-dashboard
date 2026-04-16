import { useUserRoleStore } from "@/store/useUserRoleStore";
import { useCurrentUser } from "./useCurrentUser";
import { resolvePermissionCode, PERMISSIONS, PermissionKey } from "@/lib/roleUtils";

/**
 * Central permissions hook.
 *
 * Checks both the user's project-level role (from useUserRoleStore, fetched
 * per project) and their global org role (from useCurrentUser). Access is
 * granted if either role satisfies the permission.
 *
 * IMPORTANT: Always check `isLoading` before using permission flags.
 * While loading, all `can()` calls return true to prevent false redirects
 * during page reload before auth data is available.
 *
 * Usage:
 *   const { isLoading, canViewCompliance, canEditTeamRoles, can } = usePermissions();
 *   if (isLoading) return <Spinner />;
 *   if (!canViewCompliance) return <Navigate to="/unauthorized" />;
 *   {canEditTeamRoles && <button>Edit Role</button>}
 */
export function usePermissions() {
  const { userRole } = useUserRoleStore();
  const { data: user, isLoading } = useCurrentUser();

  const projectCode = resolvePermissionCode(userRole ?? "");
  const globalCode = resolvePermissionCode(user?.role?.code ?? "");

  // Org admins (account_type === 'organisation') can manage team regardless of project role
  const isOrgAdmin = user?.account_type === 'organisation';

  const can = (permission: PermissionKey): boolean => {
    // While auth is loading, allow everything — RoleRoute handles the gate
    if (isLoading) return true;

    const allowed = PERMISSIONS[permission] as readonly string[];

    // Categorize permissions
    const globalOnlyPermissions: PermissionKey[] = [
      "createProject",
      "manageSettings",
      "viewBilling"
    ];

    // 1. If it's a global-only permission, check against global role only
    if (globalOnlyPermissions.includes(permission)) {
      return allowed.includes(globalCode);
    }

    // 2. For project-level permissions: 
    //    - If user has a project-specific role, that is the strict source of truth
    if (projectCode) {
      return allowed.includes(projectCode);
    }

    //    - Fallback: If no project role is found (e.g. Org Owner viewing projects), 
    //      grant full access only if they are a global CLIENT (Owner/Super-Admin)
    if (globalCode === "CLIENT") return true;

    return false;
  };

  return {
    isLoading,
    isOrgAdmin,
    can,
    canViewCompliance: can("viewCompliance"),
    canViewFinance: can("viewFinance"),
    canViewAudit: can("viewAudit"),
    canViewProgramme: can("viewProgramme"),
    canViewSettings: can("viewSettings"),
    canEditTeamRoles: can("editTeamRoles"),
    canManageTeam: isOrgAdmin || can("manageTeam"),
    canManageSettings: can("manageSettings"),
    canViewBilling: can("viewBilling"),
    canManageIntegrations: can("manageIntegrations"),
    canCreateProject: can("createProject"),
    canEditProject: isOrgAdmin || can("editProject"),
    canCreateTasks: can("createTasks"),
  };
}
