/**
 * Presentation layer for platform fee `basisDetail`.
 *
 * This is the same problem `lib/riskFormat.ts` solved for risk signals — the
 * backend hands over a structured derivation keyed on snake_case field names,
 * and rendering it raw produces a debug dump. It is solved the same way here:
 * a FIELD_META table giving each key a human label and a format, a HIDDEN_KEYS
 * set for the fields that are plumbing or are rendered elsewhere, an `order`
 * so the headline figure reads first, and `titleCase` (imported from
 * riskFormat) as the fallback label.
 *
 * It does NOT reuse riskFormat's `buildFigures`/`formatMoney`, for one reason:
 * `formatMoney` is deliberately compact ("R 1.2m"), which is right for a risk
 * tile and wrong for a bill. Every figure on this screen has to foot exactly to
 * the cent, because this is the screen a client reads when disputing a charge.
 * So money goes through `formatZAR` and nothing is abbreviated.
 *
 * THREE SHAPES, NOT ONE
 * ---------------------
 * `basisDetail` is not one schema. It is three, and they share almost nothing:
 *
 *   pc        base, claim_amount, materials_on_site, retention_*,
 *             net_excluding_vat, vo_deduplication{}, cap{}, assumptions{}
 *   vo        base, sub_total, grand_total, approved_amount, derivation,
 *             cap{}, assumptions{}
 *   reversal  reverses_charge_id, reverses_dedupe_key, reason, original_basis
 *             — NO `base`, NO `cap`, NO assumptions.
 *
 * Anything reading `detail.base` unconditionally breaks on every credit row.
 * `basisShape()` is the single place that decides which of the three is in
 * hand, and every other export in this module takes the answer as an argument
 * rather than re-sniffing it.
 *
 * NUMBERS ARRIVE AS STRINGS. The charge-level amounts (feeAmount, baseAmount…)
 * are JSON floats, but everything inside `basisDetail` was stringified on the
 * way into the JSONField precisely because a float cannot hold cents exactly.
 * `toNum` exists so no caller forgets that.
 */
import { formatZAR } from "@/lib/formatCurrency";
import { titleCase } from "@/lib/riskFormat";

export type BasisShape = "pc" | "vo" | "reversal" | "unknown";

export type BasisDetail = Record<string, any> | null | undefined;

/** Decimal strings in, number out. Empty/absent reads as 0. */
export function toNum(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Money for the screen. Never abbreviated — this footing has to be checkable. */
export function money(value: unknown): string {
  return formatZAR(toNum(value));
}

/** A rate as the contract would state it: "1.00%", "15.00%". */
export function pct(value: unknown): string {
  return `${toNum(value).toFixed(2)}%`;
}

/**
 * Which of the three schemas this detail blob is.
 *
 * `status` is trusted first because it is authoritative: the backend sets
 * REVERSAL on the credit row itself. The key sniff is the fallback for a row
 * whose status did not survive some future refactor, and the eventType check
 * is last because it is present on all three.
 */
export function basisShape(
  detail: BasisDetail,
  eventType?: string,
  status?: string
): BasisShape {
  if (status === "reversal") return "reversal";
  if (detail && typeof detail === "object") {
    if ("reverses_charge_id" in detail || "original_basis" in detail) return "reversal";
    if ("claim_amount" in detail || "net_excluding_vat" in detail) return "pc";
    if ("sub_total" in detail || "derivation" in detail) return "vo";
  }
  if (eventType === "pc_posted") return "pc";
  if (eventType === "vo_approved") return "vo";
  return "unknown";
}

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

type FigureFormat = "currency" | "percent" | "text";

interface FieldMeta {
  label: string;
  format: FigureFormat;
  /** Lower sorts first. */
  order: number;
  /** The number the whole derivation is driving at. */
  emphasis?: boolean;
}

const FIELD_META: Record<string, FieldMeta> = {
  // Payment certificate derivation
  claim_amount: { label: "Valuation claimed", format: "currency", order: 1 },
  materials_on_site: { label: "Materials on site", format: "currency", order: 2 },
  retention_base: { label: "Retention base", format: "currency", order: 3 },
  retention_rate_pct: { label: "Retention rate", format: "percent", order: 4 },
  retention_amount: { label: "Retention held", format: "currency", order: 5 },
  retention_release: { label: "Retention released", format: "currency", order: 6 },
  net_excluding_vat: { label: "Certified excluding VAT", format: "currency", order: 7 },

  // Variation order derivation
  sub_total: { label: "Variation net (excl VAT)", format: "currency", order: 1 },
  grand_total: { label: "Variation gross (incl VAT)", format: "currency", order: 2 },
  approved_amount: { label: "Approved at sign-off", format: "currency", order: 3 },

  // Shared — always last, it is the answer the rest of the block builds to.
  base: { label: "Fee base", format: "currency", order: 90, emphasis: true },
};

/**
 * Keys that must never render as a figure.
 * Either they get their own block below (dedup, cap, assumptions, strategy),
 * or they are internal plumbing that means nothing to a client.
 */
const HIDDEN_KEYS = new Set([
  "assumptions",        // rendered as prose statements
  "cap",                // rendered as the cap block
  "vo_deduplication",   // rendered as the de-duplication block
  "strategy",           // rendered as a labelled line in the header
  "derivation",         // rendered as the base prose sentence
  "original_basis",     // rendered by recursing into the original charge
  "reverses_charge_id", // rendered in the credit's lede
  "reverses_dedupe_key",// internal idempotency key
  "reason",             // rendered in the credit's lede
  "currency",           // folded into the formatted money value
  "source",             // rendered as an assumption note
]);

export interface Figure {
  key: string;
  label: string;
  value: string;
  emphasis?: boolean;
}

/**
 * The flat scalar figures of a derivation, ordered and formatted.
 *
 * Objects and booleans are skipped on purpose: nested structures have their
 * own blocks, and a bare `true` in a value column tells a quantity surveyor
 * nothing (see `assumptionStatements`).
 */
export function buildBasisFigures(detail: BasisDetail): Figure[] {
  if (!detail || typeof detail !== "object") return [];

  const figures: (Figure & { order: number })[] = [];

  for (const [key, raw] of Object.entries(detail)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (raw === null || raw === undefined || raw === "") continue;
    if (typeof raw === "object") continue;
    if (typeof raw === "boolean") continue;

    const meta = FIELD_META[key];
    const format = meta?.format ?? "text";
    let value: string;
    switch (format) {
      case "currency":
        value = money(raw);
        break;
      case "percent":
        value = pct(raw);
        break;
      default:
        value = String(raw);
    }

    figures.push({
      key,
      label: meta?.label ?? titleCase(key),
      value,
      order: meta?.order ?? 50,
      emphasis: meta?.emphasis,
    });
  }

  return figures
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...rest }) => rest);
}

