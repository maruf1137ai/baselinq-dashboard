/**
 * Parsing and re-rendering of money as a person actually types or pastes it.
 *
 * The currency inputs on the payment-certificate drawer used to do this:
 *
 *     const digits = e.target.value.replace(/[^0-9]/g, "");
 *     onChange(digits === "" ? 0 : Number(digits));
 *
 * which deletes the decimal separator and the minus sign rather than reading
 * them. "1,250,000.00" pasted out of a valuation spreadsheet became
 * 125 000 000 — a hundredfold over-certification, entered by a user who typed
 * the right number. "250.75" became 25 075. "-5000" became 5 000, so a
 * correcting (negative) entry silently reversed its sign.
 *
 * These helpers live here, apart from the component, because this is the layer
 * where a mistake changes what an employer pays, and it has to be testable
 * without a DOM.
 *
 * Rendering stays with `formatZAR` — the app's single currency formatter — so
 * an amount reads the same in an input as it does in the table the input feeds.
 */
import { formatZAR } from "./formatCurrency";

/**
 * Characters that may legitimately appear around a typed amount, beyond digits:
 * a currency prefix (R/r), grouping separators (space, non-breaking space,
 * narrow no-break space, comma, apostrophe, full stop), a decimal separator
 * (comma or full stop) and a leading sign.
 *
 * Anything else — a letter, an exponent, a stray symbol — makes the input
 * unparseable. We reject it rather than stripping it: `"1e6"` scrubbed down to
 * its digits is 16, which is not a plausible reading of what the user meant.
 */
const ACCEPTED = /^[-+]?[\d\s\u00a0\u202f.,']*$/;

/** Every character we treat as thousands grouping when it is not the decimal. */
const GROUPING = /[\s\u00a0\u202f',]/g;

/**
 * Read a typed or pasted money string.
 *
 * Accepts a leading `R`, a sign, thousands separators (space, non-breaking
 * space, comma or apostrophe) and either a full stop or a comma as the decimal
 * separator — so both the South African `1 250 000,00` and the spreadsheet
 * `1,250,000.00` read as 1250000.
 *
 * Returns `null` when the string cannot be read as a number. The caller must
 * keep the user's text and leave the stored value alone rather than
 * substituting a guess — silently rewriting a money figure is the bug this
 * module exists to prevent.
 *
 * An empty string is 0: clearing a field means "nothing", not "unreadable".
 */
export function parseMoneyInput(input: string): number | null {
  if (typeof input !== "string") return null;

  // Drop the currency prefix the input already renders as an affix.
  let s = input.trim().replace(/^R\s*/i, "").trim();
  if (s === "") return 0;

  // A sign may sit either side of the prefix ("-R 500" and "R -500" both occur).
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) {
    s = s.slice(1).trim();
  }
  s = s.replace(/^R\s*/i, "").trim();
  if (s === "") return null; // a lone sign is not yet a number

  if (!ACCEPTED.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const decimalAt = Math.max(lastDot, lastComma);

  let whole = s;
  let fraction = "";

  if (decimalAt !== -1) {
    const after = s.slice(decimalAt + 1);
    const bothPresent = lastDot !== -1 && lastComma !== -1;
    // With both separators present the later one is the decimal, whatever the
    // locale — "1,250,000.00" and "1.250.000,00" both resolve correctly.
    // With only one, it is a decimal separator when it is followed by one or
    // two digits and appears once; otherwise it is grouping ("1,250" is 1250,
    // "250,75" is 250.75).
    const onlyOccurrence =
      s.indexOf(s[decimalAt]) === decimalAt && !/\D/.test(after);
    const isDecimal = bothPresent
      ? /^\d{1,}$/.test(after)
      : onlyOccurrence && after.length > 0 && after.length <= 2;

    if (isDecimal) {
      whole = s.slice(0, decimalAt);
      fraction = after;
    }
  }

  const digits = whole.replace(GROUPING, "").replace(/\./g, "");
  if (!/^\d*$/.test(digits) || !/^\d*$/.test(fraction)) return null;
  if (digits === "" && fraction === "") return null;

  const value = Number(`${digits || "0"}.${fraction || "0"}`);
  if (!Number.isFinite(value)) return null;
  return sign * value;
}

/**
 * Render a value back into a currency input: grouped, always to the cent, and
 * without the `R` the input draws as its own affix. Cents are shown because a
 * certificate is signed to the cent — the previous input rounded them away, so
 * they could neither be entered nor read back.
 */
export function formatMoneyInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  return formatZAR(value).replace(/^R\s*/, "");
}
