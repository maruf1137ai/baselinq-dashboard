/**
 * The task types Linq can work on, and the endpoint that runs each one's
 * checked analysis.
 *
 * The backend's task chat and analysis accept exactly these five
 * (`ai_analysis/views.py`, VALID_TASK_TYPES and ANALYSIS_VIEWS). A GI or an
 * IC gets "Invalid task type" from the chat and no analysis, so the task page
 * does not offer "Analyze with AI" on them at all rather than offer a button
 * that only fails.
 */
export const TASK_ANALYSIS_ENDPOINTS: Readonly<Record<string, string>> = {
  VO: "ai_analysis/vo/",
  RFI: "ai_analysis/rfi/",
  CPI: "ai_analysis/cpi/",
  SI: "ai_analysis/si/",
  DC: "ai_analysis/dc/",
};

export function taskAnalysisEndpoint(taskType: string | null | undefined): string | null {
  if (!taskType) return null;
  return Object.prototype.hasOwnProperty.call(TASK_ANALYSIS_ENDPOINTS, taskType)
    ? TASK_ANALYSIS_ENDPOINTS[taskType]
    : null;
}
