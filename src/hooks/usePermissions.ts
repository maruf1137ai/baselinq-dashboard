import { useCurrentUser } from "./useCurrentUser";
import { useEffectivePermissions } from "./useEffectivePermissions";
import { PermissionKey } from "@/lib/roleUtils";

/**
 * Central permissions hook — backed by the DB permission matrix.
 *
 * Settings are gated by two codes only:
 *   settings.view  → read-only access to everything in Settings
 *   settings.edit  → full edit access to everything in Settings
 *
 * All legacy flag names are preserved so existing components need no changes.
 * While permissions are loading, all flags return `true` to prevent false
 * redirects during page reload before auth data is available.
 */

const FLAG_TO_CODE: Record<PermissionKey, string> = {
  viewCompliance:      "compliance.view",
  viewFinance:         "finance.view",
  viewAudit:           "audit.view",
  viewProgramme:       "programme.view",
  viewSettings:        "settings.view",
  editSettings:        "settings.edit",
  // Legacy settings flags — all resolve to the 2 new codes
  editTeamRoles:       "settings.edit",
  manageTeam:          "settings.edit",
  manageSettings:      "settings.edit",
  viewBilling:         "settings.edit",
  manageIntegrations:  "settings.edit",
  viewPermissions:     "settings.view",
  editPermissions:     "settings.edit",
  manageRoles:         "settings.edit",
  addTeamMember:       "settings.edit",
  removeTeamMember:    "settings.edit",
  editTeamMember:      "settings.edit",
  manageAssociatedCompanies: "settings.edit",
  addCompanyMember:          "settings.edit",
  editCompanyMember:         "settings.edit",
  // Non-settings flags unchanged
  createProject:       "project.create",
  editProject:         "project.edit",
  createTasks:         "task.create",
  viewCostLedger:         "finance.cost_ledger.view",
  editCostLedger:         "finance.cost_ledger.edit",
  viewPaymentCertificate: "finance.payment_certificate.view",
  editPaymentCertificate: "finance.payment_certificate.edit",
  viewVariationOrder:     "finance.variation_order.view",
  editVariationOrder:     "finance.variation_order.edit",
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

  // settings.edit implies settings.view — check both so edit-tier users can always see settings
  const canViewSettings = perm("settings.view") || perm("settings.edit");
  const canEditSettings = isOrgAdmin || perm("settings.edit");

  return {
    isLoading,
    isOrgAdmin,
    can,
    // Module access
    canViewCompliance:     perm("compliance.view"),
    canViewFinance:        perm("finance.view"),
    canViewAudit:          perm("audit.view"),
    canViewProgramme:      perm("programme.view"),
    // Settings — 2 primary flags
    canViewSettings,
    canEditSettings,
    // Legacy flags — all map to the 2 new settings codes
    canEditTeamRoles:      canEditSettings,
    canManageTeam:         canEditSettings,
    canManageSettings:     canEditSettings,
    canViewBilling:        canEditSettings,
    canManageIntegrations: canEditSettings,
    canViewPermissions:    canViewSettings,
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
    canEditProject:        isOrgAdmin || perm("project.edit"),
    // Tasks
    canCreateTasks:        perm("task.create"),
    // Finance
    canViewCostLedger:         perm("finance.cost_ledger.view"),
    canEditCostLedger:         perm("finance.cost_ledger.edit"),
    canViewPaymentCertificate: perm("finance.payment_certificate.view"),
    canEditPaymentCertificate: perm("finance.payment_certificate.edit"),
    canViewVariationOrder:     perm("finance.variation_order.view"),
    canEditVariationOrder:     perm("finance.variation_order.edit"),
  };
}
