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
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePermissions = vi.fn();
const mockUsePermission = vi.fn();
const mockUseFetch = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: (code: string) => mockUsePermission(code),
}));
vi.mock("@/hooks/useFetch", () => ({
  default: (...args: unknown[]) => mockUseFetch(...args),
}));

// The page's chrome and its three sibling tabs are stubbed: this suite is
// about which tab the URL selects and what it hands down, not about what the
// tabs render internally.
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/finance/costLadger", () => ({
  default: () => <div data-testid="cost-ledger" />,
}));
vi.mock("@/components/finance/platformFees", () => ({
  default: () => <div data-testid="platform-fees" />,
}));
vi.mock("@/components/finance/paymentCertificate", () => ({
  default: ({ certificateParam }: { certificateParam?: string | null }) => (
    <div data-testid="payment-certificates" data-pc-param={certificateParam ?? ""} />
  ),
}));

import Finance from "@/pages/finance";

/** Two variation orders, as the VO list endpoint returns them. */
const VO_RESPONSE = {
  count: 2,
  results: [
    { taskId: 43, status: "open", update_at: "2026-08-01", task: { voNumber: "VO-001", title: "Rock excavation", grandTotal: 125000 } },
    { taskId: 44, status: "done", update_at: "2026-08-02", task: { voNumber: "VO-002", title: "Revised roof detail", grandTotal: 88000 } },
  ],
};

const renderFinance = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Finance />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "1");
  mockUseFetch.mockReturnValue({ data: VO_RESPONSE, isLoading: false });
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

  it("falls back to the first visible tab for a tab key that no longer exists", () => {
    renderFinance("/finance?tab=Forecast");
    expect(screen.getByRole("tab", { name: "Cost Ledger" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("cost-ledger")).toBeInTheDocument();
  });

  it("behaves exactly as before when no parameter is present", () => {
    renderFinance("/finance");
    expect(screen.getByRole("tab", { name: "Cost Ledger" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("/finance?tab= and the permission gate", () => {
  it("refuses a viewer without finance.view, parameters or not", () => {
    mockUsePermissions.mockReturnValue({ canViewFinance: false, canEditFinance: false });

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

  it("will not open Platform Fees for a viewer who lacks the code for it", () => {
    // finance.view yes, finance.approve_payment no — so Platform Fees is not
    // in the page's own tab list, and a link naming it lands on Cost Ledger.
    mockUsePermission.mockImplementation((code: string) => code !== "finance.approve_payment");

    renderFinance("/finance?tab=Platform%20Fees");

    expect(screen.queryByRole("tab", { name: "Platform Fees" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("platform-fees")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cost Ledger" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
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
    mockUseFetch.mockReturnValue({
      data: { count: 1, results: [VO_RESPONSE.results[0]] },
      isLoading: false,
    });

    renderFinance("/finance?tab=Variation%20Orders&vo=VO-002");

    expect(screen.getByText("VO-001")).toBeInTheDocument();
    expect(screen.queryByText("VO-002")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    // And no error surface anywhere.
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});
