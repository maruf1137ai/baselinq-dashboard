/**
 * VO prices are AI estimates, not verified market data (audit ACC-01…03). The table must always carry the
 * label and disclaimer, show unverified items as such, never show savings / fair value / market claims, and
 * render nothing for the old "verified" price data still stored in older chat messages.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { isPriceBreakdownV2, type PriceBreakdownV2 } from "@/types/priceEstimate";
import { LegacyPriceNotice } from "../LegacyPriceNotice";
import { PriceBreakdown } from "../PriceBreakdown";

const LABEL = "AI estimate — not verified";
const DISCLAIMER =
  "Indicative ranges produced by an AI model from general knowledge. They are not market data, have not been " +
  "checked against suppliers or price indices, and must be confirmed by a QS before use.";

function breakdown(overrides: Partial<PriceBreakdownV2> = {}): PriceBreakdownV2 {
  return {
    schema_version: 2,
    status: "partial",
    label: LABEL,
    disclaimer: DISCLAIMER,
    source: "ai_estimate",
    currency: "ZAR",
    location: "Cape Town",
    total_claimed: 45520,
    counts: { estimated: 2, not_verified: 1, above_range: 1, within_range: 1, below_range: 0 },
    items: [
      {
        index: 1, description: "Concrete 30 MPa", quantity: 25, claimed_unit_rate: 1800, claimed_total: 45000,
        status: "ai_estimate", estimate: { unit: "m³", low: 1400, typical: 1600, high: 1750, basis: "Ready-mix, pumped." },
        position: "above_range", variance_vs_estimate_pct: 12.5,
        note: "Claimed rate is above the AI estimate range — ask a QS to check it.",
      },
      {
        index: 2, description: "Steel reinforcement", quantity: 2, claimed_unit_rate: 260, claimed_total: 520,
        status: "ai_estimate", estimate: { unit: "kg", low: 200, typical: 250, high: 300, basis: "" },
        position: "within_range", variance_vs_estimate_pct: 4,
        note: "Claimed rate is within the AI estimate range (not a verification).",
      },
      {
        index: 3, description: "Sundries", quantity: 1, claimed_unit_rate: 0, claimed_total: 0,
        status: "not_verified", estimate: null, position: null, variance_vs_estimate_pct: null,
        note: "Not verified — manual QS review.",
      },
    ],
    ...overrides,
  };
}

describe("PriceBreakdown", () => {
  it("always shows the label and the disclaimer", () => {
    render(<PriceBreakdown priceData={breakdown()} />);
    expect(screen.getByRole("region", { name: "AI price estimates" })).toBeInTheDocument();
    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it("shows each claimed rate against the AI range with a neutral check", () => {
    const { container } = render(<PriceBreakdown priceData={breakdown()} />);
    // en-ZA formatting: space-like group separator, decimal comma
    expect(container.textContent).toMatch(/R\s1\s?400,00\s–\sR\s1\s?750,00 per m³/);
    expect(container.textContent).toMatch(/R\s1\s?800,00/);
    expect(screen.getByText("Above AI range")).toBeInTheDocument();
    expect(screen.getByText("Within AI range")).toBeInTheDocument();
    expect(screen.getByText("Ready-mix, pumped.")).toBeInTheDocument();
  });

  it("marks items without an estimate as not verified", () => {
    render(<PriceBreakdown priceData={breakdown()} />);
    expect(screen.getByText("Not verified — manual QS review")).toBeInTheDocument();
  });

  it("never shows savings, fair value or market claims", () => {
    const { container } = render(<PriceBreakdown priceData={breakdown()} />);
    const text = (container.textContent || "").replace("not market data", "").replace(/not verified/gi, "");
    expect(text).not.toMatch(/saving|fair value|market|stats sa|verified/i);
    expect(container.textContent).toMatch(/Total claimed:/);
  });

  it("says the units may differ instead of above/below when the rate is far outside the range", () => {
    const steel = {
      index: 1, description: "Y12 reinforcement", quantity: 900, claimed_unit_rate: 32, claimed_total: 28800,
      status: "ai_estimate" as const, estimate: { unit: "tonne", low: 8000, typical: 10000, high: 12000, basis: "" },
      position: "unit_unclear" as const, variance_vs_estimate_pct: null,
      note: "The claimed rate and the AI range look like different units (for example per kg and per tonne) — no comparison made; ask a QS to check.",
    };
    render(<PriceBreakdown priceData={breakdown({ items: [steel] })} />);
    expect(screen.getByText("Units may differ — QS to check")).toBeInTheDocument();
    expect(screen.queryByText("Below AI range")).not.toBeInTheDocument();
  });

  it("keeps the currency symbol and the claimed amount on one line", () => {
    const { container } = render(<PriceBreakdown priceData={breakdown()} />);
    const claimed = Array.from(container.querySelectorAll("td")).find((td) => /R\s1\s?800,00/.test(td.textContent || ""));
    expect(claimed?.className).toMatch(/whitespace-nowrap/);
  });

  it("shows why there is no estimate", () => {
    render(
      <PriceBreakdown
        priceData={breakdown({ status: "estimate_unavailable", reason: "The AI price estimate could not be produced right now. Try again later." })}
      />,
    );
    expect(screen.getByText("The AI price estimate could not be produced right now. Try again later.")).toBeInTheDocument();
  });

  it("uses the currency code for other currencies", () => {
    const { container } = render(<PriceBreakdown priceData={breakdown({ currency: "USD" })} />);
    expect(container.textContent).toMatch(/USD/);
    expect(container.textContent).not.toMatch(/R\s?1/);
  });

  it("renders nothing for old price data, empty data or nothing", () => {
    const legacy = { items_analysis: [{ market_verification: { status: "verified", data_quality: "high" } }], summary: { potential_savings: 9000 } };
    for (const data of [legacy, breakdown({ items: [], status: "no_line_items" }), null, undefined, "x"]) {
      const { container, unmount } = render(<PriceBreakdown priceData={data} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});

describe("isPriceBreakdownV2", () => {
  it("accepts only the current shape", () => {
    expect(isPriceBreakdownV2(breakdown())).toBe(true);
    expect(isPriceBreakdownV2({ schema_version: 1, items: [] })).toBe(false);
    expect(isPriceBreakdownV2({ items_analysis: [] })).toBe(false);
    expect(isPriceBreakdownV2(null)).toBe(false);
  });
});

describe("LegacyPriceNotice", () => {
  it("tells the reader the old prices were not verified", () => {
    render(<LegacyPriceNotice />);
    expect(screen.getByRole("note")).toHaveTextContent(/earlier automated check that was not verified/);
    expect(screen.getByRole("note")).toHaveTextContent(/ask a QS to review the rates/);
  });
});
