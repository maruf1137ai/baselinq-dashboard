/**
 * Settings → Contract & payment: blank fields save as "use the contract
 * form's default" (null), and the party check says plainly whether a tax
 * invoice on this project would be valid.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const responses: Record<string, unknown> = {};
const mockUpdateTerms = vi.fn();

vi.mock("@/hooks/useFetch", () => ({
  default: (url: string) => ({ data: responses[url], isLoading: false, isError: false, error: null }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canEditFinance: true, canEditProject: true }),
}));
vi.mock("@/lib/Api", () => ({
  updatePaymentTerms: (...args: unknown[]) => mockUpdateTerms(...args),
  updateRiskPolicy: vi.fn(),
  updateProject: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ContractPayment from "@/pages/settings/contractPayment";

const TERMS = {
  contractForm: "jbcc",
  paymentDays: 14,
  unit: "calendar",
  interestBasis: "repo_plus_margin",
  interestMarginPct: "6.000",
  fixedInterestRatePct: null,
  configured: false,
  provenance: "JBCC: payment within 14 calendar days of the date FOR issue.",
  defaulted: ["paymentDays", "unit", "interestBasis", "interestMarginPct", "invoiceRequiredForPayment"],
  certificateIssueDay: null,
  invoiceRequiredForPayment: false,
};

const party = (role: string, missing: string[]) => ({
  role, name: role === "employer" ? "Mokoena Holdings" : "Ndlovu Construction",
  registrationNumber: "", vatNumber: "", address: "", contactName: "", email: "", missing,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ContractPayment />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  localStorage.setItem("selectedProjectId", "45");
  mockUpdateTerms.mockReset().mockResolvedValue(TERMS);
  responses["projects/45/payment-terms/"] = TERMS;
  responses["projects/45/risk-policy/"] = { valuation_basis: "measured_progress", pc_gate_mode: "advisory" };
  responses["projects/45/billing-parties/"] = {
    employer: party("employer", ["physical address"]),
    contractor: party("contractor", []),
    readyForTaxInvoices: false,
  };
  responses["projects/45/"] = { clientDetails: {}, appointedCompany: {} };
});

describe("Contract & payment", () => {
  it("says the project is on the contract form's defaults", () => {
    renderPage();
    expect(screen.getByText("Using JBCC (private employer) defaults")).toBeInTheDocument();
  });

  it("saves blank fields as null, so the contract form's default applies", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Certificate issue day"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save payment terms" }));
    await waitFor(() => expect(mockUpdateTerms).toHaveBeenCalled());
    const [, body] = mockUpdateTerms.mock.calls[0];
    expect(body).toMatchObject({
      certificateIssueDay: 25,
      paymentDays: null,
      interestMarginPct: null,
      invoiceRequiredForPayment: null,
    });
  });

  it("says tax invoices are not yet valid and names what is missing", () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Tax invoices on this project are not yet valid");
    expect(screen.getByText("1 missing")).toBeInTheDocument();
  });
});
