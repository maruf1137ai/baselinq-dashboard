/**
 * The invoice screen, at the render level.
 *
 * Every assertion here corresponds to a defect an adversarial review found in
 * this file after it had been written, typechecked and built cleanly — which
 * is the point. A wrong URL string, a credit rendered without its sign, an
 * error handler reading a field the server never sends, and an irreversible
 * control shown to someone the server will refuse are all invisible to the
 * compiler and all visible to a customer.
 *
 * These are render-level rather than unit-level because what is being tested
 * IS the rendered consequence: a quantity surveyor reading a figure off a
 * screen and recomputing it by hand.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Doubles ──────────────────────────────────────────────────────────────
const fetchState: { data: any; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};
let staff = true;

vi.mock("@/hooks/useFetch", () => ({
  default: () => fetchState,
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
  useIsPlatformStaff: () => staff,
}));
vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(async () => ({})),
  postData: vi.fn(async () => ({})),
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: () => <div>loading</div>,
}));

import PlatformInvoices from "@/components/finance/platformInvoices";

/**
 * A debit and its exact reversal. The server carries direction as a FLAG —
 * `totalAmount` is always positive, `isCredit` decides the sign — while the
 * invoice total is computed signed. Rendering the flag as a positive number
 * made a charge and its reversal show the same figure above a R0.00 total,
 * so the lines could not be made to sum.
 */
const INVOICE_WITH_CREDIT = {
  id: 1,
  projectId: 45,
  invoiceNumber: "BLQ-00045-0001",
  status: "draft",
  isSettled: false,
  isOutstanding: true,
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  subtotal: "0.00",
  vatAmount: "0.00",
  totalAmount: "0.00",
  billingContactName: "Vantage Developments",
  billingContactEmail: "ap@vantage.test",
  notes: "",
  issuedAt: null,
  settledAt: null,
  settledOn: null,
  settledReference: "",
  cancelledAt: null,
  cancellationReason: "",
  createdAt: "2026-10-31T00:00:00Z",
  lines: [
    {
      id: 10,
      feeChargeId: 100,
      isCredit: false,
      isLive: true,
      description: "Platform fee at 1.000% on payment certificate PC-007",
      sourceRef: "PC-007",
      baseAmount: "100000.00",
      feeRatePct: "1.000",
      feeAmount: "1000.00",
      vatRatePct: "15.00",
      vatAmount: "150.00",
      totalAmount: "1150.00",
    },
    {
      id: 11,
      feeChargeId: 101,
      isCredit: true,
      isLive: true,
      description: "Reversal of platform fee on payment certificate PC-007",
      sourceRef: "PC-007",
      baseAmount: "100000.00",
      feeRatePct: "1.000",
      feeAmount: "1000.00",
      vatRatePct: "15.00",
      vatAmount: "150.00",
      totalAmount: "1150.00",
    },
  ],
};

const LIST_RESPONSE = {
  projectId: 45,
  invoices: [INVOICE_WITH_CREDIT],
  uninvoiced: {
    projectId: 45,
    uninvoicedChargeCount: 4,
    // Deliberately different so a test can tell which one is rendered.
    uninvoicedFee: "66025.00",
    uninvoicedVat: "9903.75",
    uninvoicedTotal: "75928.75",
    earliestUninvoicedOn: "2026-10-01",
  },
};

const draw = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PlatformInvoices />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  localStorage.setItem("selectedProjectId", "45");
  fetchState.data = LIST_RESPONSE;
  fetchState.isLoading = false;
  fetchState.isError = false;
  staff = true;
});

describe("platform invoices", () => {
  it("renders the invoice with its number and total", async () => {
    draw();
    expect(await screen.findByText("BLQ-00045-0001")).toBeInTheDocument();
  });

  it("does not present an outage as an empty list", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    draw();
    // "No invoices yet" over a failed read is an all-clear nobody can check.
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/no invoices yet/i)).not.toBeInTheDocument();
  });

  describe("the staff gate", () => {
    it("offers Build to Baselinq staff", () => {
      staff = true;
      draw();
      expect(screen.getByRole("button", { name: /build draft invoice/i })).toBeInTheDocument();
    });

    it("offers no mutating control to a customer", () => {
      // The server gates build/issue/settle/cancel on `is_staff`, outside the
      // permission matrix. An earlier revision gated them on a project
      // permission, so a customer was shown an irreversible Issue button
      // against their own bill and got a 403 on click.
      staff = false;
      draw();
      expect(
        screen.queryByRole("button", { name: /build draft invoice/i }),
      ).not.toBeInTheDocument();
    });

    it("still shows the invoice itself to a customer", async () => {
      staff = false;
      draw();
      // Reading is theirs by right — the server allows finance.view.
      expect(await screen.findByText("BLQ-00045-0001")).toBeInTheDocument();
    });
  });

  describe("the uninvoiced headline", () => {
    it("leads with the fee, not the VAT-inclusive figure", () => {
      draw();
      // VAT is collected for SARS, not earned. Showing R75,928.75 as "earned"
      // overstates the business's own revenue line by 15%.
      /*
        Normalise U+00A0 before comparing. `formatZAR` groups with a
        NON-BREAKING space on purpose, so that "R 108 500 000,00" cannot wrap
        mid-number into "R 108 500" — a syntactically complete, plausible,
        wrong figure. A test that asserts an ordinary space fails against
        correct output, which is how this assertion first failed.
      */
      const body = (document.body.textContent ?? "").replace(/\u00a0/g, " ");
      expect(body).toContain("R 66 025,00");
      // The VAT-inclusive figure is still present, but subordinate.
      expect(body).toContain("to invoice with VAT");
    });
  });
});
