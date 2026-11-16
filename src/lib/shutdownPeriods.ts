/**
 * The builders' break: the annual shutdown periods a project's working days
 * skip.
 *
 * JBCC excludes the contractor's annual holiday period from working days, so
 * every notice deadline and working-day payment period that spans it moves
 * out. The server owns the rules (`project/shutdown.py`); the checks here only
 * catch obvious slips before a save, and the server's answer is final.
 *
 * `annualShutdownPeriods` on the project is null when the project has not set
 * its own, which means the platform calendar applies. An empty list means
 * "this contract has no annual holiday period". The two are not the same.
 */
import { parseDay } from "@/lib/timeBarEvents";

export interface ShutdownPeriod {
  start: string;
  end: string;
  label: string;
}

export interface ShutdownPeriodsInfo {
  /** The periods working days are actually counted against. */
  effective: ShutdownPeriod[];
  /** "project": its own Contract Data. "platform": not set, so the default. */
  source: "project" | "platform";
  /** Baselinq's industry calendar, shown so a project can return to it. */
  platformDefault: ShutdownPeriod[];
}

/** Same limits as the server (`project/shutdown.py`). */
export const MAX_PERIODS = 10;
export const MAX_PERIOD_DAYS = 45;

const DAY_MS = 86_400_000;

function asPeriods(value: unknown): ShutdownPeriod[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({ start: String(p.start ?? ""), end: String(p.end ?? ""), label: String(p.label ?? "") }));
}

/** The `shutdownPeriods` block of a project payload, or null when absent. */
export function readShutdownPeriods(project: unknown): ShutdownPeriodsInfo | null {
  const raw = (project as { shutdownPeriods?: unknown } | null)?.shutdownPeriods;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    effective: asPeriods(r.effective),
    source: r.source === "project" ? "project" : "platform",
    platformDefault: asPeriods(r.platformDefault),
  };
}

/** Calendar days in a period, both ends included; null when a date is unreadable. */
export function periodDays(p: ShutdownPeriod): number | null {
  const start = parseDay(p.start);
  const end = parseDay(p.end);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** Everything wrong with a draft list, in words. Empty when it may be saved. */
export function periodProblems(periods: ShutdownPeriod[]): string[] {
  const problems: string[] = [];
  if (periods.length > MAX_PERIODS) problems.push(`At most ${MAX_PERIODS} periods can be recorded.`);
  periods.forEach((p, i) => {
    const where = `Period ${i + 1}`;
    if (!p.label.trim()) problems.push(`${where} needs a label.`);
    const days = periodDays(p);
    if (days === null) problems.push(`${where} needs a start and an end date.`);
    else if (days < 1) problems.push(`${where} ends before it starts.`);
    else if (days > MAX_PERIOD_DAYS) {
      problems.push(`${where} is ${days} days long. An annual shutdown is at most ${MAX_PERIOD_DAYS} days.`);
    }
  });
  const sorted = [...periods].filter((p) => periodDays(p) !== null).sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= sorted[i - 1].end) {
      problems.push(`"${sorted[i - 1].label || "A period"}" and "${sorted[i].label || "another"}" overlap.`);
    }
  }
  return problems;
}
