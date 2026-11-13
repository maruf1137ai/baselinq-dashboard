/**
 * Admin panel: superusers see the dashboard — figures with their change
 * against the previous period, what needs attention, and a chart per measure;
 * anyone else who reaches the URL sees a notice, and nothing is requested.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUser = vi.fn();
const mockGetAdminOverview = vi.fn();
const mockGetAdminStats = vi.fn();

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUser(),
}));
vi.mock("@/lib/Api", () => ({
  getAdminOverview: () => mockGetAdminOverview(),
  getAdminStats: (range: string) => mockGetAdminStats(range),
}));

import AdminGuard from "../account/admin/AdminGuard";
import AdminDashboard, { describeChange } from "../account/admin/AdminDashboard";

const overview = {
  users: { total: 12, active: 10, superusers: 1, newLast30Days: 3 },
  organizations: { total: 4 },
  projects: { total: 7, byStatus: { Active: 5, Draft: 2 }, newLast30Days: 1 },
  documents: { total: 40 },
  tasks: { total: 90 },
  meetings: { total: 6 },
  recentUsers: [
    {
      id: 1, name: "Ada Admin", email: "ada@example.test", organization: "Baselinq",
      isActive: true, isSuperuser: true, dateJoined: "2026-10-01T10:00:00Z", lastLogin: null,
    },
  ],
  recentProjects: [
    { id: 9, name: "Market Building", status: "Active", createdBy: "Ada Admin", createdAt: "2026-10-02T10:00:00Z" },
  ],
};

const bucket = (start: string, over: Record<string, unknown> = {}) => ({
  start, newUsers: 0, activeUsers: 0, newProjects: 0, feesEarned: "0.00", feesPaid: "0.00",
  certificates: 0, variations: 0, tasks: 0, documents: 0, meetings: 0, aiCalls: 0, aiCostUsd: "0.00",
  ...over,
});

const stats = {
  range: "30d",
  bucket: "day",
  start: "2026-10-06",
  end: "2026-11-04",
  kpis: {
    users: { total: 12, current: 3, previous: 2 },
    activeUsers: { total: null, current: 8, previous: 10 },
    projects: { total: 7, current: 1, previous: 0 },
    companies: { total: 4, current: 0, previous: 0 },
    feesEarned: { current: "1150.00", previous: "0.00" },
    feesPaid: { current: "0.00", previous: "0.00" },
  },
  series: [bucket("2026-11-03", { newUsers: 2, tasks: 5 }), bucket("2026-11-04", { newUsers: 1 })],
  attention: [
    { key: "risk_sweep_stale", severity: "critical", title: "Risk alert check is not running",
      detail: "Last ran 08 Sep 2026.", count: 1, link: null },
    { key: "billing_no_contact", severity: "warning", title: "Billing on, nobody to bill",
      detail: "No billed-to email.", count: 47, link: "/account/admin/billing/projects" },
  ],
  recentAdminActions: [
    { id: 1, actor: "Ada Admin", action: "billing.invoice.issue", targetLabel: "BLQ-00044-0001",
      createdAt: "2026-11-04T08:00:00Z" },
  ],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/account/admin"]}>
        <Routes>
          <Route path="/account/admin" element={<AdminGuard />}>
            <Route index element={<AdminDashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Admin panel dashboard", () => {
  beforeEach(() => {
    mockUser.mockReset();
    mockGetAdminOverview.mockReset();
    mockGetAdminStats.mockReset();
  });

  const asSuperuser = () => {
    mockUser.mockReturnValue({ data: { id: 1, is_superuser: true }, isLoading: false });
    mockGetAdminOverview.mockResolvedValue(overview);
    mockGetAdminStats.mockResolvedValue(stats);
  };

  it("shows each figure with its trend, never a % of a different number", async () => {
    asSuperuser();
    renderPage();

    // Totals show what was ADDED: users rose by 3 — not "fell 50%" because
    // fewer joined than the period before.
    expect(await screen.findByText("2 joined in the previous 30 days")).toBeInTheDocument();
    expect(screen.getByText("3 added; 2 in the previous 30 days")).toBeInTheDocument();
    // Per-period figures show the % change, in words for screen readers.
    expect(screen.getByText("▼ 20% vs previous 30 days")).toBeInTheDocument(); // active 8 vs 10
    expect(screen.getByText("▲ 1,150 vs none in the previous 30 days")).toBeInTheDocument(); // fees
  });

  it("lists what needs attention, most urgent first, with a way to act", async () => {
    asSuperuser();
    renderPage();

    const critical = await screen.findByText("Risk alert check is not running");
    const warning = screen.getByText("Billing on, nobody to bill");
    expect(critical.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(warning.closest("a")).toHaveAttribute("href", "/account/admin/billing/projects");
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("draws the trend chart, switches its measure, and lists activity per measure", async () => {
    asSuperuser();
    renderPage();

    expect(await screen.findByRole("img", { name: /^Total users/ })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Fees earned" }));
    fireEvent.click(screen.getByRole("tab", { name: "Fees earned" }));
    expect(await screen.findByRole("img", { name: /^Fees earned/ })).toBeInTheDocument();

    for (const label of ["Payment certificates", "Variation orders", "Tasks", "Documents", "Meetings", "AI calls"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("5")).toBeInTheDocument(); // tasks summed over the range
  });

  it("still shows the newest users, projects and admin actions", async () => {
    asSuperuser();
    renderPage();

    expect(await screen.findByText("Market Building")).toBeInTheDocument();
    expect(screen.getByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByText(/issued/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View all" }).map((l) => l.getAttribute("href"))).toEqual([
      "/account/admin/users",
      "/account/admin/projects",
    ]);
  });

  it("asks for the range the administrator picks", async () => {
    asSuperuser();
    renderPage();

    await screen.findByText("2 joined in the previous 30 days");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "12 months" }));
    fireEvent.click(screen.getByRole("tab", { name: "12 months" }));

    expect(mockGetAdminStats).toHaveBeenLastCalledWith("12m");
  });

  it("never requests the overview for anyone else", () => {
    mockUser.mockReturnValue({ data: { id: 2, is_superuser: false }, isLoading: false });

    renderPage();

    expect(screen.getByText("This area is only available to superusers.")).toBeInTheDocument();
    expect(mockGetAdminOverview).not.toHaveBeenCalled();
    expect(mockGetAdminStats).not.toHaveBeenCalled();
  });
});

describe("describeChange", () => {
  it.each([
    [3, 2, "▲ 50% vs last week"],
    [8, 10, "▼ 20% vs last week"],
    [5, 5, "No change vs last week"],
    [0, 0, "No change vs last week"],
    [4, 0, "▲ 4 vs none in the last week"],
  ])("%i against %i reads %s", (current, previous, expected) => {
    expect(describeChange(current, previous, "last week")).toBe(expected);
  });
});
