/**
 * What a notice-deadline countdown says, and how it is coloured.
 *
 * Lives apart from `TimeBarsTab` so the rule has tests rather than an opinion,
 * and so the tab file exports only its component.
 */
import { dueSoonThreshold, normaliseDayUnit } from "@/lib/compliance";

/** The fields of a time bar this decision reads. Nothing else. */
export interface TimeBarCountdownInput {
  days_remaining: number | null;
  days_remaining_unit?: string | null;
  days_remaining_label?: string | null;
  status: string;
  /** Whether a served notice was in time — the server's verdict, never ours. */
  service?: { timing?: { on_time: boolean } | null } | null;
  /**
   * Whether missing this deadline can forfeit the entitlement, from the
   * server's definition. False for JBCC's 40-working-day particulars and
   * detailed claim for expense and loss; absent means "assume it can".
   */
  forfeits?: boolean | null;
}

/**
 * What the countdown badge says, and how it is coloured.
 *
 * THE DEFECT THIS EXISTS TO PREVENT. This badge used to render
 * `${bar.days_remaining}d left`. That number is a WORKING-day count; "12d"
 * read as a wall-clock date is out by roughly a third in an ordinary week and
 * much more across the mid-December builders' break. On a JBCC 20-working-day
 * notice, service one day late forfeits the claim outright — and this is the
 * tab an insurer reads to judge whether notice was served in time.
 *
 * So the text comes from `days_remaining_label`, verbatim. We do not rebuild
 * the sentence from the number and the unit: rebuilding it is the operation
 * that produced the defect. Where the label is absent we say the countdown is
 * unavailable rather than inventing one — the deadline date is on the row
 * above regardless, so the user is never left without the hard fact.
 *
 * `tone` is derived from the number, which is safe: a colour cannot be
 * misread as a duration.
 */
export type CountdownTone =
  | "overdue"         // deadline passed with nothing recorded (open or lapsed)
  | "urgent"          // 3 days or fewer left, including due today
  | "soon"            // inside the approaching window for the clock's unit
  | "safe"            // comfortably ahead
  | "unknown"         // live, but the server sent no count we can state
  | "served"          // served, and the server says in time
  | "served_late"     // served, and the server says after the deadline
  | "served_undated"  // recorded served before the date of service was kept
  | "cancelled"
  | "closed";         // any other status the server may add

export type Countdown = { text: string; tone: CountdownTone };

export function describeCountdown(bar: TimeBarCountdownInput): Countdown {
  const countdown = describeRawCountdown(bar);
  // A step that carries no forfeiture of its own is still a deadline, but it
  // is never shown in the red reserved for the ones that can forfeit — the
  // same rule as the server's signal severity. Overstating a time bar is
  // adjacent to legal advice.
  if (bar.forfeits === false && (countdown.tone === "urgent" || countdown.tone === "overdue")) {
    return { text: countdown.text, tone: "soon" };
  }
  return countdown;
}

function describeRawCountdown(bar: TimeBarCountdownInput): Countdown {
  const label = (bar.days_remaining_label ?? "").trim();

  // A bar that is no longer running reports what happened to it, in words a
  // person would use — never the raw enum.
  if (bar.status === "served") {
    const timing = bar.service?.timing;
    if (!timing) return { text: "Served", tone: "served_undated" };
    return timing.on_time
      ? { text: "Served", tone: "served" }
      : { text: "Served late", tone: "served_late" };
  }
  if (bar.status === "cancelled") return { text: "Cancelled", tone: "cancelled" };
  // Lapsed means the deadline passed with nothing recorded against it. That is
  // the most urgent state on the page, not a closed one: it used to render as
  // a grey "lapsed" chip identical to a served notice.
  if (bar.status === "lapsed") return { text: label || "Deadline passed", tone: "overdue" };
  if (bar.status !== "open") {
    return { text: statusLabel(bar.status), tone: "closed" };
  }

  const days = typeof bar.days_remaining === "number" && Number.isFinite(bar.days_remaining)
    ? bar.days_remaining
    : null;

  // No countdown we can state. An undated or uncounted bar is live-and-unknown
  // — never clear — so it must not be styled as safe.
  if (!label) {
    return { text: "countdown unavailable", tone: "unknown" };
  }
  if (days === null) {
    return { text: label, tone: "unknown" };
  }

  const threshold = dueSoonThreshold(normaliseDayUnit(bar.days_remaining_unit));
  if (days < 0) return { text: label, tone: "overdue" };
  if (days <= 3) return { text: label, tone: "urgent" };
  if (days <= threshold) return { text: label, tone: "soon" };
  return { text: label, tone: "safe" };
}

/** The `Badge` semantic variants this tab uses. */
export type CountdownBadgeVariant = "danger" | "warning" | "neutral" | "success";

/**
 * Urgency runs one way: the closer the deadline, the louder the badge.
 *
 * This used to run backwards. The tab greyed `urgent` and `soon` into the
 * served/cancelled style and left `safe` emerald, so "2 working days
 * remaining" looked exactly like a closed notice while "40 working days
 * remaining" was the only green thing on the page. On a page whose purpose is
 * preventing forfeiture, that inverted the one signal it exists to give.
 *
 * Comfortable is neutral, approaching is amber, three days or fewer and
 * overdue are red. A live clock we cannot count is amber, never neutral: "we
 * could not count it" and "you have plenty of time" are not the same
 * statement. Served in time is green; served late is red, because the dates
 * say so (the server computes it). Cancelled is neutral, and the tab sets
 * closed notices apart from live ones as well, so neutral is never ambiguous.
 */
export const TONE_VARIANT: Record<CountdownTone, CountdownBadgeVariant> = {
  overdue: "danger",
  urgent: "danger",
  soon: "warning",
  safe: "neutral",
  unknown: "warning",
  served: "success",
  served_late: "danger",
  served_undated: "neutral",
  cancelled: "neutral",
  closed: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  served: "Served",
  lapsed: "Deadline passed",
  cancelled: "Cancelled",
};

/** A time-bar status as a person would say it. Unknown values are humanised. */
export function statusLabel(status: string | null | undefined): string {
  const s = (status ?? "").trim();
  if (!s) return "Closed";
  if (STATUS_LABEL[s]) return STATUS_LABEL[s];
  const words = s.replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Open and lapsed notices are still live: something can still be recorded. */
export const isLiveStatus = (status: string): boolean => status === "open" || status === "lapsed";
