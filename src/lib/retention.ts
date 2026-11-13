/**
 * Retention rate handling shared by the project forms and the payment
 * certificate screens.
 *
 * Retention is optional (Grant, 4 Nov 2026): a project that leaves the field
 * blank, or enters 0, takes no retention at all. The forms used to fall back
 * to a hidden 5% (`parseFloat(x) || 5`), which also turned a typed 0 into 5
 * because 0 is falsy — so almost every project was created at 5% without
 * anyone choosing it.
 */

/** A form's retention input as a rate: blank, invalid or negative → 0. */
export function parseRetentionRate(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  if (text === "") return 0;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True when a rate or amount means retention is actually taken. */
export function hasRetention(value: unknown): boolean {
  return parseRetentionRate(value) > 0;
}
