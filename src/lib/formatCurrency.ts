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

// ── Project currencies (client meeting, 10 Nov 2026) ─────────────────────
//
// A contract outside South Africa is certified and paid in its own currency —
// Rwandan francs, US dollars. Contract money follows the selected project's
// currency; Baselinq's own fee is invoiced in rand and keeps `formatZAR`.
// Same grouping and decimal comma as `formatZAR`, so a rand project renders
// exactly as before.

/** Symbols where one is clearer than the code; the code otherwise. */
const SYMBOL: Record<string, string> = {
  ZAR: "R",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  BWP: "P",
  NAD: "N$",
  KES: "KSh",
};

/** ISO minor units for currencies that have none worth printing. */
const ZERO_DECIMALS = new Set(["RWF", "UGX", "TZS", "MWK"]);

let activeCurrency = "ZAR";

/** Set by the layout from the selected project (CurrencySync). */
export function setActiveCurrency(code?: string | null) {
  activeCurrency = (code || "ZAR").toUpperCase();
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

export function currencySymbol(code: string = activeCurrency): string {
  return SYMBOL[code.toUpperCase()] ?? code.toUpperCase();
}

/**
 * Contract money, in the selected project's currency unless one is given.
 * `formatZAR` for a rand amount, so nothing changes on a rand project.
 */
export function formatMoney(value: number, currency: string = activeCurrency): string {
  const code = (currency || "ZAR").toUpperCase();
  if (code === "ZAR") return formatZAR(value);
  const digits = ZERO_DECIMALS.has(code) ? 0 : 2;
  const [whole, fraction] = Math.abs(value).toFixed(digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + (fraction ? `,${fraction}` : "");
  const symbol = currencySymbol(code);
  return value < 0 ? `${symbol}${NBSP}-${grouped}` : `${symbol}${NBSP}${grouped}`;
}
