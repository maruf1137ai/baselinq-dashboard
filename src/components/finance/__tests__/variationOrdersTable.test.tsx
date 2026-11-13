import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import {
  OrderStatus,
  VariationOrdersTable,
  type VariationOrder,
} from "@/components/finance/VariationOrdersTable";
import { toCertificationMap } from "@/lib/variationCertification";

const order = (over: Partial<VariationOrder>): VariationOrder => ({
  id: "VO-001",
  voNumber: "VO-001",
  taskId: "11",
  title: "Additional stormwater",
  value: 100000,
  status: OrderStatus.Approved,
  signedAt: "2026-10-01T00:00:00Z",
  requestedBy: null,
  updated: "1 Oct 2026",
  impact: null,
  ...over,
});

const ORDERS: VariationOrder[] = [
  order({}),
  order({ id: "VO-002", voNumber: "VO-002", taskId: "12", title: "Façade change", value: 40000 }),
  order({ id: "VO-003", voNumber: "VO-003", taskId: "13", title: "Draft extra", status: OrderStatus.Draft }),
];

const BY_NUMBER = toCertificationMap({
  variations: [
    {
      voNumber: "VO-001",
      approvedValue: "100000.00",
      certifiedToDate: "50000.00",
      certifiedPosted: "30000.00",
      onUnpostedCertificates: "20000.00",
      remaining: "50000.00",
      overCertified: false,
    },
    {
      voNumber: "VO-002",
      approvedValue: "40000.00",
      certifiedToDate: "40000.00",
      certifiedPosted: "40000.00",
      onUnpostedCertificates: "0.00",
      remaining: "0.00",
      overCertified: false,
    },
  ],
});

const rowFor = (title: string) => screen.getByText(title).closest("tr") as HTMLElement;

describe("the variation register's Certified and Remaining columns", () => {
  it("sits Certified and Remaining beside Value", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" certification={{ byNumber: BY_NUMBER, status: "ready" }} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers.slice(2, 5)).toEqual(["Value excl. VAT", "Certified", "Remaining"]);
  });

  it("shows what is certified, what is on a certificate not yet posted, and what is left", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" certification={{ byNumber: BY_NUMBER, status: "ready" }} />);
    const r = within(rowFor("Additional stormwater"));
    expect(r.getByText(/R\s30\s000,00/)).toBeInTheDocument();
    expect(r.getByText(/\+ R\s20\s000,00 not yet posted/)).toBeInTheDocument();
    expect(r.getByText(/R\s50\s000,00/)).toBeInTheDocument();
  });

  it("says Fully certified rather than R 0,00 when nothing is left", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" certification={{ byNumber: BY_NUMBER, status: "ready" }} />);
    expect(within(rowFor("Façade change")).getByText("Fully certified")).toBeInTheDocument();
  });

  it("leaves an unapproved variation blank in both columns", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" certification={{ byNumber: BY_NUMBER, status: "ready" }} />);
    const cells = within(rowFor("Draft extra")).getAllByRole("cell");
    expect(cells[3]).toHaveTextContent("—");
    expect(cells[4]).toHaveTextContent("—");
  });

  it("says Unavailable, never R 0,00, when the ledger failed to load", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" certification={{ byNumber: {}, status: "error" }} />);
    const r = within(rowFor("Additional stormwater"));
    expect(r.getAllByText("Unavailable")).toHaveLength(2);
    expect(r.queryByText(/R\s0,00/)).not.toBeInTheDocument();
  });

  it("names the VAT basis under the table", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" certification={{ byNumber: BY_NUMBER, status: "ready" }} />);
    expect(screen.getByText(/Amounts excl\. VAT/)).toBeInTheDocument();
  });

  it("renders the register as before when no certification is passed", () => {
    render(<VariationOrdersTable orders={ORDERS} search="" />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).not.toContain("Certified");
    expect(headers).toHaveLength(7);
  });
});
