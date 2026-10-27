/**
 * Baselinq staff on /finance (QA BUG-06).
 *
 * Staff raise the platform-fee invoice on projects they are not members of,
 * so they hold no project permission there. The server serves them the
 * invoices and fees; the page sent them to /unauthorized. They now get the
 * two platform tabs — and ONLY those: staff status is not a licence to read
 * the customer's ledger or certificates.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePermissions = vi.fn();
const mockUsePermission = vi.fn();
const mockIsStaff = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: string) => mockUsePermission(code),
  useIsPlatformStaff: () => mockIsStaff(),
}));
vi.mock("@/hooks/useFetch", () => ({
  default: () => ({ data: { count: 0, results: [] }, isLoading: false }),
}));
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/finance/costLadger", () => ({
  default: () => <div data-testid="cost-ledger" />,
}));
vi.mock("@/components/finance/platformFees", () => ({
  default: () => <div data-testid="platform-fees" />,
}));
vi.mock("@/components/finance/platformInvoices", () => ({
  default: () => <div data-testid="platform-invoices" />,
}));
vi.mock("@/components/finance/paymentCertificate", () => ({
  default: () => <div data-testid="payment-certificates" />,
}));

import Finance from "@/pages/finance";

const renderFinance = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Finance />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const tabNames = () => screen.queryAllByRole("tab").map((t) => t.textContent?.trim());

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "47");
});

describe("Baselinq staff who are not on the project", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({ canViewFinance: false, canEditFinance: false });
    mockUsePermission.mockReturnValue(false);
    mockIsStaff.mockReturnValue(true);
  });

  it("get the two platform tabs and nothing else", () => {
    renderFinance("/finance");
    expect(tabNames()).toEqual(["Platform Fees", "Invoices"]);
    expect(screen.queryByTestId("cost-ledger")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-certificates")).not.toBeInTheDocument();
  });

  it("can open Invoices from a link", () => {
    renderFinance("/finance?tab=Invoices");
    expect(screen.getByTestId("platform-invoices")).toBeInTheDocument();
  });

  it("cannot reach the customer's certificates by link", () => {
    renderFinance("/finance?tab=Payment%20Certificates&pc=12");
    expect(screen.queryByTestId("payment-certificates")).not.toBeInTheDocument();
  });
});

describe("staff who ARE members", () => {
  it("see every tab, the platform ones included even without the payment code", () => {
    mockUsePermissions.mockReturnValue({ canViewFinance: true, canEditFinance: false });
    mockUsePermission.mockReturnValue(false);
    mockIsStaff.mockReturnValue(true);
    renderFinance("/finance");
    expect(tabNames()).toEqual([
      "Cost Ledger",
      "Payment Certificates",
      "Variation Orders",
      "Platform Fees",
      "Invoices",
    ]);
  });
});

describe("customers are unchanged", () => {
  it("a non-member who is not staff sees nothing", () => {
    mockUsePermissions.mockReturnValue({ canViewFinance: false, canEditFinance: false });
    mockUsePermission.mockReturnValue(false);
    mockIsStaff.mockReturnValue(false);
    renderFinance("/finance");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
