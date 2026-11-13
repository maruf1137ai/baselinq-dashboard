/**
 * Notice deadlines grouped by the event that started them, and the record of
 * how each notice was served.
 *
 * JBCC starts a notice for time and a notice for money from every event, each
 * due within 20 working days and each forfeiting on its own
 * (`risk/timebars.py::PAIRED_NOTICES`). Shown as a flat list they read as
 * identical "Notice for time" / "Notice for money" cards with nothing to say
 * which belong together, so the one omission that costs contractors most —
 * serving one and forgetting the other — was invisible on the tab where
 * service is recorded. Grouping is by the server's `event_key`.
 */
import { formatDate } from "@/lib/dateUtils";
import { isLiveStatus } from "@/lib/timeBarCountdown";

export interface TimeBarServiceTiming {
  on_time: boolean;
  /** Working or calendar days to spare (on time) or late — in `unit`. */
  days: number;
  unit: string;
  /** The server's sentence: "On time (2 working days to spare)". Printed verbatim. */
  label: string;
}

export interface TimeBarService {
  served_on: string | null;
  method: string | null;
  method_label: string | null;
  served_to: string | null;
  reference: string;
  document: { id: number | null; name: string | null; reference: string | null; visible: boolean } | null;
  recorded_at: string | null;
  recorded_by: string | null;
  /** Null when the date of service was never recorded. Unknown, not on time. */
  timing: TimeBarServiceTiming | null;
}

export interface TimeBarWithdrawal {
  at: string;
  by: string | null;
  reason: string;
  served_on: string | null;
}

export interface TimeBar {
  id: number;
  label: string;
  clock_type: string;
  contract_form: string;
  clause_ref: string;
  clause_verified: boolean;
  awareness_date: string;
  duration: number;
  unit: string;
  deadline_date: string;
  /**
   * Counted in `days_remaining_unit` — for every JBCC clock that is WORKING
   * days, on the South African working-day calendar including the builders'
   * annual shutdown. Nullable in the type because a countdown we did not
   * receive must be handled, not assumed.
   */
  days_remaining: number | null;
  /** "working" | "calendar". Always travels with `days_remaining`. */
  days_remaining_unit?: string | null;
  /**
   * The countdown as a finished sentence — "12 working days remaining",
   * "3 working days overdue", "due today". Published by the backend
   * (`TimeBarClock.days_remaining_label`) expressly so that no client ever
   * pairs the number with a unit itself. Rendered verbatim.
   */
  days_remaining_label?: string | null;
  status: string;
  /** The definition's standard description, set on creation. Not the event. */
  notes?: string;
  /** Shared by the clocks one event started. */
  event_key?: string | null;
  /** What happened, as the person who tracked it said. */
  event_description?: string | null;
  source?: { type: string | null; id: number; ref: string | null; title: string } | null;
  /** "time" or "money" for the halves of a JBCC paired notice. */
  pair_role?: "time" | "money" | null;
  /** Whether missing this deadline can forfeit the entitlement. */
  forfeits?: boolean | null;
  service?: TimeBarService | null;
  last_withdrawal?: TimeBarWithdrawal | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
}

export interface ContractFormInfo {
  form: string | null;
  /** Who a contractor's notice goes to under this form, e.g. "Principal agent". */
  notice_recipient: string | null;
  error: string | null;
}

export interface HalfServed {
  served: "time" | "money";
  missing: "time" | "money";
  /** The notice not yet recorded as served. */
  open: TimeBar;
}

export interface TimeBarGroup {
  key: string;
  /** What happened, or the source record's reference, or "" if neither exists. */
  description: string;
  awarenessDate: string;
  /** The pair first (time, then money), then the other clocks by deadline. */
  pair: TimeBar[];
  others: TimeBar[];
  live: boolean;
  halfServed: HalfServed | null;
}

/** `YYYY-MM-DD` as a LOCAL date. `new Date("2026-11-12")` is UTC midnight and
 *  prints as the 11th west of Greenwich; a legal date must not move. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Nov 2026" for a date or a timestamp; "" when absent. */
export const formatDay = (value: string | null | undefined): string => formatDate(parseDay(value));

/** Today as `YYYY-MM-DD` in the viewer's own calendar, for `<input type="date" max>`. */
export function todayIso(now: Date = new Date()): string {
  return formatDate(now, "input");
}