/* ------------------------------------------------------------------ */
/* Prose                                                               */
/* ------------------------------------------------------------------ */

/** What the project is charged on, in words. */
export function strategyLabel(strategy: unknown): string | null {
  switch (strategy) {
    case "both":
      return "Variations at approval and certificates when posted, de-duplicated";
    case "pc_only":
      return "Payment certificates only";
    case "vo_only":
      return "Variation orders only";
    default:
      return null;
  }
}

/**
 * How the fee base was reached, in sentences a client can check with a
 * calculator. Returns one paragraph per step.
 */
export function baseNarrative(detail: BasisDetail, shape: BasisShape): string[] {
  if (!detail || shape === "reversal" || shape === "unknown") return [];
  const lines: string[] = [];

  if (shape === "pc") {
    const claim = toNum(detail.claim_amount);
    const retention = toNum(detail.retention_amount);
    const release = toNum(detail.retention_release);
    const net = toNum(detail.net_excluding_vat);

    lines.push(
      `Certified value is the valuation claimed less retention held plus retention released: ` +
        `${money(claim)} − ${money(retention)} + ${money(release)} = ${money(net)}.`
    );

    const retentionOnMaterials = detail.assumptions?.retention_includes_materials_on_site;
    if (retentionOnMaterials === true) {
      lines.push(
        `Retention of ${pct(detail.retention_rate_pct)} was applied to the full valuation of ` +
          `${money(detail.retention_base)}, materials on site included.`
      );
    } else if (retentionOnMaterials === false) {
      lines.push(
        `Retention of ${pct(detail.retention_rate_pct)} was applied to ${money(detail.retention_base)} — ` +
          `the valuation less ${money(detail.materials_on_site)} of materials on site, which do not attract retention.`
      );
    }

    const deduction = toNum(detail.vo_deduplication?.deduction);
    if (deduction > 0) {
      lines.push(
        `Variation work already charged at approval was then deducted: ` +
          `${money(net)} − ${money(deduction)} = ${money(detail.base)}, the fee base for this certificate.`
      );
    } else {
      lines.push(
        `Nothing was deducted for previously charged variations, so the fee base is ${money(detail.base)}.`
      );
    }
    return lines;
  }

  // Variation order
  switch (detail.derivation) {
    case "sub_total":
      lines.push(
        `The fee base is the variation's net value of ${money(detail.sub_total)}. ` +
          `The grand total of ${money(detail.grand_total)} includes VAT, and fee is not charged on VAT.`
      );
      break;
    case "approved_amount_pro_rata_of_sub_total":
      lines.push(
        `Only ${money(detail.approved_amount)} of this variation's ${money(detail.grand_total)} gross value was approved.`
      );
      lines.push(
        `There is no separately recorded approved net amount, so the approval is treated as pro-rata across net and VAT: ` +
          `${money(detail.approved_amount)} × ${money(detail.sub_total)} ÷ ${money(detail.grand_total)} = ${money(detail.base)}.`
      );
      break;
    case "vat_inclusive_approved_or_grand_total":
      lines.push(
        `The fee base is the VAT-inclusive value of ${money(detail.base)}.`
      );
      break;
    default:
      lines.push(`The fee base for this variation is ${money(detail.base)}.`);
  }
  return lines;
}

