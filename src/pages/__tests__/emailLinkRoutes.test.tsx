/**
 * The pages an email links to are gated by the server, not by the project
 * this browser happens to have selected.
 *
 * The statement, a Baselinq invoice and a contractor tax invoice are each
 * emailed with their own project. They sat behind RoleRoute (and the
 * statement behind ProjectProtectedRoute too), which check the permissions of
 * the project selected in THIS browser. A user with finance access on the
 * document's project, but with another project selected, was sent to
 * /unauthorized from a link in their own inbox. Each server endpoint checks
 * the document's own project; the page shows its refusal.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The gates, made visible: if a route still wraps its page in one, the gate's
// marker renders instead of the page.
vi.mock("@/RoleRoute", () => ({ default: () => <div>role gate</div> }));
vi.mock("@/components/ProjectProtectedRoute", () => ({ default: () => <div>project gate</div> }));
vi.mock("@/pages/FinancialStatementPage", () => ({ default: () => <div>statement page</div> }));
vi.mock("@/pages/InvoicePage", () => ({ default: () => <div>invoice page</div> }));
vi.mock("@/pages/TaxInvoicePage", () => ({ default: () => <div>tax invoice page</div> }));
vi.mock("@/components/PermissionLiveSync", () => ({ PermissionLiveSync: () => null }));
vi.mock("@/components/StagingBanner", () => ({ StagingBanner: () => null }));

import App from "@/App";

const visit = (path: string) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

beforeEach(() => {
  localStorage.clear();
});

describe("routes an email links to", () => {
  it.each([
    ["/finance/statement?projectId=46", "statement page"],
    ["/invoices/7", "invoice page"],
    ["/finance/tax-invoices/3", "tax invoice page"],
  ])("%s opens for a signed-in user, whatever project is selected", async (path, page) => {
    localStorage.setItem("access", "token");
    localStorage.setItem("selectedProjectId", "45");
    visit(path);

    expect(await screen.findByText(page)).toBeInTheDocument();
    expect(screen.queryByText("role gate")).not.toBeInTheDocument();
    expect(screen.queryByText("project gate")).not.toBeInTheDocument();
  });

  it("still asks a signed-out visitor to sign in", async () => {
    visit("/invoices/7");

    expect(screen.queryByText("invoice page")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });
});