const groupKey = (bar: TimeBar): string =>
  bar.event_key || `aware:${bar.awareness_date}`;

const byDeadline = (a: TimeBar, b: TimeBar) => a.deadline_date.localeCompare(b.deadline_date);

/**
 * Half a pair served: one notice recorded as served while its partner is
 * still live. A partner CANCELLED with a reason ("no money claim") is a
 * decision, not an omission, and is not flagged — the same rule as the
 * server's PAIRED_NOTICE_UNSERVED signal. Unlike that signal this also flags a
 * partner whose deadline has passed: here, where service is recorded, a lapsed
 * notice for money beside a served notice for time is the thing to see.
 */
export function findHalfServed(bars: TimeBar[]): HalfServed | null {
  const time = bars.find((b) => b.pair_role === "time");
  const money = bars.find((b) => b.pair_role === "money");
  if (!time || !money) return null;
  if (time.status === "served" && isLiveStatus(money.status)) {
    return { served: "time", missing: "money", open: money };
  }
  if (money.status === "served" && isLiveStatus(time.status)) {
    return { served: "money", missing: "time", open: time };
  }
  return null;
}

function describeEvent(bars: TimeBar[]): string {
  for (const bar of bars) {
    const text = (bar.event_description ?? "").trim();
    if (text) return text;
  }
  for (const bar of bars) {
    const src = bar.source;
    if (src && (src.ref || src.title)) {
      return [src.ref, src.title && src.title !== src.ref ? src.title : ""].filter(Boolean).join(": ");
    }
  }
  return "";
}

/**
 * The deadlines as events. Live events first, the one with the nearest live
 * deadline at the top; closed events after, most recent first.
 */
export function groupTimeBars(bars: TimeBar[]): TimeBarGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, TimeBar[]>();
  for (const bar of bars) {
    const key = groupKey(bar);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(bar);
  }

  const groups: TimeBarGroup[] = order.map((key) => {
    const members = byKey.get(key)!;
    const pair = ["time", "money"]
      .map((role) => members.find((b) => b.pair_role === role))
      .filter((b): b is TimeBar => Boolean(b));
    const others = members.filter((b) => !pair.includes(b)).sort(byDeadline);
    return {
      key,
      description: describeEvent(members),
      awarenessDate: members[0].awareness_date,
      pair,
      others,
      live: members.some((b) => isLiveStatus(b.status)),
      halfServed: findHalfServed(members),
    };
  });

  const nearestLive = (g: TimeBarGroup) =>
    [...g.pair, ...g.others].filter((b) => isLiveStatus(b.status)).map((b) => b.deadline_date).sort()[0] ?? "";
  const latest = (g: TimeBarGroup) =>
    [...g.pair, ...g.others].map((b) => b.deadline_date).sort().reverse()[0] ?? "";

  return groups.sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1;
    return a.live ? nearestLive(a).localeCompare(nearestLive(b)) : latest(b).localeCompare(latest(a));
  });
}

const METHOD_PHRASE: Record<string, string> = {
  email: "by email",
  hand: "by hand delivery",
  registered_post: "by registered post",
  platform: "via the platform",
};

/**
 * "Served on 12 Nov 2026 by email to Principal agent." — the facts of service
 * as recorded. Whether that was in time is the server's sentence
 * (`service.timing.label`), shown beside it and never computed here.
 *
 * A notice marked served before the date of service was kept says so: the
 * date the record was made is not the date the notice was served.
 */
export function serviceSummary(service: TimeBarService | null | undefined): string {
  if (!service) return "";
  if (!service.served_on) {
    const recorded = formatDay(service.recorded_at);
    return recorded
      ? `Recorded as served on ${recorded}. The date of service was not recorded.`
      : "Recorded as served. The date of service was not recorded.";
  }
  const how = service.method
    ? METHOD_PHRASE[service.method] ?? (service.method_label ? `by ${service.method_label.toLowerCase()}` : "")
    : "";
  const to = service.served_to ? `to ${service.served_to}` : "";
  return [`Served on ${formatDay(service.served_on)}`, how, to].filter(Boolean).join(" ") + ".";
}

/** The server's own message from a failed request, else `fallback`. */
export function serverMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}
