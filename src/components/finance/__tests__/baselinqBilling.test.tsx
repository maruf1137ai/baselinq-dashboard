/**
 * Finance → Baselinq Billing, the merged tab.
 *
 * The merge put two permission codes behind one tab, which is exactly where a
 * consolidation like this leaks: the tab is visible on EITHER
 * `finance.platform_fees.view` or `finance.invoices.view`, and the server
 * enforces them separately (cost_ledger/views.py for the fee ledger,
 * billing/views.py for the invoices). A client may hold one and not the other.
 * So every test here is about a viewer holding exactly one code and seeing
 * exactly one section — and, just as importantly, not even REQUESTING the
 * endpoint the server would refuse them.
 *
 * The rest is the merge's own promise: one summary strip with no figure on it
 * twice, and "Invoiced · BLQ-…" on a charge row as a real link to that
 * invoice's document rather than dead text naming another tab.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const FEES_URL = "cost-ledger/fees/?project_id=45";
const INVOICES_URL = "billing/projects/45/invoices/";

/** Which keys `useFetch` was called with, so a refused request can be asserted. */
const requested: string[] = [];
let held: string[] = [];
let staff = false;
const failing = new Set<string>();

vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: string) => held.includes(code),
  useIsPlatformStaff: () => staff,
}));
vi.mock("@/hooks/useFetch", () => ({
  default: (url: string) => {
    requested.push(url);
    if (!url) return { data: undefined, isLoading: false, isError: false };
    if (failing.has(url)) return { data: undefined, isLoading: false, isError: true };
    return { data: PAYLOADS[url], isLoading: false, isError: false };
  },
}));
vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(async () => ({})),
  postData: vi.fn(async () => ({})),
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: () => <div>loading</div>,
}));

/* ── Fixtures ─────────────────────────────────────────────────────────── */

/** One invoiced fee and one that has not reached an invoice yet. */
const CHARGES = [
  {
    id: 900,
    status: "active",
    eventType: "pc_posted",
    feeBase: "certified",
    sourceRef: "PC-007",
    sourceVoId: null,
    sourcePcId: 7,
    baseAmount: 100000,
    feeRatePct: 1,
    feeAmount: 1000,
    vatRatePct: 15,
    vatAmount: 150,
    totalAmount: 1150,
    runningTotal: 1000,
    capReached: false,
    reversesId: null,
    reversalReason: "",
    costLedgerEntryId: null,
    basisDetail: {},
    createdAt: "2026-10-03T00:00:00Z",
    billingState: "invoiced",
    invoiceId: 1,
    invoiceNumber: "BLQ-00045-0001",
  },
  {
    id: 901,
    status: "active",
    eventType: "vo_approved",
    feeBase: "approved",
    sourceRef: "VO-002",
    sourceVoId: 2,
    sourcePcId: null,
    baseAmount: 50000,
    feeRatePct: 1,
    feeAmount: 500,
    vatRatePct: 15,
    vatAmount: 75,
    totalAmount: 575,
    runningTotal: 1500,
    capReached: false,
    reversesId: null,
    reversalReason: "",
    costLedgerEntryId: null,
    basisDetail: {},
    createdAt: "2026-10-20T00:00:00Z",
    billingState: "not_invoiced",
    invoiceId: null,
    invoiceNumber: null,
  },
];

const FEES_RESPONSE = {
  projectId: 45,
  viewBillingLedger: true,
  config: {
    configured: true,
    enabled: true,
    feeBase: "certified",
    feeRatePct: 1,
    vatRatePct: 15,
    capAmount: null,
    billingContactName: "Vantage Developments",
    billingContactEmail: "ap@vantage.test",
  },
  calculatedFees: CHARGES,
  totals: {
    feeExVat: 1500,
    vat: 225,
    total: 1725,
    reversed: 0,
    cap: null,
    capRemaining: null,
    capReached: false,
    currency: "ZAR",
  },
};

const INVOICES_RESPONSE = {
  projectId: 45,
  invoices: [
    {
      id: 1,
      projectId: 45,
      projectName: "Market Building",
      projectNumber: "PRJ-045",
      invoiceNumber: "BLQ-00045-0001",
      status: "issued",
      displayStatus: "unpaid",
      isSettled: false,
      isOutstanding: true,
      isOverdue: false,
      dueOn: "2026-11-30",
      supplierDetails: {},
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      subtotal: "1000.00",
      vatAmount: "150.00",
      totalAmount: "1150.00",
      billingContactName: "Vantage Developments",
      billingContactEmail: "ap@vantage.test",
      notes: "",
      issuedAt: "2026-11-01T00:00:00Z",
      settledAt: null,
      settledOn: null,
      settledReference: "",
      cancelledAt: null,
      cancellationReason: "",
      createdAt: "2026-10-31T00:00:00Z",
    },
  ],
  uninvoiced: {
    uninvoicedChargeCount: 1,
    uninvoicedFee: "500.00",
    uninvoicedVat: "75.00",
    uninvoicedTotal: "575.00",
    earliestUninvoicedOn: "2026-10-20",
  },
};

const PAYLOADS: Record<string, unknown> = {
  [FEES_URL]: FEES_RESPONSE,
  [INVOICES_URL]: INVOICES_RESPONSE,
};

import BaselinqBilling from "@/components/finance/baselinqBilling";

const draw = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <BaselinqBilling />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** Page text with the non-breaking spaces `formatZAR` groups with folded out. */
const text = () => (document.body.textContent ?? "").replace(/ /g, " ");

