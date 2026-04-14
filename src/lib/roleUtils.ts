/**
 * Role permission resolution utilities.
 *
 * New role codes are mapped to an existing "backbone" code that carries the
 * actual permission rules. This lets you add new roles without touching every
 * permission check across the app — just extend NEW_ROLE_PERMISSION_MAP here
 * and everything resolves automatically.
 *
 * NEVER remove or rename backbone codes (CLIENT, CPM, PM, CM, CONTRACTS_MGR,
 * ARCH, CQS, CONS_PLANNER, PLANNER, SE, SS, FOREMAN). Only add new mappings.
 */

// New role code → backbone permission code
export const NEW_ROLE_PERMISSION_MAP: Record<string, string> = {
  ADMIN: "CLIENT",
  PROJECT_ADMIN: "CPM",
  PRINCIPAL_PM: "PM",
  SUPER_USER: "CPM",
  QS: "CQS",
  STANDARD: "SE",
  // STRUCT_ENG, MECH_ENG, ELEC_ENG are now separate backbone roles (not mapped to SE)
  // This prevents them from inheriting SE's SI creation permission
  SPECIAL_USER: "PM",
  LIMITED: "FOREMAN",
  VIEWER: "FOREMAN",
  LIMITED_VIEWER: "FOREMAN",
  LEGAL: "CONTRACTS_MGR",
};

// New role display names → code (so display-name lookups also resolve)
export const NEW_ROLE_DISPLAY_TO_CODE: Record<string, string> = {
  "Administrator": "ADMIN",
  "Admin": "ADMIN",
  "Project Administrator": "PROJECT_ADMIN",
  "Project Admin": "PROJECT_ADMIN",
  "Principal / PM": "PRINCIPAL_PM",
  "Principal/PM": "PRINCIPAL_PM",
  "Super User": "SUPER_USER",
  "Quantity Surveyor": "QS",
  "Standard User": "STANDARD",
  "Standard": "STANDARD",
  "Structural Engineer": "STRUCT_ENG",
  "Mechanical Engineer": "MECH_ENG",
  "Electrical Engineer": "ELEC_ENG",
  "Special User": "SPECIAL_USER",
  "Limited User": "LIMITED",
  "Viewer": "VIEWER",
  "Limited Viewer": "LIMITED_VIEWER",
  "Legal": "LEGAL",
};

/**
 * Backbone role display names → backbone code.
 * Handles cases where roleName is stored as the full display name
 * (e.g. "Client Project Manager") instead of the code ("CPM").
 */
export const BACKBONE_DISPLAY_TO_CODE: Record<string, string> = {
  "Client / Owner": "CLIENT",
  "Client/Owner": "CLIENT",
  "Client Owner": "CLIENT",
  "Owner": "CLIENT",
  "Client Project Manager": "CPM",
  "Project Manager": "PM",
  "Construction Manager": "CM",
  "Contracts Manager": "CONTRACTS_MGR",
  "Contract Manager": "CONTRACTS_MGR",
  "Architect": "ARCH",
  "Consultant Quantity Surveyor": "CQS",
  "Consultant Planning Engineer": "CONS_PLANNER",
  "Planning Engineer": "PLANNER",
  "Site Engineer": "SE",
  "Site Supervisor": "SS",
  "Foreman": "FOREMAN",
};

/**
 * Feature permission definitions.
 * Each key maps to the backbone role codes that are allowed to access it.
 * VIEWER / LIMITED / FOREMAN are read-only — not listed in write/manage permissions.
 */
export const PERMISSIONS = {
  // Page-level access
  viewCompliance: ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "ARCH", "CQS", "CONS_PLANNER", "PLANNER"],
  viewFinance: ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "CQS"],
  viewAudit: ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR"],
  viewProgramme: ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "CQS"],
  viewSettings: ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "ARCH"],
  // Settings actions
  editTeamRoles: ["CLIENT", "CPM", "PM", "CM"],
  manageTeam: ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR"],
  manageSettings: ["CLIENT", "CPM", "PM"],
  viewBilling: ["CLIENT", "CPM"],
  manageIntegrations: ["CLIENT", "CPM", "PM"],
  // Project actions
  createProject: ["CLIENT", "CPM", "PM", "CM"],
  editProject: ["CLIENT", "CPM", "PM", "CM"],
  // Task actions
  createTasks: ["CLIENT", "CPM", "PM", "CM", "ARCH", "CQS", "CONTRACTS_MGR", "CONS_PLANNER", "PLANNER"],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Resolve a role string (code or display name) to its backbone permission code.
 * - "ADMIN"                → "CLIENT"
 * - "QS"                   → "CQS"
 * - "Quantity Surveyor"    → "CQS"
 * - "Architect"            → "ARCH"  (backbone — passes through)
 * - "CPM"                  → "CPM"   (backbone — passes through)
 */
