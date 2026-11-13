/**
 * Admin panel phase 3 — Companies, Activity and System health.
 *
 * Pinned: suspending a company says it blocks sign-in and will not proceed
 * without a reason; a staff card filters the audit log to that person; the
 * health page leads with what is broken, in words, not colour alone.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = {
  getAdminCompanies: vi.fn(),
  getAdminCompany: vi.fn(),
  patchAdminCompany: vi.fn(),
  postAdminCompanyStatus: vi.fn(),
  postAdminUserCompany: vi.fn(),
  getAdminStaff: vi.fn(),
  getAdminAudit: vi.fn(),
  getAdminHealth: vi.fn(),
};
vi.mock("@/lib/Api", () => ({
  getAdminCompanies: (p: unknown) => api.getAdminCompanies(p),
  getAdminCompany: (id: number) => api.getAdminCompany(id),
  patchAdminCompany: (...a: unknown[]) => api.patchAdminCompany(...a),
  postAdminCompanyStatus: (...a: unknown[]) => api.postAdminCompanyStatus(...a),
  postAdminUserCompany: (...a: unknown[]) => api.postAdminUserCompany(...a),
  getAdminStaff: () => api.getAdminStaff(),
  getAdminAudit: (p: unknown) => api.getAdminAudit(p),
  getAdminHealth: () => api.getAdminHealth(),
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({ AwesomeLoader: () => <div>loading</div> }));

import AdminCompanies from "../account/admin/AdminCompanies";
import AdminActivity from "../account/admin/AdminActivity";
import AdminActivityDetail from "../account/admin/AdminActivityDetail";
import AdminHealth from "../account/admin/AdminHealth";

const page = <T,>(results: T[]) => ({ count: results.length, page: 1, pageSize: 25, pages: 1, results });

const acme = { id: 3, name: "Acme", status: "active", vatNumber: null, registrationNumber: null, companySize: null,
  userCount: 2, projectCount: 1, createdAt: "2026-08-12T10:00:00Z" };
const acmeDetail = {
  ...acme, description: null, ckNumber: null,
  users: [{ id: 7, name: "Pat Builder", email: "pat@acme.test", isActive: true, role: "QS", lastActiveOn: null }],
  projects: [{ id: 44, name: "Market Building", number: "PRJ-044", status: "Active" }],
  money: { certifiedValue: "6196522.00", feesCharged: "0.00", invoicedUnpaid: "0.00", paid: "0.00" },
  statusChoices: ["active", "inactive", "suspended"], adminHistory: [],
};

const draw = (el: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getAdminCompanies.mockResolvedValue(page([acme]));
  api.getAdminCompany.mockResolvedValue(acmeDetail);
  api.getAdminStaff.mockResolvedValue({ results: [
    { id: 1, name: "Ada Admin", email: "ada@baselinq.test", isSuperuser: true, isActive: true, lastLogin: null,
      lastActiveOn: "2026-11-04", actionsLast30Days: 3, lastActionAt: "2026-11-04T08:00:00Z" },
  ] });
  api.getAdminAudit.mockResolvedValue(page([
    { id: 9, actor: "Ada Admin", actorId: 1, action: "company.status", targetType: "company", targetId: "3",
      targetLabel: "Acme", detail: { from: "active", to: "suspended", reason: "Unpaid invoices" }, createdAt: "2026-11-04T08:00:00Z" },
  ]));
  api.getAdminHealth.mockResolvedValue({
    checkedAt: "2026-11-04T08:00:00Z", activeUsersToday: 2,
    checks: [
      { key: "email", title: "Email delivery", state: "ok", summary: "5 sent, 0 failed.", detail: [] },
      { key: "risk_sweep", title: "Risk alert check", state: "critical", summary: "Last ran 08 Sep 2026.", detail: [] },
    ],
    recentDeliveryFailures: [], recentJobFailures: [],
    aiByFeature: [{ feature: "vo_analysis", calls: 12, errors: 1, costUsd: "0.42" }], aiTopProjects: [],
  });
});

describe("Companies", () => {
  it("suspending says it blocks sign-in and needs a reason", async () => {
    api.postAdminCompanyStatus.mockResolvedValue({ ...acmeDetail, status: "suspended" });
    draw(<AdminCompanies />);

    fireEvent.click(await screen.findByText("Acme"));
    expect(await screen.findByText("R 6 196 522,00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Change status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Suspended" }));

    const dialog = await screen.findByRole("dialog", { name: "Suspend this company?" });
    expect(within(dialog).getByText(/cannot sign in until it is reactivated/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Suspend company" });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Unpaid invoices" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(api.postAdminCompanyStatus).toHaveBeenCalledWith(3, "suspended", "Unpaid invoices"));
  });
});

describe("Activity", () => {
  it("shows only staff cards, each linking to that person's page", async () => {
    draw(<AdminActivity />);

    const card = await screen.findByRole("link", { name: /Ada Admin/ });
    expect(card).toHaveAttribute("href", "/account/admin/activity/1");
    expect(screen.queryByText("changed the status of")).not.toBeInTheDocument();
    expect(api.getAdminAudit).not.toHaveBeenCalled();
  });

  it("the person's page reads their log in words, filtered to them", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/account/admin/activity/1"]}>
          <Routes><Route path="/account/admin/activity/:userId" element={<AdminActivityDetail />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("changed the status of")).toBeInTheDocument();
    expect(screen.getByText("active → suspended · “Unpaid invoices”")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Ada Admin" })).toBeInTheDocument();
    expect(api.getAdminAudit).toHaveBeenLastCalledWith(expect.objectContaining({ actor: "1", page: 1 }));
  });
});

describe("System health", () => {
  it("leads with what is broken, critical first, with a word not just a colour", async () => {
    draw(<AdminHealth />);

    expect(await screen.findByText("1 of 2 checks need attention")).toBeInTheDocument();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Risk alert check", "Email delivery"]);
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("vo analysis")).toBeInTheDocument();
  });
});
