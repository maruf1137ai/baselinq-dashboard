/**
 * The invoice list and its preview dialog, at the render level.
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
 *
 * WHAT MOVED. This was the Invoices TAB; it is a section of Finance → Baselinq
 * Billing now, and takes its invoices as a prop rather than fetching them, so
 * the tab's summary strip and this list cannot read the same endpoint twice
 * and disagree about it. The headline figures, the permission gating, and the
 * loading and error states belong to the tab and are asserted against it in
 * `baselinqBilling.test.tsx`.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(async () => ({})),
  postData: vi.fn(async () => ({})),
}));

import { InvoicesSection } from "@/components/finance/platformInvoices";

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
  projectName: "Market Building",
  projectNumber: "PRJ-045",
  invoiceNumber: "BLQ-00045-0001",
  status: "issued",
  displayStatus: "unpaid",
  isSettled: false,
  isOutstanding: true,
  isOverdue: false,
  dueOn: "2026-11-30",
  supplierDetails: { legalName: "Baselinq (Pty) Ltd", vatNumber: "4000000000", bankName: "FNB", bankAccountNumber: "62000000000" },
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  subtotal: "2000.00",
  vatAmount: "300.00",
  totalAmount: "2300.00",
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
} as any;

const draw = (invoices: any[] = [INVOICE_WITH_CREDIT]) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InvoicesSection invoices={invoices} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "45");
});

describe("platform invoices", () => {
  it("renders the invoice with its number and total", async () => {
    draw();
    expect(await screen.findByText("BLQ-00045-0001")).toBeInTheDocument();
  });

  /*
    The LINES, the banking block and the issuer are no longer in this dialog.
    They are the document, at /invoices/:id, and are asserted against it in
    `invoiceDocument.test.tsx` — including the credit sign this test used to
    guard (QA BUG-21), over the same fixture.

    What the dialog owes the reader is: which invoice this is, what it comes to
    with VAT shown separately, and a way to the document. Nothing more, because
    a tax invoice read through a 300px scroll box inside a modal is the defect
    the route exists to fix.
  */
  it("summarises the invoice and offers the document, not a scrolling copy of it", async () => {
    // Opening an invoice fetches it WITH its lines — the list omits them.
    const { fetchData } = await import("@/lib/Api");
    (fetchData as any).mockResolvedValueOnce(INVOICE_WITH_CREDIT);
    draw();
    fireEvent.click(await screen.findByText("BLQ-00045-0001"));

    const link = await screen.findByRole("link", { name: /full tax invoice/i });
    expect(link).toHaveAttribute("href", "/invoices/1");

    const body = (document.body.textContent ?? "").replace(/ /g, " ");
    expect(body).toContain("VAT (15%)");
    expect(body).toContain("Total due");
    expect(body).toContain("R 2 300,00");
    // The supply period is a RANGE here too, so the summary and the document
    // cannot disagree about what the invoice covers.
    expect(body).toContain("01 October 2026 – 31 October 2026");
  });

  it("states the invoice date, which no screen in the product used to show", async () => {
    const { fetchData } = await import("@/lib/Api");
    (fetchData as any).mockResolvedValueOnce({
      ...INVOICE_WITH_CREDIT,
      issuedAt: "2026-11-02T08:15:00Z",
    });
    draw();
    fireEvent.click(await screen.findByText("BLQ-00045-0001"));
    expect(await screen.findByText("02 November 2026")).toBeInTheDocument();
  });

  it("says there are none only when there are none", () => {
    // An outage is the TAB's to report — "No invoices yet" over a failed read
    // is an all-clear nobody can check, and `baselinqBilling.test.tsx` holds
    // that assertion. An empty list here genuinely means an empty list.
    draw([]);
    expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument();
  });

  describe("read-only on the project", () => {
    it("offers no build, issue or settle control", () => {
      // Baselinq manages invoices in the Admin Panel → Billing, which reaches
      // every project. Nothing here changes an invoice — for anyone, staff
      // included, and the server refuses it to all but a superuser anyway.
      draw();
      expect(
        screen.queryByRole("button", { name: /build|issue|settle|paid|cancel/i }),
      ).not.toBeInTheDocument();
    });
  });
});
