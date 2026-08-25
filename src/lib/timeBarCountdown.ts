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
export type Countdown = { text: string; tone: "closed" | "overdue" | "urgent" | "soon" | "safe" | "unknown" };

export function describeCountdown(bar: TimeBarCountdownInput): Countdown {
  // A bar that is no longer running reports what happened to it.
  if (bar.status !== "open") {
    return { text: bar.status?.trim() || "closed", tone: "closed" };
  }

  const label = (bar.days_remaining_label ?? "").trim();
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

export const TONE_CLASS: Record<Countdown["tone"], string> = {
  closed: "bg-muted text-muted-foreground border-border",
  overdue: "bg-red-50 text-red-700 border-red-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
  soon: "bg-amber-50 text-amber-700 border-amber-200",
  safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  // Unknown is neutral, never green. "We could not count it" and "you have
  // plenty of time" are not the same statement.
  unknown: "bg-muted text-muted-foreground border-border",
};
