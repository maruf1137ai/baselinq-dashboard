/**
 * Baselinq staff on /finance (QA BUG-06).
 *
 * Staff raise the platform-fee invoice on projects they are not members of,
 * so they hold no project permission there. The server serves them the
 * invoices and fees; the page sent them to /unauthorized. They now get the
 * Baselinq Billing tab — and ONLY that: staff status is not a licence to read
 * the customer's ledger or certificates.
 *
 * The two platform tabs it used to be are one tab now, under one heading, and
 * the two permission codes behind it are unchanged — see
 * baselinqBilling.test.tsx for the per-code gating.
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
  // Same double: the per-tab codes fall back to finance.view only when the
  // server does not know them, which a mocked permission map never models.
  usePermissionOr: (code: string) => mockUsePermission(code),
  useIsPlatformStaff: () => mockIsStaff(),
}));
vi.mock("@/hooks/useProjectVariations", () => ({
  useProjectVariations: () => ({ rows: [], records: [], isLoading: false, isError: false, refetch: () => {} }),
}));
vi.mock("@/hooks/useFetch", () => ({
  default: () => ({ data: { count: 0, results: [] }, isLoading: false }),
}));
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/finance/financialPositionTab", () => ({
  default: () => <div data-testid="financial-position" />,
}));
vi.mock("@/components/finance/costLadger", () => ({
  default: () => <div data-testid="cost-ledger" />,
}));
vi.mock("@/components/finance/baselinqBilling", () => ({
  default: () => <div data-testid="baselinq-billing" />,
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

  it("see no Finance tabs: their billing is in Settings → Billing", () => {
    renderFinance("/finance");
    expect(tabNames()).toEqual([]);
    expect(screen.queryByTestId("cost-ledger")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-certificates")).not.toBeInTheDocument();
  });

  it("cannot reach the customer's certificates by link", () => {
    renderFinance("/finance?tab=Payment%20Certificates&pc=12");
    expect(screen.queryByTestId("payment-certificates")).not.toBeInTheDocument();
  });
});

describe("staff who ARE members", () => {
  it("see the four project tabs; Baselinq's billing is in Settings, not here", () => {
    mockUsePermissions.mockReturnValue({ canViewFinance: true, canEditFinance: false });
    // Each project tab now has its own view code, seeded from finance.view
    // (user/migrations/0077), so a member who holds the area holds them too.
    // Platform fees / invoices are deliberately NOT granted here — the staff
    // bypass is what puts Baselinq Billing on screen.
    mockUsePermission.mockImplementation((code: string) =>
      [
        "finance.cost_ledger.view",
        "finance.certificates.view",
        "finance.payments.view",
        "finance.variations.view",
      ].includes(code),
    );
    mockIsStaff.mockReturnValue(true);
    renderFinance("/finance");
    expect(tabNames()).toEqual([
      "Financial Position",
      "Payment Certificates",
      "Variation Orders",
      "Cost Ledger",
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
