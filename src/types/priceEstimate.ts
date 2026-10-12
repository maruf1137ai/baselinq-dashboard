// VO line-item price estimates (backend ai_analysis/pricing.py, schema_version 2).
// Every figure is an unverified AI estimate; there is deliberately no savings or fair-value field.

export type PriceBreakdownStatus =
  | "ai_estimate"
  | "partial"
  | "not_verified"
  | "no_line_items"
  | "estimate_unavailable";

// "unit_unclear": the claimed rate is so far outside the range that the units probably differ (e.g. kg vs tonne).
export type PricePosition = "above_range" | "within_range" | "below_range" | "unit_unclear";

export interface PriceEstimate {
  unit: string;
  low: number;
  typical: number;
  high: number;
  basis: string;
}

export interface PriceBreakdownItem {
  index: number;
  description: string;
  quantity: number;
  claimed_unit_rate: number;
  claimed_total: number;
  status: "ai_estimate" | "not_verified";
  estimate: PriceEstimate | null;
  position: PricePosition | null;
  variance_vs_estimate_pct: number | null;
  note: string;
}

export interface PriceBreakdownV2 {
  schema_version: 2;
  status: PriceBreakdownStatus;
  label: string;
  disclaimer: string;
  source: "ai_estimate";
  currency: string;
  location?: string;
  model?: string;
  generated_at?: string;
  reason?: string;
  total_claimed: number;
  counts: {
    estimated: number;
    not_verified: number;
    above_range: number;
    within_range: number;
    below_range: number;
    unit_unclear?: number;
  };
  items: PriceBreakdownItem[];
}

export function isPriceBreakdownV2(value: unknown): value is PriceBreakdownV2 {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<PriceBreakdownV2>;
  return v.schema_version === 2 && Array.isArray(v.items);
}
