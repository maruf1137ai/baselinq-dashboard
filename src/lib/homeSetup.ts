/**
 * Project setup completeness — the seven fields a project needs before the
 * rest of Baselinq works.
 *
 * Pure so it can be tested without mounting the homepage, following the same
 * pattern as `src/lib/compliance.ts`.
 */

export const SETUP_FIELDS = [
  "Client Details",
  "Scope of Work",
  "Project Documents",
  "Budget Allocation",
  "Location",
  "Project Timeline",
  "Associated Company",
] as const;

export type SetupField = (typeof SETUP_FIELDS)[number];

export interface ProjectSetupState {
  percentage: number;
  filledCount: number;
  totalCount: number;
  missing: SetupField[];
}

/**
 * Derive which of the seven setup fields a project is still missing.
 *
 * Reads both camelCase and snake_case: the `project` app's serialisers are
 * camel, but several call sites still hand back the raw snake payload.
 */
export function summariseProjectSetup(project: any): ProjectSetupState | null {
  if (!project) return null;

  const clientDetails = project.clientDetails || project.client_details;
  const taskOrderBrief = project.taskOrderBrief || project.task_order_brief;
  const projectDocs = project.documents || project.attachments || [];

  const filled: Record<SetupField, boolean> = {
    "Client Details": !!(clientDetails?.company_name || clientDetails?.companyName),
    "Scope of Work": !!taskOrderBrief,
    "Project Documents": projectDocs.length > 0,
    "Budget Allocation": Number((project.totalBudget ?? project.total_budget) || 0) > 0,
    "Location": !!project.location,
    "Project Timeline":
      !!(project.startDate || project.start_date) && !!(project.endDate || project.end_date),
    "Associated Company": !!(project.appointedCompany || project.appointed_company)?.company_name,
  };

  const missing = SETUP_FIELDS.filter((f) => !filled[f]);
  const filledCount = SETUP_FIELDS.length - missing.length;

  return {
    percentage: Math.round((filledCount / SETUP_FIELDS.length) * 100),
    filledCount,
    totalCount: SETUP_FIELDS.length,
    missing: [...missing],
  };
}
