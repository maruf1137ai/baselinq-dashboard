/**
 * The Audit page renders only what the server recorded: no invented entries
 * when the trail is empty, no compliance score or deadline tracker, an honest
 * error, and a note when the server's 500-row cap is reached.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const responses: { audits: () => any; tasks: () => any } = {
  audits: () => [],
  tasks: () => ({ tasks: [] }),
};

vi.mock("@/lib/Api", () => ({
  fetchData: vi.fn(async (url: string) => (url.startsWith("tasks/audits/") ? responses.audits() : responses.tasks())),
}));
vi.mock("@/hooks/useEffectivePermissions", () => ({
  useEffectivePermissions: () => ({ data: { permissions: { "audit.full_access": true } }, isLoading: false }),
}));
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AuditPage from "@/pages/AuditPage";

const vo = { taskId: "345", taskType: "VO", status: "done", created_at: "2026-10-01T00:00:00Z", task: { voNumber: "VO-203" } };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem("selectedProjectId", "47");
  responses.audits = () => [];
  responses.tasks = () => ({ tasks: [vo] });
});

describe("AuditPage", () => {
  it("shows an empty trail as empty, inventing nothing from the tasks", async () => {
    renderPage();
    expect(await screen.findByText("No activity has been recorded on this project yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Created/)).not.toBeInTheDocument();
    expect(screen.queryByText(/System/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Compliance Score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Risk Level/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/JBCC/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download CSV/ })).not.toBeInTheDocument();
  });

  it("shows the real rows, with no user where none was recorded", async () => {
    responses.audits = () => [
      { taskId: 345, action: "created", createdByName: "Test PM", createdAt: "2026-10-27T09:00:00Z" },
      { taskId: 345, action: "other", description: "Signed and issued", createdByName: null, createdAt: "2026-10-27T10:00:00Z" },
    ];
    renderPage();
    expect(await screen.findAllByText("VO-203")).toHaveLength(2);
    expect(screen.getByText(/No user recorded/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download CSV/ })).toBeInTheDocument();
    expect(screen.queryByTestId("trail-capped")).not.toBeInTheDocument();
  });

  it("says so when the server's cap cut the trail short", async () => {
    responses.audits = () =>
      Array.from({ length: 500 }, (_, i) => ({ taskId: 345, action: "created", createdByName: "A", createdAt: `2026-10-27T09:${String(i % 60).padStart(2, "0")}:00Z` }));
    renderPage();
    expect(await screen.findByTestId("trail-capped")).toHaveTextContent("latest 500");
  });

  it("shows an error, not an empty trail, when the trail fails to load", async () => {
    responses.audits = () => {
      throw new Error("500");
    };
    renderPage();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded"));
    expect(screen.queryByText(/No activity has been recorded/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
