/**
 * The AI mark in the header sat on every page as a <button> with no handler.
 * It now opens Linq, and says so to a screen reader.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

// The header's data hooks and the controls beside the button are not under test.
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    fetchNotifications: vi.fn(),
  }),
}));
vi.mock("@/hooks/useUnreadSummary", () => ({ useUnreadSummary: () => ({ total: 0 }) }));
vi.mock("@/hooks/useLogout", () => ({ useLogout: () => ({ logout: vi.fn() }) }));
vi.mock("../NavbarWeather", () => ({ default: () => null }));
vi.mock("../header/CreateRequestButton", () => ({ default: () => null }));

import { DashboardHeader } from "../DashboardHeader";

function renderHeaderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <Routes>
          <Route path="/ai-workspace" element={<p>Linq page</p>} />
          <Route path="*" element={<DashboardHeader />} />
        </Routes>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("DashboardHeader AI button", () => {
  it("is labelled as opening Linq", () => {
    renderHeaderAt("/tasks");
    expect(screen.getByRole("button", { name: "Open Linq" })).toBeInTheDocument();
  });

  it("opens Linq when pressed", () => {
    renderHeaderAt("/tasks");
    fireEvent.click(screen.getByRole("button", { name: "Open Linq" }));
    expect(screen.getByText("Linq page")).toBeInTheDocument();
  });

  it("is not shown on the account pages, which have no project", () => {
    renderHeaderAt("/account");
    expect(screen.queryByRole("button", { name: "Open Linq" })).not.toBeInTheDocument();
  });
});
