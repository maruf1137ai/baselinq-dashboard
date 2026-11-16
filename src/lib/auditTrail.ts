/**
 * The Audit page's trail: the project's real task-audit rows, and nothing else.
 *
 * The page used to show figures this app never recorded:
 *   - when the trail was empty it invented "Created" and "Completed" entries
 *     signed "System";
 *   - a table of made-up JBCC clauses and periods ("JBCC 17.1, VO, 14 days",
 *     counted in calendar days) drove a deadline tracker, a compliance score
 *     and a risk level;
 *   - a row with no user was signed "System".
 * An audit page is read as evidence, so every line here has to be a row the
 * server wrote. Notice deadlines live on the Compliance page, which works
 * them out from the contract.
 *
 * The trail comes from `tasks/audits/?projectId=<id>`: a plain array, newest
 * first, capped by the server at the latest PROJECT_TRAIL_LIMIT rows.
 */
import { getActionLabel } from "./auditActionLabel";

/** The server's cap on the project trail (TaskAuditViewSet.PROJECT_TRAIL_LIMIT). */
export const PROJECT_TRAIL_LIMIT = 500;

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

/** The tasks list, whichever envelope the endpoint used. */
export const tasksFrom = (payload: any): any[] =>
  Array.isArray(payload) ? payload : payload?.tasks ?? payload?.results ?? [];

export interface TrailEntry {
  /** The record's number, or "" when the task is not in this viewer's list. */
  record: string;
  action: string;
  description?: string;
  taskType: string;
  taskId: string;
  /** The user the server recorded, or null when it recorded none. */
  createdByName: string | null;
  created_at: string;
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Audit rows as trail entries. The rows carry a task id but not its type or
 * number, so both come from the tasks list. A row with no user stays without
 * one: it is never attributed to "System".
 */
export function buildAuditTrail(logs: any[], tasks: any[]): TrailEntry[] {
  const byId = new Map(tasks.map((t) => [taskIdOf(t), t]));
  return logs
    .map((log) => {
      const task = byId.get(String(log.taskId ?? ""));
      const label = getActionLabel(log);
      const change =
        label.oldStatus || label.newStatus ? ` ${[label.oldStatus, label.newStatus].filter(Boolean).join(" → ")}` : "";
      const who: string | null = log.createdByName || null;
      // getActionLabel phrases most events to follow the actor's name.
      const action = label.hideUserName ? `${label.text}${change}` : who ? `${who} ${label.text}` : capitalise(label.text);
      return {
        record: task ? taskCodeOf(task) : "",
        action,
        description: label.detail,
        taskType: task ? taskTypeOf(task) : "",
        taskId: String(log.taskId ?? ""),
        createdByName: who,
        created_at: log.createdAt || log.created_at,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** True when the server's cap cut the trail short, so older rows exist. */
export const isTrailCapped = (logs: unknown[] | undefined): boolean =>
  Array.isArray(logs) && logs.length >= PROJECT_TRAIL_LIMIT;

/**
 * One CSV cell. Quoted always, inner quotes doubled, so commas, quotes and
 * line breaks in a description stay inside their cell. A cell that a
 * spreadsheet would run as a formula (= + - @, tab, carriage return) gets a
 * leading apostrophe.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** The trail as CSV, exactly the rows shown. */
export function trailToCsv(trail: TrailEntry[]): string {
  const header = ["Date and time", "Record", "Type", "Action", "Detail", "User"];
  const rows = trail.map((e) => [
    e.created_at,
    e.record,
    e.taskType,
    e.action,
    e.description ?? "",
    e.createdByName ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
