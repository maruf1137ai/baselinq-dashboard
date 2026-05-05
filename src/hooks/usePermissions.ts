import { useCurrentUser } from "./useCurrentUser";
import { useEffectivePermissions } from "./useEffectivePermissions";
import { PermissionKey } from "@/lib/roleUtils";

/**
 * Central permissions hook — backed by the DB permission matrix.
 *
 * Settings are gated by three codes:
 *   settings.view  → read-only access to every page in Settings (incl. project details)
 *   settings.edit  → edit everything in Settings EXCEPT project details
 *   project.edit   → view AND update project details (Project Details + Site Settings)
 *
 * Finance is gated by three codes:
 *   finance.view             → read-only access to every Finance page
 *   finance.edit             → edit everything in Finance (cost ledger, payment certs, VOs, budget)
 *   finance.approve_payment  → final sign-off on payment certificates (independent)
 *
 * Some legacy flag names map to multiple codes (OR semantics) so the right
 * users can still pass route gates. While permissions are loading, all flags
 * return `true` to prevent false redirects during page reload.
 */

// A flag may resolve to a single permission code (AND), or an array (OR).
const FLAG_TO_CODE: Record<PermissionKey, string | readonly string[]> = {
  // Module access
  viewCompliance:      "compliance.view",
  viewFinance:         "finance.view",
  viewAudit:           "audit.view",
  viewProgramme:       "programme.view",
  // Settings — page-level access: any of the 3 settings codes grants entry
  viewSettings:        ["settings.view", "settings.edit", "project.edit"],
  editSettings:        "settings.edit",
  // Settings — read-only views: settings.view OR settings.edit (NOT project.edit alone)
  viewBilling:         ["settings.view", "settings.edit"],
  viewPermissions:     ["settings.view", "settings.edit"],
  // Settings — edit-anything-non-project actions: settings.edit only
  editTeamRoles:       "settings.edit",
  manageTeam:          "settings.edit",
  manageSettings:      "settings.edit",
  manageIntegrations:  "settings.edit",
  editPermissions:     "settings.edit",
  manageRoles:         "settings.edit",
  addTeamMember:       "settings.edit",
  removeTeamMember:    "settings.edit",
  editTeamMember:      "settings.edit",
  manageAssociatedCompanies: "settings.edit",
  addCompanyMember:          "settings.edit",
  editCompanyMember:         "settings.edit",
  // Project
  createProject:       "project.create",
  editProject:         "project.edit",
  // Tasks
  createTasks:         "task.create",
  // Meetings — 2 codes
  scheduleMeeting:     "meeting.schedule",
  updateMeeting:       "meeting.update",
  // Finance — legacy sub-tab flags now collapse to finance.view / finance.edit
  viewCostLedger:         "finance.view",
  editCostLedger:         "finance.edit",
  viewPaymentCertificate: "finance.view",
  editPaymentCertificate: "finance.edit",
  viewVariationOrder:     "finance.view",
  editVariationOrder:     "finance.edit",
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
    if (Array.isArray(code)) return code.some((c) => perm(c));
    return perm(code as string);
  };

  // Composite settings flags
  const canViewSettings = perm("settings.view") || perm("settings.edit") || perm("project.edit");
  const canEditSettings = isOrgAdmin || perm("settings.edit");
  const canEditProject  = isOrgAdmin || perm("project.edit");
  // Read access to non-project settings sub-pages (billing, permissions, etc.)
  const canReadSettingsCore = perm("settings.view") || perm("settings.edit");

  // Finance flags — edit implies view
  const canViewFinance     = perm("finance.view") || perm("finance.edit");
  const canEditFinance     = isOrgAdmin || perm("finance.edit");
  const canApprovePayment  = isOrgAdmin || perm("finance.approve_payment");

  return {
    isLoading,
    isOrgAdmin,
    can,
    // Module access
    canViewCompliance:     perm("compliance.view"),
    canViewAudit:          perm("audit.view"),
    canViewProgramme:      perm("programme.view"),
    // Settings — 3 primary flags
    canViewSettings,
    canEditSettings,
    canEditProject,
    // Legacy settings flags
    canEditTeamRoles:      canEditSettings,
    canManageTeam:         canEditSettings,
    canManageSettings:     canEditSettings,
    canViewBilling:        canReadSettingsCore,
    canManageIntegrations: canEditSettings,
    canViewPermissions:    canReadSettingsCore,
    canEditPermissions:    canEditSettings,
    canManageRoles:        canEditSettings,
    canAddTeamMember:      canEditSettings,
    canRemoveTeamMember:   canEditSettings,
    canEditTeamMember:     canEditSettings,
    canManageAssociatedCompanies: canEditSettings,
    canAddCompanyMember:          canEditSettings,
    canEditCompanyMember:         canEditSettings,
    // Project
    canCreateProject:      perm("project.create"),
    // Tasks
    canCreateTasks:        perm("task.create"),
    // Meetings — 2 flags
    canScheduleMeeting:    isOrgAdmin || perm("meeting.schedule"),
    canUpdateMeeting:      isOrgAdmin || perm("meeting.update"),
    // Finance — 3 primary flags
    canViewFinance,
    canEditFinance,
    canApprovePayment,
    // Legacy finance flags — all collapse to view/edit
    canViewCostLedger:         canViewFinance,
    canEditCostLedger:         canEditFinance,
    canViewPaymentCertificate: canViewFinance,
    canEditPaymentCertificate: canEditFinance,
    canViewVariationOrder:     canViewFinance,
    canEditVariationOrder:     canEditFinance,
  };
}
