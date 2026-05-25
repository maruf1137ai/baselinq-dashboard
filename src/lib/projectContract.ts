/**
 * Helpers for the "live" contract value + end-date fields shown on the
 * project details page. These are updated by signed VOs on the backend
 * (see tasks/views_signing.py::_apply_vo_to_project) and read here for
 * read-only display.
 *
 * Kept as small pure functions so they can be unit-tested without
 * mounting the full settings page.
 */

import { format, parseISO } from "date-fns";

/** Format a number string with thousand-separator commas. Returns "" for falsy input. */
export function formatWithCommas(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val);
  const clean = str.replace(/,/g, "");
  if (isNaN(Number(clean))) return str;
  const parts = clean.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * Pull contractValue (or snake_case contract_value) off a project object and
 * format it with thousand separators. Returns "" when no value is present.
 */
export function getContractValueDisplay(project: any): string {
  const raw = project?.contractValue ?? project?.contract_value;
  if (raw === null || raw === undefined || raw === "") return "";
  return formatWithCommas(String(raw));
}

/**
 * Pull contractEndDate (or snake_case contract_end_date) off a project object
 * and render it in "PPP" date-fns format (e.g. "Jan 14, 2027"). Returns "" if
 * the date is missing or unparseable.
 */
export function getContractEndDateDisplay(project: any): string {
  const raw = project?.contractEndDate ?? project?.contract_end_date;
  if (!raw) return "";
  try {
    return format(parseISO(raw), "PPP");
  } catch {
    return String(raw);
  }
}
