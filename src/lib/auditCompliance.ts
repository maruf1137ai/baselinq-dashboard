/**
 * The Audit page's figures: JBCC deadline compliance and the activity trail.
 *
 * Moved out of `pages/AuditPage.tsx` because the page showed a 0% score and
 * an empty trail on a project with 163 tasks (QA BUG-10), and nothing could
 * test why without rendering it:
 *   - it read `projects/<id>/tasks/` as `{ results }`, but that endpoint
 *     returns `{ tasks }` — so every figure was computed over nothing;
 *   - it read task fields that are not on the payload (`task.id`,
 *     `task.number`), so even with tasks the deadline rows would have been
 *     unlabelled;
 *   - its trail came from `projects/<id>/audit-logs/`, an endpoint that does
 *     not exist (404 on every load). The real trail is
 *     `tasks/audits/?projectId=<id>`.
 */
import { getActionLabel } from "./auditActionLabel";

export const JBCC_DEADLINES: Record<string, { clause: string; days: number; label: string }[]> = {
  VO: [
    { clause: "JBCC 17.1", days: 14, label: "Pricing submission" },
    { clause: "JBCC 17.2", days: 7, label: "Client approval" },
  ],
  RFI: [{ clause: "JBCC 5.5", days: 5, label: "Response required" }],
  SI: [{ clause: "JBCC 18.1", days: 3, label: "Acknowledgment" }],
  DC: [
    { clause: "JBCC 29.1", days: 20, label: "Notice period" },
    { clause: "JBCC 29.3", days: 28, label: "Assessment completion" },
  ],
  CPI: [{ clause: "JBCC 20.1", days: 30, label: "Programme schedule" }],
  GI: [{ clause: "JBCC 5.1", days: 7, label: "Acknowledgment" }],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const isTaskCompleted = (task: any): boolean =>
  ["done", "completed", "closed", "approved"].includes(String(task?.status || "").toLowerCase());

export const taskTypeOf = (task: any): string => String(task?.taskType || task?.task_type || "").toUpperCase();

export const taskIdOf = (task: any): string => String(task?.taskId ?? task?.id ?? task?._id ?? "");

/** The document's own number (VO-072, RFI-006 …), the same chain the task board uses. */
export function taskCodeOf(task: any): string {
  const t = task?.task || {};
  const own =
    t.rfiNumber || t.siNumber || t.voNumber || t.giNumber || t.icNumber || t.dcNumber ||
    t.rfi_number || t.si_number || t.vo_number || t.gi_number || t.ic_number || t.dc_number;
  if (own) return own;
  return `${taskTypeOf(task)}-${taskIdOf(task).padStart(3, "0")}`;
}

const assigneeOf = (task: any): string => {
  const list = task?.assignedTo || task?.assigned_to || [];
  const first = Array.isArray(list) ? list[0] : null;
  return first?.name || first?.userName || "Unassigned";
};

export type DeadlineStatus = { label: "Overdue" | "At Risk" | "On Track"; color: string };

export const deadlineStatus = (daysRemaining: number): DeadlineStatus => {
  if (daysRemaining < 0) return { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" };
  if (daysRemaining <= 3) return { label: "At Risk", color: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "On Track", color: "bg-green-50 text-green-700 border-green-200" };
};

export interface DeadlineRow {
  taskId: string;
  taskNumber: string;
  taskType: string;
  clause: string;
  label: string;
  deadline: Date;
  daysRemaining: number;
  status: DeadlineStatus;
  assignedTo: string;
  isCompleted: boolean;
}

export interface Compliance {
  score: number;
  totalTasks: number;
  compliantTasks: number;
  overdueItems: number;
  pendingDeadlines: number;
  riskLevel: "High" | "Medium" | "Low";
  byType: Record<string, { total: number; compliant: number; overdue: number }>;
  deadlines: DeadlineRow[];
}

/** The tasks list, whichever envelope the endpoint used. */
export const tasksFrom = (payload: any): any[] =>
  Array.isArray(payload) ? payload : payload?.tasks ?? payload?.results ?? [];

export function buildCompliance(tasks: any[], now: Date = new Date()): Compliance {
  let compliant = 0;
  let overdue = 0;
  let pending = 0;
  const byType: Compliance["byType"] = {};
  const deadlines: DeadlineRow[] = [];

  for (const task of tasks) {
    const type = taskTypeOf(task);
    if (!type) continue;
    byType[type] ??= { total: 0, compliant: 0, overdue: 0 };
    byType[type].total++;

    const completed = isTaskCompleted(task);
    if (completed) {
      compliant++;
      byType[type].compliant++;
    }

    const createdAt = task.created_at || task.createdAt;
    if (!createdAt) continue;
    const created = new Date(createdAt).getTime();
    for (const dl of JBCC_DEADLINES[type] || []) {
      const deadline = new Date(created + dl.days * DAY_MS);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS);
      if (!completed && daysRemaining < 0) {
        overdue++;
        byType[type].overdue++;
      }
      if (!completed && daysRemaining >= 0 && daysRemaining <= 7) pending++;
      deadlines.push({
        taskId: taskIdOf(task),
        taskNumber: taskCodeOf(task),
        taskType: type,
        clause: dl.clause,
        label: dl.label,
        deadline,
        daysRemaining,
        status: deadlineStatus(daysRemaining),
        assignedTo: assigneeOf(task),
        isCompleted: completed,
      });
    }
  }

  deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  const total = tasks.length;
  return {
    score: total > 0 ? Math.round((compliant / total) * 100) : 0,
    totalTasks: total,
    compliantTasks: compliant,
    overdueItems: overdue,
    pendingDeadlines: pending,
    riskLevel: overdue > 5 ? "High" : overdue > 2 ? "Medium" : "Low",
    byType,
    deadlines,
  };
}

export interface TrailEntry {
  action: string;
  description?: string;
  taskType: string;
  taskId: string;
  createdByName: string;
  created_at: string;
}

/**
 * Audit rows (`tasks/audits/?projectId=`) as trail entries. The rows carry a
 * task id but not its type or number, so both come from the tasks list.
 */
export function buildAuditTrail(logs: any[], tasks: any[]): TrailEntry[] {
  const byId = new Map(tasks.map((t) => [taskIdOf(t), t]));
  return logs
    .map((log) => {
      const task = byId.get(String(log.taskId ?? ""));
      const code = task ? taskCodeOf(task) : "";
      const label = getActionLabel(log);
      const change =
        label.oldStatus || label.newStatus ? ` ${[label.oldStatus, label.newStatus].filter(Boolean).join(" → ")}` : "";
      const who = log.createdByName || "System";
      // getActionLabel phrases most events to follow the actor's name.
      const text = label.hideUserName ? `${label.text}${change}` : `${who} ${label.text}`;
      return {
        action: code ? `${code} · ${text}` : text,
        description: label.detail,
        taskType: task ? taskTypeOf(task) : "",
        taskId: String(log.taskId ?? ""),
        createdByName: who,
        created_at: log.createdAt || log.created_at,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
