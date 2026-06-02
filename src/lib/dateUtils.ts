export const isMeetingPast = (dateStr: string, timeStr: string) => {
  if (!dateStr) return false;
  try {
    const timeToParse = timeStr || "00:00 AM";
    const [hStr, mRest] = timeToParse.split(":");
    if (!mRest) return false;
    const [mStr, mer] = mRest.split(" ");

    let hour = parseInt(hStr);
    const minute = parseInt(mStr);
    if (mer?.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (mer?.toUpperCase() === "AM" && hour === 12) hour = 0;

    const [y, m, d] = dateStr.split("-").map(Number);
    const meetingDate = new Date(y, m - 1, d, hour, minute);

    return meetingDate < new Date();
  } catch (e) {
    return false;
  }
};

export const isMeetingPastUTC = (scheduledUtc: string | null | undefined): boolean => {
  if (!scheduledUtc) return false;
  try {
    return new Date(scheduledUtc) < new Date();
  } catch {
    return false;
  }
};

export const formatMeetingTime = (scheduledUtc: string | null | undefined): string => {
  if (!scheduledUtc) return "";
  try {
    return new Date(scheduledUtc).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const formatMeetingDate = (scheduledUtc: string | null | undefined): string => {
  if (!scheduledUtc) return "";
  try {
    return new Date(scheduledUtc).toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const formatMeetingDateTime = (scheduledUtc: string | null | undefined): string => {
  const d = formatMeetingDate(scheduledUtc);
  const t = formatMeetingTime(scheduledUtc);
  if (!d) return "";
  return t ? `${d} • ${t}` : d;
};

// ── Canonical date formatter (SA / Werner-style) ──────────────────────
//
// One helper for every "due date / created date / replied date" in the
// app so dates never read "01/06/2026" (ambiguous DD/MM vs MM/DD) again.
// Native `Date#toLocaleDateString()` with no locale uses the BROWSER
// locale, which is why some SA users were seeing UK numeric format while
// the rest of the app rendered "01 Jun 2026". This util forces en-GB +
// long month so the format is identical for every viewer regardless of
// their browser locale.
//
// Variants:
//   "short" → "01 Jun 2026"   (use in tables, badges, dense rows)
//   "long"  → "01 June 2026"  (use in headers, legal text, audit trail)
//   "input" → "2026-06-01"    (ISO yyyy-mm-dd for HTML <input type=date>)

type DateInput = string | number | Date | null | undefined;

export const formatDate = (
  value: DateInput,
  variant: "short" | "long" | "input" = "short",
  fallback = "",
): string => {
  if (value == null || value === "") return fallback;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;

    if (variant === "input") {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: variant === "long" ? "long" : "short",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
};

// Convenience wrapper for "no date" fallbacks where the UI used to
// render the string "No Date" verbatim.
export const formatDateOrNoDate = (value: DateInput): string =>
  formatDate(value, "short", "No Date");