export interface DedupeView {
  deduction: number;
  why: string;
  matched: { voNumber: string; thisPeriod: string }[];
  unmatched: { voNumber: string; thisPeriod: string }[];
}

/** The de-duplication block, or null where the shape carries none. */
export function dedupeView(detail: BasisDetail): DedupeView | null {
  const d = detail?.vo_deduplication;
  if (!d || typeof d !== "object") return null;
  return {
    deduction: toNum(d.deduction),
    why: typeof d.why === "string" ? d.why : "",
    matched: Array.isArray(d.matched) ? d.matched : [],
    unmatched: Array.isArray(d.unmatched) ? d.unmatched : [],
  };
}

export interface CapView {
  capAmount: number | null;
  runningTotalBefore: number;
  uncappedFee: number;
  chargedFee: number;
  capReached: boolean;
  /** The arithmetic, in words. */
  narrative: string;
}

/**
 * The cap block. Returns null for a reversal (which carries no `cap` key) and
 * for any charge raised before caps were recorded.
 */
export function capView(detail: BasisDetail): CapView | null {
  const c = detail?.cap;
  if (!c || typeof c !== "object") return null;

  const capAmount = c.cap_amount === null || c.cap_amount === undefined ? null : toNum(c.cap_amount);
  const before = toNum(c.running_total_before);
  const uncapped = toNum(c.uncapped_fee);
  const charged = toNum(c.charged_fee);
  const reached = Boolean(c.cap_reached);

  let narrative: string;
  if (capAmount === null) {
    narrative = "No fee cap is set on this project, so the full fee was charged.";
  } else if (reached) {
    narrative =
      `Fees of ${money(before)} had already been charged against the cap of ${money(capAmount)}, ` +
      `leaving ${money(Math.max(capAmount - before, 0))}. The uncapped fee of ${money(uncapped)} exceeded ` +
      `that headroom, so ${money(charged)} was charged and the cap is now reached.`;
  } else {
    narrative =
      `Fees of ${money(before)} had been charged against the cap of ${money(capAmount)} before this one, ` +
      `so the full ${money(charged)} was charged.`;
  }

  return {
    capAmount,
    runningTotalBefore: before,
    uncappedFee: uncapped,
    chargedFee: charged,
    capReached: reached,
    narrative,
  };
}

/**
 * The assumptions block as statements rather than `key: true` pairs.
 *
 * These are recorded per charge so a charge raised today keeps the rules it
 * was raised under, even after the constants change. That only has value if
 * they are legible, hence the mapping.
 */
export function assumptionStatements(detail: BasisDetail): string[] {
  const a = detail?.assumptions;
  if (!a || typeof a !== "object") return [];
  const out: string[] = [];

  for (const [key, raw] of Object.entries(a)) {
    switch (key) {
      case "retention_includes_materials_on_site":
        out.push(
          raw
            ? "Retention is calculated on the full valuation, materials on site included."
            : "Materials on site are excluded from the retention base."
        );
        break;
      case "fee_base_is_vat_exclusive":
        out.push(
          raw
            ? "Fee is charged on the VAT-exclusive value; no fee is charged on VAT."
            : "Fee is charged on the VAT-inclusive value."
        );
        break;
      case "partial_approval_is_pro_rata":
        if (raw) {
          out.push("A partly approved variation is treated as approved pro-rata across net and VAT.");
        }
        break;
      case "source":
        if (typeof raw === "string" && raw) out.push(raw.charAt(0).toUpperCase() + raw.slice(1));
        break;
      default:
        if (typeof raw === "boolean") out.push(`${titleCase(key)}: ${raw ? "yes" : "no"}`);
        else if (raw) out.push(`${titleCase(key)}: ${String(raw)}`);
    }
  }
  return out;
}

/** The fee arithmetic on the charge itself, spelled out. */
export function feeArithmetic(charge: {
  baseAmount: number;
  feeRatePct: number;
  feeAmount: number;
  vatRatePct: number;
  vatAmount: number;
  totalAmount: number;
}): string {
  return (
    `${money(charge.baseAmount)} × ${pct(charge.feeRatePct)} = ${money(charge.feeAmount)} fee. ` +
    `VAT at ${pct(charge.vatRatePct)} = ${money(charge.vatAmount)}. ` +
    `Total ${money(charge.totalAmount)}.`
  );
}

/** "August 2026" — the statement period a charge falls in. */
export function statementPeriod(createdAt: string | null | undefined): {
  key: string;
  label: string;
} {
  const d = createdAt ? new Date(createdAt) : null;
  if (!d || isNaN(d.getTime())) return { key: "unknown", label: "Undated" };
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return { key, label };
}

/** Short date for a table cell. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
