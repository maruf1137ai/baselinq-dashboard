/**
 * Presentation layer for risk signal detail.
 *
 * The backend sends a structured `detail` payload per rule. Rendering that
 * raw produces a debug dump — snake_case keys, unformatted decimals, and
 * booleans like `contractual: false` that mean nothing to a quantity
 * surveyor. This module turns it into figures a construction professional
 * can read at a glance.
 *
 * Three jobs:
 *   1. Give every field a human label and the right format (money, percent,
 *      days, date).
 *   2. Hide the fields that are plumbing rather than information — currency
 *      codes belong inside the formatted number, and long prose notes get
 *      their own treatment rather than sitting in a value column.
 *   3. Order the figures so the most important number is read first.
 */

export type FigureFormat = "currency" | "percent" | "number" | "days" | "date" | "text";

interface FieldMeta {
  label: string;
  format: FigureFormat;
  /** Lower sorts first. Keeps the headline number leftmost. */
  order?: number;
}

/**
 * Field metadata keyed on the backend's snake_case names.
 * Anything not listed falls back to a title-cased label and plain text.
 */
const FIELD_META: Record<string, FieldMeta> = {
  // VO tolerance / mandate
  cumulative_vo_value: { label: "Approved variations", format: "currency", order: 1 },
  original_budget:     { label: "Original budget",     format: "currency", order: 2 },
  percentage:          { label: "Of budget",           format: "percent",  order: 3 },
  tolerance_pct:       { label: "Tolerance",           format: "percent",  order: 4 },
  vo_count:            { label: "Variation orders",    format: "number",   order: 5 },
  vo_value:            { label: "Variation value",     format: "currency", order: 1 },
  mandate:             { label: "PA mandate",          format: "currency", order: 2 },
  vo_number:           { label: "Variation order",     format: "text",     order: 0 },

  // Milestones / programme
  milestone:      { label: "Milestone",       format: "text",   order: 0 },
  end_date:       { label: "Planned end",     format: "date",   order: 1 },
  planned_end:    { label: "Planned end",     format: "date",   order: 1 },
  days_overdue:   { label: "Days overdue",    format: "days",   order: 2 },
  days_slipped:   { label: "Days slipped",    format: "days",   order: 2 },
  threshold_days: { label: "Tolerance",       format: "days",   order: 3 },

  // Payments
  pc_number:        { label: "Certificate",      format: "text",     order: 0 },
  certificate_date: { label: "Certified on",     format: "date",     order: 1 },
  net_amount:       { label: "Amount outstanding", format: "currency", order: 2 },
  days_pending:     { label: "Days outstanding", format: "days",     order: 3 },
  terms_days:       { label: "Payment terms",    format: "days",     order: 4 },
  days_overrun:     { label: "Days over terms",  format: "days",     order: 5 },

  // Certification divergence
  claimed_pct:     { label: "Claimed",     format: "percent", order: 1 },
  measured_pct:    { label: "Measured progress", format: "percent", order: 2 },
  divergence_pct:  { label: "Divergence",  format: "percent", order: 3 },

  // Time bars
  awareness_date: { label: "Awareness date", format: "date",   order: 1 },
  deadline_date:  { label: "Deadline",       format: "date",   order: 2 },
  days_remaining: { label: "Days remaining", format: "days",   order: 3 },
  duration:       { label: "Period allowed", format: "number", order: 4 },
  contract_form:  { label: "Contract",       format: "text",   order: 0 },
};

/**
 * Keys that must never appear as a figure.
 * Either they are rendered elsewhere (notes, evidence line), or they are
 * internal plumbing (currency code, machine flags, nested arrays).
 */
const HIDDEN_KEYS = new Set([
  "currency",            // folded into the formatted money value
  "contractual",         // rendered as a badge instead
  "evidence",            // shown as the row subtitle
  "basis_note",          // rendered as a caveat block
  "coverage_note",       // rendered as a caveat block
  "advisory_note",       // rendered as a caveat block
  "note",                // rendered as a caveat block
  "calculation",         // rendered as its own explanation line
  "summary",             // duplicate of the evidence line
  "detail",
  "kind",
  "clause_display",      // rendered in the header
  "clause_ref",
  "clause_verified",
  "clock_type",
  "unit",
  "milestones",          // nested array — shown as its own sub-list
  "index_movements",     // nested array
  "categories",
  "gate_mode",
  "direction",
  "dsu_candidate",
  "material_threshold_pct",
  "source",
  "threshold_pct",
  "milestone_id",
  "status",
]);

/**
 * Fallback label for a backend key with no metadata entry.
 * Exported because the same "raw snake_case key → human label" problem recurs
 * wherever the backend hands the UI a structured detail blob — see
 * `lib/feeBasis.ts`, which applies this module's approach to platform fees.
 */
export function titleCase(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function formatMoney(value: number, currency = "ZAR"): string {
  const abs = Math.abs(value);
  // Construction figures are large; compact notation keeps the tile readable
  // without hiding the magnitude.
  if (abs >= 1_000_000) {
    return `${currency} ${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  }
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export interface Figure {
  key: string;
  label: string;
  value: string;
  /** True when this figure is the one that breached a threshold. */
  emphasis?: boolean;
}

/**
 * Turn a signal's `detail` payload into display-ready figures.
 */
export function buildFigures(detail: Record<string, any> | null | undefined): Figure[] {
  if (!detail) return [];
  const currency = detail.currency || "ZAR";

  const figures: (Figure & { order: number })[] = [];

  for (const [key, raw] of Object.entries(detail)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (raw === null || raw === undefined || raw === "") continue;
    // Nested structures get their own rendering, never a value column.
    if (typeof raw === "object") continue;
    if (typeof raw === "boolean") continue;

    const meta = FIELD_META[key];
    const format = meta?.format ?? "text";
    let value: string;

    switch (format) {
      case "currency":
        value = formatMoney(Number(raw), currency);
        break;
      case "percent":
        value = `${Number(raw).toFixed(1)}%`;
        break;
      case "days": {
        const n = Number(raw);
        value = `${Math.abs(n)} ${Math.abs(n) === 1 ? "day" : "days"}`;
        break;
      }
      case "number":
        value = Number(raw).toLocaleString();
        break;
      case "date":
        value = formatDate(String(raw));
        break;
      default:
        value = String(raw);
    }

    figures.push({
      key,
      label: meta?.label ?? titleCase(key),
      value,
      order: meta?.order ?? 50,
      // The measured value that crossed the line, not the threshold itself.
      emphasis: ["percentage", "days_overdue", "days_slipped", "days_pending",
                 "divergence_pct", "days_remaining"].includes(key),
    });
  }

  return figures
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...rest }) => rest);
}

/**
 * The caveat text for a signal, if any. These exist because several rules
 * report things that look contractual but are not, and the distinction must
 * survive all the way to the screen.
 */
export function getCaveat(detail: Record<string, any> | null | undefined): string | null {
  if (!detail) return null;
  return detail.basis_note || detail.coverage_note || detail.advisory_note || null;
}

/** The plain-English calculation, where a rule provides one (time bars). */
export function getCalculation(detail: Record<string, any> | null | undefined): string | null {
  return detail?.calculation ?? null;
}

/** Milestone breakdown for the certification-divergence rule. */
export function getMilestoneBreakdown(detail: Record<string, any> | null | undefined) {
  const rows = detail?.milestones;
  return Array.isArray(rows) && rows.length ? rows : null;
}
