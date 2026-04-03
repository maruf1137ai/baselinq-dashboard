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
  ADMIN:          "CLIENT",
  PROJECT_ADMIN:  "CPM",
  PRINCIPAL_PM:   "PM",
  SUPER_USER:     "CPM",
  QS:             "CQS",
  STANDARD:       "SE",
  STRUCT_ENG:     "SE",
  MECH_ENG:       "SE",
  ELEC_ENG:       "SE",
  SPECIAL_USER:   "PM",
  LIMITED:        "FOREMAN",
  VIEWER:         "FOREMAN",
  LIMITED_VIEWER: "FOREMAN",
  LEGAL:          "CONTRACTS_MGR",
};

// New role display names → code (so display-name lookups also resolve)
export const NEW_ROLE_DISPLAY_TO_CODE: Record<string, string> = {
  "Administrator":          "ADMIN",
  "Admin":                  "ADMIN",
  "Project Administrator":  "PROJECT_ADMIN",
  "Project Admin":          "PROJECT_ADMIN",
  "Principal / PM":         "PRINCIPAL_PM",
  "Principal/PM":           "PRINCIPAL_PM",
  "Super User":             "SUPER_USER",
  "Quantity Surveyor":      "QS",
  "Standard User":          "STANDARD",
  "Standard":               "STANDARD",
  "Structural Engineer":    "STRUCT_ENG",
  "Mechanical Engineer":    "MECH_ENG",
  "Electrical Engineer":    "ELEC_ENG",
  "Special User":           "SPECIAL_USER",
  "Limited User":           "LIMITED",
  "Viewer":                 "VIEWER",
  "Limited Viewer":         "LIMITED_VIEWER",
  "Legal":                  "LEGAL",
};

/**
 * Feature permission definitions.
 * Each key maps to the backbone role codes that are allowed to access it.
 * VIEWER / LIMITED / FOREMAN are read-only — not listed in write/manage permissions.
 */
export const PERMISSIONS = {
  // Page-level access
  viewCompliance:    ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "ARCH", "CQS", "CONS_PLANNER", "PLANNER"],
  viewFinance:       ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "CQS"],
  viewAudit:         ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR"],
  viewProgramme:     ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR", "ARCH", "CQS", "CONS_PLANNER", "PLANNER", "SE", "SS"],
  // Settings actions
  editTeamRoles:     ["CLIENT", "CPM", "PM", "CM"],
  manageTeam:        ["CLIENT", "CPM", "PM", "CM", "CONTRACTS_MGR"],
  manageSettings:    ["CLIENT", "CPM", "PM"],
  viewBilling:       ["CLIENT", "CPM"],
  manageIntegrations:["CLIENT", "CPM", "PM"],
  // Project actions
  createProject:     ["CLIENT", "CPM", "PM", "CM"],
  editProject:       ["CLIENT", "CPM", "PM", "CM"],
  // Task actions
  createTasks:       ["CLIENT", "CPM", "PM", "CM", "ARCH", "CQS", "CONTRACTS_MGR", "CONS_PLANNER", "PLANNER"],
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

  // Direct code lookup (e.g. "ADMIN" → "CLIENT")
  if (NEW_ROLE_PERMISSION_MAP[upper]) return NEW_ROLE_PERMISSION_MAP[upper];

  // Display name lookup (e.g. "Quantity Surveyor" → code "QS" → "CQS")
  const code = NEW_ROLE_DISPLAY_TO_CODE[trimmed];
  if (code) return NEW_ROLE_PERMISSION_MAP[code] ?? code;

  // Unknown / backbone roles pass through uppercased
  return upper;
}
