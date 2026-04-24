import { useCurrentUser } from "./useCurrentUser";
import { useEffectivePermissions } from "./useEffectivePermissions";
import { PermissionKey } from "@/lib/roleUtils";

/**
 * Central permissions hook — backed by the DB permission matrix.
 *
 * Each flag maps to a permission code that is resolved server-side via
 * `has_perm(user, code, project)`.  Admins can edit the matrix from
 * Settings → Role Permissions and changes take effect immediately.
 *
 * While permissions are loading, all flags return `true` to prevent false
 * redirects during page reload before auth data is available.
 */

// Map legacy flag names to DB permission codes
const FLAG_TO_CODE: Record<PermissionKey, string> = {
  viewCompliance:      "compliance.view",
  viewFinance:         "finance.view",
  viewAudit:           "audit.view",
  viewProgramme:       "programme.view",
  viewSettings:        "settings.view",
  editTeamRoles:       "settings.team.roles.edit",
  manageTeam:          "settings.team.manage",
  manageSettings:      "settings.manage",
  viewBilling:         "settings.billing.view",
  manageIntegrations:  "settings.integrations.manage",
  createProject:       "project.create",
  editProject:         "project.edit",
  createTasks:         "task.create",
};

export function usePermissions() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const isOrgAdmin = user?.account_type === "organisation";

  const projectId =
    parseInt(localStorage.getItem("selectedProjectId") || "0") || null;

  const { data: effectivePerms, isLoading: permsLoading } =
    useEffectivePermissions(projectId);

  const isLoading = userLoading || permsLoading;

  const perm = (code: string): boolean => {
    if (isLoading) return true;
    return effectivePerms?.permissions?.[code] ?? false;
  };

  const can = (permission: PermissionKey): boolean => {
    const code = FLAG_TO_CODE[permission];
    return perm(code);
  };

  return {
    isLoading,
    isOrgAdmin,
    can,
    canViewCompliance:     perm("compliance.view"),
    canViewFinance:        perm("finance.view"),
    canViewAudit:          perm("audit.view"),
    canViewProgramme:      perm("programme.view"),
    canViewSettings:       perm("settings.view"),
    canEditTeamRoles:      perm("settings.team.roles.edit"),
    canManageTeam:         isOrgAdmin || perm("settings.team.manage"),
    canManageSettings:     perm("settings.manage"),
    canViewBilling:        perm("settings.billing.view"),
    canManageIntegrations: perm("settings.integrations.manage"),
    canCreateProject:      perm("project.create"),
    canEditProject:        isOrgAdmin || perm("project.edit"),
    canCreateTasks:        perm("task.create"),
  };
}
