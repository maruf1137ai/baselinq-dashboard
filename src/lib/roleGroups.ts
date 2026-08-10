/**
 * Role-code groupings for task creation forms — who should be offered as
 * "To", and who should be auto-checked into "CC" because they have
 * escalate/sign/close authority on that entity type.
 *
 * Source of truth is the backend: these three sets mirror
 * PROFESSIONAL_CODES / PM_CODES / CONTRACTOR_CODES as used for the real
 * escalation and close-authority permission checks in
 * baselinq-backend/tasks/views_werner.py. If those change, update here too
 * — there is no shared endpoint yet, so this is a manually-kept mirror.
 */

export const PROFESSIONAL_CODES = [
  "ARCH", "STRUCT_ENG", "MECH_ENG", "ELEC_ENG", "CIVIL_ENG",
  "QS", "CQS", "PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA",
];

export const PM_CODES = ["PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PA"];

export const CONTRACTOR_CODES = ["CONTRACTS_MGR", "CM", "FOREMAN", "SS", "CONTRACTOR"];

// VO Sign & Issue authority (views_signing.py SIGNING_ROLES["vo"]) — the
// closest VO equivalent to "escalate authority" since a VO is terminal,
// it doesn't escalate to anything further.
export const VO_SIGNING_CODES = ["CLIENT", ...PM_CODES];

function union(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat()));
}

/** Per task-type: who the "To" picker should be filtered to, and which
 * role codes get auto-checked into CC (escalate authority + close
 * authority combined — the CC field doesn't need to distinguish why
 * someone belongs there, just that they do). */
export const TASK_TYPE_ROLE_RULES: Record<
  string,
  { toRoleFilter: string[]; ccAutoRoles: string[] }
> = {
  rfi: {
    toRoleFilter: PROFESSIONAL_CODES,
    ccAutoRoles: union(PROFESSIONAL_CODES, CONTRACTOR_CODES),
  },
  si: {
    toRoleFilter: CONTRACTOR_CODES,
    ccAutoRoles: PROFESSIONAL_CODES,
  },
  vo: {
    toRoleFilter: CONTRACTOR_CODES,
    ccAutoRoles: VO_SIGNING_CODES,
  },
  gi: {
    toRoleFilter: PROFESSIONAL_CODES,
    ccAutoRoles: PROFESSIONAL_CODES,
  },
  ic: {
    toRoleFilter: PM_CODES,
    ccAutoRoles: CONTRACTOR_CODES,
  },
  // DC and CPI deliberately excluded — DC is only ever created by
  // escalating an IC (no direct creation form to pre-fill), and CPI sits
  // outside the Werner reply/escalate/close framework entirely.
};
