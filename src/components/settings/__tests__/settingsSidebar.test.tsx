/**
 * The Settings sidebar offers only pages the user can open.
 *
 * User Management and Associated Companies had no permission on their links,
 * while their routes require viewSettings. A user admitted to Settings for
 * Billing alone (billing.terms.view) saw both, and each sent them to
 * /unauthorized.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

let held = new Set<string>();
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (p: string) => held.has(p), isLoading: false }),
}));

import { Sidebar } from "@/components/settings/sidebar";

const draw = () =>
  render(
    <MemoryRouter initialEntries={["/settings/billing"]}>
      <Sidebar />
    </MemoryRouter>,
  );

beforeEach(() => {
  held = new Set();
});

describe("settings sidebar", () => {
  it("hides User Management and Associated Companies from a billing-only user", () => {
    held = new Set(["viewBillingTerms"]);
    draw();
    expect(screen.getByRole("link", { name: /Billing/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /User Management/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Associated Companies/ })).not.toBeInTheDocument();
  });

  it("shows them to a user who holds viewSettings, as their routes require", () => {
    held = new Set(["viewSettings"]);
    draw();
    expect(screen.getByRole("link", { name: /User Management/ })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: /Associated Companies/ })).toHaveAttribute(
      "href",
      "/settings/associated-companies",
    );
  });
});
