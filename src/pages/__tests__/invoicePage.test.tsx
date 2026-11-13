/**
 * /invoices/:id — the page around the document.
 *
 * The document itself is tested in
 * `components/finance/__tests__/invoiceDocument.test.tsx`. What is tested here
 * is the page's own three jobs: get the invoice, be printable, and refuse or
 * fail in a way that cannot be mistaken for "nothing is owed".
 *
 * The print path matters more than it looks. `window.print()` on a dedicated
 * route is this codebase's established pattern (CertificatePage.tsx:162) and
 * the only reason it produces a clean A4 page is the `.no-print` toolbar and
 * the `@media print` block beside it. A toolbar that printed would put two
 * buttons and a "Copied" label on a document going to a client's accounts
 * department.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchState: { data: any; isLoading: boolean; isError: boolean; error: any } = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};

vi.mock("@/hooks/useFetch", () => ({ default: () => fetchState }));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
  useIsPlatformStaff: () => false,
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: ({ message }: { message?: string }) => <div>{message}</div>,
}));

import InvoicePage from "@/pages/InvoicePage";

const INVOICE = {
  id: 7,
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
  supplierDetails: {
    legalName: "Baselinq (Pty) Ltd",
    vatNumber: "4000000000",
    registrationNumber: "2024/123456/07",
    address: "1 Bree Street, Cape Town",
    bankName: "FNB",
    bankAccountNumber: "62000000000",
  },
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  subtotal: "2000.00",
  vatAmount: "300.00",
  totalAmount: "2300.00",
  billingContactName: "Thandi Mokoena",
  billingContactEmail: "ap@vantage.test",
  notes: "",
  issuedAt: "2026-11-02T08:15:00Z",
  settledAt: null,
  settledOn: null,
  settledReference: "",
  cancelledAt: null,
  cancellationReason: "",
  createdAt: "2026-10-31T00:00:00Z",
  lines: [],
};

const draw = () =>
  render(
    <MemoryRouter initialEntries={["/invoices/7"]}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoicePage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchState.data = INVOICE;
  fetchState.isLoading = false;
  fetchState.isError = false;
  fetchState.error = null;
});

describe("the invoice page", () => {
  it("renders the document, not a preview of it", () => {
    draw();
    expect(screen.getByRole("heading", { name: "TAX INVOICE" })).toBeInTheDocument();
  });

  it("keeps the toolbar off the paper", () => {
    const { container } = draw();
    const toolbar = container.querySelector(".no-print");
    expect(toolbar).not.toBeNull();
    // Every control is inside it — Back, Copy link and Print all belong to the
    // screen and none of them belongs on a client's copy.
    expect(toolbar?.textContent).toContain("Back");
    expect(toolbar?.textContent).toContain("Copy link");
    expect(toolbar?.textContent).toContain("Print");
    expect(container.querySelectorAll("button").length).toBe(3);
  });

  it("prints through the browser rather than a bundled PDF library", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", { writable: true, value: print });
    draw();
    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("says a refusal is a refusal", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    // The server answers 403 on an invoice belonging to a project this viewer
    // holds no invoice permission on. That is an answer, not an outage.
    fetchState.error = { status: 403 };
    draw();
    expect(screen.getByText(/not visible to your role/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "TAX INVOICE" })).not.toBeInTheDocument();
  });

  it("does not present an outage as a settled account", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    fetchState.error = { status: 500 };
    draw();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/not a statement that nothing is owed/i)).toBeInTheDocument();
  });

  it("shows a loader rather than an empty document while it reads", () => {
    fetchState.data = undefined;
    fetchState.isLoading = true;
    draw();
    expect(screen.getByText("Loading the invoice")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "TAX INVOICE" })).not.toBeInTheDocument();
  });
});
