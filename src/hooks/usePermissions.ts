import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { PERMISSIONS_CHANGED_EVENT } from "./useUserEventSocket";
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
  // Documents — route-level gates
  viewDocuments:       "document.view",
  uploadDocument:      "document.upload",
  // Finance — legacy sub-tab flags now collapse to finance.view / finance.edit
  viewCostLedger:         "finance.view",
  editCostLedger:         "finance.edit",
  viewPaymentCertificate: "finance.view",
  editPaymentCertificate: "finance.edit",
  viewVariationOrder:     "finance.view",
  editVariationOrder:     "finance.edit",
  // Roles & Permissions — its own category, decoupled from settings.*
  // (see user/migrations/0059_seed_roles_permission_category.py). Default
  // access: Administrator, Principal Agent, Project Manager, Super User
  // only — no isOrgAdmin bypass, unlike every settings.* flag above.
  viewRolesPermissions: ["roles.view", "roles.edit"],
  editRolesPermissions: "roles.edit",
};

/**
 * Refetch this user's permissions the moment an admin changes them.
 *
 * Without it the change lands on the server and the browser keeps the old
 * answer until something else forces a refetch — the button stays until the
 * API refuses it, which reads as a bug rather than a permission.
 *
 * Lives here rather than in the socket hook so every page that asks about
 * permissions gets it, not only the ones that open a socket for some other
 * reason.
 */
function useInvalidateOnPermissionChange() {
  const qc = useQueryClient();
  useEffect(() => {
    const handler = () => {
      qc.invalidateQueries({ queryKey: ["effective-perms"] });
      // Roles & Permissions is showing the very matrix that changed.
      qc.invalidateQueries({ queryKey: ["role-matrix"] });
      // A surface just hidden or revealed changes how many unreads the
      // bell/sidebar should be counting — see unread_summary's permission
      // filter on the backend.
      qc.invalidateQueries({ queryKey: ["unread-summary"] });
    };
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PERMISSIONS_CHANGED_EVENT, handler);
  }, [qc]);
}

export function usePermissions() {
  useInvalidateOnPermissionChange();
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
  // Deliberately NOT escalated by isOrgAdmin: cost_ledger/views.py and
  // tasks/views_payments.py never honor account_type=="organisation" for
  // finance actions, so the bypass only ever showed edit/approve controls
  // that would 403 on submit — pure dead-end UX, no real access lost here.
  const canEditFinance     = perm("finance.edit");
  const canApprovePayment  = perm("finance.approve_payment");

  // ── The three certificate-stage codes ────────────────────────────────────
  //
  // These are the codes the SERVER checks per transition
  // (`tasks/pc_workflow.py::TRANSITION_PERMISSIONS`), and not one of them is
  // `finance.approve_payment` — that code reverses a RECORDED PAYMENT
  // (`tasks/views_payments.py`) and answers no question about certifying.
  // They are read here so the homepage can show a person the certificate acts
  // they can actually perform, instead of showing every finance viewer the
  // principal agent's job.
  //
  // `finance.approve_certificate` is granted to PRINCIPAL_PM alone
  // (user/migrations/0040_pc_single_approve_permission.py), which is what makes
  // "awaiting your certification" an answerable question at all.
  //
  // Deliberately NOT escalated by `isOrgAdmin`: an organisation admin is an
  // account-level role, certifying is a project-level appointment, and the
  // server does not treat the one as the other.
  const canCertifyCertificate = perm("finance.approve_certificate");
  const canPostCertificate    = perm("finance.post_certificate");
  const canPrepareCertificate = perm("finance.create_certificate");

  // Serving or cancelling a contractual notice-deadline clock — PM /
  // Principal Agent by default (risk/views_evidence.py::TimeBarActionView,
  // backed by `risk.timebar.manage`, user/migrations/0064). Read directly,
  // like the three certificate-stage flags above, since nothing routes on
  // it — only the Home "Needs You" queue and TimeBarsTab's own buttons
  // gate on this flag.
  const canManageTimeBars = perm("risk.timebar.manage");

  // Folder filing — create/delete a folder (documents/permissions.py::
  // can_manage_folders, backed by document.manage). Read directly, like
  // canManageTimeBars above, since nothing routes on it — only inline
  // folder actions in the Documents page gate on this flag.
  const canManageFolders = perm("document.manage");

  // Roles & Permissions — deliberately NOT OR'd with isOrgAdmin or
  // canEditSettings: this is its own category with its own, stricter
  // default (Administrator/Principal Agent/Project Manager/Super User),
  // not a subset of general Settings access.
  const canViewRolesPermissions = perm("roles.view") || perm("roles.edit");
  const canEditRolesPermissions = perm("roles.edit");

  return {
    isLoading,
    isOrgAdmin,
    can,
    // Module access
    canViewCompliance:     perm("compliance.view"),
    canViewAudit:          perm("audit.view"),
    canViewProgramme:      perm("programme.view"),
    // full_visibility (fees.view_all) implies can-view-other, same invariant
    // discipline.py::visibility_context() enforces server-side — without the
    // OR here, a role granted only fees.view_all (e.g. PRINCIPAL_PM) sees no
    // discipline picker at all, even though the backend already serves them
    // every discipline's data.
    canViewOtherDisciplines:  perm("programme.discipline.other.view") || perm("programme.discipline.fees.view_all"),
    canViewAllDisciplineFees: perm("programme.discipline.fees.view_all"),
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
    // Documents — route-level gates
    canViewDocuments:      perm("document.view"),
    canUploadDocument:     perm("document.upload"),
    // Documents — inline folder-filing actions (not a route gate)
    canManageFolders,
    // Meetings — 2 flags
    canScheduleMeeting:    isOrgAdmin || perm("meeting.schedule"),
    canUpdateMeeting:      isOrgAdmin || perm("meeting.update"),
    // Finance — 3 primary flags
    canViewFinance,
    canEditFinance,
    canApprovePayment,
    // Finance — the certificate stages, one code per act
    canCertifyCertificate,
    canPostCertificate,
    canPrepareCertificate,
    // Risk / notice deadlines — serve or cancel a time-bar clock
    canManageTimeBars,
    // Legacy finance flags — all collapse to view/edit
    canViewCostLedger:         canViewFinance,
    canEditCostLedger:         canEditFinance,
    canViewPaymentCertificate: canViewFinance,
    canEditPaymentCertificate: canEditFinance,
    canViewVariationOrder:     canViewFinance,
    canEditVariationOrder:     canEditFinance,
    // Roles & Permissions — own category, see FLAG_TO_CODE comment above.
    canViewRolesPermissions,
    canEditRolesPermissions,
  };
}