export function resolvePermissionCode(role: string): string {
  if (!role) return role;
  const trimmed = role.trim();
  const upper = trimmed.toUpperCase();

  // Direct code lookup (e.g. "ADMIN" → "CLIENT", "CPM" → "CPM")
  if (NEW_ROLE_PERMISSION_MAP[upper]) return NEW_ROLE_PERMISSION_MAP[upper];

  // New role display name lookup (e.g. "Quantity Surveyor" → "QS" → "CQS")
  const newCode = NEW_ROLE_DISPLAY_TO_CODE[trimmed];
  if (newCode) return NEW_ROLE_PERMISSION_MAP[newCode] ?? newCode;

  // Backbone role display name lookup (e.g. "Client Project Manager" → "CPM")
  const backboneCode = BACKBONE_DISPLAY_TO_CODE[trimmed];
  if (backboneCode) return backboneCode;

  // Unknown / backbone codes pass through uppercased (e.g. "CPM" → "CPM")
  return upper;
}

/**
 * Check if a role has permission for a specific feature.
 * Automatically resolves new/display roles to backbone codes.
 */
export function hasPermission(role: string | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  const backbone = resolvePermissionCode(role);
  return (PERMISSIONS[permission] as readonly string[]).includes(backbone);
}

// ── Company Types & Role Filtering ───────────────────────────────────────────

export const COMPANY_TYPES = [
  "Architectural", "Civil Engineering", "Construction Management",
  "Electrical Engineering", "Environmental Consulting", "General Contractor",
  "Interior Design", "Landscape Architecture", "Legal & Compliance",
  "Mechanical Engineering", "Project Management", "Quantity Surveying",
  "Structural Engineering", "Urban Planning", "Other",
];

/**
 * Maps each company type to the role codes that are relevant to it.
 * When a company type is selected, only the roles listed here should appear
 * in the Professional Role dropdown. "Other" / empty → show all roles.
 */
export const COMPANY_TYPE_ROLE_CODES: Record<string, string[]> = {
  "Architectural": ["ARCH"],
  "Civil Engineering": ["CE", "SE"],
  "Construction Management": ["CM", "CONTRACTS_MGR", "SM", "SS", "FOREMAN"],
  "Electrical Engineering": ["ELEC_ENG", "MEP"],
  "Environmental Consulting": ["SO", "OTHER"],
  "General Contractor": ["CIDB", "SM", "SS", "FOREMAN", "SE"],
  "Interior Design": ["ARCH", "OTHER"],
  "Landscape Architecture": ["ARCH", "OTHER"],
  "Legal & Compliance": ["LEGAL", "OTHER"],
  "Mechanical Engineering": ["MECH_ENG", "MEP"],
  "Project Management": ["PM", "CPM", "CONS_PLANNER", "PLANNER"],
  "Quantity Surveying": ["QS", "CQS"],
  "Structural Engineering": ["STRUCT_ENG"],
  "Urban Planning": ["PLANNER", "OTHER"],
  "Other": [], // empty = show all roles
};

/**
 * Filter a list of roles by company type.
 * Returns all roles if the company type is empty, "Other", or not found.
 */
export function filterRolesByCompanyType(
  roles: { code: string; name: string }[],
  companyType: string,
): { code: string; name: string }[] {
  if (!companyType || companyType === "Other") return roles;
  const allowed = COMPANY_TYPE_ROLE_CODES[companyType];
  if (!allowed || allowed.length === 0) return roles;
  return roles.filter((r) => allowed.includes(r.code));
}

// Hierarchy level (higher = more authority)
export const ROLE_HIERARCHY: Record<string, number> = {
  CLIENT: 100,
  CPM: 90,
  PM: 80,
  CM: 60,
  CONTRACTS_MGR: 55,
  ARCH: 50,
  CQS: 45,
  CONS_PLANNER: 44,
  PLANNER: 40,
  SE: 30,
  // Engineer roles (separate from SE)
  STRUCT_ENG: 30,
  MECH_ENG: 30,
  ELEC_ENG: 30,
  SS: 25,
  FOREMAN: 20,
};

/**
 * Check if an actor can manage (remove/edit) a target member based on roles.
 * Mirrored from backend role_permissions.py.
 */
export function canManageMember(actorRole: string | undefined | null, targetRole: string | undefined | null): boolean {
  if (!actorRole || !targetRole) return false;
  const actor = resolvePermissionCode(actorRole);
  const target = resolvePermissionCode(targetRole);

  if (actor === "CLIENT") return true;
  if (actor === "CPM") return target !== "CLIENT";

  const actorLevel = ROLE_HIERARCHY[actor] || 0;
  const targetLevel = ROLE_HIERARCHY[target] || 0;

  // Specific rules for mid-level managers
  if (actor === "PM") return target !== "CLIENT" && targetLevel < ROLE_HIERARCHY.PM;
  if (actor === "CM") return ["SE", "SS", "FOREMAN"].includes(target);
  if (actor === "CONTRACTS_MGR") return ["SE", "SS", "FOREMAN", "PLANNER"].includes(target);

  return false;
}
