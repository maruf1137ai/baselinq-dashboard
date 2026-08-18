/**
 * The app's single currency formatter.
 *
 * ── Why the spaces are NON-BREAKING ───────────────────────────────────────
 *
 * South African convention groups thousands with a space and takes a comma
 * for the decimal, so `formatZAR` produces `R 108 500 000,00`. Those spaces
 * used to be ordinary U+0020, and every surface that renders a figure in a
 * narrow cell sets `break-words` — `Figure` in `src/components/home/blocks.tsx`
 * carries `tabular-nums break-words`, and CSS `overflow-wrap: break-word`
 * looks for a space before it looks anywhere else.
 *
 * So in a narrow column `R 108 500 000,00` wrapped to
 *
 *     R 108 500
 *     000,00
 *
 * and the first line is a syntactically complete, plausible, WRONG number.
 * That is strictly worse than the `truncate` this codebase already removed
 * from money cells: an ellipsis at least signals that something was lost,
 * while a clean break at a thousands separator signals nothing at all and
 * reads as a figure two orders of magnitude smaller than the one on the row.
 *
 * U+00A0 NO-BREAK SPACE renders identically and is not a break opportunity,
 * so the figure now wraps as a whole or not at all. The space after the `R`
 * is non-breaking for the same reason — a currency symbol orphaned from its
 * amount is a smaller defect than a truncated number, but it costs nothing
 * to prevent.
 *
 * `parseMoneyInput` in `src/lib/money.ts` already accepts U+00A0 as a
 * grouping separator ("accepts a non-breaking space and an apostrophe as
 * grouping", `money.test.ts`), so a figure this function renders still
 * round-trips through the app's own money input.
 *
 * This is the ONLY formatter in this file. `formatCertCurrency` in
 * `src/lib/certificate.ts` has the same ASCII-space defect and is reported
 * rather than changed here — it belongs to the certificate document surface,
 * not this one.
 */

/** U+00A0. Named so the intent survives an editor that eats the glyph. */
const NBSP = " ";

export function formatZAR(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return value < 0 ? `R${NBSP}-${formatted}` : `R${NBSP}${formatted}`;
}
