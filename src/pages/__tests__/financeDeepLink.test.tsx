/**
 * /finance deep links — ?tab=, ?pc=, ?vo=.
 *
 * The point of these tests is the two things a link must never do:
 *
 *   1. Get somebody past a permission gate. A viewer without finance.view is
 *      refused today when they navigate to /finance normally. Arriving with
 *      `?tab=Payment Certificates&pc=12` must refuse them in exactly the same
 *      way — the parameter picks from the list of tabs the page already
 *      decided this viewer may see, and that list is computed without ever
 *      looking at the URL.
 *
 *   2. Assert an absence it cannot vouch for. A stale id must land on the
 *      plain, fully populated tab — never an error, and never a list filtered
 *      down to nothing, which would tell the viewer the record is gone when it
 *      may only be one they were not shown.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePermissions = vi.fn();
const mockUsePermission = vi.fn();
const mockUseFetch = vi.fn();
const mockUseVariations = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: string) => mockUsePermission(code),
  usePermissionOr: (code: string) => mockUsePermission(code),
  // Baselinq staff are covered in financeStaff.test.tsx.
  useIsPlatformStaff: () => false,
}));
vi.mock("@/hooks/useFetch", () => ({
  default: (...args: unknown[]) => mockUseFetch(...args),
}));
// The register is the project's variations (tasks/variation-orders/), read
// through the hook Home shares — not the viewer's assignment tasks.
vi.mock("@/hooks/useProjectVariations", () => ({
  useProjectVariations: () => mockUseVariations(),
}));

// The page's chrome and its three sibling tabs are stubbed: this suite is
// about which tab the URL selects and what it hands down, not about what the
// tabs render internally.
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
vi.mock("@/components/finance/payments", () => ({
  default: () => <div data-testid="payments" />,
}));
vi.mock("@/components/finance/paymentCertificate", () => ({
  default: ({ certificateParam }: { certificateParam?: string | null }) => (
    <div data-testid="payment-certificates" data-pc-param={certificateParam ?? ""} />
  ),
}));

import Finance from "@/pages/finance";

/** Two variation orders, as tasks/variation-orders/ returns them (task = the wrapping assignment task). */
const VO_ROWS = [
  { _id: "7", projectId: "1", voNumber: "VO-001", title: "Rock excavation", grandTotal: 125000, status: "Draft", updatedAt: "2026-08-01", task: { _id: 43 } },
  { _id: "8", projectId: "1", voNumber: "VO-002", title: "Revised roof detail", grandTotal: 88000, status: "Approved", updatedAt: "2026-08-02", task: { _id: 44 } },
];
const variations = (rows: unknown[]) => ({ rows, records: [], isLoading: false, isError: false, refetch: vi.fn() });

const renderFinance = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/finance" element={<Finance />} />
          {/* Baselinq's billing moved here; old Finance links redirect to it. */}
          <Route path="/settings/billing" element={<div data-testid="settings-billing" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "1");
  mockUseFetch.mockReturnValue({ data: { count: 0, results: [] }, isLoading: false });
  mockUseVariations.mockReturnValue(variations(VO_ROWS));
  mockUsePermissions.mockReturnValue({ canViewFinance: true, canEditFinance: true });
  mockUsePermission.mockReturnValue(true);
});

