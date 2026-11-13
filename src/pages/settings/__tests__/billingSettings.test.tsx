/**
 * Settings → Billing: read-only for everyone (client meeting, 28 Oct 2026).
 *
 * BUG-11: a role the server refuses watched "Loading billing terms" forever —
 *         the loader was checked before the error.
 *
 * Terms are managed in the Admin Panel → Billing, which reaches every project.
 * Nobody edits them here — not even a superuser, who gets a link instead.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchState: { data: any; isLoading: boolean; isError: boolean; error: any } = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};
let superuser = false;

vi.mock("@/hooks/useFetch", () => ({ default: () => fetchState }));
// Embedded under the terms; tested on its own (baselinqBilling.test.tsx).
vi.mock("@/components/finance/baselinqBilling", () => ({ default: () => <div data-testid="baselinq-billing" /> }));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ data: { id: 1, is_superuser: superuser } }),
}));
vi.mock("@/components/commons/AwesomeLoader", () => ({
  AwesomeLoader: ({ message }: { message: string }) => <div>{message}</div>,
}));

import Billing from "@/pages/settings/billing";

const CONFIG = {
  configured: true,
  enabled: true,
  feeBase: "both",
  feeRatePct: 1,
  rateSource: "default",
  vatRatePct: 15,
  capAmount: null,
  billingContactName: "Vantage",
  billingContactEmail: "ap@vantage.test",
};

const draw = () =>
  render(
    <MemoryRouter>
      <Billing />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.setItem("selectedProjectId", "47");
  fetchState.data = CONFIG;
  fetchState.isLoading = false;
  fetchState.isError = false;
  fetchState.error = null;
  superuser = false;
});

describe("a refused read", () => {
  it("says the terms are not visible to this role instead of loading forever", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    fetchState.error = Object.assign(new Error("You do not have permission"), { status: 403 });
    draw();
    expect(screen.getByText(/not visible to your role/i)).toBeInTheDocument();
    expect(screen.queryByText("Loading billing terms")).not.toBeInTheDocument();
  });

  it("keeps the outage wording for anything that is not a refusal", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    fetchState.error = Object.assign(new Error("HTTP error! status: 500"), { status: 500 });
    draw();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
});

describe("read-only for everyone", () => {
  it("shows the terms with no inputs and no save", () => {
    draw();
    expect(screen.getByText("1%")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
    expect(screen.getByText(/Baselinq's standard rate/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("says when the rate was negotiated for this project", () => {
    fetchState.data = { ...CONFIG, feeRatePct: 0.75, rateSource: "negotiated" };
    draw();
    expect(screen.getByText("0.75%")).toBeInTheDocument();
    expect(screen.getByText(/Negotiated for this project/)).toBeInTheDocument();
  });

  it("gives a superuser a way to the admin panel, not a form", () => {
    superuser = true;
    draw();
    expect(screen.getByRole("button", { name: /manage in admin panel/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("hides that link from everyone else", () => {
    draw();
    expect(screen.queryByRole("button", { name: /manage in admin panel/i })).not.toBeInTheDocument();
  });
});

describe("the billing guide", () => {
  it("is linked from the page", () => {
    draw();
    expect(screen.getByRole("link", { name: /billing guide/i })).toHaveAttribute("href", "/help/billing");
  });

  it("is still linked when the terms are refused, which is when it is most needed", () => {
    fetchState.data = undefined;
    fetchState.isError = true;
    fetchState.error = Object.assign(new Error("refused"), { status: 403 });
    draw();
    expect(screen.getByRole("link", { name: /billing guide/i })).toHaveAttribute("href", "/help/billing");
  });
});