beforeEach(() => {
  vi.clearAllMocks();
  requested.length = 0;
  failing.clear();
  staff = false;
  held = ["finance.platform_fees.view", "finance.invoices.view"];
  localStorage.setItem("selectedProjectId", "45");
});

describe("one code at a time", () => {
  it("shows a finance.invoices.view-only viewer the invoices and NOT the fee derivation", () => {
    held = ["finance.invoices.view"];
    draw();

    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("BLQ-00045-0001")).toBeInTheDocument();

    // The derivation is the other code's content. Its heading, its table and
    // its charge references are all absent.
    expect(screen.queryByText("How the fees were calculated")).not.toBeInTheDocument();
    expect(screen.queryByText("Running total")).not.toBeInTheDocument();
    expect(screen.queryByText("VO-002")).not.toBeInTheDocument();
    // And the fee ledger was never even asked for.
    expect(requested).not.toContain(FEES_URL);
  });

  it("shows a finance.platform_fees.view-only viewer the derivation and NOT the invoices", () => {
    held = ["finance.platform_fees.view"];
    draw();

    expect(screen.getByText("How the fees were calculated")).toBeInTheDocument();
    expect(screen.getByText("VO-002")).toBeInTheDocument();

    expect(screen.queryByText("Invoices")).not.toBeInTheDocument();
    expect(screen.queryByText("Supply period")).not.toBeInTheDocument();
    expect(requested).not.toContain(INVOICES_URL);
  });

  it("shows both sections to a viewer holding both codes", () => {
    draw();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("How the fees were calculated")).toBeInTheDocument();
    expect(requested).toContain(FEES_URL);
    expect(requested).toContain(INVOICES_URL);
  });

  it("shows platform staff both sections on a project they hold no permission on", () => {
    // QA BUG-06: the bill is Baselinq's to raise and staff are not members of
    // the customer's team, so they hold neither project code.
    held = [];
    staff = true;
    draw();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("How the fees were calculated")).toBeInTheDocument();
  });

  it("refuses a viewer who holds neither code, and asks for nothing", () => {
    held = [];
    draw();
    expect(screen.getByText(/not visible to your role/i)).toBeInTheDocument();
    expect(requested.filter(Boolean)).toHaveLength(0);
  });
});

describe("the one summary strip", () => {
  it("answers the three questions once each, off the invoices payload", () => {
    draw();
    const body = text();

    expect(body).toContain("Accrued, not yet invoiced");
    expect(body).toContain("R 575,00");
    // SINCE WHEN, and no scheduled date: a billing run is a person pressing
    // Build in the admin panel, so naming a day would promise what nothing keeps.
    expect(body).toContain("1 fee · accruing since 20 October 2026 · invoiced after month end");

    expect(body).toContain("Invoiced, unpaid");
    expect(body).toContain("1 unpaid invoice, incl. 15% VAT");
    expect(body).toContain("Overdue");
    expect(body).toContain("0 past the due date");
  });

  it("states the lifetime total once, in the derivation and not on the strip", () => {
    // The duplication the merge existed to remove: "Total charged" was a stat
    // card here AND the same rand was "On the next invoice" one tab away.
    draw();
    const body = text();
    expect(body).toContain("R 1 725,00 charged since the project started");
    expect(body).not.toContain("Total charged");
    expect(body).not.toContain("On the next invoice");
  });

  it("falls back to the charges for a fees-only viewer, who cannot read invoices", () => {
    held = ["finance.platform_fees.view"];
    draw();
    const body = text();
    // Folded off the server's own `billingState`, never re-derived: R 575,00
    // uninvoiced and R 1 150,00 on an issued invoice.
    expect(body).toContain("R 575,00");
    expect(body).toContain("R 1 150,00");
    expect(body).toContain("accruing since 20 October 2026 · invoiced after month end");
  });

  it("says nothing rather than R 0,00 when no payload can place the fees", () => {
    // An older fee payload carrying no billingState at all. R 0,00 outstanding
    // would read as "nothing is owed", which nobody here can vouch for.
    held = ["finance.platform_fees.view"];
    PAYLOADS[FEES_URL] = {
      ...FEES_RESPONSE,
      calculatedFees: CHARGES.map(({ billingState, ...rest }) => rest),
    };
    try {
      draw();
      expect(screen.queryByText("Accrued, not yet invoiced")).not.toBeInTheDocument();
      // The derivation still renders in full — the strip is the only casualty.
      expect(screen.getByText("VO-002")).toBeInTheDocument();
    } finally {
      PAYLOADS[FEES_URL] = FEES_RESPONSE;
    }
  });
});

describe("the link the merge existed to create", () => {
  it("makes 'Invoiced · BLQ-…' a link to that invoice's document", () => {
    draw();
    const link = screen.getByRole("link", { name: /BLQ-00045-0001/ });
    expect(link).toHaveAttribute("href", "/invoices/1");
  });

  it("leaves an uninvoiced charge as plain text", () => {
    draw();
    expect(screen.getByText("Not invoiced").closest("a")).toBeNull();
  });
});

describe("neither section presents an outage as an absence", () => {
  it("says the invoices could not be loaded, and still shows the fees", () => {
    failing.add(INVOICES_URL);
    draw();
    expect(screen.getByText(/invoices could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/no invoices yet/i)).not.toBeInTheDocument();
    expect(screen.getByText("How the fees were calculated")).toBeInTheDocument();
  });

  it("says the fees could not be loaded, and still shows the invoices", () => {
    failing.add(FEES_URL);
    draw();
    expect(screen.getByText(/platform fees could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText("BLQ-00045-0001")).toBeInTheDocument();
  });
});