describe("/finance?tab=", () => {
  it("opens the tab the link names instead of the default first tab", () => {
    renderFinance("/finance?tab=Variation%20Orders");
    expect(screen.getByRole("tab", { name: "Variation Orders" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("VO-001")).toBeInTheDocument();
  });

  it("opens Payment Certificates and hands the tab the ?pc= value", () => {
    renderFinance("/finance?tab=Payment%20Certificates&pc=12");
    expect(screen.getByTestId("payment-certificates")).toHaveAttribute("data-pc-param", "12");
  });

  it.each(["/finance?tab=Payments", "/finance?tab=Payments%20Status"])(
    "%s lands on the Financial Position, where the payment register now is",
    (url) => {
      renderFinance(url);
      expect(screen.getByRole("tab", { name: "Financial Position" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("financial-position")).toBeInTheDocument();
      expect(screen.queryByTestId("payment-certificates")).not.toBeInTheDocument();
    },
  );

  it("falls back to the first visible tab for a tab key that no longer exists", () => {
    renderFinance("/finance?tab=Forecast");
    expect(screen.getByRole("tab", { name: "Financial Position" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("financial-position")).toBeInTheDocument();
  });

  it("opens on the Financial Position when no parameter is present", () => {
    renderFinance("/finance");
    expect(screen.getByRole("tab", { name: "Financial Position" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("/finance?tab= and the permission gate", () => {
  it("refuses a viewer without finance.view, parameters or not", () => {
    mockUsePermissions.mockReturnValue({ canViewFinance: false, canEditFinance: false });
    // …and without the platform-tab codes either: those tabs have their own
    // codes now, so a role holding only them would (correctly) see them.
    mockUsePermission.mockReturnValue(false);

    const withLink = renderFinance("/finance?tab=Payment%20Certificates&pc=12");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByTestId("payment-certificates")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cost-ledger")).not.toBeInTheDocument();
    const refusedViaLink = withLink.container.innerHTML;
    withLink.unmount();

    // The same page reached normally. Byte-identical: the parameter bought
    // this viewer nothing at all.
    const plain = renderFinance("/finance");
    expect(plain.container.innerHTML).toBe(refusedViaLink);
  });

  it("hides Baselinq Billing when finance.view is off, even holding a billing code", () => {
    // The billing codes are children of finance.view now (user/migrations/0077):
    // holding finance.invoices.view while the Finance area is switched off is a
    // state the server will not resolve, so the client must not show the tab
    // either. One Finance tab surviving the switch that closes the area was the
    // bug this change fixed. The staff bypass (financeStaff.test.tsx) is the
    // only way the tab appears without finance.view.
    mockUsePermissions.mockReturnValue({ canViewFinance: false, canEditFinance: false });
    mockUsePermission.mockImplementation((code: string) => code === "finance.invoices.view");

    renderFinance("/finance");

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByTestId("baselinq-billing")).not.toBeInTheDocument();
  });

  it("has no Baselinq Billing tab: Baselinq's own bill lives in Settings → Billing", () => {
    renderFinance("/finance");
    expect(screen.queryByRole("tab", { name: "Baselinq Billing" })).not.toBeInTheDocument();
  });
});

/*
  Baselinq's billing moved to Settings → Billing. `?tab=invoices` — lowercase —
  is hard-coded in the BACKEND's invoice notification links, and the other keys
  were shipped and shared, so each still lands where the invoice now is.
*/
describe("/finance?tab= legacy billing keys", () => {
  it.each([
    "/finance?tab=Baselinq%20Billing",
    "/finance?tab=Platform%20Fees",
    "/finance?tab=Invoices",
    "/finance?tab=invoices",
    "/finance?tab=platform+fees",
  ])("%s redirects to Settings → Billing", async (url) => {
    renderFinance(url);
    expect(await screen.findByTestId("settings-billing")).toBeInTheDocument();
  });
});

describe("/finance?vo=", () => {
  it("highlights the variation the link names", () => {
    renderFinance("/finance?tab=Variation%20Orders&vo=VO-002");
    const row = screen.getByText("VO-002").closest("tr");
    expect(row).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByText("VO-001").closest("tr")).not.toHaveAttribute("data-highlighted");
  });

  it("also accepts the task id, which is what /tasks/:id resolves against", () => {
    renderFinance("/finance?tab=Variation%20Orders&vo=44");
    expect(screen.getByText("VO-002").closest("tr")).toHaveAttribute("data-highlighted", "true");
  });

  it("shows the whole list, unfiltered, when the id is stale", () => {
    renderFinance("/finance?tab=Variation%20Orders&vo=VO-999");

    // Every variation is still on screen. Nothing is highlighted. Nothing
    // claims the record was deleted.
    expect(screen.getByText("VO-001")).toBeInTheDocument();
    expect(screen.getByText("VO-002")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("shows the whole list, unfiltered, when the variation is one this viewer's list did not return", () => {
    // The permission case as the client sees it: the record exists on the
    // project, this user's request simply did not include it. Identical to a
    // stale id by design — the page has no way to tell them apart and must not
    // guess, so it says nothing about the record either way.
    mockUseVariations.mockReturnValue(variations([VO_ROWS[0]]));

    renderFinance("/finance?tab=Variation%20Orders&vo=VO-002");

    expect(screen.getByText("VO-001")).toBeInTheDocument();
    expect(screen.queryByText("VO-002")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    // And no error surface anywhere.
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});


describe("the variation register", () => {
  it("says the register failed to load instead of showing an empty list", () => {
    mockUseVariations.mockReturnValue({ ...variations([]), isError: true });
    renderFinance("/finance?tab=Variation%20Orders");
    expect(screen.getByRole("alert")).toHaveTextContent("The variation register could not be loaded");
  });
});
