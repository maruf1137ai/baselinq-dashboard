/**
 * Admin panel phase 2 — the Users and Projects management pages.
 *
 * What is pinned: filters and sort reach the server as parameters; a row
 * opens its drawer; consequential actions go through a confirmation that
 * will not proceed without the reason the audit log keeps; the Invitations
 * tab offers resend/cancel only where they make sense.
 */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = {
  getAdminUsers: vi.fn(),
  getAdminUser: vi.fn(),
  postAdminUserAction: vi.fn(),
  getAdminInvitations: vi.fn(),
  postAdminInvitationAction: vi.fn(),
  getAdminCompanies: vi.fn(),
  getAdminProjects: vi.fn(),
  getAdminProject: vi.fn(),
  postAdminProjectStatus: vi.fn(),
  downloadAdminExport: vi.fn(),
};
vi.mock("@/lib/Api", () => ({
  getAdminUsers: (p: unknown) => api.getAdminUsers(p),
  getAdminUser: (id: number) => api.getAdminUser(id),
  postAdminUserAction: (...a: unknown[]) => api.postAdminUserAction(...a),
  getAdminInvitations: (p: unknown) => api.getAdminInvitations(p),
  postAdminInvitationAction: (...a: unknown[]) => api.postAdminInvitationAction(...a),
  getAdminCompanies: () => api.getAdminCompanies(),
  getAdminProjects: (p: unknown) => api.getAdminProjects(p),
  getAdminProject: (id: number) => api.getAdminProject(id),
  postAdminProjectStatus: (...a: unknown[]) => api.postAdminProjectStatus(...a),
  downloadAdminExport: (...a: unknown[]) => api.downloadAdminExport(...a),
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({ AwesomeLoader: () => <div>loading</div> }));

import AdminUsers from "../account/admin/AdminUsers";
import AdminProjects from "../account/admin/AdminProjects";

const page = <T,>(results: T[]) => ({ count: results.length, page: 1, pageSize: 25, pages: 1, results });

const pat = {
  id: 7, name: "Pat Builder", email: "pat@acme.test", organization: "Acme", organizationId: 3,
  role: "Quantity Surveyor", accountType: "individual", projectCount: 2, isActive: true, isStaff: false,
  isSuperuser: false, isLocked: true, dateJoined: "2026-08-24T10:00:00Z", lastLogin: null, lastActiveOn: null,
};
const patDetail = {
  ...pat, isEmailVerified: true, failedLoginAttempts: 5, loginLockedUntil: "2026-11-04T10:00:00Z",
  signingPinSet: false, signingPinLockedUntil: null, activeDaysLast30: 0, invitationsSent: 1,
  projects: [{ id: 44, name: "Market Building", number: "PRJ-044", status: "Active", role: "QS", isActive: true, owner: false }],
  recentActivity: [], adminHistory: [],
};

const project = {
  id: 44, name: "Market Building", projectNumber: "PRJ-044", status: "Active", location: "Cape Town",
  company: "Acme", createdBy: "Ada", userCount: 22, billing: "on", lastActivity: null, inactive: true,
  createdAt: "2026-08-17T10:00:00Z",
};
const projectDetail = {
  ...project, description: null, startDate: null, endDate: null, contractValue: "6922800.00", currency: "ZAR",
  statusChoices: ["Draft", "Active", "On Hold", "Completed", "Cancelled"],
  team: [{ userId: 7, name: "Pat Builder", email: "pat@acme.test", role: "QS", company: "Acme", isActive: true, joined: "2026-08-17T10:00:00Z" }],
  associatedCompanies: [],
  counts: { tasks: 160, openTasks: 98, overdueTasks: 98, variations: 39, approvedVariations: 21, certificates: 23,
    postedCertificates: 17, certifiedValue: "6076522.00", documents: 47, meetings: 3, openRiskSignals: 11 },
  billingSummary: { state: "on", feeRatePct: 1, billingContactEmail: "", unbilledTotal: "0.00", outstandingTotal: "0.00" },
  adminHistory: [],
};

const draw = (el: React.ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.getAdminUsers.mockResolvedValue(page([pat]));
  api.getAdminUser.mockResolvedValue(patDetail);
  api.getAdminCompanies.mockResolvedValue({ count: 1, results: [{ id: 3, name: "Acme" }] });
  api.getAdminInvitations.mockResolvedValue(page([]));
  api.getAdminProjects.mockResolvedValue(page([project]));
  api.getAdminProject.mockResolvedValue(projectDetail);
  api.downloadAdminExport.mockResolvedValue(undefined);
});

describe("Users page", () => {
  it("lists users with their access and asks the server to sort", async () => {
    draw(<AdminUsers />);

    expect(await screen.findByText("Pat Builder")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Last sign-in" }));
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "lastLogin", page: 1 })));
  });

  it("opens a user, and unlocking goes through a confirmation", async () => {
    api.postAdminUserAction.mockResolvedValue({ ...patDetail, isLocked: false });
    draw(<AdminUsers />);

    fireEvent.click(await screen.findByText("Pat Builder"));
    expect(await screen.findByText("Market Building")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Unlock/ }));
    const dialog = await screen.findByRole("dialog", { name: "Unlock this user?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Unlock" }));

    await waitFor(() => expect(api.postAdminUserAction).toHaveBeenCalledWith(7, "unlock", ""));
  });

  it("will not deactivate without a reason", async () => {
    api.postAdminUserAction.mockResolvedValue({ ...patDetail, isActive: false });
    draw(<AdminUsers />);
    fireEvent.click(await screen.findByText("Pat Builder"));
    fireEvent.click(await screen.findByRole("button", { name: /Deactivate/ }));

    const dialog = await screen.findByRole("dialog", { name: "Deactivate this user?" });
    const confirm = within(dialog).getByRole("button", { name: "Deactivate" });
    expect(confirm).toBeDisabled();

    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Left the company" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.postAdminUserAction).toHaveBeenCalledWith(7, "deactivate", "Left the company"));
  });

  it("shows invitations with resend and cancel only where they apply", async () => {
    api.getAdminInvitations.mockResolvedValue(page([
      { id: 1, email: "new@x.test", name: "", position: "", type: "Client", status: "expired", invitedBy: "Ada",
        organization: null, project: "Market Building", createdAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-08T10:00:00Z", acceptedAt: null },
      { id: 2, email: "done@x.test", name: "", position: "", type: "Client", status: "accepted", invitedBy: "Ada",
        organization: null, project: "Market Building", createdAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-08T10:00:00Z", acceptedAt: "2026-10-02T10:00:00Z" },
    ]));
    draw(<AdminUsers />);
    await screen.findByText("Pat Builder");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Invitations" }));
    fireEvent.click(screen.getByRole("tab", { name: "Invitations" }));

    expect(await screen.findByText("new@x.test")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Resend" })).toHaveLength(1);
  });
});

describe("Projects page", () => {
  it("lists projects with billing and inactivity, and filters on the server", async () => {
    draw(<AdminProjects />);

    expect(await screen.findByText("Market Building")).toBeInTheDocument();
    expect(screen.getByText("Billing on")).toBeInTheDocument();
    expect(screen.getByText("No activity")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Inactive 30+ days" }));
    await waitFor(() => expect(api.getAdminProjects).toHaveBeenLastCalledWith(expect.objectContaining({ inactive: "1", page: 1 })));
  });

  it("opens a project with its health and team", async () => {
    draw(<AdminProjects />);
    fireEvent.click(await screen.findByText("Market Building"));

    expect(await screen.findByText("98 overdue tasks · 11 open risk signals")).toBeInTheDocument();
    expect(screen.getByText("17 posted of 23")).toBeInTheDocument();
    expect(screen.getByText("Team (1)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing terms" })).toHaveAttribute("href", "/account/admin/billing/projects/44");
  });

  it("exports with the current filters", async () => {
    draw(<AdminProjects />);
    await screen.findByText("Market Building");
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    expect(api.downloadAdminExport).toHaveBeenCalledWith("projects", expect.objectContaining({ sort: "created" }));
  });
});
